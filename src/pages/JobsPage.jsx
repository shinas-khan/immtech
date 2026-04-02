import { useState, useCallback, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ALL_JOBS, ALL_LOCATIONS } from "../lib/constants"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

const ADZUNA_ID = "344e86d1"
const ADZUNA_KEY = "039c47ae80bab92aef99751a471040fb"
const JOBS_PER_PAGE = 20

// Hard negative - job DEFINITELY does not sponsor - remove completely
const NEG_KW = [
  "no sponsorship", "cannot sponsor", "cannot offer visa", "no visa sponsorship",
  "uk residents only", "british nationals only", "must have right to work",
  "sponsorship not available", "unable to offer sponsorship", "we do not offer sponsorship",
  "unable to sponsor", "does not offer sponsorship", "not able to sponsor",
  "unfortunately we cannot", "visa sponsorship is not", "not in a position to sponsor",
  "does not provide sponsorship", "own right to work", "right to work in the uk is required",
  "you must have the right to work", "applicants must have the right to work",
  "only applicants with the right to work", "must already have the right to work",
  "must be eligible to work in the uk without", "right to work without sponsorship",
  "sponsorship cannot be offered", "we are unable to offer visa"
]

// Strong positive - job IS offering sponsorship
const VISA_POS = [
  "visa sponsorship provided", "visa sponsorship available", "visa sponsorship offered",
  "will provide visa sponsorship", "certificate of sponsorship", "cos will be provided",
  "skilled worker visa sponsorship", "we will sponsor", "sponsorship is available",
  "open to sponsorship", "visa support provided", "sponsorship provided",
  "tier 2 sponsorship", "ukvi sponsorship", "sponsorship for the right candidate",
  "visa sponsorship for", "we can sponsor", "sponsorship considered"
]

// Weak positive - mentions sponsorship but not confirmed
const VISA_WEAK = [
  "visa sponsorship", "skilled worker visa", "right to work sponsorship",
  "sponsorship may be", "sponsorship possible", "sponsorship available for",
  "tier 2", "ukvi"
]

const FRESHER_KW = ["graduate scheme", "grad scheme", "graduate programme", "entry level graduate", "trainee programme", "apprenticeship"]

const ALL_ROLES = ["All Jobs", ...ALL_JOBS]
const ALL_LOCS = ["Anywhere in UK", ...ALL_LOCATIONS]
const QUICK_ROLES = ["All Jobs","Software Engineer","Registered Nurse","Data Analyst","Cyber Security Analyst","Civil Engineer","Pharmacist","Data Scientist","Accountant","Physiotherapist","Social Worker","DevOps Engineer"]


const CAREERS_DB = {
  "amazon": "https://www.amazon.jobs/en-gb",
  "google": "https://careers.google.com",
  "microsoft": "https://careers.microsoft.com",
  "apple": "https://jobs.apple.com/en-gb/search",
  "meta": "https://www.metacareers.com",
  "ibm": "https://www.ibm.com/employment",
  "salesforce": "https://careers.salesforce.com",
  "adobe": "https://careers.adobe.com",
  "intel": "https://jobs.intel.com",
  "cisco": "https://jobs.cisco.com",
  "nvidia": "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite",
  "dell": "https://jobs.dell.com",
  "samsung": "https://www.samsung.com/uk/aboutsamsung/careers",
  "barclays": "https://search.jobs.barclays",
  "hsbc": "https://mycareer.hsbc.com/en_GB/external/SearchJobs",
  "lloyds bank": "https://careers.lloydsbank.com",
  "lloyds banking": "https://careers.lloydsbank.com",
  "natwest bank": "https://jobs.natwestgroup.com",
  "natwest group": "https://jobs.natwestgroup.com",
  "natwest markets": "https://jobs.natwestgroup.com",
  "standard chartered": "https://careers.standardchartered.com",
  "goldman sachs": "https://higher.gs.com/roles",
  "jpmorgan": "https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001",
  "jp morgan": "https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001",
  "morgan stanley": "https://morganstanley.tal.net/vx/lang-en-GB/candidate/jobboard/vacancy/1/adv",
  "deutsche bank": "https://careers.db.com",
  "blackrock": "https://careers.blackrock.com",
  "fidelity international": "https://jobs.fidelityinternational.com",
  "aviva": "https://careers.aviva.co.uk",
  "deloitte": "https://apply.deloitte.com",
  "pwc": "https://www.pwc.co.uk/careers",
  "kpmg": "https://www.kpmg.com/uk/en/home/careers",
  "accenture": "https://www.accenture.com/gb-en/careers",
  "capgemini": "https://www.capgemini.com/gb-en/careers",
  "cognizant": "https://careers.cognizant.com",
  "infosys": "https://www.infosys.com/careers",
  "tata consultancy": "https://www.tcs.com/careers",
  "wipro": "https://careers.wipro.com",
  "bupa": "https://careers.bupa.co.uk",
  "nuffield health": "https://www.nuffieldhealth.com/careers",
  "spire healthcare": "https://jobs.spirehealthcare.com",
  "astrazeneca": "https://careers.astrazeneca.com",
  "glaxosmithkline": "https://jobs.gsk.com",
  "pfizer": "https://pfizer.wd1.myworkdayjobs.com/PfizerCareers",
  "novartis": "https://www.novartis.com/careers",
  "roche": "https://www.roche.com/careers",
  "sanofi": "https://sanofi.wd3.myworkdayjobs.com/Sanofi",
  "abbvie": "https://careers.abbvie.com",
  "eli lilly": "https://jobs.lilly.com",
  "care uk": "https://careers.careuk.com",
  "university of the west of scotland": "https://ce0974li.webitrent.com/ce0974li_webrecruitment/wrd/run/etrec179gf.open?wvid=3866692FHL",
  "university of oxford": "https://jobs.ox.ac.uk",
  "university of cambridge": "https://www.jobs.cam.ac.uk",
  "university of edinburgh": "https://www.vacancies.ed.ac.uk",
  "university of manchester": "https://www.jobs.manchester.ac.uk",
  "university of birmingham": "https://www.birmingham.ac.uk/jobs",
  "university of bristol": "https://www.bristol.ac.uk/jobs",
  "university of leeds": "https://jobs.leeds.ac.uk",
  "university of sheffield": "https://www.sheffield.ac.uk/jobs",
  "university of glasgow": "https://www.gla.ac.uk/explore/jobs",
  "university college london": "https://www.ucl.ac.uk/human-resources/working-ucl/vacancies",
  "imperial college": "https://www.imperial.ac.uk/jobs",
  "london school of economics": "https://jobs.lse.ac.uk",
  "bt group": "https://careers.bt.com",
  "vodafone": "https://careers.vodafone.com/uk",
  "sky": "https://careers.sky.com",
  "virgin media": "https://careers.virginmedia.com",
  "rolls royce": "https://careers.rolls-royce.com",
  "bae systems": "https://careers.baesystems.com",
  "airbus": "https://www.airbus.com/en/careers",
  "boeing": "https://jobs.boeing.com",
  "siemens": "https://jobs.siemens.com",
  "dyson": "https://careers.dyson.com",
  "jaguar land rover": "https://www.jaguarlandrover.com/careers",
  "arup": "https://www.arup.com/careers",
  "aecom": "https://aecom.jobs",
  "mott macdonald": "https://www.mottmac.com/careers",
  "wsp": "https://www.wsp.com/en-gb/careers",
  "jacobs": "https://careers.jacobs.com",
  "bp": "https://www.bp.com/en/global/corporate/careers",
  "shell": "https://www.shell.com/careers",
  "tesco": "https://www.tesco-careers.com",
  "sainsburys": "https://jobs.sainsburys.co.uk",
  "asda": "https://jobs.asda.com",
  "waitrose": "https://www.waitrosejobs.com",
  "john lewis": "https://www.jlpjobs.com",
  "boots": "https://jobs.boots.com",
  "unilever": "https://careers.unilever.com",
  "nestle": "https://www.nestle.com/jobs",
  "diageo": "https://www.diageo.com/en/careers",
  "reckitt": "https://careers.reckitt.com",
  "british airways": "https://careers.ba.com",
  "easyjet": "https://careers.easyjet.com",
  "dhl": "https://careers.dhl.com",
  "royal mail": "https://jobs.royalmail.com",
  "network rail": "https://www.networkrail.co.uk/careers",
  "transport for london": "https://jobs.tfl.gov.uk",
  "revolut": "https://www.revolut.com/careers",
  "monzo": "https://monzo.com/careers",
  "wise": "https://www.wise.jobs",
  "starling bank": "https://www.starlingbank.com/careers",
  "klarna": "https://www.klarna.com/careers",
  "bbc": "https://careers.bbc.co.uk",
  "bloomberg": "https://careers.bloomberg.com",
  "capita": "https://careers.capita.com",
  "serco": "https://careers.serco.com",
  "cbre": "https://careers.cbre.com",
  "jll": "https://careers.jll.com",
  "savills": "https://careers.savills.com",
}

function getCareersUrl(employer) {
  if (!employer || employer === "Unknown") return null
  const norm = employer.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/ +/g, " ").trim()
  if (CAREERS_DB[norm]) return CAREERS_DB[norm]
  for (const [key, url] of Object.entries(CAREERS_DB)) {
    if (key.length < 5) continue
    if (norm === key) return url
    if (norm.startsWith(key + " ")) return url
  }
  const low = employer.toLowerCase()
  if (low.startsWith("nhs ") || low.includes(" nhs trust") || low.includes("nhs foundation trust")) {
    return "https://www.jobs.nhs.uk"
  }
  return null
}

function useW() {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener("resize", fn)
    return () => window.removeEventListener("resize", fn)
  }, [])
  return w
}

async function checkSponsor(name) {
  if (!name || name === "Unknown") return null
  try {
    const clean = name.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/ +/g, " ").trim()
    const { data: a } = await supabase.from("sponsors").select("organisation_name, town, route, rating").ilike("organisation_name", name).limit(1)
    if (a && a[0]) return a[0]
    const words = clean.split(" ")
    if (words[0] && words[0].length >= 4) {
      const { data: b } = await supabase.from("sponsors").select("organisation_name, town, route, rating").ilike("organisation_name", "%" + words[0] + "%").limit(1)
      if (b && b[0]) return b[0]
    }
    return null
  } catch { return null }
}

async function batchCheck(employers) {
  const unique = [...new Set(employers.filter(Boolean))]
  const results = {}
  for (let i = 0; i < unique.length; i += 8) {
    await Promise.all(unique.slice(i, i + 8).map(async e => { results[e] = await checkSponsor(e) }))
  }
  return results
}

function scoreJob(job, sponsor) {
  // Strip HTML from description for accurate text matching
  const rawDesc = job.description
    ? job.description.replace(/<[^>]*>/g, " ").replace(/ +/g, " ")
    : ""
  const text = (job.title + " " + rawDesc + " " + job.employer).toLowerCase()

  // HARD FILTER: Any negative phrase = remove job completely
  for (const neg of NEG_KW) {
    if (text.includes(neg)) return { score: -1, signals: [], fresher: false, verified: false }
  }

  let score = 0
  const signals = []
  let fresher = false
  let hasStrongVisa = false

  // GOV VERIFIED SPONSOR - most reliable signal
  if (sponsor) {
    score += 40
    signals.push({ type: "verified", label: "Gov Verified" })
    if (sponsor.rating === "A") { score += 10; signals.push({ type: "rating", label: "A-Rated" }) }
  }

  // STRONG VISA POSITIVE - explicit sponsorship offer
  for (const kw of VISA_POS) {
    if (text.includes(kw)) {
      score += 30
      signals.push({ type: "visa", label: "Sponsorship Confirmed" })
      hasStrongVisa = true
      break
    }
  }

  // WEAK VISA SIGNAL - only if no strong signal found
  if (!hasStrongVisa) {
    for (const kw of VISA_WEAK) {
      if (text.includes(kw)) {
        score += 8
        signals.push({ type: "visa", label: kw })
        break
      }
    }
  }

  // Fresher detection
  for (const kw of FRESHER_KW) { if (text.includes(kw)) { fresher = true; break } }

  // Salary disclosed
  if (job.salary_min && job.salary_min > 1000) { score += 5; signals.push({ type: "salary", label: "Salary shown" }) }

  // MINIMUM THRESHOLD: Only show jobs that have at least ONE positive signal
  // A job must be either gov verified OR have explicit visa language
  // This removes the "5-20%" junk jobs
  const minRequired = sponsor ? 40 : hasStrongVisa ? 30 : 8
  if (score < minRequired) return { score: -1, signals: [], fresher: false, verified: false }

  return {
    score: Math.min(100, score),
    signals: [...new Map(signals.map(s => [s.label, s])).values()].slice(0, 4),
    fresher,
    verified: !!sponsor
  }
}

async function fetchReed(q, loc, page) {
  const kw = q ? q + " sponsorship" : "visa sponsorship uk"
  const loc2 = loc || "United Kingdom"
  const params = new URLSearchParams({ keywords: kw, locationName: loc2, resultsToTake: 40, resultsToSkip: (page - 1) * 40 })
  const r = await fetch("https://uk-visa-jobs-six.vercel.app/api/reed?" + params)
  if (!r.ok) return { jobs: [], total: 0 }
  const data = await r.json()
  const jobs = (data.results || []).map(j => ({
    id: "reed_" + j.jobId, source: "Reed", title: j.jobTitle || "",
    employer: j.employerName || "Unknown", location: j.locationName || "",
    salary_min: j.minimumSalary, salary_max: j.maximumSalary,
    description: j.jobDescription || "", url: j.jobUrl || "#",
    posted: j.date, full_time: j.fullTime
  }))
  return { jobs, total: data.totalResults || 0 }
}

async function fetchAdzuna(q, loc, page) {
  const what = q ? q + " sponsorship" : "visa sponsorship uk"
  const where = loc || "UK"
  const params = new URLSearchParams({ app_id: ADZUNA_ID, app_key: ADZUNA_KEY, what, where, results_per_page: 40 })
  const r = await fetch("https://api.adzuna.com/v1/api/jobs/gb/search/" + page + "?" + params)
  if (!r.ok) return { jobs: [], total: 0 }
  const data = await r.json()
  const jobs = (data.results || []).map(j => ({
    id: "adzuna_" + j.id, source: "Adzuna", title: j.title || "",
    employer: (j.company && j.company.display_name) || "Unknown",
    location: (j.location && j.location.display_name) || "UK",
    salary_min: j.salary_min, salary_max: j.salary_max,
    description: j.description || "", url: j.redirect_url || "#",
    posted: j.created, full_time: j.contract_time === "full_time"
  }))
  return { jobs, total: data.count || 0 }
}

function JobCard({ job, onSave, saved, navigate, mob }) {
  const [expanded, setExpanded] = useState(false)
  const sal = job.salary_min || job.salary_max
    ? "GBP " + (job.salary_min || 0).toLocaleString() + (job.salary_max ? " - " + job.salary_max.toLocaleString() : "+")
    : null
  const posted = (() => { if (!job.posted) return ""; const d = new Date(job.posted); return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) })()
  const sc = job.verified ? "#00D68F" : job.score >= 60 ? "#0057FF" : job.score >= 30 ? "#FF6B35" : "#9CA3B8"
  const sl = job.verified && job.score >= 70 ? "Verified" : job.score >= 70 ? "Confirmed" : job.score >= 50 ? "Likely" : "Possible"
  return (
    <div style={{ background: "#fff", border: "1.5px solid " + (job.verified ? "#00D68F35" : "#E8EEFF"), borderRadius: 16, padding: mob ? "14px" : "20px 24px", position: "relative", transition: "all 0.2s" }}
      onMouseEnter={e => { if (!mob) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,57,255,0.07)" } }}
      onMouseLeave={e => { if (!mob) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" } }}
    >
      {job.verified && <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg,#00D68F,#00A67E)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 10px", borderRadius: "0 16px 0 8px" }}>UK GOV VERIFIED</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: job.verified ? 8 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ background: job.source === "Reed" ? "#e8534215" : "#7c4dff15", color: job.source === "Reed" ? "#e85342" : "#7c4dff", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{job.source}</span>
            {job.fresher && <span style={{ background: "#00D68F15", color: "#00D68F", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>Fresher Friendly</span>}
            {getCareersUrl(job.employer) && <span style={{ background: "#0057FF12", color: "#0057FF", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>Direct Apply</span>}
          </div>
          <h3 style={{ fontSize: mob ? 14 : 15, fontWeight: 800, color: "#0A0F1E", margin: "0 0 3px", lineHeight: 1.3 }}>{job.title}</h3>
          <div style={{ color: "#4B5675", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.employer} - {job.location}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
          <div style={{ background: sc + "15", border: "1px solid " + sc + "40", borderRadius: 20, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: sc }}>{sl} {job.score}%</div>
          <button onClick={() => onSave(job)} style={{ background: saved ? "#0057FF10" : "none", border: "1px solid " + (saved ? "#0057FF" : "#E8EEFF"), color: saved ? "#0057FF" : "#9CA3B8", borderRadius: 6, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>{saved ? "Saved" : "Save"}</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 7, fontSize: 11, color: "#4B5675", flexWrap: "wrap" }}>
        {sal && <span>{sal}</span>}
        {posted && <span>Posted {posted}</span>}
        {job.sponsorInfo && job.sponsorInfo.route && <span>{job.sponsorInfo.route.split(":")[0]}</span>}
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
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: "#0057FF", fontSize: 11, cursor: "pointer", marginTop: 6, padding: 0, fontFamily: "inherit" }}>{expanded ? "Hide" : "Show description"}</button>
          {expanded && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#4B5675", lineHeight: 1.7, borderTop: "1px solid #E8EEFF", paddingTop: 8, maxHeight: 140, overflow: "auto" }}>{job.description.replace(/<[^>]*>/g, "").slice(0, 500)}</p>}
        </>
      )}
      {(() => {
        const cu = getCareersUrl(job.employer)
        return (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {cu ? (
              <a href={cu} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: "linear-gradient(135deg,#00D68F,#00A67E)", color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                Apply on Careers Page
              </a>
            ) : (
              <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: "linear-gradient(135deg,#0057FF,#00C2FF)", color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                Apply via {job.source}
              </a>
            )}
            {cu && <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ background: "#F0F5FF", border: "1px solid #0057FF20", color: "#0057FF", borderRadius: 8, padding: "9px 12px", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>via {job.source}</a>}
            {job.sponsorInfo && <button onClick={() => navigate("/employer/" + encodeURIComponent(job.employer))} style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", color: "#4B5675", borderRadius: 8, padding: "9px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Profile</button>}
          </div>
        )
      })()}
    </div>
  )
}

function Pagination({ page, total, onPage, mob }) {
  if (total <= 1) return null
  const pages = []
  const d = mob ? 1 : 2
  const L = Math.max(2, page - d)
  const R = Math.min(total - 1, page + d)
  pages.push(1)
  if (L > 2) pages.push("...")
  for (let i = L; i <= R; i++) pages.push(i)
  if (R < total - 1) pages.push("...")
  if (total > 1) pages.push(total)
  const btn = (label, pg, active, disabled) => (
    <button key={label} onClick={() => !disabled && onPage(pg)} style={{ padding: "8px 13px", borderRadius: 9, fontSize: 13, fontWeight: active ? 800 : 600, border: "1.5px solid " + (active ? "#0057FF" : "#E8EEFF"), background: active ? "#0057FF" : "#fff", color: active ? "#fff" : disabled ? "#9CA3B8" : "#4B5675", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", minWidth: 38 }}>{label}</button>
  )
  return (
    <div style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ color: "#4B5675", fontSize: 13 }}>Page {page} of {total}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {btn("Prev", page - 1, false, page === 1)}
        {pages.map((p, i) => p === "..." ? <span key={"d"+i} style={{ padding: "8px 4px", color: "#9CA3B8" }}>...</span> : btn(p, p, p === page, false))}
        {btn("Next", page + 1, false, page === total)}
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
  const [showF, setShowF] = useState(false)
  const [fresherOnly, setFresherOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [salMin, setSalMin] = useState("")
  const [salMax, setSalMax] = useState("")
  const [jobType, setJobType] = useState("")
  const [source, setSource] = useState("")
  const [allJobs, setAllJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [saved, setSaved] = useState(new Set())
  const topRef = useRef(null)
  const navigate = useNavigate()
  const w = useW()
  const mob = w < 768

  const filteredQ = q ? ALL_ROLES.filter(r => r.toLowerCase().includes(q.toLowerCase())) : ALL_ROLES
  const filteredL = loc ? ALL_LOCS.filter(l => l.toLowerCase().includes(loc.toLowerCase())) : ALL_LOCS

  const totalPages = Math.max(1, Math.ceil(allJobs.length / JOBS_PER_PAGE))
  const pageJobs = allJobs.slice((page - 1) * JOBS_PER_PAGE, page * JOBS_PER_PAGE)

  useEffect(() => { run("", "") }, [])

  const goPage = (p) => { setPage(p); if (topRef.current) topRef.current.scrollIntoView({ behavior: "smooth" }) }

  const saveJob = async (job) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate("/auth"); return }
    if (saved.has(job.id)) return
    await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: job.id, job_title: job.title, employer: job.employer, location: job.location, salary_min: job.salary_min, salary_max: job.salary_max, job_url: job.url, source: job.source, sponsorship_score: job.score })
    setSaved(s => new Set([...s, job.id]))
  }

  const run = useCallback(async (sq, sl) => {
    setLoading(true); setError(""); setPage(1)
    try {
      const cl = sl && sl !== "Anywhere in UK" ? sl : ""
      let raw = []
      const fetches = await Promise.allSettled([
        fetchReed(sq, cl, 1), fetchAdzuna(sq, cl, 1),
        fetchReed(sq, cl, 2), fetchAdzuna(sq, cl, 2),
        fetchReed(sq, cl, 3), fetchAdzuna(sq, cl, 3),
      ])
      for (const r of fetches) { if (r.status === "fulfilled") raw.push(...r.value.jobs) }
      if (raw.length === 0) { setError("No results found."); setLoading(false); return }
      const seen = new Set()
      raw = raw.filter(j => { const k = j.title.slice(0, 30) + j.employer; if (seen.has(k)) return false; seen.add(k); return true })
      const sm = await batchCheck(raw.map(j => j.employer))
      let scored = raw.map(j => { const si = sm[j.employer]; const { score, signals, fresher, verified } = scoreJob(j, si); return { ...j, score, signals, fresher, verified, sponsorInfo: si } }).filter(j => j.score >= 0)
      if (fresherOnly) scored = scored.filter(j => j.fresher)
      if (verifiedOnly) scored = scored.filter(j => j.verified)
      if (jobType === "Full-time") scored = scored.filter(j => j.full_time === true)
      if (jobType === "Part-time") scored = scored.filter(j => j.full_time === false)
      if (salMin) scored = scored.filter(j => (j.salary_min || 0) >= parseInt(salMin))
      if (salMax) scored = scored.filter(j => (j.salary_max || 999999) <= parseInt(salMax))
      if (source) scored = scored.filter(j => j.source === source)
      scored.sort((a, b) => { if (a.verified && !b.verified) return -1; if (!a.verified && b.verified) return 1; return b.score - a.score })
      setAllJobs(scored)
      setTimeout(async () => {
        try {
          const bg = await Promise.allSettled([fetchReed(sq, cl, 4), fetchAdzuna(sq, cl, 4), fetchReed(sq, cl, 5), fetchAdzuna(sq, cl, 5)])
          let bj = []
          for (const r of bg) { if (r.status === "fulfilled") bj.push(...r.value.jobs) }
          if (bj.length > 0) {
            const bsm = await batchCheck(bj.map(j => j.employer))
            const bs = bj.map(j => { const si = bsm[j.employer]; const { score, signals, fresher, verified } = scoreJob(j, si); return { ...j, score, signals, fresher, verified, sponsorInfo: si } }).filter(j => j.score >= 0)
            setAllJobs(prev => { const ids = new Set(prev.map(j => j.id)); const nj = bs.filter(j => !ids.has(j.id)); if (!nj.length) return prev; return [...prev, ...nj].sort((a, b) => { if (a.verified && !b.verified) return -1; if (!a.verified && b.verified) return 1; return b.score - a.score }) })
          }
        } catch(e) {}
      }, 2000)
    } catch (e) { setError("Search failed.") } finally { setLoading(false) }
  }, [fresherOnly, verifiedOnly, jobType, salMin, salMax, source])

  const pill = (active) => ({ padding: "5px 11px", borderRadius: 100, fontSize: mob ? 11 : 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (active ? "#0057FF" : "#E8EEFF"), background: active ? "#0057FF0D" : "#fff", color: active ? "#0057FF" : "#4B5675", fontFamily: "inherit", whiteSpace: "nowrap" })
  const fpill = (active) => ({ padding: "6px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (active ? "#0057FF" : "#E8EEFF"), background: active ? "#0057FF0D" : "#F8FAFF", color: active ? "#0057FF" : "#4B5675", fontFamily: "inherit" })
  const drop = { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", borderRadius: 14, border: "1px solid #E8EEFF", boxShadow: "0 16px 48px rgba(0,57,255,0.1)", maxHeight: 360, overflowY: "auto", zIndex: 300 }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div ref={topRef} style={{ maxWidth: 900, margin: "0 auto", padding: mob ? "82px 4% 40px" : "96px 5% 60px" }}>
        <div style={{ marginBottom: mob ? 14 : 20 }}>
          <h1 style={{ fontSize: mob ? 20 : 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 4px" }}>Find UK Visa Sponsored Jobs</h1>
          <p style={{ color: "#4B5675", fontSize: mob ? 12 : 14, margin: 0 }}>125,284 verified UK Home Office sponsors - Positive results shown first</p>
        </div>

        <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 16, marginBottom: 10, boxShadow: "0 4px 24px rgba(0,57,255,0.06)", position: "relative", zIndex: 20 }}>
          <div style={{ position: "relative", borderBottom: "1px solid #E8EEFF" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3B8", fontSize: 13, pointerEvents: "none" }}>Role:</span>
            <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => { setShowQ(true); setShowL(false) }} onBlur={() => setTimeout(() => setShowQ(false), 200)} onKeyDown={e => { if (e.key === "Enter") { run(q, loc); setShowQ(false) } }} placeholder="Search any role - leave empty for all sponsored jobs" style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: mob ? "14px 80px 14px 60px" : "14px 90px 14px 62px", fontSize: mob ? 14 : 15, color: "#0A0F1E", fontFamily: "inherit" }} />
            {q && <button onClick={() => { setQ(""); run("", loc) }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#4B5675", cursor: "pointer", fontFamily: "inherit" }}>Clear</button>}
            {showQ && (
              <div style={drop}>
                <div style={{ padding: "10px 14px 8px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #F8FAFF" }}>
                  {q ? filteredQ.length + " roles" : "All " + ALL_JOBS.length + " roles"}
                </div>
                {filteredQ.map(r => (
                  <div key={r} onMouseDown={() => { setQ(r === "All Jobs" ? "" : r); run(r === "All Jobs" ? "" : r, loc); setShowQ(false) }}
                    style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: r === "All Jobs" ? "#0057FF" : "#0A0F1E", fontWeight: r === "All Jobs" ? 700 : 400, background: r === "All Jobs" ? "#F0F5FF" : "transparent", borderBottom: "1px solid rgba(232,238,255,0.4)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFF"}
                    onMouseLeave={e => e.currentTarget.style.background = r === "All Jobs" ? "#F0F5FF" : "transparent"}
                  >{r}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9CA3B8", fontSize: 12, pointerEvents: "none" }}>Location:</span>
              <input value={loc} onChange={e => setLoc(e.target.value)} onFocus={() => { setShowL(true); setShowQ(false) }} onBlur={() => setTimeout(() => setShowL(false), 200)} onKeyDown={e => { if (e.key === "Enter") { run(q, loc); setShowL(false) } }} placeholder="Any UK city..." style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: "12px 12px 12px 82px", fontSize: 13, color: "#0A0F1E", fontFamily: "inherit" }} />
              {showL && (
                <div style={drop}>
                  <div style={{ padding: "10px 14px 8px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #F8FAFF" }}>
                    {loc ? filteredL.length + " locations" : "All " + ALL_LOCATIONS.length + " UK cities"}
                  </div>
                  {filteredL.map(c => (
                    <div key={c} onMouseDown={() => { setLoc(c === "Anywhere in UK" ? "" : c); run(q, c === "Anywhere in UK" ? "" : c); setShowL(false) }}
                      style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: c === "Anywhere in UK" ? "#0057FF" : "#0A0F1E", fontWeight: c === "Anywhere in UK" ? 700 : 400, background: c === "Anywhere in UK" ? "#F0F5FF" : "transparent", borderBottom: "1px solid rgba(232,238,255,0.4)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F8FAFF"}
                      onMouseLeave={e => e.currentTarget.style.background = c === "Anywhere in UK" ? "#F0F5FF" : "transparent"}
                    >{c}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 1, height: 32, background: "#E8EEFF" }} />
            <button onClick={() => setShowF(f => !f)} style={{ background: "none", border: "none", color: "#4B5675", padding: "0 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", height: 44 }}>Filters</button>
            <button onClick={() => { run(q, loc); setShowQ(false); setShowL(false) }} disabled={loading} style={{ background: "linear-gradient(135deg,#0057FF,#00C2FF)", color: "#fff", border: "none", borderRadius: "0 0 14px 0", padding: mob ? "12px 14px" : "12px 22px", fontSize: mob ? 13 : 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", height: 44, whiteSpace: "nowrap" }}>Search</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {QUICK_ROLES.map(r => <button key={r} onClick={() => { const v = r === "All Jobs" ? "" : r; setQ(v); run(v, loc) }} style={pill((r === "All Jobs" && !q) || q === r)}>{r}</button>)}
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
          {[{ label: "Fresher friendly", val: fresherOnly, set: () => { setFresherOnly(v => !v); setTimeout(() => run(q, loc), 50) }, color: "#FF6B35" }, { label: "Verified only", val: verifiedOnly, set: () => { setVerifiedOnly(v => !v); setTimeout(() => run(q, loc), 50) }, color: "#00D68F" }].map(t => (
            <div key={t.label} onClick={t.set} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: t.val ? t.color : "#E8EEFF", position: "relative", transition: "background 0.2s" }}>
                <div style={{ position: "absolute", top: 2, left: t.val ? 15 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 12, color: t.val ? t.color : "#4B5675", fontWeight: 600 }}>{t.label}</span>
            </div>
          ))}
        </div>

        {showF && (
          <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 14, padding: mob ? "14px" : "18px 22px", marginBottom: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Contract</div><div style={{ display: "flex", gap: 6 }}>{["Full-time","Part-time"].map(v => <button key={v} onClick={() => setJobType(t => t === v ? "" : v)} style={fpill(jobType === v)}>{v}</button>)}</div></div>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Source</div><div style={{ display: "flex", gap: 6 }}>{["Reed","Adzuna"].map(v => <button key={v} onClick={() => setSource(s => s === v ? "" : v)} style={fpill(source === v)}>{v}</button>)}</div></div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#9CA3B8" }}>Salary</span>
              <input value={salMin} onChange={e => setSalMin(e.target.value)} placeholder="Min" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
              <span style={{ color: "#9CA3B8" }}>to</span>
              <input value={salMax} onChange={e => setSalMax(e.target.value)} placeholder="Max" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
            </div>
          </div>
        )}

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#DC2626", fontSize: 13 }}>{error}</div>}

        {allJobs.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {[{ l: "Total Jobs", v: allJobs.length, c: "#0057FF" }, { l: "Gov Verified", v: allJobs.filter(j => j.verified).length, c: "#00D68F" }, { l: "Fresher", v: allJobs.filter(j => j.fresher).length, c: "#FF6B35" }].map(s => (
              <div key={s.l} style={{ background: "#fff", border: "1px solid " + s.c + "20", borderRadius: 10, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: mob ? 15 : 17, fontWeight: 900, color: s.c }}>{s.v}</span>
                <span style={{ fontSize: 10, color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase" }}>{s.l}</span>
              </div>
            ))}
          </div>
        )}

        {loading && allJobs.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1px solid #E8EEFF", opacity: 1 - i * 0.15 }}>
                <div style={{ height: 14, background: "#F0F0F0", borderRadius: 4, width: (55 + i * 8) + "%", marginBottom: 10 }} />
                <div style={{ height: 11, background: "#F0F0F0", borderRadius: 4, width: "35%" }} />
              </div>
            ))}
          </div>
        )}

        {pageJobs.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: "#4B5675" }}>Showing {((page-1)*JOBS_PER_PAGE)+1}-{Math.min(page*JOBS_PER_PAGE, allJobs.length)} of {allJobs.length} jobs (Page {page} of {totalPages})</div>
              {loading && <span style={{ fontSize: 12, color: "#0057FF", fontWeight: 600 }}>Loading more...</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: mob ? 10 : 12 }}>
              {pageJobs.map(job => <JobCard key={job.id} job={job} onSave={saveJob} saved={saved.has(job.id)} navigate={navigate} mob={mob} />)}
            </div>
            <Pagination page={page} total={totalPages} onPage={goPage} mob={mob} />
          </>
        )}

        {!loading && allJobs.length === 0 && error === "" && (
          <div style={{ textAlign: "center", padding: "48px 20px", background: "#fff", borderRadius: 20, border: "1px solid #E8EEFF" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>No results found</div>
            <button onClick={() => { setQ(""); setLoc(""); run("", "") }} style={{ background: "linear-gradient(135deg,#0057FF,#00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Show All Jobs</button>
          </div>
        )}
      </div>
    </div>
  )
}
