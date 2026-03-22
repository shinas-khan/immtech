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

function useW() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn) }, [])
  return w
}

async function checkSponsor(employerName) {
  if (!employerName || employerName === "Unknown") return null
  try {
    const clean = employerName.replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co|corp|corporation|holdings|services|solutions|international|technologies|technology|systems|consulting|consultancy|recruitment|staffing|agency)\.?$/gi, "").replace(/[^\w\s]/g, " ").trim()
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
    score += 55; signals.push({ type: "verified", label: "✓ Gov Verified" })
    if (sponsorData.rating === "A") { score += 10; signals.push({ type: "rating", label: "A-Rated" }) }
  }
  let visaFound = 0
  for (const kw of VISA_KW) {
    if (text.includes(kw) && visaFound < 2) { score += 12; signals.push({ type: "visa", label: kw }); visaFound++ }
  }
  for (const kw of FRESHER_KW) { if (text.includes(kw)) { fresherFriendly = true; break } }
  if (job.salary_min || job.salary_max) { score += 5; signals.push({ type: "salary", label: "Salary disclosed" }) }
  const uniqueSignals = [...new Map(signals.map(s => [s.label, s])).values()].slice(0, 4)
  return { score: Math.min(100, Math.max(0, score)), signals: uniqueSignals, fresherFriendly, verified: !!sponsorData }
}

async function fetchAdzuna(q, loc, page) {
  const params = new URLSearchParams({ app_id: ADZUNA_ID, app_key: ADZUNA_KEY, what: q ? `${q} visa sponsorship` : "visa sponsorship uk", where: loc || "UK", results_per_page: 20, content_type: "application/json" })
  const r = await fetch(`https://api.adzuna.com/v1/api/jobs/gb/search/${page}?${params}`)
  if (!r.ok) throw new Error(`Adzuna ${r.status}`)
  const data = await r.json()
  return (data.results || []).map(j => ({ id: `adzuna_${j.id}`, source: "Adzuna", title: j.title || "", employer: j.company?.display_name || "Unknown", location: j.location?.display_name || "UK", salary_min: j.salary_min, salary_max: j.salary_max, description: j.description || "", url: j.redirect_url || "#", posted: j.created, full_time: j.contract_time === "full_time" }))
}

async function fetchReed(q, loc, page) {
  const params = new URLSearchParams({ keywords: q ? `${q} visa sponsorship` : "visa sponsorship", locationName: loc || "United Kingdom", resultsToTake: 20, resultsToSkip: (page - 1) * 20 })
  const r = await fetch(`https://uk-visa-jobs-six.vercel.app/api/reed?${params}`)
  if (!r.ok) throw new Error(`Reed ${r.status}`)
  const data = await r.json()
  return (data.results || []).map(j => ({ id: `reed_${j.jobId}`, source: "Reed", title: j.jobTitle || "", employer: j.employerName || "Unknown", location: j.locationName || "", salary_min: j.minimumSalary, salary_max: j.maximumSalary, description: j.jobDescription || "", url: j.jobUrl || "#", posted: j.date, full_time: j.fullTime }))
}

function JobCard({ job, onSave, saved, navigate, mob }) {
  const [expanded, setExpanded] = useState(false)
  const salary = job.salary_min || job.salary_max ? `£${(job.salary_min || 0).toLocaleString()}${job.salary_max ? `–£${job.salary_max.toLocaleString()}` : "+"}` : null
  const posted = job.posted ? new Date(job.posted).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""
  const scoreColor = job.verified ? "#00D68F" : job.score >= 60 ? "#0057FF" : job.score >= 30 ? "#FF6B35" : "#9CA3B8"
  const scoreLabel = job.verified ? "Verified" : job.score >= 60 ? "Very Likely" : job.score >= 30 ? "Likely" : "Possible"

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${job.verified ? "#00D68F35" : "#E8EEFF"}`, borderRadius: 16, padding: mob ? "14px" : "20px 24px", transition: "all 0.2s", position: "relative" }}
      onMouseEnter={e => { if (!mob) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,57,255,0.07)" } }}
      onMouseLeave={e => { if (!mob) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" } }}
    >
      {job.verified && <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #00D68F, #00A67E)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 10px", borderRadius: "0 16px 0 8px", letterSpacing: 0.5 }}>✓ UK GOV VERIFIED</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start", marginTop: job.verified ? 8 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ background: job.source === "Reed" ? "#e8534215" : "#7c4dff15", color: job.source === "Reed" ? "#e85342" : "#7c4dff", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{job.source}</span>
            {job.fresherFriendly && <span style={{ background: "#00D68F15", color: "#00D68F", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>🎓 Fresher</span>}
            {job.sponsorInfo?.town && <span style={{ background: "#0057FF08", color: "#0057FF", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>📍 {job.sponsorInfo.town}</span>}
          </div>
          <h3 style={{ fontSize: mob ? 14 : 15, fontWeight: 800, color: "#0A0F1E", margin: "0 0 3px", lineHeight: 1.3, paddingRight: 4 }}>{job.title}</h3>
          <div style={{ color: "#4B5675", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.employer} · {job.location}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
          <div style={{ background: `${scoreColor}15`, border: `1px solid ${scoreColor}40`, borderRadius: 20, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: scoreColor, whiteSpace: "nowrap" }}>{scoreLabel} {job.score}%</div>
          <button onClick={() => onSave(job)} style={{ background: saved ? "#0057FF10" : "none", border: `1px solid ${saved ? "#0057FF" : "#E8EEFF"}`, color: saved ? "#0057FF" : "#9CA3B8", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{saved ? "✓ Saved" : "Save"}</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 7, fontSize: 11, color: "#4B5675", flexWrap: "wrap" }}>
        {salary && <span>💷 {salary}</span>}
        {posted && <span>📅 {posted}</span>}
        {job.sponsorInfo?.route && <span>🛂 {job.sponsorInfo.route.split(":")[0]}</span>}
      </div>
      {job.signals?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {job.signals.map((s, i) => {
            const cols = { verified: "#00D68F", rating: "#00D68F", visa: "#0057FF", salary: "#FF6B35" }
            return <span key={i} style={{ background: `${cols[s.type] || "#888"}12`, color: cols[s.type] || "#888", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 600 }}>{s.label}</span>
          })}
        </div>
      )}
      {job.description && (
        <>
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: "#0057FF", fontSize: 11, cursor: "pointer", marginTop: 6, padding: 0, fontFamily: "inherit" }}>
            {expanded ? "▲ Hide" : "▼ Description"}
          </button>
          {expanded && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#4B5675", lineHeight: 1.7, borderTop: "1px solid #E8EEFF", paddingTop: 8, maxHeight: 140, overflow: "auto" }}>{job.description.replace(/<[^>]*>/g, "").slice(0, 500)}{job.description.length > 500 ? "…" : ""}</p>}
        </>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>Apply Now →</a>
        {job.sponsorInfo && <button onClick={() => navigate(`/employer/${encodeURIComponent(job.employer)}`)} style={{ background: "#00D68F10", border: "1px solid #00D68F30", color: "#00D68F", borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🏢</button>}
      </div>
    </div>
  )
}

const POPULAR_ROLES = ["Software Engineer","Data Analyst","Registered Nurse","Cyber Security Analyst","Civil Engineer","Pharmacist","Data Scientist","Accountant","General Practitioner","Machine Learning Engineer","Physiotherapist","Project Manager","DevOps Engineer","Mechanical Engineer","Social Worker","Radiographer","Financial Analyst","Business Analyst"]

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

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: f[k] === v ? "" : v }))
  const activeCount = Object.values(filters).filter(v => v !== "" && v !== "Score").length
  const displayJobs = q.length > 0 ? smartSearch(q, ALL_JOBS) : ALL_JOBS
  const displayLocs = loc.length > 0 ? ALL_LOCATIONS.filter(l => l.toLowerCase().includes(loc.toLowerCase())) : ALL_LOCATIONS

  // Load all jobs on page load (no search needed)
  useEffect(() => {
    handleSearch(1, true)
  }, [])

  // Auto search as user types
  useEffect(() => {
    if (!searched) return
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { handleSearch(1) }, 700)
    return () => clearTimeout(searchTimeout.current)
  }, [q, loc])

  const handleSave = async (job) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate("/auth"); return }
    if (savedJobs.has(job.id)) return
    await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: job.id, job_title: job.title, employer: job.employer, location: job.location, salary_min: job.salary_min, salary_max: job.salary_max, job_url: job.url, source: job.source, sponsorship_score: job.score })
    setSavedJobs(s => new Set([...s, job.id]))
  }

  const handleSearch = useCallback(async (p = 1, initial = false) => {
    setLoading(true); setError(""); setPage(p)
    try {
      let allJobs = []
      const searchTerm = q.trim()
      const [reedResult, adzunaResult] = await Promise.allSettled([
        fetchReed(searchTerm, loc, p),
        fetchAdzuna(searchTerm, loc, p),
      ])
      if (reedResult.status === "fulfilled") allJobs.push(...reedResult.value)
      if (adzunaResult.status === "fulfilled") allJobs.push(...adzunaResult.value)

      // Deduplicate
      const seen = new Set()
      allJobs = allJobs.filter(j => {
        const key = `${j.title.toLowerCase().slice(0, 30)}|${j.employer.toLowerCase()}`
        if (seen.has(key)) return false; seen.add(key); return true
      })

      // Batch verify sponsors
      const sponsorMap = await batchCheckSponsors(allJobs.map(j => j.employer))

      // Score all jobs
      let scored = allJobs.map(j => {
        const sponsorInfo = sponsorMap[j.employer]
        const { score, signals, fresherFriendly, verified } = scoreJob(j, sponsorInfo)
        return { ...j, score, signals, fresherFriendly, verified, sponsorInfo }
      }).filter(j => j.score >= 0)

      // Apply filters
      if (fresherOnly) scored = scored.filter(j => j.fresherFriendly)
      if (verifiedOnly) scored = scored.filter(j => j.verified)
      if (filters.jobType === "Full-time") scored = scored.filter(j => j.full_time === true)
      if (filters.jobType === "Part-time") scored = scored.filter(j => j.full_time === false)
      if (filters.salaryMin) scored = scored.filter(j => (j.salary_min || 0) >= parseInt(filters.salaryMin))
      if (filters.salaryMax) scored = scored.filter(j => (j.salary_max || 999999) <= parseInt(filters.salaryMax))
      if (filters.source === "Reed") scored = scored.filter(j => j.source === "Reed")
      if (filters.source === "Adzuna") scored = scored.filter(j => j.source === "Adzuna")

      // Sort — POSITIVE RESULTS FIRST: verified > high score > score
      scored.sort((a, b) => {
        // Verified sponsors always first
        if (a.verified && !b.verified) return -1
        if (!a.verified && b.verified) return 1
        // Then by score
        if (filters.sortBy === "Salary") return (b.salary_min || 0) - (a.salary_min || 0)
        if (filters.sortBy === "Date") return new Date(b.posted || 0) - new Date(a.posted || 0)
        return b.score - a.score
      })

      setJobs(p === 1 ? scored : prev => [...prev, ...scored])
      setSearched(true)
      setHasMore(scored.length >= 15)
    } catch (err) { setError("Search failed. Please try again."); console.error(err) }
    finally { setLoading(false) }
  }, [q, loc, fresherOnly, verifiedOnly, filters])

  const stats = { total: jobs.length, verified: jobs.filter(j => j.verified).length, fresher: jobs.filter(j => j.fresherFriendly).length }
  const pillStyle = (active) => ({ padding: "6px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? "#0057FF" : "#E8EEFF"}`, background: active ? "#0057FF0D" : "#F8FAFF", color: active ? "#0057FF" : "#4B5675", transition: "all 0.18s", fontFamily: "inherit" })
  const dropStyle = { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "rgba(255,255,255,0.98)", backdropFilter: "blur(12px)", borderRadius: 14, border: "1px solid #E8EEFF", boxShadow: "0 16px 48px rgba(0,57,255,0.1)", maxHeight: 260, overflowY: "auto", zIndex: 300 }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: mob ? "82px 4% 40px" : "96px 5% 60px" }}>

        <div style={{ marginBottom: mob ? 14 : 20 }}>
          <h1 style={{ fontSize: mob ? 20 : 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 4px", letterSpacing: -0.8 }}>Find UK Visa Sponsored Jobs</h1>
          <p style={{ color: "#4B5675", fontSize: mob ? 12 : 14, margin: 0 }}>125,284 verified UK sponsors · Results appear as you type · Positive results shown first</p>
        </div>

        {/* Search box */}
        <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 16, overflow: "visible", marginBottom: 10, boxShadow: "0 4px 24px rgba(0,57,255,0.06)", position: "relative", zIndex: 20 }}>
          <div style={{ position: "relative", borderBottom: "1px solid #E8EEFF" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>🔍</span>
            <input value={q} onChange={e => { setQ(e.target.value); setShowQ(true); setShowL(false) }} onFocus={() => { setShowQ(true); setShowL(false) }} onBlur={() => setTimeout(() => setShowQ(false), 200)} onKeyDown={e => e.key === "Enter" && handleSearch(1)} placeholder="Search any job role — or leave empty to see all sponsored jobs" style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: mob ? "14px 14px 14px 42px" : "14px 14px 14px 44px", fontSize: mob ? 14 : 15, color: "#0A0F1E", fontFamily: "inherit" }} />
            {loading && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#0057FF", fontWeight: 600 }}>Loading...</span>}
            {showQ && (
              <div style={dropStyle}>
                <div style={{ padding: "10px 14px 6px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  {q.length === 0 ? "All Roles A–Z" : "Matching roles"}
                </div>
                {displayJobs.slice(0, 12).map(s => (
                  <div key={s} onMouseDown={() => { setQ(s); setShowQ(false) }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: "#0A0F1E", borderBottom: "1px solid rgba(232,238,255,0.4)", display: "flex", alignItems: "center", gap: 8 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#0057FF08"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  ><span style={{ fontSize: 11, color: "#9CA3B8" }}>🔍</span>{s}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none" }}>📍</span>
              <input value={loc} onChange={e => { setLoc(e.target.value); setShowL(true); setShowQ(false) }} onFocus={() => { setShowL(true); setShowQ(false) }} onBlur={() => setTimeout(() => setShowL(false), 200)} onKeyDown={e => e.key === "Enter" && handleSearch(1)} placeholder="Any location in UK..." style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: "12px 12px 12px 36px", fontSize: 13, color: "#0A0F1E", fontFamily: "inherit" }} />
              {showL && (
                <div style={dropStyle}>
                  <div style={{ padding: "10px 14px 6px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8 }}>All Locations</div>
                  {displayLocs.slice(0, 8).map(s => (
                    <div key={s} onMouseDown={() => { setLoc(s); setShowL(false) }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: "#0A0F1E", borderBottom: "1px solid rgba(232,238,255,0.4)", display: "flex", alignItems: "center", gap: 8 }}
                      onMouseEnter={e => e.currentTarget.style.background = "#0057FF08"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    ><span style={{ fontSize: 11, color: "#9CA3B8" }}>📍</span>{s}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 1, height: 32, background: "#E8EEFF", flexShrink: 0 }} />
            <button onClick={() => setShowFilters(f => !f)} style={{ background: "none", border: "none", color: showFilters ? "#0057FF" : "#4B5675", padding: "0 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, height: 44, whiteSpace: "nowrap" }}>
              ⚙️ {activeCount > 0 && <span style={{ background: "#0057FF", color: "#fff", borderRadius: "50%", width: 15, height: 15, fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>}
            </button>
            <button onClick={() => handleSearch(1)} disabled={loading} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: "0 0 14px 0", padding: mob ? "12px 14px" : "12px 20px", fontSize: mob ? 12 : 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", height: 44 }}>
              Search
            </button>
          </div>
        </div>

        {/* Popular role pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "#9CA3B8", fontWeight: 600, alignSelf: "center", flexShrink: 0 }}>Popular:</span>
          {POPULAR_ROLES.slice(0, mob ? 6 : 10).map(role => (
            <button key={role} onClick={() => { setQ(role); handleSearch(1) }} style={{ background: q === role ? "#0057FF0D" : "#fff", border: `1px solid ${q === role ? "#0057FF" : "#E8EEFF"}`, color: q === role ? "#0057FF" : "#4B5675", borderRadius: 100, padding: "5px 11px", fontSize: 11, fontWeight: q === role ? 700 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s" }}>{role}</button>
          ))}
          {q && <button onClick={() => { setQ(""); handleSearch(1) }} style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", color: "#4B5675", borderRadius: 100, padding: "5px 11px", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>✕ All Jobs</button>}
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
          {[{ label: "🎓 Fresher only", val: fresherOnly, set: setFresherOnly, color: "#FF6B35" }, { label: "✓ Verified only", val: verifiedOnly, set: setVerifiedOnly, color: "#00D68F" }].map(t => (
            <div key={t.label} onClick={() => t.set(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: t.val ? t.color : "#E8EEFF", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: t.val ? 15 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 12, color: t.val ? t.color : "#4B5675", fontWeight: 600 }}>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        {showFilters && (
          <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 14, padding: mob ? "14px" : "18px 22px", marginBottom: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Contract</div><div style={{ display: "flex", gap: 6 }}>{["Full-time","Part-time","Contract"].map(v => <button key={v} onClick={() => setFilter("jobType", v)} style={pillStyle(filters.jobType === v)}>{v}</button>)}</div></div>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Sort</div><div style={{ display: "flex", gap: 6 }}>{["Score","Date","Salary"].map(v => <button key={v} onClick={() => setFilter("sortBy", v)} style={pillStyle(filters.sortBy === v)}>{v}</button>)}</div></div>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Source</div><div style={{ display: "flex", gap: 6 }}>{["Reed","Adzuna"].map(v => <button key={v} onClick={() => setFilter("source", v)} style={pillStyle(filters.source === v)}>{v}</button>)}</div></div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={filters.salaryMin} onChange={e => setFilter("salaryMin", e.target.value)} placeholder="Min salary £" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              <span style={{ color: "#9CA3B8", fontSize: 12 }}>–</span>
              <input value={filters.salaryMax} onChange={e => setFilter("salaryMax", e.target.value)} placeholder="Max salary £" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              {activeCount > 0 && <button onClick={() => setFilters({ salaryMin: "", salaryMax: "", jobType: "", source: "", sortBy: "Score" })} style={{ background: "none", border: "none", color: "#4B5675", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>✕ Clear</button>}
            </div>
          </div>
        )}

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#DC2626", fontSize: 13 }}>❌ {error}</div>}

        {/* Stats */}
        {jobs.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {[{ label: "Results", value: stats.total, color: "#0057FF" }, { label: "Gov Verified", value: stats.verified, color: "#00D68F" }, { label: "Fresher", value: stats.fresher, color: "#FF6B35" }].map(s => (
              <div key={s.label} style={{ background: "#fff", border: `1px solid ${s.color}20`, borderRadius: 10, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: mob ? 16 : 18, fontWeight: 900, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 10, color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && jobs.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1px solid #E8EEFF" }}>
                <div style={{ height: 14, background: "#F8FAFF", borderRadius: 4, width: "60%", marginBottom: 8, animation: "pulse 1.5s ease infinite" }} />
                <div style={{ height: 12, background: "#F8FAFF", borderRadius: 4, width: "40%", animation: "pulse 1.5s ease infinite 0.2s" }} />
              </div>
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
          </div>
        )}

        {/* Results */}
        {jobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: mob ? 10 : 12 }}>
            {jobs.map(job => <JobCard key={job.id} job={job} onSave={handleSave} saved={savedJobs.has(job.id)} navigate={navigate} mob={mob} />)}
            {hasMore && (
              <button onClick={() => handleSearch(page + 1)} disabled={loading} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 12, padding: "14px", color: "#4B5675", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
                {loading ? "Loading..." : "Load more →"}
              </button>
            )}
          </div>
        )}

        {/* No results */}
        {searched && jobs.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "48px 20px", background: "#fff", borderRadius: 20, border: "1px solid #E8EEFF" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>No results found</div>
            <div style={{ fontSize: 13, color: "#4B5675", marginBottom: 16 }}>Try removing filters or searching a different role</div>
            <button onClick={() => { setQ(""); setVerifiedOnly(false); setFresherOnly(false); handleSearch(1) }} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Show All Sponsored Jobs</button>
          </div>
        )}
      </div>
    </div>
  )
}
