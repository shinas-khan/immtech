import { useState, useCallback, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { C, ALL_JOBS, ALL_LOCATIONS, smartSearch } from "../lib/constants"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

const ADZUNA_ID = "344e86d1"
const ADZUNA_KEY = "039c47ae80bab92aef99751a471040fb"

// ─── STRICT negative phrases — any match = DISCARD job immediately ───────────
const HARD_NEGATIVES = [
  "right to work in the uk",
  "right to work in uk",
  "must have right to work",
  "must be eligible to work in the uk",
  "you must have the right to work",
  "applicants must have the right to work",
  "no sponsorship",
  "sponsorship not available",
  "sponsorship is not available",
  "we are unable to offer sponsorship",
  "unable to offer visa sponsorship",
  "cannot offer sponsorship",
  "cannot offer visa sponsorship",
  "we cannot sponsor",
  "we are not able to sponsor",
  "not able to offer sponsorship",
  "not eligible for sponsorship",
  "this post will not be open for sponsorship",
  "this role will not be open for sponsorship",
  "not open for sponsorship under ukvi",
  "ukvi sponsorship is not available",
  "does not offer visa sponsorship",
  "do not offer visa sponsorship",
  "sponsorship under the skilled worker",
  "unfortunately we cannot offer",
  "uk residents only",
  "british nationals only",
  "must already have the right to work",
  "existing right to work",
  "no visa support",
  "visa support not available",
  "not a licensed sponsor",
  "not a registered sponsor",
  "indefinite leave to remain required",
  "settled status required",
  "pre-settled status required",
]

// ─── STRONG positive phrases — any match = high confidence sponsored ─────────
const STRONG_POSITIVES = [
  "visa sponsorship available",
  "visa sponsorship provided",
  "visa sponsorship offered",
  "sponsorship available",
  "we can offer sponsorship",
  "we are able to sponsor",
  "we will sponsor",
  "certificate of sponsorship",
  "certificate of sponsorship provided",
  "cos provided",
  "skilled worker visa sponsorship",
  "tier 2 sponsorship",
  "tier 2 visa",
  "ukvi sponsorship",
  "sponsorship for the right candidate",
  "sponsorship considered",
  "international candidates welcome",
  "relocation package available",
  "global talent visa",
  "health and care visa",
  "health & care visa",
]

// ─── FRESHER keywords ─────────────────────────────────────────────────────────
const FRESHER_KW = [
  "graduate scheme", "grad scheme", "graduate programme", "graduate program",
  "entry level", "entry-level", "junior", "trainee", "apprentice", "apprenticeship",
  "no experience required", "fresh graduate", "recently graduated", "new graduate",
  "placement year", "internship", "associate level", "school leaver",
]

// ─── Well-known UK visa sponsors (extra boost if employer matches) ────────────
const KNOWN_SPONSORS = [
  "amazon", "google", "microsoft", "meta", "apple", "ibm", "accenture",
  "deloitte", "pwc", "kpmg", "ey", "ernst young", "capgemini", "infosys",
  "tata consultancy", "wipro", "cognizant", "hcl", "nhs", "barclays", "hsbc",
  "lloyds", "natwest", "jpmorgan", "jp morgan", "goldman sachs", "morgan stanley",
  "astrazeneca", "gsk", "pfizer", "siemens", "rolls royce", "bae systems",
  "vodafone", "bt group", "bt plc", "samsung", "oracle", "salesforce", "sap",
  "cisco", "intel", "nvidia", "adobe", "uber", "spotify", "booking.com",
  "deliveroo", "revolut", "monzo", "octopus energy", "arm holdings",
]

// ─── Verify employer against Supabase sponsor register ───────────────────────
async function checkSponsor(employerName) {
  if (!employerName || employerName === "Unknown") return null
  try {
    const clean = employerName
      .replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co|corp|solutions|services|consulting)\.?$/gi, "")
      .trim()
    if (clean.length < 3) return null
    const { data } = await supabase
      .from("sponsors")
      .select("organisation_name, town, route, rating")
      .ilike("organisation_name", `%${clean}%`)
      .limit(1)
    return data?.[0] || null
  } catch { return null }
}

async function batchCheckSponsors(employers) {
  const unique = [...new Set(employers.filter(e => e && e !== "Unknown"))]
  const results = {}
  // Process in batches of 10 to avoid rate limits
  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10)
    await Promise.all(batch.map(async emp => { results[emp] = await checkSponsor(emp) }))
  }
  return results
}

// ─── Core scoring function ────────────────────────────────────────────────────
function scoreJob(job, sponsorData) {
  const text = `${job.title} ${job.description} ${job.employer}`.toLowerCase()
  let score = 0
  let signals = []
  let fresherFriendly = false
  let hardReject = false

  // HARD NEGATIVE CHECK — immediate discard
  for (const neg of HARD_NEGATIVES) {
    if (text.includes(neg)) {
      hardReject = true
      break
    }
  }
  if (hardReject) return { score: -1, signals: [], fresherFriendly: false, verified: false, hardReject: true }

  // UK GOV REGISTER VERIFIED — strongest signal
  if (sponsorData) {
    score += 55
    signals.push({ type: "verified", label: "✓ UK Gov Verified Sponsor" })
    if (sponsorData.rating === "A") {
      score += 10
      signals.push({ type: "rating", label: "A-Rated Licence" })
    }
  }

  // STRONG positive phrases in description
  let posCount = 0
  for (const pos of STRONG_POSITIVES) {
    if (text.includes(pos)) {
      posCount++
      score += 12
      if (posCount === 1) signals.push({ type: "visa", label: pos })
      if (posCount >= 3) break
    }
  }

  // Known major sponsor employers
  const isKnownSponsor = KNOWN_SPONSORS.some(s => text.includes(s))
  if (isKnownSponsor && !sponsorData) {
    score += 20
    signals.push({ type: "known", label: "Known sponsor employer" })
  }

  // Salary disclosed — good sign of legitimate role
  if (job.salary_min || job.salary_max) {
    score += 5
    signals.push({ type: "salary", label: "Salary disclosed" })
  }

  // Fresher detection
  for (const kw of FRESHER_KW) {
    if (text.includes(kw)) {
      fresherFriendly = true
      break
    }
  }

  // If NO positive signals at all and NOT verified — low score but don't discard
  // (some sponsored jobs don't explicitly mention it in the description)
  if (posCount === 0 && !sponsorData && !isKnownSponsor) {
    score = Math.max(0, score - 10)
  }

  const uniqueSignals = [...new Map(signals.map(s => [s.label, s])).values()].slice(0, 4)
  return {
    score: Math.min(100, Math.max(0, score)),
    signals: uniqueSignals,
    fresherFriendly,
    verified: !!sponsorData,
    hardReject: false,
  }
}

// ─── API fetchers ─────────────────────────────────────────────────────────────
async function fetchAdzuna(q, loc, page) {
  const params = new URLSearchParams({
    app_id: ADZUNA_ID, app_key: ADZUNA_KEY,
    what: q ? `${q} visa sponsorship` : "visa sponsorship",
    where: loc || "UK",
    results_per_page: 20,
  })
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
  const params = new URLSearchParams({
    keywords: q ? `${q} visa sponsorship` : "visa sponsorship",
    locationName: loc || "United Kingdom",
    resultsToTake: 20,
    resultsToSkip: (page - 1) * 20,
  })
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
    employerUrl: j.employerProfileUrl || null,
  }))
}

// ─── Employer career page finder ──────────────────────────────────────────────
function getEmployerCareerUrl(employerName) {
  if (!employerName || employerName === "Unknown") return null
  const clean = employerName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim()
  const domain = clean.replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co|corp)$/g, "").trim().replace(/\s+/g, "")

  // Known career page patterns for major sponsors
  const known = {
    "amazon": "https://www.amazon.jobs/en-gb",
    "google": "https://careers.google.com",
    "microsoft": "https://careers.microsoft.com/v2/global/en/uk.html",
    "nhs": "https://www.jobs.nhs.uk",
    "deloitte": "https://www2.deloitte.com/uk/en/careers.html",
    "pwc": "https://www.pwc.co.uk/careers.html",
    "kpmg": "https://www.kpmgcareers.co.uk",
    "accenture": "https://www.accenture.com/gb-en/careers",
    "meta": "https://www.metacareers.com",
    "apple": "https://www.apple.com/uk/jobs/uk/",
    "barclays": "https://home.barclays/careers/",
    "hsbc": "https://www.hsbc.com/careers",
    "vodafone": "https://careers.vodafone.com/uk",
    "bt": "https://careers.bt.com",
    "ibm": "https://www.ibm.com/uk-en/employment/",
    "capgemini": "https://www.capgemini.com/gb-en/careers/",
    "infosys": "https://www.infosys.com/careers/apply.html",
    "astrazeneca": "https://careers.astrazeneca.com",
    "gsk": "https://www.gsk.com/en-gb/careers/",
    "rolls royce": "https://careers.rolls-royce.com",
    "siemens": "https://new.siemens.com/uk/en/company/jobs.html",
  }

  for (const [key, url] of Object.entries(known)) {
    if (clean.includes(key)) return url
  }

  // Generic fallback — Google search for their careers page
  return `https://www.google.com/search?q=${encodeURIComponent(employerName + " careers jobs visa sponsorship UK")}`
}

// ─── Job Card Component ───────────────────────────────────────────────────────
function JobCard({ job, onSave, saved, navigate }) {
  const [expanded, setExpanded] = useState(false)
  const salary = job.salary_min || job.salary_max
    ? `£${job.salary_min?.toLocaleString() || "?"}${job.salary_max ? ` – £${job.salary_max.toLocaleString()}` : "+"}`
    : "Salary not disclosed"
  const posted = job.posted
    ? new Date(job.posted).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : ""
  const color = job.verified ? "#00D68F" : job.score >= 60 ? "#0057FF" : job.score >= 30 ? "#FF6B35" : "#9CA3B8"
  const careerUrl = getEmployerCareerUrl(job.employer)

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${job.verified ? "#00D68F40" : "#E8EEFF"}`, borderRadius: 16, padding: "20px 22px", transition: "all 0.2s", position: "relative" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${job.verified ? "#00D68F12" : "rgba(0,57,255,0.07)"}` }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" }}
    >
      {/* Verified banner */}
      {job.verified && (
        <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #00D68F, #00A67E)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 12px", borderRadius: "0 16px 0 8px", letterSpacing: 0.5 }}>
          ✓ UK HOME OFFICE VERIFIED
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginTop: job.verified ? 10 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
            <span style={{ background: job.source === "Reed" ? "#e8534218" : "#7c4dff18", color: job.source === "Reed" ? "#e85342" : "#7c4dff", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{job.source}</span>
            {job.fresherFriendly && <span style={{ background: "#FF6B3515", color: "#FF6B35", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>🎓 Fresher</span>}
            {job.sponsorInfo?.route && <span style={{ background: "#0057FF08", color: "#0057FF", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>🛂 {job.sponsorInfo.route}</span>}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0A0F1E", margin: "0 0 4px", letterSpacing: -0.2, lineHeight: 1.3 }}>{job.title}</h3>
          <div style={{ color: "#4B5675", fontSize: 13 }}>{job.employer} · 📍 {job.location}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block", marginRight: 4 }} />
            {job.verified ? "Verified" : job.score >= 60 ? "Very Likely" : job.score >= 30 ? "Likely" : "Possible"} {job.score}%
          </div>
          <button onClick={() => onSave(job)} style={{ background: saved ? "#0057FF10" : "none", border: `1px solid ${saved ? "#0057FF" : "#E8EEFF"}`, color: saved ? "#0057FF" : "#9CA3B8", borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {saved ? "✓ Saved" : "🔖 Save"}
          </button>
        </div>
      </div>

      {/* Salary + meta */}
      <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12, color: "#4B5675", flexWrap: "wrap", alignItems: "center" }}>
        <span>💷 {salary}</span>
        {posted && <span>📅 {posted}</span>}
        {job.full_time !== undefined && <span>{job.full_time ? "Full-time" : "Part-time"}</span>}
        {job.sponsorInfo?.town && <span>🏙️ {job.sponsorInfo.town}</span>}
      </div>

      {/* Signals */}
      {job.signals?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {job.signals.map((s, i) => {
            const colors = { verified: "#00D68F", rating: "#00D68F", visa: "#0057FF", known: "#7C3AED", salary: "#FF6B35" }
            return (
              <span key={i} style={{ background: `${colors[s.type] || "#888"}12`, color: colors[s.type] || "#888", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>
                {s.label}
              </span>
            )
          })}
        </div>
      )}

      {/* Description toggle */}
      {job.description && (
        <>
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: "#0057FF", fontSize: 12, cursor: "pointer", marginTop: 8, padding: 0, fontFamily: "inherit" }}>
            {expanded ? "▲ Hide description" : "▼ Show description"}
          </button>
          {expanded && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#4B5675", lineHeight: 1.75, borderTop: "1px solid #E8EEFF", paddingTop: 8, maxHeight: 180, overflow: "auto" }}>
              {job.description.replace(/<[^>]*>/g, "").slice(0, 700)}
              {job.description.length > 700 ? "…" : ""}
            </p>
          )}
        </>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        {/* Apply to job listing */}
        <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", borderRadius: 9, padding: "10px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center", minWidth: 100 }}>
          Apply to Job →
        </a>

        {/* Employer careers page */}
        {careerUrl && (
          <a href={careerUrl} target="_blank" rel="noopener noreferrer" style={{ background: "#00D68F10", border: "1px solid #00D68F35", color: "#00D68F", borderRadius: 9, padding: "10px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            🏢 Careers Page
          </a>
        )}

        {/* Employer profile */}
        {job.sponsorInfo && (
          <button onClick={() => navigate(`/employer/${encodeURIComponent(job.employer)}`)} style={{ background: "#0057FF08", border: "1px solid #0057FF25", color: "#0057FF", borderRadius: 9, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            📋 Sponsor Profile
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Dropdown component ───────────────────────────────────────────────────────
function SearchDropdown({ value, placeholder, icon, options, onSelect }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const ref = useRef(null)

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])

  const filtered = filter.length > 0
    ? options.filter(o => o.toLowerCase().includes(filter.toLowerCase()))
    : options

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 16px", cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 15, color: value ? "#0A0F1E" : "#9CA3B8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || placeholder}
        </span>
        <span style={{ color: "#9CA3B8", fontSize: 11, flexShrink: 0, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▼</span>
      </div>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #0057FF35", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,57,255,0.14)", zIndex: 500, overflow: "hidden", minWidth: 260 }}>
          {/* Search inside dropdown */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #E8EEFF", background: "#fff", position: "sticky", top: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 13, color: "#9CA3B8" }}>🔍</span>
              <input
                autoFocus
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder={`Search ${placeholder.toLowerCase()}...`}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#0A0F1E", fontFamily: "inherit", flex: 1 }}
                onClick={e => e.stopPropagation()}
              />
              {filter && (
                <span onClick={(e) => { e.stopPropagation(); setFilter("") }} style={{ cursor: "pointer", color: "#9CA3B8", fontSize: 14 }}>✕</span>
              )}
            </div>
          </div>

          {/* Clear option */}
          {value && (
            <div onClick={() => { onSelect(""); setOpen(false); setFilter("") }}
              style={{ padding: "11px 16px", fontSize: 13, color: "#DC2626", cursor: "pointer", borderBottom: "1px solid #E8EEFF", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span>✕</span> Clear selection
            </div>
          )}

          {/* All options */}
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "#9CA3B8", fontSize: 14 }}>No results found</div>
            ) : (
              filtered.map(opt => (
                <div key={opt}
                  onClick={() => { onSelect(opt); setOpen(false); setFilter("") }}
                  style={{ padding: "11px 16px", fontSize: 14, color: opt === value ? "#0057FF" : "#0A0F1E", fontWeight: opt === value ? 700 : 400, cursor: "pointer", background: opt === value ? "#0057FF08" : "transparent", borderBottom: "1px solid rgba(232,238,255,0.5)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = "#F8FAFF" }}
                  onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background = opt === value ? "#0057FF08" : "transparent" }}
                >
                  <span>{opt}</span>
                  {opt === value && <span style={{ color: "#0057FF", fontSize: 12 }}>✓</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main JobsPage ────────────────────────────────────────────────────────────
export default function JobsPage() {
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get("q") || "")
  const [loc, setLoc] = useState(searchParams.get("loc") || "")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ salaryMin: "", salaryMax: "", jobType: "", source: "", sortBy: "Score" })
  const [fresherOnly, setFresherOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [rejectedCount, setRejectedCount] = useState(0)
  const [savedJobs, setSavedJobs] = useState(new Set())
  const navigate = useNavigate()

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: f[k] === v ? "" : v }))
  const activeCount = Object.values(filters).filter(v => v !== "" && v !== "Score").length

  // Auto-load jobs on page mount
  useEffect(() => {
    handleSearch(1, q || "", loc || "")
  }, [])

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

  const handleSearch = useCallback(async (p = 1, searchQ = q, searchLoc = loc) => {
    setLoading(true); setError(""); setPage(p)
    try {
      let allJobs = []
      await Promise.allSettled([
        fetchReed(searchQ, searchLoc, p).then(r => allJobs.push(...r)).catch(() => {}),
        fetchAdzuna(searchQ, searchLoc, p).then(r => allJobs.push(...r)).catch(() => {}),
      ])

      if (allJobs.length === 0) {
        setError("No results found. Try a different search or location.")
        setLoading(false)
        return
      }

      // Deduplicate by title + employer
      const seen = new Set()
      allJobs = allJobs.filter(j => {
        const key = `${j.title.toLowerCase().slice(0, 30)}|${j.employer.toLowerCase()}`
        if (seen.has(key)) return false
        seen.add(key); return true
      })

      // Batch verify against sponsor register
      setVerifying(true)
      const sponsorMap = await batchCheckSponsors(allJobs.map(j => j.employer))
      setVerifying(false)

      // Score every job
      let rejected = 0
      let scored = allJobs.map(j => {
        const sponsorInfo = sponsorMap[j.employer]
        const result = scoreJob(j, sponsorInfo)
        if (result.hardReject) rejected++
        return { ...j, ...result, sponsorInfo }
      }).filter(j => !j.hardReject && j.score >= 0)

      setRejectedCount(rejected)

      // Apply UI filters
      if (fresherOnly) scored = scored.filter(j => j.fresherFriendly)
      if (verifiedOnly) scored = scored.filter(j => j.verified)
      if (filters.jobType === "Full-time") scored = scored.filter(j => j.full_time)
      if (filters.jobType === "Part-time") scored = scored.filter(j => j.full_time === false)
      if (filters.salaryMin) scored = scored.filter(j => (j.salary_min || 0) >= parseInt(filters.salaryMin))
      if (filters.salaryMax) scored = scored.filter(j => (j.salary_max || 999999) <= parseInt(filters.salaryMax))
      if (filters.source === "Reed") scored = scored.filter(j => j.source === "Reed")
      if (filters.source === "Adzuna") scored = scored.filter(j => j.source === "Adzuna")

      // Sort — verified always on top, then by score
      if (filters.sortBy === "Salary") {
        scored.sort((a, b) => (b.salary_min || 0) - (a.salary_min || 0))
      } else if (filters.sortBy === "Date") {
        scored.sort((a, b) => new Date(b.posted || 0) - new Date(a.posted || 0))
      } else {
        scored.sort((a, b) =>
          (b.verified ? 1 : 0) - (a.verified ? 1 : 0) ||
          b.score - a.score
        )
      }

      setJobs(p === 1 ? scored : prev => [...prev, ...scored])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setVerifying(false)
    }
  }, [q, loc, fresherOnly, verifiedOnly, filters])

  const pillStyle = (active) => ({
    padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: `1.5px solid ${active ? "#0057FF" : "#E8EEFF"}`,
    background: active ? "#0057FF0D" : "#F8FAFF",
    color: active ? "#0057FF" : "#4B5675",
    transition: "all 0.18s", fontFamily: "inherit",
  })

  const stats = {
    total: jobs.length,
    verified: jobs.filter(j => j.verified).length,
    fresher: jobs.filter(j => j.fresherFriendly).length,
    highScore: jobs.filter(j => j.score >= 70).length,
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "86px 4% 60px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 6px", letterSpacing: -1 }}>
            UK Visa Sponsored Jobs
          </h1>
          <p style={{ color: "#4B5675", fontSize: 14, lineHeight: 1.6 }}>
            Every employer verified against the UK Home Office register · Non-sponsoring jobs automatically removed
          </p>
        </div>

        {/* Search box */}
        <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 18, overflow: "visible", marginBottom: 12, boxShadow: "0 4px 24px rgba(0,57,255,0.06)", position: "relative", zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <SearchDropdown
              value={q}
              placeholder="Job title or role"
              icon="🔍"
              options={ALL_JOBS}
              onSelect={(val) => { setQ(val); handleSearch(1, val, loc) }}
            />
            <div style={{ width: 1, background: "#E8EEFF", flexShrink: 0, alignSelf: "stretch" }} />
            <SearchDropdown
              value={loc}
              placeholder="Location (all UK)"
              icon="📍"
              options={ALL_LOCATIONS}
              onSelect={(val) => { setLoc(val); handleSearch(1, q, val) }}
            />
            <div style={{ width: 1, background: "#E8EEFF", flexShrink: 0, alignSelf: "stretch" }} />
            <button onClick={() => setShowFilters(f => !f)} style={{ background: showFilters ? "#0057FF0D" : "none", border: "none", color: showFilters ? "#0057FF" : "#4B5675", padding: "0 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
              ⚙️ {activeCount > 0 && <span style={{ background: "#0057FF", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>}
            </button>
            <button onClick={() => handleSearch(1)} disabled={loading} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: "0 16px 16px 0", padding: "0 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", minHeight: 54, flexShrink: 0, opacity: loading ? 0.8 : 1 }}>
              {loading ? "⏳" : "Search →"}
            </button>
          </div>
        </div>

        {/* Toggles + clear */}
        <div style={{ display: "flex", gap: 18, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { label: "🎓 Fresher friendly", val: fresherOnly, set: setFresherOnly, color: "#FF6B35" },
            { label: "✓ Verified sponsors only", val: verifiedOnly, set: setVerifiedOnly, color: "#00D68F" },
          ].map(t => (
            <div key={t.label} onClick={() => { t.set(v => !v); setTimeout(() => handleSearch(1), 100) }} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: t.val ? t.color : "#E8EEFF", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: t.val ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
              <span style={{ fontSize: 13, color: t.val ? t.color : "#4B5675", fontWeight: 600 }}>{t.label}</span>
            </div>
          ))}
          {(q || loc) && (
            <button onClick={() => { setQ(""); setLoc(""); handleSearch(1, "", "") }} style={{ background: "none", border: "none", color: "#9CA3B8", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", marginLeft: "auto" }}>
              Clear search
            </button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 14, padding: "18px 20px", marginBottom: 14, boxShadow: "0 4px 24px rgba(0,57,255,0.05)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Contract Type</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["Full-time", "Part-time", "Contract", "Permanent"].map(v => (
                    <button key={v} onClick={() => setFilter("jobType", v)} style={pillStyle(filters.jobType === v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Sort By</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Score", "Date", "Salary"].map(v => (
                    <button key={v} onClick={() => setFilter("sortBy", v)} style={pillStyle(filters.sortBy === v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Source</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Reed", "Adzuna"].map(v => (
                    <button key={v} onClick={() => setFilter("source", v)} style={pillStyle(filters.source === v)}>{v}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Salary Range (£/year)</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input value={filters.salaryMin} onChange={e => setFilter("salaryMin", e.target.value)} placeholder="Min e.g. 25000" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
                <span style={{ color: "#9CA3B8", fontSize: 13 }}>—</span>
                <input value={filters.salaryMax} onChange={e => setFilter("salaryMax", e.target.value)} placeholder="Max e.g. 80000" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
                <button onClick={() => handleSearch(1)} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Apply</button>
              </div>
            </div>
          </div>
        )}

        {/* Verifying indicator */}
        {verifying && (
          <div style={{ background: "#00D68F0D", border: "1px solid #00D68F25", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: "#00D68F", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, border: "2px solid #00D68F", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Cross-referencing employers against UK Home Office sponsor register...
          </div>
        )}

        {/* Rejected notice */}
        {rejectedCount > 0 && !verifying && (
          <div style={{ background: "#FEF9C3", border: "1px solid #FDE047", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: "#854D0E", fontWeight: 500 }}>
            🛡️ <strong>{rejectedCount} jobs removed</strong> — these contained phrases indicating no visa sponsorship available (e.g. "right to work required", "no sponsorship")
          </div>
        )}

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 14, color: "#DC2626", fontSize: 13 }}>❌ {error}</div>
        )}

        {/* Stats bar */}
        {jobs.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
            {[
              { label: "Results", value: stats.total, color: "#0057FF" },
              { label: "Gov Verified", value: stats.verified, color: "#00D68F" },
              { label: "High Confidence", value: stats.highScore, color: "#7C3AED" },
              { label: "Fresher Friendly", value: stats.fresher, color: "#FF6B35" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", border: `1px solid ${s.color}20`, borderRadius: 10, padding: "7px 14px", display: "flex", gap: 7, alignItems: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 10, color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.label}</span>
              </div>
            ))}
            {q && <span style={{ fontSize: 13, color: "#4B5675", marginLeft: 4 }}>for "<strong>{q}</strong>{loc ? `" in "${loc}` : ""}"</span>}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && jobs.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 16, padding: "20px 22px" }}>
                <div style={{ height: 14, background: "#E8EEFF", borderRadius: 6, width: `${50 + i * 7}%`, marginBottom: 10, animation: "pulse 1.5s ease infinite" }} />
                <div style={{ height: 12, background: "#E8EEFF", borderRadius: 6, width: "40%", marginBottom: 8, animation: "pulse 1.5s ease infinite" }} />
                <div style={{ height: 10, background: "#E8EEFF", borderRadius: 6, width: "25%", animation: "pulse 1.5s ease infinite" }} />
              </div>
            ))}
          </div>
        )}

        {/* Job results */}
        {jobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {jobs.map(job => (
              <JobCard key={job.id} job={job} onSave={handleSave} saved={savedJobs.has(job.id)} navigate={navigate} />
            ))}
            <button onClick={() => handleSearch(page + 1)} disabled={loading} style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 12, padding: "14px", color: "#4B5675", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#F8FAFF"; e.currentTarget.style.borderColor = "#0057FF30" }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#E8EEFF" }}
            >
              {loading ? "Loading more..." : "Load more sponsored jobs →"}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && jobs.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🔎</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>No sponsored jobs found</div>
            <div style={{ fontSize: 14, color: "#4B5675", marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>
              Try a different role, remove the location filter, or turn off "verified only" to see more results.
            </div>
            <button onClick={() => { setQ(""); setLoc(""); setVerifiedOnly(false); handleSearch(1, "", "") }} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Show all sponsored jobs
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
