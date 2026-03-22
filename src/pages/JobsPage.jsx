import { useState, useCallback, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { C, ALL_JOBS, ALL_LOCATIONS, smartSearch } from "../lib/constants"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

const ADZUNA_ID = "344e86d1"
const ADZUNA_KEY = "039c47ae80bab92aef99751a471040fb"

const FRESHER_KW = ["graduate","entry level","junior","trainee","apprentice","no experience","fresh graduate","new graduate","grad scheme","graduate scheme","placement","internship"]
const NEG_KW = ["must have right to work","no sponsorship","sponsorship not available","cannot sponsor","uk residents only","british nationals only","no visa sponsorship","must be eligible to work in the uk without sponsorship"]
const VISA_KW = ["visa sponsorship","sponsor visa","certificate of sponsorship","cos provided","skilled worker visa","tier 2","ukvi","sponsorship available","will sponsor","sponsorship provided","visa support","sponsorship considered","open to sponsorship"]

function useW() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn) }, [])
  return w
}

// Smart employer name matching against Supabase sponsor register
async function checkSponsor(employerName) {
  if (!employerName || employerName === "Unknown") return null
  try {
    // Try multiple matching strategies
    const clean = employerName
      .replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co|corp|corporation|holdings|services|solutions|international)\.?$/gi, "")
      .replace(/[^\w\s]/g, " ")
      .trim()

    if (clean.length < 2) return null

    // Strategy 1: exact match
    const { data: exact } = await supabase
      .from("sponsors")
      .select("organisation_name, town, route, rating")
      .ilike("organisation_name", employerName)
      .limit(1)
    if (exact?.[0]) return exact[0]

    // Strategy 2: contains cleaned name
    const { data: contains } = await supabase
      .from("sponsors")
      .select("organisation_name, town, route, rating")
      .ilike("organisation_name", `%${clean}%`)
      .limit(1)
    if (contains?.[0]) return contains[0]

    // Strategy 3: first word match for longer names
    const firstWord = clean.split(" ")[0]
    if (firstWord.length >= 4) {
      const { data: partial } = await supabase
        .from("sponsors")
        .select("organisation_name, town, route, rating")
        .ilike("organisation_name", `${firstWord}%`)
        .limit(1)
      if (partial?.[0]) return partial[0]
    }

    return null
  } catch { return null }
}

async function batchCheckSponsors(employers) {
  const unique = [...new Set(employers.filter(Boolean))]
  const results = {}
  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < unique.length; i += 5) {
    const batch = unique.slice(i, i + 5)
    await Promise.all(batch.map(async (emp) => {
      results[emp] = await checkSponsor(emp)
    }))
  }
  return results
}

function scoreJob(job, sponsorData) {
  const text = `${job.title} ${job.description} ${job.employer}`.toLowerCase()
  let score = 0
  let signals = []
  let fresherFriendly = false

  // Hard negative filter
  for (const neg of NEG_KW) {
    if (text.includes(neg)) return { score: -1, signals: [], fresherFriendly: false, verified: false }
  }

  // Verified on UK gov register — biggest signal
  if (sponsorData) {
    score += 55
    signals.push({ type: "verified", label: "✓ Gov Verified Sponsor" })
    if (sponsorData.rating === "A") {
      score += 10
      signals.push({ type: "rating", label: "A-Rated" })
    }
  }

  // Explicit visa keywords in description
  let visaKwFound = 0
  for (const kw of VISA_KW) {
    if (text.includes(kw) && visaKwFound < 2) {
      score += 12
      signals.push({ type: "visa", label: kw })
      visaKwFound++
    }
  }

  // Fresher detection
  for (const kw of FRESHER_KW) {
    if (text.includes(kw)) { fresherFriendly = true; break }
  }

  // Salary disclosed
  if (job.salary_min || job.salary_max) {
    score += 5
    signals.push({ type: "salary", label: "Salary disclosed" })
  }

  // Cap and unique signals
  const uniqueSignals = [...new Map(signals.map(s => [s.label, s])).values()].slice(0, 4)
  return {
    score: Math.min(100, Math.max(0, score)),
    signals: uniqueSignals,
    fresherFriendly,
    verified: !!sponsorData
  }
}

async function fetchAdzuna(q, loc, page) {
  const params = new URLSearchParams({
    app_id: ADZUNA_ID,
    app_key: ADZUNA_KEY,
    what: `${q} visa sponsorship`,
    where: loc || "UK",
    results_per_page: 20,
    content_type: "application/json",
  })
  const r = await fetch(`https://api.adzuna.com/v1/api/jobs/gb/search/${page}?${params}`)
  if (!r.ok) throw new Error(`Adzuna ${r.status}`)
  const data = await r.json()
  return (data.results || []).map(j => ({
    id: `adzuna_${j.id}`,
    source: "Adzuna",
    title: j.title || "",
    employer: j.company?.display_name || "Unknown",
    location: j.location?.display_name || "UK",
    salary_min: j.salary_min,
    salary_max: j.salary_max,
    description: j.description || "",
    url: j.redirect_url || "#",
    posted: j.created,
    full_time: j.contract_time === "full_time",
  }))
}

async function fetchReed(q, loc, page) {
  const params = new URLSearchParams({
    keywords: `${q} visa sponsorship`,
    locationName: loc || "United Kingdom",
    resultsToTake: 20,
    resultsToSkip: (page - 1) * 20,
  })
  const r = await fetch(`https://uk-visa-jobs-six.vercel.app/api/reed?${params}`)
  if (!r.ok) throw new Error(`Reed ${r.status}`)
  const data = await r.json()
  return (data.results || []).map(j => ({
    id: `reed_${j.jobId}`,
    source: "Reed",
    title: j.jobTitle || "",
    employer: j.employerName || "Unknown",
    location: j.locationName || "",
    salary_min: j.minimumSalary,
    salary_max: j.maximumSalary,
    description: j.jobDescription || "",
    url: j.jobUrl || "#",
    posted: j.date,
    full_time: j.fullTime,
  }))
}

function JobCard({ job, onSave, saved, navigate, mob }) {
  const [expanded, setExpanded] = useState(false)
  const salary = job.salary_min || job.salary_max
    ? `£${(job.salary_min || 0).toLocaleString()}${job.salary_max ? ` – £${job.salary_max.toLocaleString()}` : "+"}`
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
      padding: mob ? "16px" : "20px 24px",
      transition: "all 0.2s",
      position: "relative",
    }}
      onMouseEnter={e => { if (!mob) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,57,255,0.07)" } }}
      onMouseLeave={e => { if (!mob) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" } }}
    >
      {/* Verified banner */}
      {job.verified && (
        <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #00D68F, #00A67E)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 12px", borderRadius: "0 16px 0 8px", letterSpacing: 0.5 }}>
          ✓ UK GOV VERIFIED SPONSOR
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", marginTop: job.verified ? 8 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges */}
          <div style={{ display: "flex", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
            <span style={{
              background: job.source === "Reed" ? "#e8534215" : "#7c4dff15",
              color: job.source === "Reed" ? "#e85342" : "#7c4dff",
              borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700
            }}>{job.source}</span>
            {job.fresherFriendly && (
              <span style={{ background: "#00D68F15", color: "#00D68F", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>🎓 Fresher</span>
            )}
            {job.sponsorInfo?.town && (
              <span style={{ background: "#0057FF08", color: "#0057FF", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>📍 {job.sponsorInfo.town}</span>
            )}
          </div>

          {/* Title */}
          <h3 style={{ fontSize: mob ? 14 : 15, fontWeight: 800, color: "#0A0F1E", margin: "0 0 4px", letterSpacing: -0.2, lineHeight: 1.3, paddingRight: mob ? 70 : 0 }}>
            {job.title}
          </h3>
          <div style={{ color: "#4B5675", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {job.employer} · {job.location}
          </div>
        </div>

        {/* Score badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ background: `${scoreColor}15`, border: `1px solid ${scoreColor}40`, borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: scoreColor, whiteSpace: "nowrap" }}>
            {scoreLabel} {job.score}%
          </div>
          <button onClick={() => onSave(job)} style={{ background: saved ? "#0057FF10" : "none", border: `1px solid ${saved ? "#0057FF" : "#E8EEFF"}`, color: saved ? "#0057FF" : "#9CA3B8", borderRadius: 7, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            {saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Meta info */}
      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "#4B5675", flexWrap: "wrap" }}>
        {salary && <span>💷 {salary}</span>}
        {posted && <span>📅 {posted}</span>}
        {job.sponsorInfo?.route && <span>🛂 {job.sponsorInfo.route.split(":")[0]}</span>}
      </div>

      {/* Signal tags */}
      {job.signals?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {job.signals.map((s, i) => {
            const colors = { verified: "#00D68F", rating: "#00D68F", visa: "#0057FF", salary: "#FF6B35" }
            const col = colors[s.type] || "#888"
            return <span key={i} style={{ background: `${col}12`, color: col, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>{s.label}</span>
          })}
        </div>
      )}

      {/* Description toggle */}
      {job.description && (
        <>
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: "#0057FF", fontSize: 12, cursor: "pointer", marginTop: 8, padding: 0, fontFamily: "inherit" }}>
            {expanded ? "▲ Hide" : "▼ Show description"}
          </button>
          {expanded && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#4B5675", lineHeight: 1.7, borderTop: "1px solid #E8EEFF", paddingTop: 8, maxHeight: 150, overflow: "auto" }}>
              {job.description.replace(/<[^>]*>/g, "").slice(0, 500)}
              {job.description.length > 500 ? "…" : ""}
            </p>
          )}
        </>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
          Apply Now →
        </a>
        {job.sponsorInfo && (
          <button onClick={() => navigate(`/employer/${encodeURIComponent(job.employer)}`)} style={{ background: "#00D68F10", border: "1px solid #00D68F30", color: "#00D68F", borderRadius: 9, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            🏢 Employer
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
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)
  const [page, setPage] = useState(1)
  const [savedJobs, setSavedJobs] = useState(new Set())
  const searchTimeout = useRef(null)
  const navigate = useNavigate()
  const w = useW()
  const mob = w < 768

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: f[k] === v ? "" : v }))
  const activeCount = Object.values(filters).filter(v => v !== "" && v !== "Score").length
  const displayJobs = q.length > 0 ? smartSearch(q, ALL_JOBS) : ALL_JOBS
  const displayLocs = loc.length > 0 ? ALL_LOCATIONS.filter(l => l.toLowerCase().includes(loc.toLowerCase())) : ALL_LOCATIONS

  // Auto search as user types
  useEffect(() => {
    if (q.trim().length < 2) return
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { handleSearch(1) }, 700)
    return () => clearTimeout(searchTimeout.current)
  }, [q])

  // Auto search from URL params on load
  useEffect(() => {
    if (searchParams.get("q")) handleSearch(1)
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

  const handleSearch = useCallback(async (p = 1) => {
    const searchQ = q.trim()
    if (!searchQ) return
    setLoading(true); setError(""); setPage(p)

    try {
      // Fetch from both APIs simultaneously
      let allJobs = []
      const [reedResult, adzunaResult] = await Promise.allSettled([
        fetchReed(searchQ, loc, p),
        fetchAdzuna(searchQ, loc, p),
      ])
      if (reedResult.status === "fulfilled") allJobs.push(...reedResult.value)
      if (adzunaResult.status === "fulfilled") allJobs.push(...adzunaResult.value)

      if (allJobs.length === 0) {
        setError("No results found. Try a broader search term.")
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

      // Verify employers against sponsor register
      setVerifying(true)
      const sponsorMap = await batchCheckSponsors(allJobs.map(j => j.employer))
      setVerifying(false)

      // Score all jobs
      let scored = allJobs.map(j => {
        const sponsorInfo = sponsorMap[j.employer]
        const { score, signals, fresherFriendly, verified } = scoreJob(j, sponsorInfo)
        return { ...j, score, signals, fresherFriendly, verified, sponsorInfo }
      }).filter(j => j.score >= 0) // Remove jobs with explicit "no sponsorship" text

      // Apply filters
      if (fresherOnly) scored = scored.filter(j => j.fresherFriendly)
      if (verifiedOnly) scored = scored.filter(j => j.verified)
      if (filters.jobType === "Full-time") scored = scored.filter(j => j.full_time === true)
      if (filters.jobType === "Part-time") scored = scored.filter(j => j.full_time === false)
      if (filters.salaryMin) scored = scored.filter(j => (j.salary_min || 0) >= parseInt(filters.salaryMin))
      if (filters.salaryMax) scored = scored.filter(j => (j.salary_max || 999999) <= parseInt(filters.salaryMax))
      if (filters.source === "Reed") scored = scored.filter(j => j.source === "Reed")
      if (filters.source === "Adzuna") scored = scored.filter(j => j.source === "Adzuna")

      // Sort — verified always first, then by score
      if (filters.sortBy === "Salary") {
        scored.sort((a, b) => (b.salary_min || 0) - (a.salary_min || 0))
      } else if (filters.sortBy === "Date") {
        scored.sort((a, b) => new Date(b.posted || 0) - new Date(a.posted || 0))
      } else {
        scored.sort((a, b) => {
          if (a.verified && !b.verified) return -1
          if (!a.verified && b.verified) return 1
          return b.score - a.score
        })
      }

      setJobs(p === 1 ? scored : prev => [...prev, ...scored])
      setSearched(true)
    } catch (err) {
      setError("Search failed. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
      setVerifying(false)
    }
  }, [q, loc, fresherOnly, verifiedOnly, filters])

  const stats = {
    total: jobs.length,
    verified: jobs.filter(j => j.verified).length,
    fresher: jobs.filter(j => j.fresherFriendly).length,
  }

  const pillStyle = (active) => ({
    padding: "6px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: `1.5px solid ${active ? "#0057FF" : "#E8EEFF"}`,
    background: active ? "#0057FF0D" : "#F8FAFF",
    color: active ? "#0057FF" : "#4B5675",
    transition: "all 0.18s", fontFamily: "inherit",
  })

  const dropStyle = {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
    background: "rgba(255,255,255,0.98)", backdropFilter: "blur(12px)",
    borderRadius: 14, border: "1px solid #E8EEFF",
    boxShadow: "0 16px 48px rgba(0,57,255,0.1)",
    maxHeight: 260, overflowY: "auto", zIndex: 300,
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: mob ? "82px 4% 40px" : "96px 5% 60px" }}>

        {/* Header */}
        <div style={{ marginBottom: mob ? 16 : 22 }}>
          <h1 style={{ fontSize: mob ? 22 : 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 4px", letterSpacing: -0.8 }}>
            Find UK Visa Sponsored Jobs
          </h1>
          <p style={{ color: "#4B5675", fontSize: mob ? 13 : 14, margin: 0 }}>
            Every employer verified against 125,284 UK Home Office licensed sponsors · Results appear as you type
          </p>
        </div>

        {/* Search box */}
        <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 16, overflow: "visible", marginBottom: 12, boxShadow: "0 4px 24px rgba(0,57,255,0.06)", position: "relative", zIndex: 20 }}>

          {/* Job search input */}
          <div style={{ position: "relative", borderBottom: "1px solid #E8EEFF" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>🔍</span>
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setShowQ(true); setShowL(false) }}
              onFocus={() => { setShowQ(true); setShowL(false) }}
              onBlur={() => setTimeout(() => setShowQ(false), 200)}
              onKeyDown={e => e.key === "Enter" && handleSearch(1)}
              placeholder={mob ? "Job title or keyword..." : "Job title or keyword... (results appear as you type)"}
              style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: mob ? "14px 60px 14px 42px" : "15px 70px 15px 44px", fontSize: mob ? 15 : 15, color: "#0A0F1E", fontFamily: "inherit" }}
            />
            {loading && (
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#0057FF", fontWeight: 600 }}>
                {verifying ? "🔍" : "⏳"}
              </span>
            )}
            {showQ && displayJobs.length > 0 && (
              <div style={dropStyle}>
                {q.length === 0 && <div style={{ padding: "10px 14px 6px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8 }}>All Roles A–Z</div>}
                {displayJobs.slice(0, 10).map(s => (
                  <div key={s} onMouseDown={() => { setQ(s); setShowQ(false) }}
                    style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: "#0A0F1E", borderBottom: "1px solid rgba(232,238,255,0.4)", display: "flex", alignItems: "center", gap: 8 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#0057FF08"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontSize: 11, color: "#9CA3B8" }}>🔍</span>{s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location + filter + search button row */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none" }}>📍</span>
              <input
                value={loc}
                onChange={e => { setLoc(e.target.value); setShowL(true); setShowQ(false) }}
                onFocus={() => { setShowL(true); setShowQ(false) }}
                onBlur={() => setTimeout(() => setShowL(false), 200)}
                onKeyDown={e => e.key === "Enter" && handleSearch(1)}
                placeholder="City or location..."
                style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: "12px 12px 12px 38px", fontSize: 14, color: "#0A0F1E", fontFamily: "inherit" }}
              />
              {showL && displayLocs.length > 0 && (
                <div style={{ ...dropStyle, top: "calc(100% + 4px)" }}>
                  {loc.length === 0 && <div style={{ padding: "10px 14px 6px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8 }}>All Locations A–Z</div>}
                  {displayLocs.slice(0, 8).map(s => (
                    <div key={s} onMouseDown={() => { setLoc(s); setShowL(false) }}
                      style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: "#0A0F1E", borderBottom: "1px solid rgba(232,238,255,0.4)", display: "flex", alignItems: "center", gap: 8 }}
                      onMouseEnter={e => e.currentTarget.style.background = "#0057FF08"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ fontSize: 11, color: "#9CA3B8" }}>📍</span>{s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ width: 1, height: 32, background: "#E8EEFF", flexShrink: 0 }} />

            <button onClick={() => setShowFilters(f => !f)} style={{ background: "none", border: "none", color: showFilters ? "#0057FF" : "#4B5675", padding: "0 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, height: 44, whiteSpace: "nowrap" }}>
              ⚙️{!mob && " Filters"} {activeCount > 0 && <span style={{ background: "#0057FF", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>}
            </button>

            <button onClick={() => handleSearch(1)} disabled={loading || !q.trim()} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: "0 0 14px 0", padding: mob ? "12px 16px" : "12px 22px", fontSize: mob ? 13 : 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", opacity: !q.trim() ? 0.6 : 1, height: 44 }}>
              {loading ? "..." : "Search"}
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
          {[
            { label: "🎓 Fresher only", val: fresherOnly, set: setFresherOnly, color: "#FF6B35" },
            { label: "✓ Verified only", val: verifiedOnly, set: setVerifiedOnly, color: "#00D68F" },
          ].map(t => (
            <div key={t.label} onClick={() => t.set(v => !v)} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
              <div style={{ width: 34, height: 18, borderRadius: 9, background: t.val ? t.color : "#E8EEFF", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: t.val ? 17 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 13, color: t.val ? t.color : "#4B5675", fontWeight: 600 }}>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 14, padding: mob ? "16px" : "20px 24px", marginBottom: 14, boxShadow: "0 4px 24px rgba(0,57,255,0.05)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: mob ? 16 : 20, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>Contract</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Full-time","Part-time","Contract"].map(v => <button key={v} onClick={() => setFilter("jobType", v)} style={pillStyle(filters.jobType === v)}>{v}</button>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>Sort By</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Score","Date","Salary"].map(v => <button key={v} onClick={() => setFilter("sortBy", v)} style={pillStyle(filters.sortBy === v)}>{v}</button>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>Source</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Reed","Adzuna"].map(v => <button key={v} onClick={() => setFilter("source", v)} style={pillStyle(filters.source === v)}>{v}</button>)}
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>Salary Range (£)</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={filters.salaryMin} onChange={e => setFilter("salaryMin", e.target.value)} placeholder="Min e.g. 25000" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
                <span style={{ color: "#9CA3B8", fontSize: 13 }}>–</span>
                <input value={filters.salaryMax} onChange={e => setFilter("salaryMax", e.target.value)} placeholder="Max e.g. 80000" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              </div>
            </div>
            {activeCount > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #E8EEFF", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setFilters({ salaryMin: "", salaryMax: "", jobType: "", source: "", sortBy: "Score" })} style={{ background: "none", border: "none", color: "#4B5675", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>✕ Clear all</button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 14, color: "#DC2626", fontSize: 13 }}>
            ❌ {error}
          </div>
        )}

        {/* Stats bar */}
        {searched && jobs.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { label: "Results", value: stats.total, color: "#0057FF" },
              { label: "Gov Verified", value: stats.verified, color: "#00D68F" },
              { label: "Fresher Friendly", value: stats.fresher, color: "#FF6B35" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", border: `1px solid ${s.color}20`, borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: mob ? 18 : 20, fontWeight: 900, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 10, color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Job results */}
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
            <button
              onClick={() => handleSearch(page + 1)}
              disabled={loading}
              style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 12, padding: "14px", color: "#4B5675", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4, transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFF"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >
              {loading ? "Loading more..." : "Load more results →"}
            </button>
          </div>
        )}

        {/* Empty state after search */}
        {searched && jobs.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "56px 20px", background: "#fff", borderRadius: 20, border: "1px solid #E8EEFF" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🔎</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>No sponsored jobs found</div>
            <div style={{ fontSize: 14, color: "#4B5675", marginBottom: 20 }}>Try a broader search, different location, or turn off verified-only filter</div>
            <button onClick={() => { setVerifiedOnly(false); setFresherOnly(false); handleSearch(1) }} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Search All Results
            </button>
          </div>
        )}

        {/* Initial state before search */}
        {!searched && !loading && (
          <div style={{ textAlign: "center", padding: mob ? "40px 16px" : "60px 20px" }}>
            <div style={{ fontSize: mob ? 44 : 56, marginBottom: 16 }}>🏛️</div>
            <div style={{ fontSize: mob ? 17 : 20, fontWeight: 800, color: "#0A0F1E", marginBottom: 10 }}>
              Search UK Gov Verified Jobs
            </div>
            <div style={{ fontSize: mob ? 13 : 15, color: "#4B5675", maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.7 }}>
              Every result verified against 125,284 employers on the official UK Home Office register of licensed sponsors.
            </div>
            {/* Quick search suggestions */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 500, margin: "0 auto" }}>
              {["Software Engineer","Registered Nurse","Data Scientist","Cyber Security Analyst","Civil Engineer","Pharmacist","Accountant","General Practitioner"].map(t => (
                <button key={t} onClick={() => setQ(t)} style={{ background: "#fff", border: "1px solid #E8EEFF", color: "#4B5675", borderRadius: 100, padding: mob ? "8px 14px" : "7px 14px", fontSize: mob ? 13 : 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#0057FF"; e.currentTarget.style.color = "#0057FF" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8EEFF"; e.currentTarget.style.color = "#4B5675" }}
                >{t}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
