import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { C, ALL_JOBS, ALL_LOCATIONS, smartSearch } from "../lib/constants"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

const ADZUNA_ID = "344e86d1"
const ADZUNA_KEY = "039c47ae80bab92aef99751a471040fb"

const FRESHER_KW = ["graduate","entry level","junior","trainee","apprentice","no experience","fresh graduate","new graduate","school leaver","recently graduated","grad scheme","graduate scheme","placement","internship","associate","beginner"]
const NEG_KW = ["must have right to work","must be eligible to work","no sponsorship","sponsorship not available","cannot sponsor","uk residents only","british nationals only","indefinite leave to remain","no visa","visa not available"]

// Check employer name against Supabase sponsor register
async function checkSponsor(employerName) {
  if (!employerName || employerName === "Unknown") return null
  try {
    const clean = employerName.replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co)\.?$/gi, "").trim()
    const { data } = await supabase
      .from("sponsors")
      .select("organisation_name, town, route, rating")
      .ilike("organisation_name", `%${clean}%`)
      .limit(1)
    return data?.[0] || null
  } catch { return null }
}

// Batch check multiple employers at once
async function batchCheckSponsors(employers) {
  const unique = [...new Set(employers.filter(Boolean))]
  const results = {}
  await Promise.all(
    unique.map(async (emp) => {
      results[emp] = await checkSponsor(emp)
    })
  )
  return results
}

function scoreJob(job, sponsorData) {
  const text = `${job.title} ${job.description}`.toLowerCase()
  let score = 0
  let signals = []
  let fresherFriendly = false

  // Negative keywords — disqualify
  for (const neg of NEG_KW) {
    if (text.includes(neg)) return { score: -1, signals: [], fresherFriendly: false, verified: false }
  }

  // Verified sponsor from UK gov register — massive boost
  if (sponsorData) {
    score += 60
    signals.push({ type: "verified", label: `✓ UK Gov Verified Sponsor` })
    if (sponsorData.rating === "A") {
      score += 15
      signals.push({ type: "rating", label: "A-Rated Sponsor" })
    }
  }

  // Job description mentions sponsorship
  const visaKw = ["visa sponsorship", "sponsor visa", "certificate of sponsorship", "cos provided", "skilled worker visa", "tier 2", "ukvi", "sponsorship available", "will sponsor", "visa support", "sponsorship provided", "relocation package"]
  visaKw.forEach(kw => {
    if (text.includes(kw)) { score += 15; signals.push({ type: "visa", label: kw }) }
  })

  // Fresher detection
  FRESHER_KW.forEach(kw => { if (text.includes(kw)) fresherFriendly = true })

  // Salary disclosed
  if (job.salary_min || job.salary_max) { score += 5; signals.push({ type: "salary", label: "Salary disclosed" }) }

  const unique = [...new Map(signals.map(s => [s.label, s])).values()].slice(0, 4)
  return { score: Math.min(100, Math.max(0, score)), signals: unique, fresherFriendly, verified: !!sponsorData }
}

async function fetchAdzuna(q, loc, page) {
  const params = new URLSearchParams({
    app_id: ADZUNA_ID, app_key: ADZUNA_KEY,
    what: q, where: loc || "UK",
    results_per_page: 30,
    what_and: "visa sponsorship",
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
    keywords: `${q} visa sponsorship`,
    locationName: loc || "United Kingdom",
    resultsToTake: 30, resultsToSkip: (page - 1) * 30,
  })
  const r = await fetch(`https://uk-visa-jobs-six.vercel.app/api/reed?${params}`)
  if (!r.ok) throw new Error(`Reed ${r.status}`)
  const data = await r.json()
  return (data.results || []).map(j => ({
    id: `reed_${j.jobId}`, source: "Reed",
    title: j.jobTitle || "", employer: j.employerName || "Unknown",
    location: j.locationName || "", salary_min: j.minimumSalary,
    salary_max: j.maximumSalary, description: j.jobDescription || "",
    url: j.jobUrl || "#", posted: j.date, full_time: j.fullTime,
  }))
}

function JobCard({ job, onSave, saved }) {
  const [expanded, setExpanded] = useState(false)
  const salary = job.salary_min || job.salary_max
    ? `£${job.salary_min?.toLocaleString() || "?"}${job.salary_max ? ` – £${job.salary_max.toLocaleString()}` : "+"}`
    : "Salary not disclosed"
  const posted = job.posted ? new Date(job.posted).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""
  const color = job.verified ? C.green : job.score >= 60 ? C.blue : job.score >= 30 ? C.orange : C.textMid

  return (
    <div style={{ background: C.white, border: `1.5px solid ${job.verified ? `${C.green}40` : C.border}`, borderRadius: 18, padding: "22px 26px", transition: "all 0.2s", position: "relative" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,57,255,0.07)` }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" }}
    >
      {/* Verified banner */}
      {job.verified && (
        <div style={{ position: "absolute", top: 0, right: 0, background: `linear-gradient(135deg, ${C.green}, #00A67E)`, color: "#fff", fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: "0 18px 0 10px", letterSpacing: 0.5 }}>
          ✓ UK GOV VERIFIED SPONSOR
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginTop: job.verified ? 8 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ background: job.source === "Reed" ? "#e8534218" : "#7c4dff18", border: `1px solid ${job.source === "Reed" ? "#e8534240" : "#7c4dff40"}`, color: job.source === "Reed" ? "#e85342" : "#7c4dff", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{job.source}</span>
            {job.fresherFriendly && <span style={{ background: `${C.green}15`, border: `1px solid ${C.green}30`, color: C.green, borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>🎓 Fresher Friendly</span>}
            {job.sponsorInfo?.town && <span style={{ background: `${C.blue}08`, border: `1px solid ${C.blue}20`, color: C.blue, borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>📍 {job.sponsorInfo.town}</span>}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: "0 0 4px", letterSpacing: -0.3 }}>{job.title}</h3>
          <div style={{ color: C.textMid, fontSize: 13 }}>{job.employer} · {job.location}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
            {job.verified ? "Verified" : job.score >= 60 ? "Very Likely" : job.score >= 30 ? "Likely" : "Possible"} · {job.score}%
          </div>
          <button onClick={() => onSave(job)} style={{ background: saved ? `${C.blue}10` : "none", border: `1px solid ${saved ? C.blue : C.border}`, color: saved ? C.blue : C.textLight, borderRadius: 8, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {saved ? "✓ Saved" : "🔖 Save"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, color: C.textMid, flexWrap: "wrap" }}>
        <span>💷 {salary}</span>
        {posted && <span>📅 {posted}</span>}
        {job.full_time !== undefined && <span>{job.full_time ? "⏱ Full-time" : "⏱ Part-time"}</span>}
        {job.sponsorInfo?.route && <span>🛂 {job.sponsorInfo.route}</span>}
      </div>

      {job.signals?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
          {job.signals.map((s, i) => {
            const colors = { verified: C.green, rating: C.green, visa: C.blue, fresher: C.green, salary: C.orange }
            return <span key={i} style={{ background: `${colors[s.type] || "#888"}15`, border: `1px solid ${colors[s.type] || "#888"}35`, color: colors[s.type] || "#888", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>{s.label}</span>
          })}
        </div>
      )}

      {job.description && (
        <>
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: C.blue, fontSize: 12, cursor: "pointer", marginTop: 10, padding: 0, fontFamily: "inherit" }}>
            {expanded ? "▲ Hide details" : "▼ Show description"}
          </button>
          {expanded && <p style={{ margin: "10px 0 0", fontSize: 12, color: C.textMid, lineHeight: 1.7, borderTop: `1px solid ${C.border}`, paddingTop: 10, maxHeight: 180, overflow: "auto" }}>
            {job.description.replace(/<[^>]*>/g, "").slice(0, 700)}{job.description.length > 700 ? "…" : ""}
          </p>}
        </>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`, color: "#fff", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          Apply Now →
        </a>
        {job.sponsorInfo && (
          <a href={`https://www.google.com/search?q=${encodeURIComponent(job.employer + " careers jobs")}`} target="_blank" rel="noopener noreferrer" style={{ background: `${C.green}10`, border: `1px solid ${C.green}30`, color: C.green, borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            🏢 Employer Careers →
          </a>
        )}
      </div>
    </div>
  )
}

export default function JobsPage() {
  const [q, setQ] = useState("")
  const [loc, setLoc] = useState("")
  const [showQ, setShowQ] = useState(false)
  const [showL, setShowL] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ salaryMin: "", salaryMax: "", jobType: "", source: "", sortBy: "Score" })
  const [fresherOnly, setFresherOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)
  const [page, setPage] = useState(1)
  const [savedJobs, setSavedJobs] = useState(new Set())
  const navigate = useNavigate()

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: f[k] === v ? "" : v }))
  const activeCount = Object.values(filters).filter(v => v !== "" && v !== "Score").length
  const displayJobs = q.length > 0 ? smartSearch(q, ALL_JOBS) : ALL_JOBS
  const displayLocs = loc.length > 0 ? ALL_LOCATIONS.filter(l => l.toLowerCase().includes(loc.toLowerCase())) : ALL_LOCATIONS

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
    if (!q.trim()) return
    setLoading(true); setError(""); setPage(p)
    try {
      let allJobs = []

      // Fetch from both APIs
      await Promise.allSettled([
        fetchReed(q, loc, p).then(r => allJobs.push(...r)).catch(() => {}),
        fetchAdzuna(q, loc, p).then(r => allJobs.push(...r)).catch(() => {}),
      ])

      if (allJobs.length === 0) { setError("No results found. Try a different search."); setLoading(false); return }

      // Deduplicate
      const seen = new Set()
      allJobs = allJobs.filter(j => {
        const key = `${j.title.toLowerCase()}|${j.employer.toLowerCase()}`
        if (seen.has(key)) return false
        seen.add(key); return true
      })

      // Batch verify all employers against UK gov sponsor register
      setVerifying(true)
      const employers = allJobs.map(j => j.employer)
      const sponsorMap = await batchCheckSponsors(employers)
      setVerifying(false)

      // Score all jobs
      let scored = allJobs.map(j => {
        const sponsorInfo = sponsorMap[j.employer]
        const { score, signals, fresherFriendly, verified } = scoreJob(j, sponsorInfo)
        return { ...j, score, signals, fresherFriendly, verified, sponsorInfo }
      }).filter(j => j.score >= 0)

      // Apply filters
      if (fresherOnly) scored = scored.filter(j => j.fresherFriendly)
      if (verifiedOnly) scored = scored.filter(j => j.verified)
      if (filters.jobType === "Full-time") scored = scored.filter(j => j.full_time)
      if (filters.jobType === "Part-time") scored = scored.filter(j => j.full_time === false)
      if (filters.salaryMin) scored = scored.filter(j => (j.salary_min || 0) >= parseInt(filters.salaryMin))
      if (filters.salaryMax) scored = scored.filter(j => (j.salary_max || 999999) <= parseInt(filters.salaryMax))
      if (filters.source === "Reed") scored = scored.filter(j => j.source === "Reed")
      if (filters.source === "Adzuna") scored = scored.filter(j => j.source === "Adzuna")

      // Sort — verified always first
      if (filters.sortBy === "Salary") scored.sort((a, b) => (b.salary_min || 0) - (a.salary_min || 0))
      else if (filters.sortBy === "Date") scored.sort((a, b) => new Date(b.posted || 0) - new Date(a.posted || 0))
      else scored.sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || b.score - a.score)

      setJobs(p === 1 ? scored : prev => [...prev, ...scored])
      setSearched(true)
    } catch (err) { setError(err.message) }
    finally { setLoading(false); setVerifying(false) }
  }, [q, loc, fresherOnly, verifiedOnly, filters])

  const pillStyle = (active) => ({ padding: "7px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? C.blue : C.border}`, background: active ? `${C.blue}0D` : C.bg, color: active ? C.blue : C.textMid, transition: "all 0.18s", fontFamily: "inherit" })
  const inputStyle = { width: "100%", border: "none", outline: "none", background: C.bg, borderRadius: 10, padding: "14px 14px 14px 42px", fontSize: 15, color: C.text, fontFamily: "inherit" }
  const dropStyle = { position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 16px 48px rgba(0,57,255,0.1)", maxHeight: 280, overflowY: "auto", zIndex: 300 }

  const stats = {
    total: jobs.length,
    verified: jobs.filter(j => j.verified).length,
    fresher: jobs.filter(j => j.fresherFriendly).length,
    highScore: jobs.filter(j => j.score >= 70).length,
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "100px 6% 60px" }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: "0 0 6px", letterSpacing: -1 }}>Find Sponsored Jobs</h1>
          <p style={{ color: C.textMid, fontSize: 15 }}>Every employer verified against the UK Home Office register of licensed sponsors</p>
        </div>

        {/* Search bar */}
        <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 8, display: "flex", gap: 8, marginBottom: 10, boxShadow: "0 4px 24px rgba(0,57,255,0.06)", position: "relative", zIndex: 20 }}>
          <div style={{ flex: 2, position: "relative" }}>
            <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none", zIndex: 1 }}>🔍</span>
            <input value={q} onChange={e => { setQ(e.target.value); setShowQ(true); setShowL(false) }} onFocus={() => { setShowQ(true); setShowL(false) }} onBlur={() => setTimeout(() => setShowQ(false), 200)} onKeyDown={e => e.key === "Enter" && handleSearch(1)} placeholder="Job title or keyword..." style={inputStyle} />
            {showQ && (
              <div style={dropStyle}>
                {q.length === 0 && <div style={{ padding: "10px 14px 6px", fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.8 }}>All Roles A–Z</div>}
                {displayJobs.map(s => (
                  <div key={s} onMouseDown={() => { setQ(s); setShowQ(false) }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: C.text, borderBottom: `1px solid rgba(232,238,255,0.5)` }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.blue}08`}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  ><span style={{ fontSize: 12, color: C.textLight, marginRight: 8 }}>🔍</span>{s}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ width: 1, background: C.border, margin: "8px 0" }} />
          <div style={{ flex: 1.3, position: "relative" }}>
            <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none", zIndex: 1 }}>📍</span>
            <input value={loc} onChange={e => { setLoc(e.target.value); setShowL(true); setShowQ(false) }} onFocus={() => { setShowL(true); setShowQ(false) }} onBlur={() => setTimeout(() => setShowL(false), 200)} onKeyDown={e => e.key === "Enter" && handleSearch(1)} placeholder="City or location..." style={inputStyle} />
            {showL && (
              <div style={dropStyle}>
                {loc.length === 0 && <div style={{ padding: "10px 14px 6px", fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.8 }}>All Locations A–Z</div>}
                {displayLocs.map(s => (
                  <div key={s} onMouseDown={() => { setLoc(s); setShowL(false) }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: C.text, borderBottom: `1px solid rgba(232,238,255,0.5)` }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.blue}08`}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  ><span style={{ fontSize: 12, color: C.textLight, marginRight: 8 }}>📍</span>{s}</div>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowFilters(f => !f)} style={{ background: showFilters ? `${C.blue}0D` : C.bg, border: `1.5px solid ${showFilters ? C.blue : C.border}`, color: showFilters ? C.blue : C.textMid, borderRadius: 10, padding: "0 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", whiteSpace: "nowrap" }}>
            ⚙️ Filters {activeCount > 0 && <span style={{ background: C.blue, color: "#fff", borderRadius: "50%", width: 17, height: 17, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>}
          </button>
          <button onClick={() => handleSearch(1)} disabled={loading || !q.trim()} style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`, color: "#fff", border: "none", borderRadius: 10, padding: "0 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", opacity: loading || !q.trim() ? 0.7 : 1 }}>
            {loading ? "⏳" : "Search →"}
          </button>
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: showFilters ? 10 : 20 }}>
          {[
            { label: "🎓 Fresher-friendly only", val: fresherOnly, set: setFresherOnly },
            { label: "✓ Verified sponsors only", val: verifiedOnly, set: setVerifiedOnly, color: C.green },
          ].map(t => (
            <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div onClick={() => t.set(v => !v)} style={{ width: 38, height: 20, borderRadius: 10, background: t.val ? (t.color || C.blue) : C.border, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: t.val ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 13, color: t.val ? (t.color || C.blue) : C.textMid, fontWeight: 600 }}>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        {showFilters && (
          <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "22px 26px", marginBottom: 20, boxShadow: "0 4px 24px rgba(0,57,255,0.05)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Contract Type</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{["Permanent", "Contract", "Full-time", "Part-time"].map(v => <button key={v} onClick={() => setFilter("jobType", v)} style={pillStyle(filters.jobType === v)}>{v}</button>)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Sort By</div>
                <div style={{ display: "flex", gap: 6 }}>{["Score", "Date", "Salary"].map(v => <button key={v} onClick={() => setFilter("sortBy", v)} style={pillStyle(filters.sortBy === v)}>{v}</button>)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Source</div>
                <div style={{ display: "flex", gap: 6 }}>{["Reed", "Adzuna", "Both"].map(v => <button key={v} onClick={() => setFilter("source", v)} style={pillStyle(filters.source === v)}>{v}</button>)}</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Salary Range</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input value={filters.salaryMin} onChange={e => setFilter("salaryMin", e.target.value)} placeholder="Min e.g. 25000" type="number" style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: C.text, background: C.bg, fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor = C.blue} onBlur={e => e.target.style.borderColor = C.border} />
                <span style={{ color: C.textLight }}>to</span>
                <input value={filters.salaryMax} onChange={e => setFilter("salaryMax", e.target.value)} placeholder="Max e.g. 80000" type="number" style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: C.text, background: C.bg, fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor = C.blue} onBlur={e => e.target.style.borderColor = C.border} />
              </div>
            </div>
          </div>
        )}

        {/* Verifying indicator */}
        {verifying && (
          <div style={{ background: `${C.green}0D`, border: `1px solid ${C.green}25`, borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: C.green, fontWeight: 600 }}>
            🔍 Verifying employers against UK Home Office sponsor register...
          </div>
        )}

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#DC2626", fontSize: 13 }}>❌ {error}</div>}

        {/* Stats */}
        {searched && jobs.length > 0 && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            {[
              { label: "Total Found", value: stats.total, color: C.blue },
              { label: "UK Gov Verified", value: stats.verified, color: C.green },
              { label: "Fresher Friendly", value: stats.fresher, color: C.orange },
              { label: "High Confidence", value: stats.highScore, color: C.purple },
            ].map(s => (
              <div key={s.label} style={{ background: C.white, border: `1px solid ${s.color}20`, borderRadius: 12, padding: "10px 18px" }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: s.color, display: "block" }}>{s.value}</span>
                <span style={{ fontSize: 11, color: C.textLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {jobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {jobs.map(job => <JobCard key={job.id} job={job} onSave={handleSave} saved={savedJobs.has(job.id)} />)}
            <button onClick={() => handleSearch(page + 1)} disabled={loading} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px", color: C.textMid, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = `${C.blue}08`}
              onMouseLeave={e => e.currentTarget.style.background = C.white}
            >{loading ? "Loading…" : "Load more results →"}</button>
          </div>
        )}

        {/* Empty */}
        {searched && jobs.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>No sponsored jobs found</div>
            <div style={{ fontSize: 14, color: C.textMid }}>Try a broader search or turn off the verified-only filter.</div>
          </div>
        )}

        {/* Before search */}
        {!searched && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 52, marginBottom: 20 }}>🏛️</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 10 }}>Search UK Gov Verified Jobs</div>
            <div style={{ fontSize: 15, color: C.textMid, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
              Every result is cross-checked against 125,000+ employers on the official UK Home Office register of licensed sponsors.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
