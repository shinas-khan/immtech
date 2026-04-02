import { useState, useCallback, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ALL_JOBS, ALL_LOCATIONS, smartSearch } from "../lib/constants"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

const ADZUNA_ID = "344e86d1"
const ADZUNA_KEY = "039c47ae80bab92aef99751a471040fb"

const FRESHER_KW = ["graduate","entry level","junior","trainee","apprentice","no experience","fresh graduate","new graduate","grad scheme","graduate scheme","placement","internship"]
const NEG_KW = ["must have right to work","no sponsorship","sponsorship not available","cannot sponsor","uk residents only","british nationals only","no visa sponsorship","must be eligible to work in the uk without sponsorship"]
const VISA_KW = ["visa sponsorship","sponsor visa","certificate of sponsorship","cos provided","skilled worker visa","tier 2","ukvi","sponsorship available","will sponsor","sponsorship provided","visa support","sponsorship considered","open to sponsorship","visa provided","relocation package","international applicants"]

const ALL_ROLES = ["All Jobs", ...ALL_JOBS]
const ALL_LOCS = ["Anywhere in UK", ...ALL_LOCATIONS]
const QUICK_ROLES = ["All Jobs","Software Engineer","Registered Nurse","Data Analyst","Cyber Security Analyst","Civil Engineer","Pharmacist","Data Scientist","Accountant","Physiotherapist","Social Worker","DevOps Engineer"]

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
    const { data: exact } = await supabase.from("sponsors").select("organisation_name, town, route, rating").ilike("organisation_name", employerName).limit(1)
    if (exact?.[0]) return exact[0]
    const { data: contains } = await supabase.from("sponsors").select("organisation_name, town, route, rating").ilike("organisation_name", `%${clean}%`).limit(1)
    if (contains?.[0]) return contains[0]
    const firstWord = clean.split(" ")[0]
    if (firstWord.length >= 4) {
      const { data: partial } = await supabase.from("sponsors").select("organisation_name, town, route, rating").ilike("organisation_name", `${firstWord}%`).limit(1)
      if (partial?.[0]) return partial[0]
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
  const text = `${job.title} ${job.description} ${job.employer}`.toLowerCase()
  let score = 0; let signals = []; let fresherFriendly = false
  for (const neg of NEG_KW) { if (text.includes(neg)) return { score: -1, signals: [], fresherFriendly: false, verified: false } }
  if (sponsorData) {
    score += 55
    signals.push({ type: "verified", label: "Gov Verified" })
    if (sponsorData.rating === "A") { score += 10; signals.push({ type: "rating", label: "A-Rated" }) }
  }
  let visaFound = 0
  for (const kw of VISA_KW) {
    if (text.includes(kw) && visaFound < 2) { score += 12; signals.push({ type: "visa", label: kw }); visaFound++ }
  }
  for (const kw of FRESHER_KW) { if (text.includes(kw)) { fresherFriendly = true; break } }
  if (job.salary_min || job.salary_max) { score += 5; signals.push({ type: "salary", label: "Salary shown" }) }
  return {
    score: Math.min(100, Math.max(0, score)),
    signals: [...new Map(signals.map(s => [s.label, s])).values()].slice(0, 4),
    fresherFriendly,
    verified: !!sponsorData
  }
}

async function fetchAdzuna(q, loc, page) {
  const what = q ? `${q} visa sponsorship` : "visa sponsorship uk jobs"
  const where = loc && loc !== "Anywhere in UK" ? loc : "UK"
  const params = new URLSearchParams({ app_id: ADZUNA_ID, app_key: ADZUNA_KEY, what, where, results_per_page: 20 })
  const r = await fetch(`https://api.adzuna.com/v1/api/jobs/gb/search/${page}?${params}`)
  if (!r.ok) throw new Error(`Adzuna ${r.status}`)
  const data = await r.json()
  return (data.results || []).map(j => ({
    id: `adzuna_${j.id}`, source: "Adzuna",
    title: j.title || "", employer: j.company?.display_name || "Unknown",
    location: j.location?.display_name || "UK",
    salary_min: j.salary_min, salary_max: j.salary_max,
    description: j.description || "", url: j.redirect_url || "#",
    posted: j.created, full_time: j.contract_time === "full_time",
  }))
}

async function fetchReed(q, loc, page) {
  const keywords = q ? `${q} visa sponsorship` : "visa sponsorship"
  const locationName = loc && loc !== "Anywhere in UK" ? loc : "United Kingdom"
  const params = new URLSearchParams({ keywords, locationName, resultsToTake: 20, resultsToSkip: (page - 1) * 20 })
  const r = await fetch(`https://uk-visa-jobs-six.vercel.app/api/reed?${params}`)
  if (!r.ok) throw new Error(`Reed ${r.status}`)
  const data = await r.json()
  return (data.results || []).map(j => ({
    id: `reed_${j.jobId}`, source: "Reed",
    title: j.jobTitle || "", employer: j.employerName || "Unknown",
    location: j.locationName || "",
    salary_min: j.minimumSalary, salary_max: j.maximumSalary,
    description: j.jobDescription || "", url: j.jobUrl || "#",
    posted: j.date, full_time: j.fullTime,
  }))
}

function JobCard({ job, onSave, saved, navigate, mob }) {

  const [careersUrl, setCareersUrl] = useState(null)
  const [loadingCareers, setLoadingCareers] = useState(false)

  // Fetch direct careers page for this employer
  useEffect(() => {
    if (!job.employer || job.employer === "Unknown") return
    setLoadingCareers(true)
    fetch(`/api/employer-careers?employer=${encodeURIComponent(job.employer)}`)
      .then(r => r.json())
      .then(data => { if (data.found) setCareersUrl(data.url) })
      .catch(() => {})
      .finally(() => setLoadingCareers(false))
  }, [job.employer])


  const [expanded, setExpanded] = useState(false)
  const salary = job.salary_min || job.salary_max
    ? `GBP ${(job.salary_min || 0).toLocaleString()}${job.salary_max ? ` - GBP ${job.salary_max.toLocaleString()}` : "+"}`
    : null
  const posted = job.posted
    ? new Date(job.posted).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : ""
  const scoreColor = job.verified ? "#00D68F" : job.score >= 60 ? "#0057FF" : job.score >= 30 ? "#FF6B35" : "#9CA3B8"
  const scoreLabel = job.verified ? "Verified" : job.score >= 60 ? "Very Likely" : job.score >= 30 ? "Likely" : "Possible"

  return (
    <div style={{
      background: "#fff",
      border: `1.5px solid ${job.verified ? "#00D68F35" : "#E8EEFF"}`,
      borderRadius: 16,
      padding: mob ? "14px" : "20px 24px",
      transition: "all 0.2s",
      position: "relative",
    }}
      onMouseEnter={e => { if (!mob) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,57,255,0.07)" } }}
      onMouseLeave={e => { if (!mob) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" } }}
    >
      {job.verified && (
        <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #00D68F, #00A67E)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 10px", borderRadius: "0 16px 0 8px", letterSpacing: 0.5 }}>
          UK GOV VERIFIED
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start", marginTop: job.verified ? 8 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ background: job.source === "Reed" ? "#e8534215" : "#7c4dff15", color: job.source === "Reed" ? "#e85342" : "#7c4dff", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>
              {job.source}
            </span>
            {job.fresherFriendly && (
              <span style={{ background: "#00D68F15", color: "#00D68F", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>
                Fresher Friendly
              </span>
            )}
            {job.sponsorInfo?.town && (
              <span style={{ background: "#0057FF08", color: "#0057FF", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>
                {job.sponsorInfo.town}
              </span>
            )}
          </div>
          <h3 style={{ fontSize: mob ? 14 : 15, fontWeight: 800, color: "#0A0F1E", margin: "0 0 3px", lineHeight: 1.3 }}>
            {job.title}
          </h3>
          <div style={{ color: "#4B5675", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {job.employer} - {job.location}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
          <div style={{ background: `${scoreColor}15`, border: `1px solid ${scoreColor}40`, borderRadius: 20, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: scoreColor, whiteSpace: "nowrap" }}>
            {scoreLabel} {job.score}%
          </div>
          <button onClick={() => onSave(job)} style={{ background: saved ? "#0057FF10" : "none", border: `1px solid ${saved ? "#0057FF" : "#E8EEFF"}`, color: saved ? "#0057FF" : "#9CA3B8", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 7, fontSize: 11, color: "#4B5675", flexWrap: "wrap" }}>
        {salary && <span>{salary}</span>}
        {posted && <span>Posted {posted}</span>}
        {job.sponsorInfo?.route && <span>{job.sponsorInfo.route.split(":")[0]}</span>}
      </div>

      {job.signals?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {job.signals.map((s, i) => {
            const cols = { verified: "#00D68F", rating: "#00D68F", visa: "#0057FF", salary: "#FF6B35" }
            return (
              <span key={i} style={{ background: `${cols[s.type] || "#888"}12`, color: cols[s.type] || "#888", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 600 }}>
                {s.label}
              </span>
            )
          })}
        </div>
      )}

      {job.description && (
        <>
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: "#0057FF", fontSize: 11, cursor: "pointer", marginTop: 6, padding: 0, fontFamily: "inherit" }}>
            {expanded ? "Hide description" : "Show description"}
          </button>
          {expanded && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#4B5675", lineHeight: 1.7, borderTop: "1px solid #E8EEFF", paddingTop: 8, maxHeight: 150, overflow: "auto" }}>
              {job.description.replace(/<[^>]*>/g, "").slice(0, 500)}
              {job.description.length > 500 ? "..." : ""}
            </p>
          )}
        </>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center", minWidth: 80 }}>
          Apply via {job.source}
        </a>
        {careersUrl && (
          <a href={careersUrl} target="_blank" rel="noopener noreferrer" style={{ background: "#00D68F", color: "#fff", borderRadius: 8, padding: "9px 12px", fontSize: 11, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            Direct Careers Page
          </a>
        )}
        {job.sponsorInfo && (
          <button onClick={() => navigate(`/employer/${encodeURIComponent(job.employer)}`)} style={{ background: "#F0F5FF", border: "1px solid #0057FF20", color: "#0057FF", borderRadius: 8, padding: "9px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Profile
          </button>
        )}
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
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)
  const [page, setPage] = useState(1)
  const [savedJobs, setSavedJobs] = useState(new Set())
  const [hasMore, setHasMore] = useState(true)
  const searchTimeout = useRef(null)
  const navigate = useNavigate()
  const w = useW()
  const mob = w < 768

  const activeCount = Object.values(filters).filter(v => v !== "" && v !== "Score").length
  const filteredRoles = q.length > 0 ? ALL_ROLES.filter(r => r.toLowerCase().includes(q.toLowerCase())) : ALL_ROLES
  const filteredLocs = loc.length > 0 ? ALL_LOCS.filter(l => l.toLowerCase().includes(loc.toLowerCase())) : ALL_LOCS

  // Load all jobs on mount
  useEffect(() => { doSearch(1, "", "") }, [])

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: f[k] === v ? "" : v }))

  const handleSave = async (job) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate("/auth"); return }
    if (savedJobs.has(job.id)) return
    await supabase.from("saved_jobs").insert({
      user_id: user.id, job_id: job.id, job_title: job.title,
      employer: job.employer, location: job.location,
      salary_min: job.salary_min, salary_max: job.salary_max,
      job_url: job.url, source: job.source, sponsorship_score: job.score,
    })
    setSavedJobs(s => new Set([...s, job.id]))
  }

  const doSearch = useCallback(async (p, searchQ, searchLoc) => {
    setLoading(true); setError(""); setPage(p)
    try {
      const cleanLoc = searchLoc && searchLoc !== "Anywhere in UK" ? searchLoc : ""
      let allJobs = []
      const [reedRes, adzunaRes] = await Promise.allSettled([
        fetchReed(searchQ, cleanLoc, p),
        fetchAdzuna(searchQ, cleanLoc, p),
      ])
      if (reedRes.status === "fulfilled") allJobs.push(...reedRes.value)
      if (adzunaRes.status === "fulfilled") allJobs.push(...adzunaRes.value)

      if (allJobs.length === 0 && p === 1) {
        setError("No results found. Try a different search.")
        setLoading(false)
        return
      }

      // Deduplicate
      const seen = new Set()
      allJobs = allJobs.filter(j => {
        const key = `${j.title.toLowerCase().slice(0, 30)}|${j.employer.toLowerCase()}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Verify sponsors
      const sponsorMap = await batchCheckSponsors(allJobs.map(j => j.employer))

      // Score
      let scored = allJobs.map(j => {
        const sponsorInfo = sponsorMap[j.employer]
        const { score, signals, fresherFriendly, verified } = scoreJob(j, sponsorInfo)
        return { ...j, score, signals, fresherFriendly, verified, sponsorInfo }
      }).filter(j => j.score >= 0)

      // Filters
      if (fresherOnly) scored = scored.filter(j => j.fresherFriendly)
      if (verifiedOnly) scored = scored.filter(j => j.verified)
      if (filters.jobType === "Full-time") scored = scored.filter(j => j.full_time === true)
      if (filters.jobType === "Part-time") scored = scored.filter(j => j.full_time === false)
      if (filters.salaryMin) scored = scored.filter(j => (j.salary_min || 0) >= parseInt(filters.salaryMin))
      if (filters.salaryMax) scored = scored.filter(j => (j.salary_max || 999999) <= parseInt(filters.salaryMax))
      if (filters.source === "Reed") scored = scored.filter(j => j.source === "Reed")
      if (filters.source === "Adzuna") scored = scored.filter(j => j.source === "Adzuna")

      // Sort - verified first, then by score
      scored.sort((a, b) => {
        if (a.verified && !b.verified) return -1
        if (!a.verified && b.verified) return 1
        if (filters.sortBy === "Salary") return (b.salary_min || 0) - (a.salary_min || 0)
        if (filters.sortBy === "Date") return new Date(b.posted || 0) - new Date(a.posted || 0)
        return b.score - a.score
      })

      setJobs(p === 1 ? scored : prev => [...prev, ...scored])
      setSearched(true)
      setHasMore(scored.length >= 15)
    } catch (err) {
      setError("Search failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [fresherOnly, verifiedOnly, filters])

  const pillStyle = (active) => ({
    padding: "5px 11px", borderRadius: 100, fontSize: mob ? 11 : 12, fontWeight: 600,
    cursor: "pointer", border: `1.5px solid ${active ? "#0057FF" : "#E8EEFF"}`,
    background: active ? "#0057FF0D" : "#fff", color: active ? "#0057FF" : "#4B5675",
    transition: "all 0.15s", fontFamily: "inherit", whiteSpace: "nowrap",
  })

  const filterPillStyle = (active) => ({
    padding: "6px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: `1.5px solid ${active ? "#0057FF" : "#E8EEFF"}`,
    background: active ? "#0057FF0D" : "#F8FAFF", color: active ? "#0057FF" : "#4B5675",
    transition: "all 0.15s", fontFamily: "inherit",
  })

  const dropStyle = {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
    background: "#fff", borderRadius: 14, border: "1px solid #E8EEFF",
    boxShadow: "0 16px 48px rgba(0,57,255,0.1)",
    maxHeight: 360, overflowY: "auto", zIndex: 300,
  }

  const stats = {
    total: jobs.length,
    verified: jobs.filter(j => j.verified).length,
    fresher: jobs.filter(j => j.fresherFriendly).length,
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: mob ? "82px 4% 40px" : "96px 5% 60px" }}>

        {/* Page header */}
        <div style={{ marginBottom: mob ? 14 : 20 }}>
          <h1 style={{ fontSize: mob ? 20 : 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 4px", letterSpacing: -0.8 }}>
            Find UK Visa Sponsored Jobs
          </h1>
          <p style={{ color: "#4B5675", fontSize: mob ? 12 : 14, margin: 0 }}>
            125,284 verified UK Home Office licensed sponsors - Verified results shown first
          </p>
        </div>

        {/* Search box */}
        <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 16, marginBottom: 10, boxShadow: "0 4px 24px rgba(0,57,255,0.06)", position: "relative", zIndex: 20 }}>

          {/* Job role search */}
          <div style={{ position: "relative", borderBottom: "1px solid #E8EEFF" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3B8", fontSize: 14, pointerEvents: "none" }}>Search</span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onFocus={() => { setShowQ(true); setShowL(false) }}
              onBlur={() => setTimeout(() => setShowQ(false), 200)}
              onKeyDown={e => { if (e.key === "Enter") { doSearch(1, q, loc); setShowQ(false) } }}
              placeholder="Job title or keyword - or leave empty to see all jobs"
              style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: mob ? "14px 80px 14px 70px" : "14px 90px 14px 72px", fontSize: mob ? 14 : 15, color: "#0A0F1E", fontFamily: "inherit" }}
            />
            {q && (
              <button onClick={() => { setQ(""); doSearch(1, "", loc); setShowQ(false) }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#4B5675", cursor: "pointer", fontFamily: "inherit" }}>
                Clear
              </button>
            )}
            {showQ && (
              <div style={dropStyle}>
                <div style={{ padding: "10px 14px 8px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #F8FAFF" }}>
                  {q ? `${filteredRoles.length} matching roles` : `All ${ALL_ROLES.length - 1} roles`}
                </div>
                {filteredRoles.map(role => (
                  <div key={role}
                    onMouseDown={() => { setQ(role === "All Jobs" ? "" : role); doSearch(1, role === "All Jobs" ? "" : role, loc); setShowQ(false) }}
                    style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: role === "All Jobs" ? "#0057FF" : "#0A0F1E", fontWeight: role === "All Jobs" ? 700 : 400, background: role === "All Jobs" ? "#F0F5FF" : "transparent", borderBottom: "1px solid rgba(232,238,255,0.4)" }}
                    onMouseEnter={e => e.currentTarget.style.background = role === "All Jobs" ? "#E8F0FF" : "#F8FAFF"}
                    onMouseLeave={e => e.currentTarget.style.background = role === "All Jobs" ? "#F0F5FF" : "transparent"}
                  >
                    {role === "All Jobs" ? "*  " : ""}{role}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location + filters + search button */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9CA3B8", fontSize: 12, pointerEvents: "none" }}>Location</span>
              <input
                value={loc}
                onChange={e => setLoc(e.target.value)}
                onFocus={() => { setShowL(true); setShowQ(false) }}
                onBlur={() => setTimeout(() => setShowL(false), 200)}
                onKeyDown={e => { if (e.key === "Enter") { doSearch(1, q, loc); setShowL(false) } }}
                placeholder="Any UK city or remote..."
                style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: "12px 12px 12px 72px", fontSize: 13, color: "#0A0F1E", fontFamily: "inherit" }}
              />
              {showL && (
                <div style={dropStyle}>
                  <div style={{ padding: "10px 14px 8px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #F8FAFF" }}>
                    {loc ? `${filteredLocs.length} locations` : `All ${ALL_LOCS.length - 1} UK cities`}
                  </div>
                  {filteredLocs.map(city => (
                    <div key={city}
                      onMouseDown={() => { setLoc(city === "Anywhere in UK" ? "" : city); doSearch(1, q, city === "Anywhere in UK" ? "" : city); setShowL(false) }}
                      style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: city === "Anywhere in UK" ? "#0057FF" : "#0A0F1E", fontWeight: city === "Anywhere in UK" ? 700 : 400, background: city === "Anywhere in UK" ? "#F0F5FF" : "transparent", borderBottom: "1px solid rgba(232,238,255,0.4)" }}
                      onMouseEnter={e => e.currentTarget.style.background = city === "Anywhere in UK" ? "#E8F0FF" : "#F8FAFF"}
                      onMouseLeave={e => e.currentTarget.style.background = city === "Anywhere in UK" ? "#F0F5FF" : "transparent"}
                    >
                      {city === "Anywhere in UK" ? "*  " : ""}{city}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ width: 1, height: 32, background: "#E8EEFF", flexShrink: 0 }} />

            <button onClick={() => setShowFilters(f => !f)} style={{ background: "none", border: "none", color: showFilters ? "#0057FF" : "#4B5675", padding: "0 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, height: 44, whiteSpace: "nowrap" }}>
              Filters {activeCount > 0 && (
                <span style={{ background: "#0057FF", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {activeCount}
                </span>
              )}
            </button>

            <button onClick={() => { doSearch(1, q, loc); setShowQ(false); setShowL(false) }} disabled={loading} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: "0 0 14px 0", padding: mob ? "12px 14px" : "12px 22px", fontSize: mob ? 13 : 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", height: 44, whiteSpace: "nowrap" }}>
              Search
            </button>
          </div>
        </div>

        {/* Quick role pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {QUICK_ROLES.map(role => (
            <button key={role} onClick={() => { const v = role === "All Jobs" ? "" : role; setQ(v); doSearch(1, v, loc) }} style={pillStyle((role === "All Jobs" && !q) || q === role)}>
              {role}
            </button>
          ))}
        </div>

        {/* Toggle switches */}
        <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
          {[
            { label: "Fresher friendly only", val: fresherOnly, set: () => { setFresherOnly(v => !v); setTimeout(() => doSearch(1, q, loc), 50) }, color: "#FF6B35" },
            { label: "Verified sponsors only", val: verifiedOnly, set: () => { setVerifiedOnly(v => !v); setTimeout(() => doSearch(1, q, loc), 50) }, color: "#00D68F" },
          ].map(t => (
            <div key={t.label} onClick={t.set} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: t.val ? t.color : "#E8EEFF", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: t.val ? 15 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 12, color: t.val ? t.color : "#4B5675", fontWeight: 600 }}>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 14, padding: mob ? "14px" : "18px 22px", marginBottom: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Contract Type</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Full-time", "Part-time", "Contract"].map(v => (
                    <button key={v} onClick={() => setFilter("jobType", v)} style={filterPillStyle(filters.jobType === v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Sort By</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Score", "Date", "Salary"].map(v => (
                    <button key={v} onClick={() => setFilter("sortBy", v)} style={filterPillStyle(filters.sortBy === v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Source</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Reed", "Adzuna"].map(v => (
                    <button key={v} onClick={() => setFilter("source", v)} style={filterPillStyle(filters.source === v)}>{v}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#9CA3B8", whiteSpace: "nowrap" }}>Salary GBP </span>
              <input value={filters.salaryMin} onChange={e => setFilter("salaryMin", e.target.value)} placeholder="Min e.g. 25000" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              <span style={{ color: "#9CA3B8", fontSize: 12 }}>to</span>
              <input value={filters.salaryMax} onChange={e => setFilter("salaryMax", e.target.value)} placeholder="Max e.g. 80000" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              {activeCount > 0 && (
                <button onClick={() => setFilters({ salaryMin: "", salaryMax: "", jobType: "", source: "", sortBy: "Score" })} style={{ background: "none", border: "none", color: "#4B5675", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#DC2626", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Stats row */}
        {jobs.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {[
              { label: "Results", value: stats.total, color: "#0057FF" },
              { label: "Gov Verified", value: stats.verified, color: "#00D68F" },
              { label: "Fresher Friendly", value: stats.fresher, color: "#FF6B35" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", border: `1px solid ${s.color}20`, borderRadius: 10, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: mob ? 16 : 18, fontWeight: 900, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 10, color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && jobs.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1px solid #E8EEFF", opacity: 1 - i * 0.15 }}>
                <div style={{ height: 14, background: "#F0F0F0", borderRadius: 4, width: `${55 + i * 8}%`, marginBottom: 10 }} />
                <div style={{ height: 11, background: "#F0F0F0", borderRadius: 4, width: "35%" }} />
              </div>
            ))}
          </div>
        )}

        {/* Job results list */}
        {jobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: mob ? 10 : 12 }}>
            {jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onSave={handleSave}
                saved={savedJobs.has(job.id)}
                navigate={navigate}
                mob={mob}
              />
            ))}
            {hasMore && (
              <button onClick={() => doSearch(page + 1, q, loc)} disabled={loading} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 12, padding: "14px", color: "#4B5675", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
                {loading ? "Loading..." : "Load more results"}
              </button>
            )}
          </div>
        )}

        {/* No results */}
        {searched && jobs.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "48px 20px", background: "#fff", borderRadius: 20, border: "1px solid #E8EEFF" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>?</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>No results found</div>
            <div style={{ fontSize: 13, color: "#4B5675", marginBottom: 16 }}>Try a broader search or remove filters</div>
            <button onClick={() => { setQ(""); setLoc(""); setVerifiedOnly(false); setFresherOnly(false); doSearch(1, "", "") }} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Show All Sponsored Jobs
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
