import { useState, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ALL_JOBS, ALL_LOCATIONS } from "../lib/constants"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

//  CONFIG 
const ADZUNA_ID  = "344e86d1"
const ADZUNA_KEY = "039c47ae80bab92aef99751a471040fb"
const PER_PAGE   = 20

//  QUICK ROLE PILLS 
const QUICK = [
  "All Jobs","Software Engineer","Registered Nurse","Data Analyst",
  "Cyber Security Analyst","Civil Engineer","Pharmacist","Data Scientist",
  "Accountant","Physiotherapist","Social Worker","DevOps Engineer",
]

//  SPONSORSHIP CONFIRMATION KEYWORDS 
// A job MUST contain at least one of these to be shown.
// This is the core rule: no confirmation = not shown.
const CONFIRM_KW = [
  "certificate of sponsorship",
  "cos will be provided",
  "cos provided",
  "we will sponsor",
  "visa sponsorship provided",
  "visa sponsorship available",
  "visa sponsorship offered",
  "sponsorship is available",
  "sponsorship provided",
  "sponsorship available",
  "we can sponsor",
  "will sponsor",
  "open to sponsorship",
  "tier 2 sponsorship",
  "ukvi sponsorship",
  "skilled worker visa sponsorship",
  "visa support provided",
  "sponsorship for the right candidate",
  "sponsorship considered",
  "visa provided",
  "will provide visa sponsorship",
  "able to offer sponsorship",
  "happy to sponsor",
  "can provide sponsorship",
]

//  HARD REJECTION KEYWORDS 
// If any of these appear the job is removed regardless of anything else.
const REJECT_KW = [
  "no sponsorship",
  "cannot sponsor",
  "no visa sponsorship",
  "sponsorship not available",
  "unable to offer sponsorship",
  "unable to sponsor",
  "we do not offer sponsorship",
  "does not offer sponsorship",
  "cannot offer visa",
  "not in a position to sponsor",
  "sponsorship cannot be offered",
  "we are unable to offer visa",
  "uk residents only",
  "british nationals only",
  "must have right to work",
  "must be eligible to work in the uk without",
  "right to work without sponsorship",
  "must already have the right to work",
  "you must have the right to work",
  "applicants must have the right to work",
  "only applicants with the right to work",
  "right to work in the uk is required",
  "own right to work",
  "not eligible for uk visa sponsorship",
  "not eligible for visa sponsorship",
  "this post is not eligible for",
  "not open to sponsorship",
  "will not be open to sponsorship",
  "this post will not be open to sponsorship",
  "salary does not meet the home office",
  "does not meet the home office requirements",
  "unable to accept applicants with skilled worker",
  "not open to skilled worker visa",
  "cannot accept applicants who require sponsorship",
  "we cannot accept applications from candidates who require",
  "this vacancy does not offer",
  "this role does not offer sponsorship",
  "no work permit",
  "work permit will not be sponsored",
  "cannot provide certificate of sponsorship",
  "visa sponsorship is not available",
  "sponsorship is not provided",
  "we do not provide sponsorship",
  "you must not require sponsorship",
  "not able to offer sponsorship",
  "unable to offer sponsorship for this role",
  "will not be able to progress any candidates who require",
  "require a certificate of sponsorship to work",
  "this role does not qualify for sponsorship",
  "this position is not eligible for sponsorship",
  "we are not in a position to sponsor",
  "self sponsored",
  "self-sponsored",
  "sponsor yourself",
  "acquire own business",
  "own your own business",
  "professional fees will apply",
  "registration fee",
  "upfront fee",
  "admin fee required",
]

//  INELIGIBLE ROLES (SOC) 
const INELIGIBLE = [
  "teaching assistant","learning support","classroom assistant","hlta",
  "chef ","sous chef","head chef","kitchen porter","kitchen assistant",
  "waiter","waitress","barista","hospitality assistant",
  "housekeeper","cleaner ","cleaning operative",
  "delivery driver","van driver","lorry driver",
  "retail assistant","shop assistant",
  "care assistant","healthcare assistant",
  "warehouse operative","warehouse assistant","packing operative",
  "security guard","security officer ",
]

//  FRESHER KEYWORDS 
const FRESHER_KW = [
  "graduate","entry level","junior","trainee","apprentice",
  "grad scheme","graduate scheme","no experience required",
]

//  SPONSOR REGISTER CHECK 
async function checkSponsor(name) {
  if (!name || name === "Unknown") return null
  try {
    const clean = name
      .replace(/\\s+(ltd|limited|plc|llp|inc|group|uk|co|corp|corporation|holdings|services|solutions|international|technologies|technology|systems|consulting|consultancy|recruitment|staffing|agency)\\.?$/gi, "")
      .replace(/[^\\w\\s]/g, " ").trim()
    if (clean.length < 2) return null
    const { data: a } = await supabase.from("sponsors")
      .select("organisation_name,town,route,rating")
      .ilike("organisation_name", name).limit(1)
    if (a && a[0]) return a[0]
    const { data: b } = await supabase.from("sponsors")
      .select("organisation_name,town,route,rating")
      .ilike("organisation_name", "%" + clean + "%").limit(1)
    if (b && b[0]) return b[0]
    const w = clean.split(" ")[0]
    if (w.length >= 4) {
      const { data: c } = await supabase.from("sponsors")
        .select("organisation_name,town,route,rating")
        .ilike("organisation_name", w + "%").limit(1)
      if (c && c[0]) return c[0]
    }
    return null
  } catch { return null }
}

async function batchCheck(employers) {
  const unique = [...new Set(employers.filter(Boolean))]
  const map = {}
  for (let i = 0; i < unique.length; i += 8) {
    await Promise.all(
      unique.slice(i, i + 8).map(async e => { map[e] = await checkSponsor(e) })
    )
  }
  return map
}

//  CORE FILTER 
// Returns true only if the job is confirmed to offer sponsorship.
// Three-step logic:
//   1. Reject if title is an ineligible role (SOC check)
//   2. Reject if any hard rejection keyword found in text
// SPONSORSHIP LIKELIHOOD SCORING
//
// Instead of hard pass/fail, every job gets a likelihood score 0-100.
// Score determines the label on the card:
//   80-100 = "Confirmed"   (gov verified + explicit keywords)
//   60-79  = "Very Likely" (gov verified OR strong keywords)
//   40-59  = "Likely"      (some positive signals, no rejections)
//   1-39   = "Possible"    (no strong signals but no rejection either)
//   0      = removed       (hard rejection OR ineligible role)
//
// This shows more jobs but ranks them honestly by likelihood.

function scoreJob(job, sponsor) {
  const title = (job.title || "").toLowerCase()

  // Hard remove - ineligible SOC role
  for (const r of INELIGIBLE) {
    if (title.includes(r.trim())) return 0
  }

  const raw  = (job.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")
  const text = (title + " " + raw + " " + (job.employer||"")).toLowerCase()

  // Hard remove - explicit rejection phrase
  for (const neg of REJECT_KW) {
    if (text.includes(neg)) return 0
  }

  let score = 0

  // +55 on gov register (employer is licensed to sponsor)
  if (sponsor) {
    score += 55
    if (sponsor.rating === "A") score += 10
  }

  // +30 explicit confirmation keyword
  for (const kw of CONFIRM_KW) {
    if (text.includes(kw)) { score += 30; break }
  }

  // +10 general visa keyword (weaker signal)
  const weakKW = ["visa sponsorship","sponsor visa","skilled worker visa","tier 2","ukvi","international applicants","relocation package"]
  for (const kw of weakKW) {
    if (text.includes(kw)) { score += 10; break }
  }

  // +5 salary shown
  if (job.salary_min && job.salary_min > 500) score += 5

  // If still 0 - no signals but also no rejection - show as Possible
  if (score === 0) score = 15

  return Math.min(100, score)
}

function buildJob(job, sponsor) {
  const score = scoreJob(job, sponsor)
  if (score === 0) return null

  const raw  = (job.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")
  const text = (job.title + " " + raw + " " + (job.employer||"")).toLowerCase()

  const sigs = []
  if (sponsor) {
    sigs.push({ t:"v", label:"Gov Verified" })
    if (sponsor.rating === "A") sigs.push({ t:"v", label:"A-Rated" })
  }
  for (const kw of CONFIRM_KW) {
    if (text.includes(kw)) { sigs.push({ t:"s", label:"Sponsorship Confirmed" }); break }
  }
  const weakKW2 = ["visa sponsorship","skilled worker visa","tier 2","ukvi"]
  for (const kw of weakKW2) {
    if (text.includes(kw)) { sigs.push({ t:"s", label:"Visa Mentioned" }); break }
  }
  if (job.salary_min && job.salary_min > 500) sigs.push({ t:"p", label:"Salary shown" })

  let fresher = false
  for (const kw of FRESHER_KW) { if (text.includes(kw)) { fresher = true; break } }

  const likelihood =
    score >= 80 ? "Confirmed" :
    score >= 60 ? "Very Likely" :
    score >= 40 ? "Likely" : "Possible"

  return {
    ...job,
    score,
    likelihood,
    signals: [...new Map(sigs.map(s => [s.label, s])).values()].slice(0, 4),
    fresher,
    verified: !!sponsor,
    sponsorInfo: sponsor,
  }
}

//  API FETCHERS 
async function fromReed(q, loc, page) {
  try {
    const kw = q ? q + " visa sponsorship" : "visa sponsorship"
    const ln = loc || "United Kingdom"
    const p  = new URLSearchParams({ keywords: kw, locationName: ln, resultsToTake: 40, resultsToSkip: (page-1)*40 })
    const r  = await fetch("https://uk-visa-jobs-six.vercel.app/api/reed?" + p)
    if (!r.ok) return []
    const d = await r.json()
    return (d.results || []).map(j => ({
      id: "r_" + j.jobId, src: "Reed",
      title: j.jobTitle || "", employer: j.employerName || "Unknown",
      location: j.locationName || "",
      salary_min: j.minimumSalary, salary_max: j.maximumSalary,
      description: j.jobDescription || "", url: j.jobUrl || "#",
      posted: j.date, full_time: j.fullTime,
    }))
  } catch { return [] }
}

async function fromAdzuna(q, loc, page) {
  try {
    const what = q ? q + " visa sponsorship" : "visa sponsorship uk"
    const where = loc || "UK"
    const p = new URLSearchParams({ app_id: ADZUNA_ID, app_key: ADZUNA_KEY, what, where, results_per_page: 40 })
    const r = await fetch("https://api.adzuna.com/v1/api/jobs/gb/search/" + page + "?" + p)
    if (!r.ok) return []
    const d = await r.json()
    return (d.results || []).map(j => ({
      id: "a_" + j.id, src: "Adzuna",
      title: j.title || "",
      employer: (j.company && j.company.display_name) || "Unknown",
      location: (j.location && j.location.display_name) || "UK",
      salary_min: j.salary_min, salary_max: j.salary_max,
      description: j.description || "", url: j.redirect_url || "#",
      posted: j.created, full_time: j.contract_time === "full_time",
    }))
  } catch { return [] }
}

//  RESPONSIVE HOOK 
function useW() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])
  return w
}

//  JOB CARD 
function Card({ job, saved, onSave, navigate, mob }) {
  const [open, setOpen] = useState(false)

  const sal = job.salary_min || job.salary_max
    ? "GBP " + (job.salary_min||0).toLocaleString() + (job.salary_max ? " - " + job.salary_max.toLocaleString() : "+")
    : null
  const posted = (() => {
    if (!job.posted) return ""
    const d = new Date(job.posted)
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day:"numeric", month:"short" })
  })()
  const sc  = job.score >= 80 ? "#00D68F" : job.score >= 60 ? "#0057FF" : job.score >= 40 ? "#FF6B35" : "#9CA3B8"
  const lbl = job.likelihood || (job.verified ? "Confirmed" : job.score >= 60 ? "Very Likely" : job.score >= 40 ? "Likely" : "Possible")

  const sigColor = { v:"#00D68F", s:"#0057FF", p:"#FF6B35" }

  return (
    <div style={{ background:"#fff", border:"1.5px solid "+(job.verified?"#00D68F35":"#E8EEFF"), borderRadius:16, padding:mob?"14px":"20px 24px", position:"relative", transition:"all 0.2s" }}
      onMouseEnter={e=>{ if(!mob){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,57,255,0.07)"}}}
      onMouseLeave={e=>{ if(!mob){e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none"}}}>

      {job.verified && (
        <div style={{ position:"absolute",top:0,right:0,background:"linear-gradient(135deg,#00D68F,#00A67E)",color:"#fff",fontSize:9,fontWeight:800,padding:"4px 10px",borderRadius:"0 16px 0 8px",letterSpacing:0.5 }}>
          UK GOV VERIFIED
        </div>
      )}

      <div style={{ display:"flex",gap:10,justifyContent:"space-between",alignItems:"flex-start",marginTop:job.verified?8:0 }}>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",gap:5,marginBottom:6,flexWrap:"wrap" }}>
            <span style={{ background:job.src==="Reed"?"#e8534215":"#7c4dff15",color:job.src==="Reed"?"#e85342":"#7c4dff",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700 }}>
              {job.src}
            </span>
            {job.fresher && (
              <span style={{ background:"#00D68F15",color:"#00D68F",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700 }}>
                Fresher Friendly
              </span>
            )}
            {job.sponsorInfo && job.sponsorInfo.town && (
              <span style={{ background:"#0057FF08",color:"#0057FF",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:600 }}>
                {job.sponsorInfo.town}
              </span>
            )}
          </div>
          <h3 style={{ fontSize:mob?14:15,fontWeight:800,color:"#0A0F1E",margin:"0 0 3px",lineHeight:1.3 }}>{job.title}</h3>
          <div style={{ color:"#4B5675",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
            {job.employer} - {job.location}
          </div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0 }}>
          <div style={{ background:sc+"15",border:"1px solid "+sc+"40",borderRadius:20,padding:"3px 8px",fontSize:10,fontWeight:700,color:sc,whiteSpace:"nowrap" }}>
            {lbl} {job.score}%
          </div>
          <button onClick={()=>onSave(job)}
            style={{ background:saved?"#0057FF10":"none",border:"1px solid "+(saved?"#0057FF":"#E8EEFF"),color:saved?"#0057FF":"#9CA3B8",borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
            {saved?"Saved":"Save"}
          </button>
        </div>
      </div>

      <div style={{ display:"flex",gap:10,marginTop:7,fontSize:11,color:"#4B5675",flexWrap:"wrap" }}>
        {sal && <span>{sal}</span>}
        {posted && <span>Posted {posted}</span>}
        {job.sponsorInfo && job.sponsorInfo.route && <span style={{ color:"#7C3AED",fontWeight:600 }}>{job.sponsorInfo.route.split(":")[0]}</span>}
      </div>

      {job.signals && job.signals.length > 0 && (
        <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginTop:6 }}>
          {job.signals.map((s,i) => (
            <span key={i} style={{ background:(sigColor[s.t]||"#888")+"12",color:sigColor[s.t]||"#888",borderRadius:4,padding:"2px 6px",fontSize:10,fontWeight:600 }}>
              {s.label}
            </span>
          ))}
        </div>
      )}

      {job.description && (
        <>
          <button onClick={()=>setOpen(o=>!o)}
            style={{ background:"none",border:"none",color:"#0057FF",fontSize:11,cursor:"pointer",marginTop:6,padding:0,fontFamily:"inherit" }}>
            {open?"Hide description":"Show description"}
          </button>
          {open && (
            <p style={{ margin:"8px 0 0",fontSize:12,color:"#4B5675",lineHeight:1.7,borderTop:"1px solid #E8EEFF",paddingTop:8,maxHeight:150,overflow:"auto" }}>
              {job.description.replace(/<[^>]*>/g,"").slice(0,500)}
              {job.description.length>500?"...":""}
            </p>
          )}
        </>
      )}

      <div style={{ display:"flex",gap:8,marginTop:10,flexWrap:"wrap" }}>
        <a href={job.url} target="_blank" rel="noopener noreferrer"
          style={{ flex:1,background:"linear-gradient(135deg,#0057FF,#00C2FF)",color:"#fff",borderRadius:8,padding:"9px 14px",fontSize:12,fontWeight:700,textDecoration:"none",textAlign:"center" }}>
          Apply Now
        </a>
        {job.sponsorInfo && (
          <button onClick={()=>navigate("/employer/"+encodeURIComponent(job.employer))}
            style={{ background:"#F0F5FF",border:"1px solid #0057FF20",color:"#0057FF",borderRadius:8,padding:"9px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
            Profile
          </button>
        )}
      </div>
    </div>
  )
}

//  PAGINATION 
function Pages({ cur, total, go, mob }) {
  if (total <= 1) return null
  const list = []
  const d = mob ? 1 : 2
  const l = Math.max(2, cur - d)
  const r = Math.min(total - 1, cur + d)
  list.push(1)
  if (l > 2) list.push("...")
  for (let i = l; i <= r; i++) list.push(i)
  if (r < total - 1) list.push("...")
  if (total > 1) list.push(total)

  const btn = (label, page, active, disabled) => (
    <button key={label+""+page} onClick={()=>!disabled&&go(page)} disabled={disabled}
      style={{ padding:"8px 13px",borderRadius:9,fontSize:13,fontWeight:active?800:600,cursor:disabled?"not-allowed":"pointer",border:"1.5px solid "+(active?"#0057FF":"#E8EEFF"),background:active?"#0057FF":"#fff",color:active?"#fff":disabled?"#9CA3B8":"#4B5675",fontFamily:"inherit",minWidth:38 }}>
      {label}
    </button>
  )

  return (
    <div style={{ marginTop:28,display:"flex",flexDirection:"column",alignItems:"center",gap:12 }}>
      <div style={{ fontSize:13,color:"#4B5675" }}>Page {cur} of {total}</div>
      <div style={{ display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center" }}>
        {btn("Prev", cur-1, false, cur===1)}
        {list.map((p,i) => p==="..." ? (
          <span key={"e"+i} style={{ padding:"8px 4px",color:"#9CA3B8",fontSize:13 }}>...</span>
        ) : btn(p, p, p===cur, false))}
        {btn("Next", cur+1, false, cur===total)}
      </div>
    </div>
  )
}

//  MAIN PAGE 
export default function JobsPage() {
  const [sp]  = useSearchParams()
  const [q,   setQ]   = useState(sp.get("q") || "")
  const [loc, setLoc] = useState(sp.get("loc") || "")
  const [showQ, setShowQ] = useState(false)
  const [showL, setShowL] = useState(false)
  const [fresherOnly, setFresherOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [sortBy, setSortBy] = useState("score")
  const [allJobs, setAllJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [searched, setSearched] = useState(false)
  const [page, setPage] = useState(1)
  const [saved, setSaved] = useState(new Set())
  const topRef  = useRef(null)
  const navigate = useNavigate()
  const w   = useW()
  const mob = w < 768

  const allRoles = ["All Jobs", ...ALL_JOBS]
  const allLocs  = ["Anywhere in UK", ...ALL_LOCATIONS]
  const filteredRoles = q ? allRoles.filter(r => r.toLowerCase().includes(q.toLowerCase())) : allRoles
  const filteredLocs  = loc ? allLocs.filter(l => l.toLowerCase().includes(loc.toLowerCase())) : allLocs

  const displayed = (() => {
    let j = [...allJobs]
    if (fresherOnly)  j = j.filter(x => x.fresher)
    if (verifiedOnly) j = j.filter(x => x.verified)
    if (sortBy === "salary") j.sort((a,b) => (b.salary_min||0)-(a.salary_min||0))
    else if (sortBy === "date") j.sort((a,b) => new Date(b.posted||0)-new Date(a.posted||0))
    else j.sort((a,b) => { if(a.verified&&!b.verified)return -1;if(!a.verified&&b.verified)return 1;return b.score-a.score })
    return j
  })()
  const totalPages = Math.max(1, Math.ceil(displayed.length / PER_PAGE))
  const pageJobs   = displayed.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const goPage = p => { setPage(p); if(topRef.current) topRef.current.scrollIntoView({ behavior:"smooth" }) }

  useEffect(() => { runSearch("","") }, [])

  const runSearch = async (searchQ, searchLoc) => {
    setLoading(true); setError(""); setPage(1)
    try {
      const loc2 = searchLoc && searchLoc !== "Anywhere in UK" ? searchLoc : ""

      // Fetch 3 pages from each source in parallel
      const results = await Promise.allSettled([
        fromReed(searchQ, loc2, 1),   fromAdzuna(searchQ, loc2, 1),
        fromReed(searchQ, loc2, 2),   fromAdzuna(searchQ, loc2, 2),
        fromReed(searchQ, loc2, 3),   fromAdzuna(searchQ, loc2, 3),
      ])
      let raw = []
      for (const r of results) { if (r.status === "fulfilled") raw.push(...r.value) }

      if (raw.length === 0) { setError("No results found. Try a different search."); setLoading(false); return }

      // Deduplicate
      const seen = new Set()
      raw = raw.filter(j => {
        const k = j.title.toLowerCase().slice(0,30) + "|" + j.employer.toLowerCase()
        if (seen.has(k)) return false
        seen.add(k); return true
      })

      // Check every employer against the Home Office register
      const sponsorMap = await batchCheck(raw.map(j => j.employer))

      // Score every job - buildJob returns null for hard rejections
      const confirmed = raw
        .map(j => buildJob(j, sponsorMap[j.employer]))
        .filter(Boolean)

      setAllJobs(confirmed)
      setSearched(true)
    } catch (e) {
      setError("Search failed. Please try again.")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async job => {
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) { navigate("/auth"); return }
    if (saved.has(job.id)) return
    await supabase.from("saved_jobs").insert({
      user_id: user.id, job_id: job.id, job_title: job.title,
      employer: job.employer, location: job.location,
      salary_min: job.salary_min, salary_max: job.salary_max,
      job_url: job.url, source: job.src, sponsorship_score: job.score,
    })
    setSaved(s => new Set([...s, job.id]))
  }

  const drop = {
    position:"absolute",top:"calc(100% + 4px)",left:0,right:0,
    background:"#fff",borderRadius:14,border:"1px solid #E8EEFF",
    boxShadow:"0 16px 48px rgba(0,57,255,0.1)",maxHeight:360,overflowY:"auto",zIndex:300,
  }
  const pill = active => ({
    padding:"5px 11px",borderRadius:100,fontSize:mob?11:12,fontWeight:600,
    cursor:"pointer",border:"1.5px solid "+(active?"#0057FF":"#E8EEFF"),
    background:active?"#0057FF0D":"#fff",color:active?"#0057FF":"#4B5675",
    fontFamily:"inherit",whiteSpace:"nowrap",
  })

  const stats = {
    total: displayed.length,
    verified: displayed.filter(j=>j.verified).length,
    fresher: displayed.filter(j=>j.fresher).length,
  }

  return (
    <div style={{ minHeight:"100vh",background:"#F8FAFF",fontFamily:"inherit" }}>
      <Nav />
      <div ref={topRef} style={{ maxWidth:900,margin:"0 auto",padding:mob?"82px 4% 40px":"96px 5% 60px" }}>

        {/* Header */}
        <div style={{ marginBottom:mob?14:20 }}>
          <h1 style={{ fontSize:mob?20:26,fontWeight:900,color:"#0A0F1E",margin:"0 0 4px",letterSpacing:-0.8 }}>
            Find UK Visa Sponsored Jobs
          </h1>
          <p style={{ color:"#4B5675",fontSize:mob?12:14,margin:0 }}>
            Every result verified against 125,284 UK Home Office sponsors - Only confirmed sponsorship shown
          </p>
        </div>

        {/* Search box */}
        <div style={{ background:"#fff",border:"1.5px solid #E8EEFF",borderRadius:16,marginBottom:10,boxShadow:"0 4px 24px rgba(0,57,255,0.06)",position:"relative",zIndex:20 }}>

          {/* Role input */}
          <div style={{ position:"relative",borderBottom:"1px solid #E8EEFF" }}>
            <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"#9CA3B8",fontSize:13,pointerEvents:"none",fontWeight:500 }}>Role:</span>
            <input value={q} onChange={e=>setQ(e.target.value)}
              onFocus={()=>{ setShowQ(true); setShowL(false) }}
              onBlur={()=>setTimeout(()=>setShowQ(false),200)}
              onKeyDown={e=>{ if(e.key==="Enter"){ runSearch(q,loc); setShowQ(false) }}}
              placeholder="Search any role - or leave empty to see all sponsored jobs"
              style={{ width:"100%",border:"none",outline:"none",background:"transparent",padding:mob?"14px 80px 14px 60px":"14px 90px 14px 62px",fontSize:mob?14:15,color:"#0A0F1E",fontFamily:"inherit" }}
            />
            {q && (
              <button onClick={()=>{ setQ(""); runSearch("",loc) }}
                style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"#F8FAFF",border:"1px solid #E8EEFF",borderRadius:6,padding:"4px 10px",fontSize:12,color:"#4B5675",cursor:"pointer",fontFamily:"inherit" }}>
                Clear
              </button>
            )}
            {showQ && (
              <div style={drop}>
                <div style={{ padding:"8px 14px 6px",fontSize:10,fontWeight:700,color:"#9CA3B8",textTransform:"uppercase",letterSpacing:0.8,position:"sticky",top:0,background:"#fff",borderBottom:"1px solid #F8FAFF" }}>
                  {q ? filteredRoles.length+" matching roles" : "All "+ALL_JOBS.length+" roles"}
                </div>
                {filteredRoles.map(role => (
                  <div key={role}
                    onMouseDown={()=>{ setQ(role==="All Jobs"?"":role); runSearch(role==="All Jobs"?"":role,loc); setShowQ(false) }}
                    style={{ padding:"10px 16px",cursor:"pointer",fontSize:14,color:role==="All Jobs"?"#0057FF":"#0A0F1E",fontWeight:role==="All Jobs"?700:400,background:role==="All Jobs"?"#F0F5FF":"transparent",borderBottom:"1px solid rgba(232,238,255,0.4)" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#F8FAFF"}
                    onMouseLeave={e=>e.currentTarget.style.background=role==="All Jobs"?"#F0F5FF":"transparent"}
                  >{role}</div>
                ))}
              </div>
            )}
          </div>

          {/* Location + buttons */}
          <div style={{ display:"flex",alignItems:"center" }}>
            <div style={{ flex:1,position:"relative" }}>
              <span style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:"#9CA3B8",fontSize:12,pointerEvents:"none",fontWeight:500 }}>Location:</span>
              <input value={loc} onChange={e=>setLoc(e.target.value)}
                onFocus={()=>{ setShowL(true); setShowQ(false) }}
                onBlur={()=>setTimeout(()=>setShowL(false),200)}
                onKeyDown={e=>{ if(e.key==="Enter"){ runSearch(q,loc); setShowL(false) }}}
                placeholder="Any UK city..."
                style={{ width:"100%",border:"none",outline:"none",background:"transparent",padding:"12px 12px 12px 82px",fontSize:13,color:"#0A0F1E",fontFamily:"inherit" }}
              />
              {showL && (
                <div style={drop}>
                  <div style={{ padding:"8px 14px 6px",fontSize:10,fontWeight:700,color:"#9CA3B8",textTransform:"uppercase",letterSpacing:0.8,position:"sticky",top:0,background:"#fff",borderBottom:"1px solid #F8FAFF" }}>
                    {loc ? filteredLocs.length+" locations" : "All "+ALL_LOCATIONS.length+" UK cities"}
                  </div>
                  {filteredLocs.map(city => (
                    <div key={city}
                      onMouseDown={()=>{ setLoc(city==="Anywhere in UK"?"":city); runSearch(q,city==="Anywhere in UK"?"":city); setShowL(false) }}
                      style={{ padding:"10px 16px",cursor:"pointer",fontSize:14,color:city==="Anywhere in UK"?"#0057FF":"#0A0F1E",fontWeight:city==="Anywhere in UK"?700:400,background:city==="Anywhere in UK"?"#F0F5FF":"transparent",borderBottom:"1px solid rgba(232,238,255,0.4)" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#F8FAFF"}
                      onMouseLeave={e=>e.currentTarget.style.background=city==="Anywhere in UK"?"#F0F5FF":"transparent"}
                    >{city}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width:1,height:32,background:"#E8EEFF",flexShrink:0 }} />
            <button onClick={()=>{ runSearch(q,loc); setShowQ(false); setShowL(false) }} disabled={loading}
              style={{ background:"linear-gradient(135deg,#0057FF,#00C2FF)",color:"#fff",border:"none",borderRadius:"0 0 14px 0",padding:mob?"12px 14px":"12px 22px",fontSize:mob?13:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",height:44,whiteSpace:"nowrap" }}>
              {loading?"Searching...":"Search"}
            </button>
          </div>
        </div>

        {/* Quick role pills */}
        <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:10 }}>
          {QUICK.map(role => (
            <button key={role}
              onClick={()=>{ const v=role==="All Jobs"?"":role; setQ(v); runSearch(v,loc) }}
              style={pill((role==="All Jobs"&&!q)||q===role)}>
              {role}
            </button>
          ))}
        </div>

        {/* Toggles + sort */}
        <div style={{ display:"flex",gap:16,marginBottom:10,flexWrap:"wrap",alignItems:"center" }}>
          {[
            { label:"Fresher friendly", val:fresherOnly, set:()=>setFresherOnly(v=>!v), color:"#FF6B35" },
            { label:"Verified only",    val:verifiedOnly,set:()=>setVerifiedOnly(v=>!v),color:"#00D68F" },
          ].map(t => (
            <div key={t.label} onClick={t.set} style={{ display:"flex",alignItems:"center",gap:6,cursor:"pointer" }}>
              <div style={{ width:32,height:18,borderRadius:9,background:t.val?t.color:"#E8EEFF",position:"relative",transition:"background 0.2s",flexShrink:0 }}>
                <div style={{ position:"absolute",top:2,left:t.val?15:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left 0.2s" }} />
              </div>
              <span style={{ fontSize:12,color:t.val?t.color:"#4B5675",fontWeight:600 }}>{t.label}</span>
            </div>
          ))}
          <div style={{ marginLeft:"auto",display:"flex",gap:6 }}>
            {[["score","Best Match"],["date","Newest"],["salary","Salary"]].map(([v,l]) => (
              <button key={v} onClick={()=>setSortBy(v)}
                style={{ padding:"5px 10px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",border:"1.5px solid "+(sortBy===v?"#0057FF":"#E8EEFF"),background:sortBy===v?"#0057FF0D":"#fff",color:sortBy===v?"#0057FF":"#4B5675",fontFamily:"inherit" }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,padding:"10px 14px",marginBottom:12,color:"#DC2626",fontSize:13 }}>
            {error}
          </div>
        )}

        {/* Stats */}
        {allJobs.length > 0 && (
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:14 }}>
            {[
              { label:"Total Jobs",     value:stats.total,    color:"#0057FF" },
              { label:"Gov Verified",   value:stats.verified, color:"#00D68F" },
              { label:"Fresher",        value:stats.fresher,  color:"#FF6B35" },
            ].map(s => (
              <div key={s.label} style={{ background:"#fff",border:"1px solid "+s.color+"20",borderRadius:10,padding:"7px 12px",display:"flex",alignItems:"center",gap:6 }}>
                <span style={{ fontSize:mob?15:17,fontWeight:900,color:s.color }}>{s.value}</span>
                <span style={{ fontSize:10,color:"#9CA3B8",fontWeight:600,textTransform:"uppercase" }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && allJobs.length === 0 && (
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {[...Array(5)].map((_,i) => (
              <div key={i} style={{ background:"#fff",borderRadius:16,padding:"20px 24px",border:"1px solid #E8EEFF",opacity:1-i*0.15 }}>
                <div style={{ height:14,background:"#F0F0F0",borderRadius:4,width:(55+i*8)+"%",marginBottom:10 }} />
                <div style={{ height:11,background:"#F0F0F0",borderRadius:4,width:"35%" }} />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {pageJobs.length > 0 && (
          <>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <div style={{ fontSize:13,color:"#4B5675" }}>
                Showing {(page-1)*PER_PAGE+1}-{Math.min(page*PER_PAGE,displayed.length)} of {displayed.length} jobs
              </div>
              {loading && <span style={{ fontSize:12,color:"#0057FF",fontWeight:600 }}>Updating...</span>}
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:mob?10:12 }}>
              {pageJobs.map(job => (
                <Card key={job.id} job={job} saved={saved.has(job.id)}
                  onSave={handleSave} navigate={navigate} mob={mob} />
              ))}
            </div>
            <Pages cur={page} total={totalPages} go={goPage} mob={mob} />
          </>
        )}

        {/* No results */}
        {searched && displayed.length === 0 && !loading && (
          <div style={{ textAlign:"center",padding:"48px 20px",background:"#fff",borderRadius:20,border:"1px solid #E8EEFF" }}>
            <div style={{ fontSize:16,fontWeight:800,color:"#0A0F1E",marginBottom:8 }}>No sponsored jobs found</div>
            <div style={{ fontSize:13,color:"#4B5675",marginBottom:16,lineHeight:1.7 }}>
              Try a different role, location, or remove filters.<br/>
              Try a different role or remove filters.
            </div>
            <button onClick={()=>{ setQ(""); setLoc(""); setFresherOnly(false); setVerifiedOnly(false); runSearch("","") }}
              style={{ background:"linear-gradient(135deg,#0057FF,#00C2FF)",color:"#fff",border:"none",borderRadius:10,padding:"11px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
              Show All Sponsored Jobs
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
