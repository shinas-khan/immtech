import { useState, useCallback, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { C, ALL_JOBS, ALL_LOCATIONS, smartSearch } from "../lib/constants"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

const ADZUNA_ID = "344e86d1"
const ADZUNA_KEY = "039c47ae80bab92aef99751a471040fb"
const FRESHER_KW = ["graduate","entry level","junior","trainee","apprentice","no experience","fresh graduate","grad scheme","graduate scheme","placement","internship"]
const NEG_KW = ["must have right to work","no sponsorship","sponsorship not available","cannot sponsor","uk residents only","british nationals only","no visa"]

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
  if (sponsorData) { score += 60; signals.push({ type: "verified", label: "✓ UK Gov Verified" }); if (sponsorData.rating === "A") { score += 15; signals.push({ type: "rating", label: "A-Rated" }) } }
  const visaKw = ["visa sponsorship","sponsor visa","certificate of sponsorship","skilled worker visa","tier 2","sponsorship available","will sponsor","sponsorship provided"]
  visaKw.forEach(kw => { if (text.includes(kw)) { score += 15; signals.push({ type: "visa", label: kw }) } })
  FRESHER_KW.forEach(kw => { if (text.includes(kw)) fresherFriendly = true })
  if (job.salary_min || job.salary_max) { score += 5; signals.push({ type: "salary", label: "Salary disclosed" }) }
  const unique = [...new Map(signals.map(s => [s.label, s])).values()].slice(0, 3)
  return { score: Math.min(100, Math.max(0, score)), signals: unique, fresherFriendly, verified: !!sponsorData }
}

async function fetchAdzuna(q, loc, page) {
  const params = new URLSearchParams({ app_id: ADZUNA_ID, app_key: ADZUNA_KEY, what: q || "visa sponsorship", where: loc || "UK", results_per_page: 20, what_and: "visa sponsorship" })
  const r = await fetch(`https://api.adzuna.com/v1/api/jobs/gb/search/${page}?${params}`)
  if (!r.ok) throw new Error(`Adzuna ${r.status}`)
  const data = await r.json()
  return (data.results || []).map(j => ({ id: `adzuna_${j.id}`, source: "Adzuna", title: j.title || "", employer: j.company?.display_name || "Unknown", location: j.location?.display_name || "UK", salary_min: j.salary_min, salary_max: j.salary_max, description: j.description || "", url: j.redirect_url || "#", posted: j.created, full_time: j.contract_time === "full_time" }))
}

async function fetchReed(q, loc, page) {
  const params = new URLSearchParams({ keywords: `${q || ""} visa sponsorship`, locationName: loc || "United Kingdom", resultsToTake: 20, resultsToSkip: (page - 1) * 20 })
  const r = await fetch(`https://uk-visa-jobs-six.vercel.app/api/reed?${params}`)
  if (!r.ok) throw new Error(`Reed ${r.status}`)
  const data = await r.json()
  return (data.results || []).map(j => ({ id: `reed_${j.jobId}`, source: "Reed", title: j.jobTitle || "", employer: j.employerName || "Unknown", location: j.locationName || "", salary_min: j.minimumSalary, salary_max: j.maximumSalary, description: j.jobDescription || "", url: j.jobUrl || "#", posted: j.date, full_time: j.fullTime }))
}

function JobCard({ job, onSave, saved, navigate }) {
  const [expanded, setExpanded] = useState(false)
  const salary = job.salary_min || job.salary_max ? `£${job.salary_min?.toLocaleString() || "?"}${job.salary_max ? ` – £${job.salary_max.toLocaleString()}` : "+"}` : "Salary undisclosed"
  const posted = job.posted ? new Date(job.posted).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""
  const color = job.verified ? "#00D68F" : job.score >= 60 ? "#0057FF" : job.score >= 30 ? "#FF6B35" : "#9CA3B8"

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${job.verified ? "#00D68F40" : "#E8EEFF"}`, borderRadius: 16, padding: "20px 22px", transition: "all 0.2s", position: "relative" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,57,255,0.07)" }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" }}
    >
      {job.verified && (
        <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #00D68F, #00A67E)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 12px", borderRadius: "0 16px 0 8px", letterSpacing: 0.5 }}>
          ✓ UK GOV VERIFIED SPONSOR
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginTop: job.verified ? 8 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
            <span style={{ background: job.source === "Reed" ? "#e8534218" : "#7c4dff18", color: job.source === "Reed" ? "#e85342" : "#7c4dff", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{job.source}</span>
            {job.fresherFriendly && <span style={{ background: "#00D68F15", color: "#00D68F", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>🎓 Fresher</span>}
            {job.sponsorInfo?.route && <span style={{ background: "#0057FF08", color: "#0057FF", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>🛂 {job.sponsorInfo.route}</span>}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0A0F1E", margin: "0 0 4px", letterSpacing: -0.2, lineHeight: 1.3 }}>{job.title}</h3>
          <div style={{ color: "#4B5675", fontSize: 13 }}>{job.employer} · {job.location}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap" }}>
            {job.verified ? "Verified" : job.score >= 60 ? "Very Likely" : "Likely"} {job.score}%
          </div>
          <button onClick={() => onSave(job)} style={{ background: saved ? "#0057FF10" : "none", border: `1px solid ${saved ? "#0057FF" : "#E8EEFF"}`, color: saved ? "#0057FF" : "#9CA3B8", borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {saved ? "✓ Saved" : "🔖 Save"}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12, color: "#4B5675", flexWrap: "wrap" }}>
        <span>💷 {salary}</span>
        {posted && <span>📅 {posted}</span>}
        {job.full_time !== undefined && <span>{job.full_time ? "Full-time" : "Part-time"}</span>}
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
            {expanded ? "▲ Hide details" : "▼ Show description"}
          </button>
          {expanded && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#4B5675", lineHeight: 1.7, borderTop: "1px solid #E8EEFF", paddingTop: 8, maxHeight: 160, overflow: "auto" }}>
            {job.description.replace(/<[^>]*>/g, "").slice(0, 600)}…
          </p>}
        </>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>Apply Now →</a>
        {job.sponsorInfo && (
          <button onClick={() => navigate(`/employer/${encodeURIComponent(job.employer)}`)} style={{ background: "#00D68F10", border: "1px solid #00D68F30", color: "#00D68F", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🏢</button>
        )}
      </div>
    </div>
  )
}

// Dropdown component
function SearchDropdown({ value, onChange, placeholder, icon, options, onSelect }) {
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
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer", background: open ? "#F8FAFF" : "#fff" }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 15, color: value ? "#0A0F1E" : "#9CA3B8", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {value || placeholder}
        </span>
        <span style={{ color: "#9CA3B8", fontSize: 12, flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>▼</span>
      </div>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #0057FF40", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,57,255,0.12)", zIndex: 400, overflow: "hidden" }}>
          {/* Search input inside dropdown */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #E8EEFF", position: "sticky", top: 0, background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 13, color: "#9CA3B8" }}>🔍</span>
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder={`Search ${placeholder.toLowerCase()}...`}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#0A0F1E", fontFamily: "inherit", flex: 1 }}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
              {filter && <span onClick={() => setFilter("")} style={{ cursor: "pointer", color: "#9CA3B8", fontSize: 14 }}>✕</span>}
            </div>
          </div>

          {/* Clear option */}
          {value && (
            <div onClick={() => { onSelect(""); setOpen(false); setFilter("") }} style={{ padding: "10px 16px", fontSize: 13, color: "#DC2626", cursor: "pointer", borderBottom: "1px solid #E8EEFF", fontWeight: 600 }}>
              ✕ Clear selection
            </div>
          )}

          {/* Options list */}
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center", color: "#9CA3B8", fontSize: 14 }}>No results found</div>
            ) : (
              filtered.map(opt => (
                <div key={opt} onClick={() => { onSelect(opt); setOpen(false); setFilter("") }}
                  style={{ padding: "11px 16px", fontSize: 14, color: opt === value ? "#0057FF" : "#0A0F1E", fontWeight: opt === value ? 700 : 400, cursor: "pointer", background: opt === value ? "#0057FF08" : "transparent", borderBottom: "1px solid rgba(232,238,255,0.5)", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = "#F8FAFF" }}
                  onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background = "transparent" }}
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
  const [savedJobs, setSavedJobs] = useState(new Set())
  const navigate = useNavigate()

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: f[k] === v ? "" : v }))
  const activeCount = Object.values(filters).filter(v => v !== "" && v !== "Score").length

  // Load all jobs on page mount
  useEffect(() => {
    handleSearch(1, q || "", loc || "")
  }, [])

  const handleSave = async (job) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate("/auth"); return }
    if (savedJobs.has(job.id)) return
    await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: job.id, job_title: job.title, employer: job.employer, location: job.location, salary_min: job.salary_min, salary_max: job.salary_max, job_url: job.url, source: job.source, sponsorship_score: job.score })
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
      if (allJobs.length === 0) { setError("No results found. Try a different search or location."); setLoading(false); return }

      // Deduplicate
      const seen = new Set()
      allJobs = allJobs.filter(j => { const key = `${j.title.toLowerCase()}|${j.employer.toLowerCase()}`; if (seen.has(key)) return false; seen.add(key); return true })

      // Verify against sponsor register
      setVerifying(true)
      const sponsorMap = await batchCheckSponsors(allJobs.map(j => j.employer))
      setVerifying(false)

      // Score
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
      if (filters.sortBy === "Salary") scored.sort((a, b) => (b.salary_min || 0) - (a.salary_min || 0))
      else if (filters.sortBy === "Date") scored.sort((a, b) => new Date(b.posted || 0) - new Date(a.posted || 0))
      else scored.sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || b.score - a.score)

      setJobs(p === 1 ? scored : prev => [...prev, ...scored])
    } catch (err) { setError(err.message) }
    finally { setLoading(false); setVerifying(false) }
  }, [q, loc, fresherOnly, verifiedOnly, filters])

  const pillStyle = (active) => ({ padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? "#0057FF" : "#E8EEFF"}`, background: active ? "#0057FF0D" : "#F8FAFF", color: active ? "#0057FF" : "#4B5675", transition: "all 0.18s", fontFamily: "inherit" })
  const stats = { total: jobs.length, verified: jobs.filter(j => j.verified).length, fresher: jobs.filter(j => j.fresherFriendly).length }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "86px 4% 60px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 6px", letterSpacing: -1 }}>Find Sponsored Jobs</h1>
          <p style={{ color: "#4B5675", fontSize: 14 }}>Every employer verified against 125,000+ UK Home Office licensed sponsors</p>
        </div>

        {/* Search bar with dropdowns */}
        <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 18, overflow: "visible", marginBottom: 14, boxShadow: "0 4px 24px rgba(0,57,255,0.06)", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>

            {/* Job role dropdown */}
            <SearchDropdown
              value={q}
              placeholder="Job title or role"
              icon="🔍"
              options={ALL_JOBS}
              onSelect={(val) => { setQ(val); handleSearch(1, val, loc) }}
            />

            <div style={{ width: 1, background: "#E8EEFF", flexShrink: 0 }} />

            {/* Location dropdown */}
            <SearchDropdown
              value={loc}
              placeholder="Location"
              icon="📍"
              options={ALL_LOCATIONS}
              onSelect={(val) => { setLoc(val); handleSearch(1, q, val) }}
            />

            <div style={{ width: 1, background: "#E8EEFF", flexShrink: 0 }} />

            {/* Filters toggle */}
            <button onClick={() => setShowFilters(f => !f)} style={{ background: showFilters ? "#0057FF0D" : "none", border: "none", color: showFilters ? "#0057FF" : "#4B5675", padding: "0 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
              ⚙️ Filters
              {activeCount > 0 && <span style={{ background: "#0057FF", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>}
            </button>

            {/* Search button */}
            <button onClick={() => handleSearch(1)} disabled={loading} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: "0 16px 16px 0", padding: "0 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", minHeight: 54, flexShrink: 0 }}>
              {loading ? "⏳" : "Search →"}
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { label: "🎓 Fresher friendly only", val: fresherOnly, set: setFresherOnly, color: "#FF6B35" },
            { label: "✓ UK Gov verified only", val: verifiedOnly, set: setVerifiedOnly, color: "#00D68F" },
          ].map(t => (
            <div key={t.label} onClick={() => { t.set(v => !v); setTimeout(() => handleSearch(1), 100) }} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: t.val ? t.color : "#E8EEFF", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: t.val ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
              </div>
              <span style={{ fontSize: 13, color: t.val ? t.color : "#4B5675", fontWeight: 600 }}>{t.label}</span>
            </div>
          ))}
          {(q || loc) && (
            <button onClick={() => { setQ(""); setLoc(""); handleSearch(1, "", "") }} style={{ background: "none", border: "none", color: "#9CA3B8", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
              Clear search
            </button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 14, padding: "18px 20px", marginBottom: 16, boxShadow: "0 4px 24px rgba(0,57,255,0.05)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Contract Type</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{["Full-time", "Part-time", "Contract", "Permanent"].map(v => <button key={v} onClick={() => setFilter("jobType", v)} style={pillStyle(filters.jobType === v)}>{v}</button>)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Sort By</div>
                <div style={{ display: "flex", gap: 6 }}>{["Score", "Date", "Salary"].map(v => <button key={v} onClick={() => setFilter("sortBy", v)} style={pillStyle(filters.sortBy === v)}>{v}</button>)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Source</div>
                <div style={{ display: "flex", gap: 6 }}>{["Reed", "Adzuna"].map(v => <button key={v} onClick={() => setFilter("source", v)} style={pillStyle(filters.source === v)}>{v}</button>)}</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Salary Range (£)</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input value={filters.salaryMin} onChange={e => setFilter("salaryMin", e.target.value)} placeholder="Min e.g. 25000" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} />
                <span style={{ color: "#9CA3B8" }}>—</span>
                <input value={filters.salaryMax} onChange={e => setFilter("salaryMax", e.target.value)} placeholder="Max e.g. 80000" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} />
                <button onClick={() => handleSearch(1)} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Apply</button>
              </div>
            </div>
          </div>
        )}

        {/* Verifying indicator */}
        {verifying && (
          <div style={{ background: "#00D68F0D", border: "1px solid #00D68F25", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#00D68F", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, border: "2px solid #00D68F", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Verifying employers against UK Home Office sponsor register...
          </div>
        )}

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 14, color: "#DC2626", fontSize: 13 }}>❌ {error}</div>}

        {/* Stats bar */}
        {jobs.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "Results", value: stats.total, color: "#0057FF" },
                { label: "Verified", value: stats.verified, color: "#00D68F" },
                { label: "Fresher", value: stats.fresher, color: "#FF6B35" },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", border: `1px solid ${s.color}20`, borderRadius: 10, padding: "7px 14px", display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</span>
                  <span style={{ fontSize: 11, color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.label}</span>
                </div>
              ))}
            </div>
            {q && <span style={{ fontSize: 13, color: "#4B5675" }}>for <strong>"{q}"</strong>{loc ? ` in <strong>${loc}</strong>` : ""}</span>}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && jobs.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 16, padding: "20px 22px", animation: "pulse 1.5s ease infinite" }}>
                <div style={{ height: 14, background: "#E8EEFF", borderRadius: 6, width: "60%", marginBottom: 10 }} />
                <div style={{ height: 12, background: "#E8EEFF", borderRadius: 6, width: "40%", marginBottom: 8 }} />
                <div style={{ height: 10, background: "#E8EEFF", borderRadius: 6, width: "30%" }} />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {jobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {jobs.map(job => <JobCard key={job.id} job={job} onSave={handleSave} saved={savedJobs.has(job.id)} navigate={navigate} />)}
            <button onClick={() => handleSearch(page + 1)} disabled={loading} style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 12, padding: "14px", color: "#4B5675", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#F8FAFF"; e.currentTarget.style.borderColor = "#0057FF30" }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#E8EEFF" }}
            >{loading ? "Loading more..." : "Load more results →"}</button>
          </div>
        )}

        {/* Empty */}
        {!loading && jobs.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🔎</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>No jobs found</div>
            <div style={{ fontSize: 14, color: "#4B5675", marginBottom: 20 }}>Try a different role or location, or turn off the verified-only filter.</div>
            <button onClick={() => handleSearch(1, "", "")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Show all sponsored jobs</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}
