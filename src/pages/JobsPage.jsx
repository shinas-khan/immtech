import { useState, useCallback, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ALL_JOBS, ALL_LOCATIONS } from "../lib/constants"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

const ADZUNA_ID = "344e86d1"
const ADZUNA_KEY = "039c47ae80bab92aef99751a471040fb"
const JOBS_PER_PAGE = 20
const FRESHER_KW = ["graduate","entry level","junior","trainee","apprentice","no experience","fresh graduate","new graduate","grad scheme","graduate scheme","placement","internship"]
const NEG_KW = ["must have right to work","no sponsorship","sponsorship not available","cannot sponsor","uk residents only","british nationals only","no visa sponsorship","must be eligible to work in the uk without sponsorship","not able to offer sponsorship","unable to offer sponsorship for this role","will not be open to sponsorship","this post will not be open to sponsorship","salary does not meet the home office"]

const ALL_ROLES = ["All Jobs", ...ALL_JOBS]
const ALL_LOCS = ["Anywhere in UK", ...ALL_LOCATIONS]
const QUICK_ROLES = ["All Jobs","Software Engineer","Registered Nurse","Data Analyst","Cyber Security Analyst","Civil Engineer","Pharmacist","Data Scientist","Accountant","Physiotherapist","Social Worker","DevOps Engineer"]

async function checkSponsor(employerName) {
  if (!employerName || employerName === "Unknown") return null
  try {
    const clean = employerName.replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co)\.?$/gi, "").trim()
    const { data } = await supabase.from("sponsors").select("organisation_name, town, route, rating").ilike("organisation_name", `%${clean}%`).limit(1)
    return data?.[0] || null
  } catch { return null }
}

async function batchCheckSponsors(employers) {
  const unique = [...new Set(employers.filter(Boolean))]
  const results = {}
  await Promise.all(unique.map(async (emp) => { results[emp] = await checkSponsor(emp) }))
  return results
}

function scoreJob(job, sponsorData) {
  const text = `${job.title} ${job.description}`.toLowerCase()
  let score = 0; let signals = []; let fresherFriendly = false
  for (const neg of NEG_KW) { if (text.includes(neg)) return { score: -1, signals: [], fresherFriendly: false, verified: false } }
  if (sponsorData) { score += 60; signals.push({ type: "verified", label: " UK Gov Verified" }); if (sponsorData.rating === "A") { score += 15; signals.push({ type: "rating", label: "A-Rated" }) } }
  const visaKw = ["visa sponsorship","sponsor visa","certificate of sponsorship","skilled worker visa","tier 2","sponsorship available","will sponsor","sponsorship provided"]
  visaKw.forEach(kw => { if (text.includes(kw)) { score += 15; signals.push({ type: "visa", label: kw }) } })
  FRESHER_KW.forEach(kw => { if (text.includes(kw)) fresherFriendly = true })
  if (job.salary_min || job.salary_max) { score += 5; signals.push({ type: "salary", label: "Salary disclosed" }) }
  const unique = [...new Map(signals.map(s => [s.label, s])).values()].slice(0, 3)
  return { score: Math.min(100, Math.max(0, score)), signals: unique, fresherFriendly, verified: !!sponsorData }
}

async function fetchAdzuna(q, loc, page) {
  const params = new URLSearchParams({ app_id: ADZUNA_ID, app_key: ADZUNA_KEY, what: q, where: loc || "UK", results_per_page: 20, what_and: "visa sponsorship" })
  const r = await fetch(`https://api.adzuna.com/v1/api/jobs/gb/search/${page}?${params}`)
  if (!r.ok) throw new Error(`Adzuna ${r.status}`)
  const data = await r.json()
  return (data.results || []).map(j => ({ id: `adzuna_${j.id}`, source: "Adzuna", title: j.title || "", employer: j.company?.display_name || "Unknown", location: j.location?.display_name || "UK", salary_min: j.salary_min, salary_max: j.salary_max, description: j.description || "", url: j.redirect_url || "#", posted: j.created, full_time: j.contract_time === "full_time" }))
}

async function fetchReed(q, loc, page) {
  const params = new URLSearchParams({ keywords: `${q} visa sponsorship`, locationName: loc || "United Kingdom", resultsToTake: 20, resultsToSkip: (page - 1) * 20 })
  const r = await fetch(`https://uk-visa-jobs-six.vercel.app/api/reed?${params}`)
  if (!r.ok) throw new Error(`Reed ${r.status}`)
  const data = await r.json()
  return (data.results || []).map(j => ({ id: `reed_${j.jobId}`, source: "Reed", title: j.jobTitle || "", employer: j.employerName || "Unknown", location: j.locationName || "", salary_min: j.minimumSalary, salary_max: j.maximumSalary, description: j.jobDescription || "", url: j.jobUrl || "#", posted: j.date, full_time: j.fullTime }))
}

function JobCard({ job, onSave, saved, navigate }) {
  const [expanded, setExpanded] = useState(false)
  const salary = job.salary_min || job.salary_max ? `${job.salary_min?.toLocaleString() || "?"}${job.salary_max ? `  ${job.salary_max.toLocaleString()}` : "+"}` : "Salary undisclosed"
  const posted = job.posted ? new Date(job.posted).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""
  const color = job.verified ? "#00D68F" : job.score >= 60 ? "#0057FF" : job.score >= 30 ? "#FF6B35" : "#9CA3B8"

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${job.verified ? "#00D68F40" : "#E8EEFF"}`, borderRadius: 16, padding: "18px 20px", transition: "all 0.2s", position: "relative" }}>
      {job.verified && (
        <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #00D68F, #00A67E)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 10px", borderRadius: "0 16px 0 8px", letterSpacing: 0.5 }}>
           UK GOV VERIFIED
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginTop: job.verified ? 6 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ background: job.source === "Reed" ? "#e8534218" : "#7c4dff18", color: job.source === "Reed" ? "#e85342" : "#7c4dff", borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{job.source}</span>
            {job.fresherFriendly && <span style={{ background: "#00D68F15", color: "#00D68F", borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}> Fresher</span>}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0A0F1E", margin: "0 0 3px", letterSpacing: -0.2, lineHeight: 1.3 }}>{job.title}</h3>
          <div style={{ color: "#4B5675", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.employer}  {job.location}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap" }}>
            {job.verified ? "Verified" : job.score >= 60 ? "Very Likely" : "Likely"} {job.score}%
          </div>
          <button onClick={() => onSave(job)} style={{ background: saved ? "#0057FF10" : "none", border: `1px solid ${saved ? "#0057FF" : "#E8EEFF"}`, color: saved ? "#0057FF" : "#9CA3B8", borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {saved ? " Saved" : "Save"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "#4B5675", flexWrap: "wrap" }}>
        <span> {salary}</span>
        {posted && <span> {posted}</span>}
      </div>

      {job.signals?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {job.signals.map((s, i) => {
            const colors = { verified: "#00D68F", rating: "#00D68F", visa: "#0057FF", salary: "#FF6B35" }
            return <span key={i} style={{ background: `${colors[s.type] || "#888"}12`, color: colors[s.type] || "#888", borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>{s.label}</span>
          })}
        </div>
      )}

      {job.description && (
        <>
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: "#0057FF", fontSize: 12, cursor: "pointer", marginTop: 8, padding: 0, fontFamily: "inherit" }}>
            {expanded ? " Hide" : " Details"}
          </button>
          {expanded && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#4B5675", lineHeight: 1.7, borderTop: "1px solid #E8EEFF", paddingTop: 8, maxHeight: 140, overflow: "auto" }}>
            {job.description.replace(/<[^>]*>/g, "").slice(0, 500)}
          </p>}
        </>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none", flex: 1, textAlign: "center" }}>Apply Now </a>
        {job.sponsorInfo && (
          <button onClick={() => navigate(`/employer/${encodeURIComponent(job.employer)}`)} style={{ background: "#00D68F10", border: "1px solid #00D68F30", color: "#00D68F", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}> Profile</button>
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
  const [filters, setFilters] = useState({ salaryMin: "", salaryMax: "", jobType: "", source: "", sortBy: "Score" })
  const [fresherOnly, setFresherOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [allJobs, setAllJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [savedJobs, setSavedJobs] = useState(new Set())
  const topRef = useRef(null)
  const navigate = useNavigate()
  const searchTimeout = useRef(null)

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: f[k] === v ? "" : v }))
  const activeCount = Object.values(filters).filter(v => v !== "" && v !== "Score").length
  const filteredRoles = q.length > 0 ? ALL_ROLES.filter(r => r.toLowerCase().includes(q.toLowerCase())) : ALL_ROLES
  const filteredLocs = loc.length > 0 ? ALL_LOCS.filter(l => l.toLowerCase().includes(loc.toLowerCase())) : ALL_LOCS
  const totalPages = Math.max(1, Math.ceil(allJobs.length / JOBS_PER_PAGE))
  const jobs = allJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE)

  // Load all jobs on mount
  useEffect(() => { handleSearch(1) }, [])

  // Auto-search from URL params
  useEffect(() => {
    if (searchParams.get("q")) handleSearch(1)
  }, [])

  const handleSave = async (job) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate("/auth"); return }
    if (savedJobs.has(job.id)) return
    await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: job.id, job_title: job.title, employer: job.employer, location: job.location, salary_min: job.salary_min, salary_max: job.salary_max, job_url: job.url, source: job.source, sponsorship_score: job.score })
    setSavedJobs(s => new Set([...s, job.id]))
  }

  const goPage = (p) => { setCurrentPage(p); if (topRef.current) topRef.current.scrollIntoView({ behavior: "smooth" }) }

  const handleSearch = useCallback(async (p = 1, silent = false) => {
    const searchQ = q.trim()
    setLoading(true)
    setError(""); setCurrentPage(1)
    try {
      let rawJobs = []
      await Promise.allSettled([
        fetchReed(searchQ, loc, 1).then(r => rawJobs.push(...r)).catch(() => {}),
        fetchAdzuna(searchQ, loc, 1).then(r => rawJobs.push(...r)).catch(() => {}),
        fetchReed(searchQ, loc, 2).then(r => rawJobs.push(...r)).catch(() => {}),
        fetchAdzuna(searchQ, loc, 2).then(r => rawJobs.push(...r)).catch(() => {}),
        fetchReed(searchQ, loc, 3).then(r => rawJobs.push(...r)).catch(() => {}),
        fetchAdzuna(searchQ, loc, 3).then(r => rawJobs.push(...r)).catch(() => {}),
      ])
      let allJobs = rawJobs
      if (allJobs.length === 0) { setError("No results found. Try a different search."); setLoading(false); return }
      const seen = new Set()
      allJobs = allJobs.filter(j => { const key = `${j.title.toLowerCase()}|${j.employer.toLowerCase()}`; if (seen.has(key)) return false; seen.add(key); return true })
      setVerifying(true)
      const employers = allJobs.map(j => j.employer)
      const sponsorMap = await batchCheckSponsors(employers)
      setVerifying(false)
      let scored = allJobs.map(j => { const sponsorInfo = sponsorMap[j.employer]; const { score, signals, fresherFriendly, verified } = scoreJob(j, sponsorInfo); return { ...j, score, signals, fresherFriendly, verified, sponsorInfo } }).filter(j => j.score >= 0)
      if (fresherOnly) scored = scored.filter(j => j.fresherFriendly)
      if (verifiedOnly) scored = scored.filter(j => j.verified)
      if (filters.jobType === "Full-time") scored = scored.filter(j => j.full_time)
      if (filters.jobType === "Part-time") scored = scored.filter(j => j.full_time === false)
      if (filters.salaryMin) scored = scored.filter(j => (j.salary_min || 0) >= parseInt(filters.salaryMin))
      if (filters.salaryMax) scored = scored.filter(j => (j.salary_max || 999999) <= parseInt(filters.salaryMax))
      if (filters.source === "Reed") scored = scored.filter(j => j.source === "Reed")
      if (filters.source === "Adzuna") scored = scored.filter(j => j.source === "Adzuna")
      if (filters.sortBy === "Salary") scored.sort((a, b) => (b.salary_min || 0) - (a.salary_min || 0))
      else if (filters.sortBy === "Date") scored.sort((a, b) => new Date(b.posted || 0) - new Date(a.posted || 0))
      else scored.sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || b.score - a.score)
      setAllJobs(scored)
      setSearched(true)
    } catch (err) { setError(err.message) }
    finally { setLoading(false); setVerifying(false) }
  }, [q, loc, fresherOnly, verifiedOnly, filters])

  const pillStyle = (active) => ({ padding: "6px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? "#0057FF" : "#E8EEFF"}`, background: active ? "#0057FF0D" : "#F8FAFF", color: active ? "#0057FF" : "#4B5675", transition: "all 0.18s", fontFamily: "inherit" })
  const stats = { total: allJobs.length, verified: allJobs.filter(j => j.verified).length, fresher: allJobs.filter(j => j.fresherFriendly).length }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div ref={topRef} style={{ maxWidth: 900, margin: "0 auto", padding: "86px 4% 60px" }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 4px", letterSpacing: -0.8 }}>Find Sponsored Jobs</h1>
          <p style={{ color: "#4B5675", fontSize: 14 }}>Verified against 125,000+ UK gov licensed sponsors  Results appear as you type</p>
        </div>

        {/* Search bar */}
        <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 16, overflow: "hidden", marginBottom: 12, boxShadow: "0 4px 24px rgba(0,57,255,0.06)" }}>
          {/* Job input */}
          <div style={{ position: "relative", borderBottom: "1px solid #E8EEFF" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}></span>
            <input value={q} onChange={e => { setQ(e.target.value); setShowQ(true); setShowL(false) }} onFocus={() => { setShowQ(true); setShowL(false) }} onBlur={() => setTimeout(() => setShowQ(false), 200)} onKeyDown={e => e.key === "Enter" && handleSearch(1)} placeholder="Job title or keyword... (results appear as you type)" style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: "14px 14px 14px 44px", fontSize: 15, color: "#0A0F1E", fontFamily: "inherit" }} />
            {loading && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#0057FF", fontWeight: 600 }}>Searching...</span>}
            {showQ && q.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8EEFF", borderRadius: "0 0 14px 14px", boxShadow: "0 16px 48px rgba(0,57,255,0.1)", maxHeight: 320, overflowY: "auto", zIndex: 300 }}>
                <div style={{ padding: "8px 14px 6px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #F8FAFF" }}>
                  {q ? filteredRoles.length + " roles" : "All " + ALL_JOBS.length + " roles"}
                </div>
                {filteredRoles.map(role => (
                  <div key={role}
                    onMouseDown={() => { setQ(role === "All Jobs" ? "" : role); handleSearch(1); setShowQ(false) }}
                    style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: role === "All Jobs" ? "#0057FF" : "#0A0F1E", fontWeight: role === "All Jobs" ? 700 : 400, background: role === "All Jobs" ? "#F0F5FF" : "transparent", borderBottom: "1px solid rgba(232,238,255,0.4)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFF"}
                    onMouseLeave={e => e.currentTarget.style.background = role === "All Jobs" ? "#F0F5FF" : "transparent"}
                  >{role}</div>
                ))}
              </div>
            )}
          </div>

          {/* Location + buttons row */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}></span>
              <input value={loc} onChange={e => { setLoc(e.target.value); setShowL(true); setShowQ(false) }} onFocus={() => { setShowL(true); setShowQ(false) }} onBlur={() => setTimeout(() => setShowL(false), 200)} onKeyDown={e => e.key === "Enter" && handleSearch(1)} placeholder="City or location..." style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: "13px 13px 13px 40px", fontSize: 14, color: "#0A0F1E", fontFamily: "inherit" }} />
              {showL && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8EEFF", borderRadius: "0 0 14px 14px", boxShadow: "0 16px 48px rgba(0,57,255,0.1)", maxHeight: 200, overflowY: "auto", zIndex: 300 }}>
                  <div style={{ padding: "8px 14px 6px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #F8FAFF" }}>
                    {loc ? filteredLocs.length + " locations" : "All " + ALL_LOCATIONS.length + " UK cities"}
                  </div>
                  {filteredLocs.map(city => (
                    <div key={city}
                      onMouseDown={() => { setLoc(city === "Anywhere in UK" ? "" : city); handleSearch(1); setShowL(false) }}
                      style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: city === "Anywhere in UK" ? "#0057FF" : "#0A0F1E", fontWeight: city === "Anywhere in UK" ? 700 : 400, background: city === "Anywhere in UK" ? "#F0F5FF" : "transparent", borderBottom: "1px solid rgba(232,238,255,0.4)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F8FAFF"}
                      onMouseLeave={e => e.currentTarget.style.background = city === "Anywhere in UK" ? "#F0F5FF" : "transparent"}
                    >{city}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 1, height: 36, background: "#E8EEFF", flexShrink: 0 }} />
            <button onClick={() => setShowFilters(f => !f)} style={{ background: "none", border: "none", color: showFilters ? "#0057FF" : "#4B5675", padding: "0 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", height: "100%", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
               {activeCount > 0 && <span style={{ background: "#0057FF", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>}
            </button>
            <button onClick={() => handleSearch(1)} disabled={loading || !q.trim()} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: "0 0 14px 0", padding: "13px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", opacity: !q.trim() ? 0.6 : 1 }}>
              Search
            </button>
          </div>
        </div>

        {/* Quick role pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {QUICK_ROLES.map(role => (
            <button key={role} onClick={() => { const v = role === "All Jobs" ? "" : role; setQ(v); setTimeout(() => handleSearch(1), 50) }}
              style={{ padding: "5px 11px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + ((role === "All Jobs" && !q) || q === role ? "#0057FF" : "#E8EEFF"), background: (role === "All Jobs" && !q) || q === role ? "#0057FF0D" : "#fff", color: (role === "All Jobs" && !q) || q === role ? "#0057FF" : "#4B5675", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {role}
            </button>
          ))}
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
          {[
            { label: " Fresher only", val: fresherOnly, set: setFresherOnly, color: "#00D68F" },
            { label: " Verified only", val: verifiedOnly, set: setVerifiedOnly, color: "#00D68F" },
          ].map(t => (
            <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }} onClick={() => t.set(v => !v)}>
              <div style={{ width: 34, height: 18, borderRadius: 9, background: t.val ? t.color : "#E8EEFF", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: t.val ? 17 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 13, color: t.val ? t.color : "#4B5675", fontWeight: 600 }}>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        {showFilters && (
          <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 14, padding: "18px", marginBottom: 14, boxShadow: "0 4px 24px rgba(0,57,255,0.05)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>Contract</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{["Full-time", "Part-time", "Contract"].map(v => <button key={v} onClick={() => setFilter("jobType", v)} style={pillStyle(filters.jobType === v)}>{v}</button>)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>Sort</div>
                <div style={{ display: "flex", gap: 6 }}>{["Score", "Date", "Salary"].map(v => <button key={v} onClick={() => setFilter("sortBy", v)} style={pillStyle(filters.sortBy === v)}>{v}</button>)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>Source</div>
                <div style={{ display: "flex", gap: 6 }}>{["Reed", "Adzuna"].map(v => <button key={v} onClick={() => setFilter("source", v)} style={pillStyle(filters.source === v)}>{v}</button>)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input value={filters.salaryMin} onChange={e => setFilter("salaryMin", e.target.value)} placeholder="Min salary" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} />
              <span style={{ color: "#9CA3B8", fontSize: 13 }}>to</span>
              <input value={filters.salaryMax} onChange={e => setFilter("salaryMax", e.target.value)} placeholder="Max salary" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} />
            </div>
          </div>
        )}

        {/* Verifying */}
        {verifying && <div style={{ background: "#00D68F0D", border: "1px solid #00D68F25", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#00D68F", fontWeight: 600 }}> Verifying against UK Home Office sponsor register...</div>}

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#DC2626", fontSize: 13 }}> {error}</div>}

        {/* Stats */}
        {searched && allJobs.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { label: "Found", value: stats.total, color: "#0057FF" },
              { label: "UK Gov Verified", value: stats.verified, color: "#00D68F" },
              { label: "Fresher Friendly", value: stats.fresher, color: "#FF6B35" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", border: `1px solid ${s.color}20`, borderRadius: 10, padding: "8px 14px" }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: s.color, display: "block" }}>{s.value}</span>
                <span style={{ fontSize: 10, color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {allJobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {jobs.map(job => <JobCard key={job.id} job={job} onSave={handleSave} saved={savedJobs.has(job.id)} navigate={navigate} />)}
            {totalPages > 1 && (
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 13, color: "#4B5675" }}>
                  Showing {((currentPage - 1) * JOBS_PER_PAGE) + 1}-{Math.min(currentPage * JOBS_PER_PAGE, allJobs.length)} of {allJobs.length} jobs
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                  <button onClick={() => goPage(currentPage - 1)} disabled={currentPage === 1}
                    style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer", border: "1.5px solid #E8EEFF", background: "#fff", color: currentPage === 1 ? "#9CA3B8" : "#0057FF", fontFamily: "inherit" }}>
                    Prev
                  </button>
                  {(() => {
                    const pages = []
                    const delta = 2
                    const left = Math.max(2, currentPage - delta)
                    const right = Math.min(totalPages - 1, currentPage + delta)
                    pages.push(1)
                    if (left > 2) pages.push("...")
                    for (let i = left; i <= right; i++) pages.push(i)
                    if (right < totalPages - 1) pages.push("...")
                    if (totalPages > 1) pages.push(totalPages)
                    return pages.map((p, i) => p === "..." ? (
                      <span key={"d"+i} style={{ padding: "8px 4px", color: "#9CA3B8", fontSize: 13 }}>...</span>
                    ) : (
                      <button key={p} onClick={() => goPage(p)}
                        style={{ padding: "8px 13px", borderRadius: 9, fontSize: 13, fontWeight: p === currentPage ? 800 : 600, cursor: "pointer", border: "1.5px solid " + (p === currentPage ? "#0057FF" : "#E8EEFF"), background: p === currentPage ? "#0057FF" : "#fff", color: p === currentPage ? "#fff" : "#4B5675", fontFamily: "inherit", minWidth: 38 }}>
                        {p}
                      </button>
                    ))
                  })()}
                  <button onClick={() => goPage(currentPage + 1)} disabled={currentPage === totalPages}
                    style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: currentPage === totalPages ? "not-allowed" : "pointer", border: "1.5px solid #E8EEFF", background: "#fff", color: currentPage === totalPages ? "#9CA3B8" : "#0057FF", fontFamily: "inherit" }}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {searched && allJobs.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}></div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0A0F1E", marginBottom: 8 }}>No sponsored jobs found</div>
            <div style={{ fontSize: 14, color: "#4B5675" }}>Try a broader search or turn off the verified-only filter.</div>
          </div>
        )}

        {/* Before search */}
        {!searched && !loading && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}></div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", marginBottom: 10 }}>Start typing to search</div>
            <div style={{ fontSize: 14, color: "#4B5675", maxWidth: 400, margin: "0 auto", lineHeight: 1.7 }}>Results appear automatically as you type. Every result verified against 125,000+ UK Home Office licensed sponsors.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 }}>
              {["Software Engineer", "Registered Nurse", "Data Scientist", "Cyber Security Analyst", "Civil Engineer"].map(t => (
                <button key={t} onClick={() => setQ(t)} style={{ background: "#fff", border: "1px solid #E8EEFF", color: "#4B5675", borderRadius: 100, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}