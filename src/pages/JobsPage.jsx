import { useState, useCallback, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ALL_JOBS, ALL_LOCATIONS } from "../lib/constants"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

const ADZUNA_ID = "344e86d1"
const ADZUNA_KEY = "039c47ae80bab92aef99751a471040fb"
const JOBS_PER_PAGE = 20

// NEGATIVE KEYWORDS - job removed if ANY phrase found
const NEG_KW = [
  "no sponsorship","cannot sponsor","no visa sponsorship","sponsorship not available",
  "unable to offer sponsorship","unable to sponsor","we do not offer sponsorship",
  "does not offer sponsorship","cannot offer visa","not in a position to sponsor",
  "does not provide sponsorship","sponsorship cannot be offered","we are unable to offer visa",
  "uk residents only","british nationals only","must have right to work",
  "must be eligible to work in the uk without","right to work without sponsorship",
  "must already have the right to work","you must have the right to work",
  "applicants must have the right to work","only applicants with the right to work",
  "right to work in the uk is required","own right to work",
  "not eligible for uk visa sponsorship","not eligible for visa sponsorship",
  "this post is not eligible for","not open to sponsorship",
  "will not be open to sponsorship","this post will not be open to sponsorship",
  "salary does not meet the home office","does not meet the home office requirements",
  "unable to accept applicants with skilled worker","not open to skilled worker visa",
  "sponsorship under the ukvi","cannot accept applicants who require sponsorship",
  "we cannot accept applications from candidates who require",
  "this vacancy does not offer","this role does not offer sponsorship",
  "no work permit","work permit will not be sponsored",
  "cannot provide certificate of sponsorship","visa sponsorship is not available",
  "visa sponsorship is unfortunately","sponsorship is not provided",
  "self sponsored","self-sponsored","sponsor yourself","acquire own business",
  "own your own business","business opportunity for","franchise opportunity",
  "you must not require sponsorship","we do not provide sponsorship",
  "self employment route","self-employment route"
]

// STRONG POSITIVE - confirms genuine sponsorship
const VISA_POS = [
  "visa sponsorship provided","visa sponsorship available","visa sponsorship offered",
  "certificate of sponsorship","cos will be provided","cos provided",
  "skilled worker visa sponsorship","we will sponsor","sponsorship is available",
  "open to sponsorship","visa support provided","sponsorship provided",
  "tier 2 sponsorship","ukvi sponsorship","sponsorship for the right candidate",
  "we can sponsor","sponsorship considered","sponsorship available",
  "will sponsor","visa provided","will provide visa"
]

// WEAK POSITIVE - only counts alongside gov verification
const VISA_WEAK = [
  "visa sponsorship","skilled worker visa","tier 2","ukvi","international applicants",
  "relocation package","overseas candidates welcome"
]

// FRESHER KEYWORDS
const FRESHER_KW = [
  "graduate","entry level","junior","trainee","apprentice",
  "grad scheme","graduate scheme","graduate programme","no experience required",
  "fresh graduate","new graduate"
]

// INELIGIBLE ROLES - removed from Skilled Worker eligible list
const INELIGIBLE_ROLES = [
  "teaching assistant","learning support","classroom assistant","hlta",
  "higher level teaching assistant",
  "chef ","sous chef","head chef","kitchen porter","kitchen assistant",
  "waiter","waitress","barista","hospitality assistant",
  "housekeeper","cleaner ","cleaning operative",
  "delivery driver","van driver","lorry driver",
  "retail assistant","shop assistant","sales assistant ",
  "security guard","security officer ",
  "care assistant","healthcare assistant","support worker","care worker",
  "warehouse operative","warehouse assistant","packing operative",
  "self-sponsor","self sponsor"
]

// SPAM/SCAM DETECTION
function isSpam(job) {
  const title = (job.title || "").toLowerCase()
  const desc = (job.description || "").replace(/<[^>]*>/g, " ").toLowerCase()
  const spamTitles = [
    "psw visa","post study work","self sponsored","self-sponsored",
    "seeking sponsorship","looking for sponsorship","sponsor needed",
    "own business","franchise","business opportunity","investment opportunity"
  ]
  for (const s of spamTitles) { if (title.includes(s)) return true }
  const spamDesc = [
    "acquire own business","own your own business","buy a business",
    "business purchase","funding available for business","business partner investor",
    "professional fees will apply","admin fee","registration fee",
    "upfront fee","course fee","training fee required","you will need to pay",
    "candidate pays","pay your own","pyramid scheme","multi-level marketing"
  ]
  for (const s of spamDesc) { if (desc.includes(s)) return true }
  return false
}

const ALL_ROLES = ["All Jobs", ...ALL_JOBS]
const ALL_LOCS = ["Anywhere in UK", ...ALL_LOCATIONS]
const QUICK_ROLES = ["All Jobs","Software Engineer","Registered Nurse","Data Analyst",
  "Cyber Security Analyst","Civil Engineer","Pharmacist","Data Scientist",
  "Accountant","Physiotherapist","Social Worker","DevOps Engineer"]

function useW() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener("resize", fn)
    return () => window.removeEventListener("resize", fn)
  }, [])
  return w
}

async function checkSponsor(employerName) {
  if (!employerName || employerName === "Unknown") return null
  try {
    const clean = employerName
      .replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co|corp|corporation|holdings|services|solutions|international|technologies|technology|systems|consulting|consultancy|recruitment|staffing|agency)\.?$/gi, "")
      .replace(/[^\w\s]/g, " ").trim()
    if (clean.length < 2) return null
    const { data: exact } = await supabase.from("sponsors").select("organisation_name, town, route, rating")
      .ilike("organisation_name", employerName).limit(1)
    if (exact && exact[0]) return exact[0]
    const { data: contains } = await supabase.from("sponsors").select("organisation_name, town, route, rating")
      .ilike("organisation_name", "%" + clean + "%").limit(1)
    if (contains && contains[0]) return contains[0]
    const firstWord = clean.split(" ")[0]
    if (firstWord.length >= 4) {
      const { data: partial } = await supabase.from("sponsors").select("organisation_name, town, route, rating")
        .ilike("organisation_name", firstWord + "%").limit(1)
      if (partial && partial[0]) return partial[0]
    }
    return null
  } catch { return null }
}

async function batchCheckSponsors(employers) {
  const unique = [...new Set(employers.filter(Boolean))]
  const results = {}
  for (let i = 0; i < unique.length; i += 8) {
    const batch = unique.slice(i, i + 8)
    await Promise.all(batch.map(async (emp) => { results[emp] = await checkSponsor(emp) }))
  }
  return results
}

function scoreJob(job, sponsorData) {
  // 1. Spam/scam check
  if (isSpam(job)) return { score: -1, signals: [], fresherFriendly: false, verified: false }

  // 2. Ineligible role check
  const titleLow = (job.title || "").toLowerCase()
  for (const role of INELIGIBLE_ROLES) {
    if (titleLow.includes(role)) return { score: -1, signals: [], fresherFriendly: false, verified: false }
  }

  // 3. Strip HTML and build full text
  const rawDesc = job.description
    ? job.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")
    : ""
  const text = (job.title + " " + rawDesc + " " + job.employer).toLowerCase()

  // 4. Hard negative filter
  for (const neg of NEG_KW) {
    if (text.includes(neg)) return { score: -1, signals: [], fresherFriendly: false, verified: false }
  }

  let score = 0
  const signals = []
  let fresherFriendly = false
  let hasStrongVisa = false

  // 5. Gov verified sponsor
  if (sponsorData) {
    score += 50
    signals.push({ type: "verified", label: "Gov Verified" })
    if (sponsorData.rating === "A") { score += 10; signals.push({ type: "rating", label: "A-Rated" }) }
  }

  // 6. Strong visa positive
  for (const kw of VISA_POS) {
    if (text.includes(kw)) {
      score += 30
      signals.push({ type: "visa", label: "Sponsorship Confirmed" })
      hasStrongVisa = true
      break
    }
  }

  // 7. Weak visa signal - only if gov verified
  if (!hasStrongVisa && sponsorData) {
    for (const kw of VISA_WEAK) {
      if (text.includes(kw)) {
        score += 10
        signals.push({ type: "visa", label: kw })
        break
      }
    }
  }

  // 8. Fresher detection
  for (const kw of FRESHER_KW) { if (text.includes(kw)) { fresherFriendly = true; break } }

  // 9. Salary disclosed
  if (job.salary_min && job.salary_min > 500) {
    score += 5
    signals.push({ type: "salary", label: "Salary shown" })
  }

  // 10. MINIMUM THRESHOLD - must have gov verification OR strong visa language
  // This removes fake 50% likelihood jobs with no real signal
  if (!sponsorData && !hasStrongVisa) {
    return { score: -1, signals: [], fresherFriendly: false, verified: false }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    signals: [...new Map(signals.map(s => [s.label, s])).values()].slice(0, 4),
    fresherFriendly,
    verified: !!sponsorData
  }
}

async function fetchAdzuna(q, loc, page) {
  const what = q ? q + " visa sponsorship" : "visa sponsorship uk jobs"
  const where = loc && loc !== "Anywhere in UK" ? loc : "UK"
  const params = new URLSearchParams({ app_id: ADZUNA_ID, app_key: ADZUNA_KEY, what, where, results_per_page: 40 })
  const r = await fetch("https://api.adzuna.com/v1/api/jobs/gb/search/" + page + "?" + params)
  if (!r.ok) return { jobs: [], total: 0 }
  const data = await r.json()
  return {
    jobs: (data.results || []).map(j => ({
      id: "adzuna_" + j.id, source: "Adzuna",
      title: j.title || "",
      employer: (j.company && j.company.display_name) || "Unknown",
      location: (j.location && j.location.display_name) || "UK",
      salary_min: j.salary_min, salary_max: j.salary_max,
      description: j.description || "", url: j.redirect_url || "#",
      posted: j.created, full_time: j.contract_time === "full_time"
    })),
    total: data.count || 0
  }
}

async function fetchReed(q, loc, page) {
  const keywords = q ? q + " visa sponsorship" : "visa sponsorship"
  const locationName = loc && loc !== "Anywhere in UK" ? loc : "United Kingdom"
  const params = new URLSearchParams({ keywords, locationName, resultsToTake: 40, resultsToSkip: (page - 1) * 40 })
  const r = await fetch("https://uk-visa-jobs-six.vercel.app/api/reed?" + params)
  if (!r.ok) return { jobs: [], total: 0 }
  const data = await r.json()
  return {
    jobs: (data.results || []).map(j => ({
      id: "reed_" + j.jobId, source: "Reed",
      title: j.jobTitle || "", employer: j.employerName || "Unknown",
      location: j.locationName || "",
      salary_min: j.minimumSalary, salary_max: j.maximumSalary,
      description: j.jobDescription || "", url: j.jobUrl || "#",
      posted: j.date, full_time: j.fullTime
    })),
    total: data.totalResults || 0
  }
}

function JobCard({ job, onSave, saved, navigate, mob }) {
  const [expanded, setExpanded] = useState(false)
  const sal = job.salary_min || job.salary_max
    ? "GBP " + (job.salary_min || 0).toLocaleString() + (job.salary_max ? " - " + job.salary_max.toLocaleString() : "+")
    : null
  const posted = (() => {
    if (!job.posted) return ""
    const d = new Date(job.posted)
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  })()
  const sc = job.verified ? "#00D68F" : job.score >= 70 ? "#0057FF" : job.score >= 50 ? "#FF6B35" : "#9CA3B8"
  const sl = job.verified ? "Verified" : job.score >= 70 ? "Very Likely" : job.score >= 50 ? "Likely" : "Possible"

  return (
    <div style={{ background: "#fff", border: "1.5px solid " + (job.verified ? "#00D68F35" : "#E8EEFF"), borderRadius: 16, padding: mob ? "14px" : "20px 24px", transition: "all 0.2s", position: "relative" }}
      onMouseEnter={e => { if (!mob) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,57,255,0.07)" } }}
      onMouseLeave={e => { if (!mob) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" } }}
    >
      {job.verified && <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #00D68F, #00A67E)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 10px", borderRadius: "0 16px 0 8px", letterSpacing: 0.5 }}>UK GOV VERIFIED</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start", marginTop: job.verified ? 8 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ background: job.source === "Reed" ? "#e8534215" : "#7c4dff15", color: job.source === "Reed" ? "#e85342" : "#7c4dff", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{job.source}</span>
            {job.fresherFriendly && <span style={{ background: "#00D68F15", color: "#00D68F", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>Fresher Friendly</span>}
            {job.sponsorInfo && job.sponsorInfo.town && <span style={{ background: "#0057FF08", color: "#0057FF", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>{job.sponsorInfo.town}</span>}
          </div>
          <h3 style={{ fontSize: mob ? 14 : 15, fontWeight: 800, color: "#0A0F1E", margin: "0 0 3px", lineHeight: 1.3 }}>{job.title}</h3>
          <div style={{ color: "#4B5675", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.employer} - {job.location}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
          <div style={{ background: sc + "15", border: "1px solid " + sc + "40", borderRadius: 20, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: sc, whiteSpace: "nowrap" }}>{sl} {job.score}%</div>
          <button onClick={() => onSave(job)} style={{ background: saved ? "#0057FF10" : "none", border: "1px solid " + (saved ? "#0057FF" : "#E8EEFF"), color: saved ? "#0057FF" : "#9CA3B8", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{saved ? "Saved" : "Save"}</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 7, fontSize: 11, color: "#4B5675", flexWrap: "wrap" }}>
        {sal && <span>{sal}</span>}
        {posted && <span>Posted {posted}</span>}
        {job.sponsorInfo && job.sponsorInfo.route && <span style={{ color: "#7C3AED", fontWeight: 600 }}>{job.sponsorInfo.route.split(":")[0]}</span>}
      </div>
      {job.signals && job.signals.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {job.signals.map((s, i) => {
            const c = s.type === "verified" ? "#00D68F" : s.type === "rating" ? "#00D68F" : s.type === "visa" ? "#0057FF" : "#FF6B35"
            return <span key={i} style={{ background: c + "12", color: c, borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 600 }}>{s.label}</span>
          })}
        </div>
      )}
      {job.description && (
        <>
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: "#0057FF", fontSize: 11, cursor: "pointer", marginTop: 6, padding: 0, fontFamily: "inherit" }}>{expanded ? "Hide description" : "Show description"}</button>
          {expanded && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#4B5675", lineHeight: 1.7, borderTop: "1px solid #E8EEFF", paddingTop: 8, maxHeight: 150, overflow: "auto" }}>{job.description.replace(/<[^>]*>/g, "").slice(0, 600)}{job.description.length > 600 ? "..." : ""}</p>}
        </>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>Apply Now</a>
        {job.sponsorInfo && <button onClick={() => navigate("/employer/" + encodeURIComponent(job.employer))} style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", color: "#4B5675", borderRadius: 8, padding: "9px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Profile</button>}
      </div>
    </div>
  )
}

function Pagination({ currentPage, totalPages, onPageChange, mob }) {
  if (totalPages <= 1) return null
  const getPages = () => {
    const pages = []
    const delta = mob ? 1 : 2
    const left = Math.max(2, currentPage - delta)
    const right = Math.min(totalPages - 1, currentPage + delta)
    pages.push(1)
    if (left > 2) pages.push("...")
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages - 1) pages.push("...")
    if (totalPages > 1) pages.push(totalPages)
    return pages
  }
  return (
    <div style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ color: "#4B5675", fontSize: 13 }}>Page {currentPage} of {totalPages}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer", border: "1.5px solid #E8EEFF", background: "#fff", color: currentPage === 1 ? "#9CA3B8" : "#0057FF", fontFamily: "inherit" }}>Prev</button>
        {getPages().map((p, i) => p === "..." ? (
          <span key={"d" + i} style={{ padding: "8px 4px", color: "#9CA3B8", fontSize: 13 }}>...</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)} style={{ padding: "8px 13px", borderRadius: 9, fontSize: 13, fontWeight: p === currentPage ? 800 : 600, cursor: "pointer", border: "1.5px solid " + (p === currentPage ? "#0057FF" : "#E8EEFF"), background: p === currentPage ? "#0057FF" : "#fff", color: p === currentPage ? "#fff" : "#4B5675", fontFamily: "inherit", minWidth: 38 }}>{p}</button>
        ))}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: currentPage === totalPages ? "not-allowed" : "pointer", border: "1.5px solid #E8EEFF", background: "#fff", color: currentPage === totalPages ? "#9CA3B8" : "#0057FF", fontFamily: "inherit" }}>Next</button>
      </div>
    </div>
  )
}

export default function JobsPage() {
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get("q") || "")
  const [loc, setLoc] = useState(searchParams.get("loc") || "")
  const [showQ, setShowQ] = useState(false)
  const [showL, setShowL] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [fresherOnly, setFresherOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [filters, setFilters] = useState({ salaryMin: "", salaryMax: "", jobType: "", source: "", sortBy: "Score" })
  const [allJobs, setAllJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [savedJobs, setSavedJobs] = useState(new Set())
  const topRef = useRef(null)
  const navigate = useNavigate()
  const w = useW()
  const mob = w < 768

  const filteredRoles = q.length > 0 ? ALL_ROLES.filter(r => r.toLowerCase().includes(q.toLowerCase())) : ALL_ROLES
  const filteredLocs = loc.length > 0 ? ALL_LOCS.filter(l => l.toLowerCase().includes(loc.toLowerCase())) : ALL_LOCS
  const totalPages = Math.max(1, Math.ceil(allJobs.length / JOBS_PER_PAGE))
  const pageJobs = allJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE)
  const activeCount = Object.values(filters).filter(v => v !== "" && v !== "Score").length

  useEffect(() => { doSearch("", "") }, [])

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: f[k] === v ? "" : v }))

  const goPage = (p) => { setCurrentPage(p); if (topRef.current) topRef.current.scrollIntoView({ behavior: "smooth" }) }

  const handleSave = async (job) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate("/auth"); return }
    if (savedJobs.has(job.id)) return
    await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: job.id, job_title: job.title, employer: job.employer, location: job.location, salary_min: job.salary_min, salary_max: job.salary_max, job_url: job.url, source: job.source, sponsorship_score: job.score })
    setSavedJobs(s => new Set([...s, job.id]))
  }

  const doSearch = useCallback(async (searchQ, searchLoc) => {
    setLoading(true); setError(""); setCurrentPage(1)
    try {
      const cleanLoc = searchLoc && searchLoc !== "Anywhere in UK" ? searchLoc : ""
      let rawJobs = []
      const fetches = await Promise.allSettled([
        fetchReed(searchQ, cleanLoc, 1), fetchAdzuna(searchQ, cleanLoc, 1),
        fetchReed(searchQ, cleanLoc, 2), fetchAdzuna(searchQ, cleanLoc, 2),
        fetchReed(searchQ, cleanLoc, 3), fetchAdzuna(searchQ, cleanLoc, 3),
      ])
      for (const res of fetches) { if (res.status === "fulfilled") rawJobs.push(...res.value.jobs) }
      if (rawJobs.length === 0) { setError("No results found. Try a different search."); setLoading(false); return }
      const seen = new Set()
      rawJobs = rawJobs.filter(j => {
        const key = j.title.toLowerCase().slice(0, 30) + "|" + j.employer.toLowerCase()
        if (seen.has(key)) return false; seen.add(key); return true
      })
      const sponsorMap = await batchCheckSponsors(rawJobs.map(j => j.employer))
      let scored = rawJobs.map(j => {
        const sponsorInfo = sponsorMap[j.employer]
        const { score, signals, fresherFriendly, verified } = scoreJob(j, sponsorInfo)
        return { ...j, score, signals, fresherFriendly, verified, sponsorInfo }
      }).filter(j => j.score >= 0)
      if (fresherOnly) scored = scored.filter(j => j.fresherFriendly)
      if (verifiedOnly) scored = scored.filter(j => j.verified)
      if (filters.jobType === "Full-time") scored = scored.filter(j => j.full_time === true)
      if (filters.jobType === "Part-time") scored = scored.filter(j => j.full_time === false)
      if (filters.salaryMin) scored = scored.filter(j => (j.salary_min || 0) >= parseInt(filters.salaryMin))
      if (filters.salaryMax) scored = scored.filter(j => (j.salary_max || 999999) <= parseInt(filters.salaryMax))
      if (filters.source) scored = scored.filter(j => j.source === filters.source)
      scored.sort((a, b) => {
        if (a.verified && !b.verified) return -1
        if (!a.verified && b.verified) return 1
        if (filters.sortBy === "Salary") return (b.salary_min || 0) - (a.salary_min || 0)
        if (filters.sortBy === "Date") return new Date(b.posted || 0) - new Date(a.posted || 0)
        return b.score - a.score
      })
      setAllJobs(scored); setSearched(true)
      setTimeout(async () => {
        try {
          const bg = await Promise.allSettled([
            fetchReed(searchQ, cleanLoc, 4), fetchAdzuna(searchQ, cleanLoc, 4),
            fetchReed(searchQ, cleanLoc, 5), fetchAdzuna(searchQ, cleanLoc, 5),
          ])
          let bgJobs = []
          for (const r of bg) { if (r.status === "fulfilled") bgJobs.push(...r.value.jobs) }
          if (!bgJobs.length) return
          const bgSM = await batchCheckSponsors(bgJobs.map(j => j.employer))
          const bgScored = bgJobs.map(j => {
            const si = bgSM[j.employer]
            const { score, signals, fresherFriendly, verified } = scoreJob(j, si)
            return { ...j, score, signals, fresherFriendly, verified, sponsorInfo: si }
          }).filter(j => j.score >= 0)
          setAllJobs(prev => {
            const ids = new Set(prev.map(j => j.id))
            const nj = bgScored.filter(j => !ids.has(j.id))
            if (!nj.length) return prev
            return [...prev, ...nj].sort((a, b) => { if (a.verified && !b.verified) return -1; if (!a.verified && b.verified) return 1; return b.score - a.score })
          })
        } catch (e) {}
      }, 2000)
    } catch (e) { setError("Search failed. Please try again.") }
    finally { setLoading(false) }
  }, [fresherOnly, verifiedOnly, filters])

  const pillStyle = (active) => ({ padding: "5px 11px", borderRadius: 100, fontSize: mob ? 11 : 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (active ? "#0057FF" : "#E8EEFF"), background: active ? "#0057FF0D" : "#fff", color: active ? "#0057FF" : "#4B5675", fontFamily: "inherit", whiteSpace: "nowrap" })
  const fpill = (active) => ({ padding: "6px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (active ? "#0057FF" : "#E8EEFF"), background: active ? "#0057FF0D" : "#F8FAFF", color: active ? "#0057FF" : "#4B5675", fontFamily: "inherit" })
  const drop = { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", borderRadius: 14, border: "1px solid #E8EEFF", boxShadow: "0 16px 48px rgba(0,57,255,0.1)", maxHeight: 360, overflowY: "auto", zIndex: 300 }
  const stats = { total: allJobs.length, verified: allJobs.filter(j => j.verified).length, fresher: allJobs.filter(j => j.fresherFriendly).length }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div ref={topRef} style={{ maxWidth: 900, margin: "0 auto", padding: mob ? "82px 4% 40px" : "96px 5% 60px" }}>
        <div style={{ marginBottom: mob ? 14 : 20 }}>
          <h1 style={{ fontSize: mob ? 20 : 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 4px", letterSpacing: -0.8 }}>Find UK Visa Sponsored Jobs</h1>
          <p style={{ color: "#4B5675", fontSize: mob ? 12 : 14, margin: 0 }}>125,284 verified UK Home Office sponsors - Spam filtered - Positive results first</p>
        </div>
        <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 16, marginBottom: 10, boxShadow: "0 4px 24px rgba(0,57,255,0.06)", position: "relative", zIndex: 20 }}>
          <div style={{ position: "relative", borderBottom: "1px solid #E8EEFF" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3B8", fontSize: 13, pointerEvents: "none" }}>Role:</span>
            <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => { setShowQ(true); setShowL(false) }} onBlur={() => setTimeout(() => setShowQ(false), 200)} onKeyDown={e => { if (e.key === "Enter") { doSearch(q, loc); setShowQ(false) } }} placeholder="Search any role - leave empty to see all sponsored jobs" style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: mob ? "14px 80px 14px 60px" : "14px 90px 14px 62px", fontSize: mob ? 14 : 15, color: "#0A0F1E", fontFamily: "inherit" }} />
            {q && <button onClick={() => { setQ(""); doSearch("", loc) }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#4B5675", cursor: "pointer", fontFamily: "inherit" }}>Clear</button>}
            {showQ && (
              <div style={drop}>
                <div style={{ padding: "10px 14px 8px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #F8FAFF" }}>{q ? filteredRoles.length + " matching roles" : "All " + ALL_JOBS.length + " roles"}</div>
                {filteredRoles.map(role => (
                  <div key={role} onMouseDown={() => { setQ(role === "All Jobs" ? "" : role); doSearch(role === "All Jobs" ? "" : role, loc); setShowQ(false) }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: role === "All Jobs" ? "#0057FF" : "#0A0F1E", fontWeight: role === "All Jobs" ? 700 : 400, background: role === "All Jobs" ? "#F0F5FF" : "transparent", borderBottom: "1px solid rgba(232,238,255,0.4)" }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFF"} onMouseLeave={e => e.currentTarget.style.background = role === "All Jobs" ? "#F0F5FF" : "transparent"}>{role}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9CA3B8", fontSize: 12, pointerEvents: "none" }}>Location:</span>
              <input value={loc} onChange={e => setLoc(e.target.value)} onFocus={() => { setShowL(true); setShowQ(false) }} onBlur={() => setTimeout(() => setShowL(false), 200)} onKeyDown={e => { if (e.key === "Enter") { doSearch(q, loc); setShowL(false) } }} placeholder="Any UK city..." style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: "12px 12px 12px 82px", fontSize: 13, color: "#0A0F1E", fontFamily: "inherit" }} />
              {showL && (
                <div style={drop}>
                  <div style={{ padding: "10px 14px 8px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #F8FAFF" }}>{loc ? filteredLocs.length + " locations" : "All " + ALL_LOCATIONS.length + " UK cities"}</div>
                  {filteredLocs.map(city => (
                    <div key={city} onMouseDown={() => { setLoc(city === "Anywhere in UK" ? "" : city); doSearch(q, city === "Anywhere in UK" ? "" : city); setShowL(false) }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: city === "Anywhere in UK" ? "#0057FF" : "#0A0F1E", fontWeight: city === "Anywhere in UK" ? 700 : 400, background: city === "Anywhere in UK" ? "#F0F5FF" : "transparent", borderBottom: "1px solid rgba(232,238,255,0.4)" }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFF"} onMouseLeave={e => e.currentTarget.style.background = city === "Anywhere in UK" ? "#F0F5FF" : "transparent"}>{city}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 1, height: 32, background: "#E8EEFF", flexShrink: 0 }} />
            <button onClick={() => setShowFilters(f => !f)} style={{ background: "none", border: "none", color: showFilters ? "#0057FF" : "#4B5675", padding: "0 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, height: 44, whiteSpace: "nowrap" }}>Filters {activeCount > 0 && <span style={{ background: "#0057FF", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>}</button>
            <button onClick={() => { doSearch(q, loc); setShowQ(false); setShowL(false) }} disabled={loading} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: "0 0 14px 0", padding: mob ? "12px 14px" : "12px 22px", fontSize: mob ? 13 : 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", height: 44, whiteSpace: "nowrap" }}>Search</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {QUICK_ROLES.map(role => (<button key={role} onClick={() => { const v = role === "All Jobs" ? "" : role; setQ(v); doSearch(v, loc) }} style={pillStyle((role === "All Jobs" && !q) || q === role)}>{role}</button>))}
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
          {[{ label: "Fresher friendly only", val: fresherOnly, set: () => { setFresherOnly(v => !v); setTimeout(() => doSearch(q, loc), 50) }, color: "#FF6B35" }, { label: "Verified sponsors only", val: verifiedOnly, set: () => { setVerifiedOnly(v => !v); setTimeout(() => doSearch(q, loc), 50) }, color: "#00D68F" }].map(t => (
            <div key={t.label} onClick={t.set} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: t.val ? t.color : "#E8EEFF", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: t.val ? 15 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 12, color: t.val ? t.color : "#4B5675", fontWeight: 600 }}>{t.label}</span>
            </div>
          ))}
        </div>
        {showFilters && (
          <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 14, padding: mob ? "14px" : "18px 22px", marginBottom: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Contract</div><div style={{ display: "flex", gap: 6 }}>{["Full-time","Part-time","Contract"].map(v => <button key={v} onClick={() => setFilter("jobType", v)} style={fpill(filters.jobType === v)}>{v}</button>)}</div></div>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Sort</div><div style={{ display: "flex", gap: 6 }}>{["Score","Date","Salary"].map(v => <button key={v} onClick={() => setFilter("sortBy", v)} style={fpill(filters.sortBy === v)}>{v}</button>)}</div></div>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Source</div><div style={{ display: "flex", gap: 6 }}>{["Reed","Adzuna"].map(v => <button key={v} onClick={() => setFilter("source", v)} style={fpill(filters.source === v)}>{v}</button>)}</div></div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#9CA3B8", whiteSpace: "nowrap" }}>Salary</span>
              <input value={filters.salaryMin} onChange={e => setFilter("salaryMin", e.target.value)} placeholder="Min e.g. 25000" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontFamily: "inherit", outline: "none", background: "#F8FAFF", color: "#0A0F1E" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              <span style={{ color: "#9CA3B8", fontSize: 12 }}>to</span>
              <input value={filters.salaryMax} onChange={e => setFilter("salaryMax", e.target.value)} placeholder="Max e.g. 80000" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontFamily: "inherit", outline: "none", background: "#F8FAFF", color: "#0A0F1E" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              {activeCount > 0 && <button onClick={() => setFilters({ salaryMin: "", salaryMax: "", jobType: "", source: "", sortBy: "Score" })} style={{ background: "none", border: "none", color: "#4B5675", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>Clear all</button>}
            </div>
          </div>
        )}
        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#DC2626", fontSize: 13 }}>{error}</div>}
        {allJobs.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {[{ label: "Total Jobs", value: allJobs.length, color: "#0057FF" }, { label: "Gov Verified", value: stats.verified, color: "#00D68F" }, { label: "Fresher", value: stats.fresher, color: "#FF6B35" }].map(s => (
              <div key={s.label} style={{ background: "#fff", border: "1px solid " + s.color + "20", borderRadius: 10, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: mob ? 15 : 17, fontWeight: 900, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 10, color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
        {loading && allJobs.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(5)].map((_, i) => (<div key={i} style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1px solid #E8EEFF", opacity: 1 - i * 0.15 }}><div style={{ height: 14, background: "#F0F0F0", borderRadius: 4, width: (55 + i * 8) + "%", marginBottom: 10 }} /><div style={{ height: 11, background: "#F0F0F0", borderRadius: 4, width: "35%" }} /></div>))}
          </div>
        )}
        {pageJobs.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: "#4B5675" }}>Showing {((currentPage - 1) * JOBS_PER_PAGE) + 1}-{Math.min(currentPage * JOBS_PER_PAGE, allJobs.length)} of {allJobs.length} verified jobs</div>
              {loading && <span style={{ fontSize: 12, color: "#0057FF", fontWeight: 600 }}>Loading more...</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: mob ? 10 : 12 }}>
              {pageJobs.map(job => <JobCard key={job.id} job={job} onSave={handleSave} saved={savedJobs.has(job.id)} navigate={navigate} mob={mob} />)}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goPage} mob={mob} />
          </>
        )}
        {searched && allJobs.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "48px 20px", background: "#fff", borderRadius: 20, border: "1px solid #E8EEFF" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>No results found</div>
            <div style={{ fontSize: 13, color: "#4B5675", marginBottom: 16 }}>Try a broader search or remove filters</div>
            <button onClick={() => { setQ(""); setLoc(""); setVerifiedOnly(false); setFresherOnly(false); doSearch("", "") }} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Show All Sponsored Jobs</button>
          </div>
        )}
      </div>
    </div>
  )
}
