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
  "sponsorship cannot be offered", "we are unable to offer visa",
  "not eligible for uk visa sponsorship",
  "not eligible for visa sponsorship",
  "not open to sponsorship",
  "will not be open to sponsorship",
  "unable to accept applicants with skilled worker",
  "not open to skilled worker visa",
  "salary does not meet the home office",
  "does not meet the home office requirements",
  "this post will not be open to sponsorship",
  "we cannot accept applications from candidates who require",
  "only accept applications from candidates who are located in",
  "eligible to work within the uk",
  "cannot accept applicants who require sponsorship",
  "sponsorship under the ukvi",
  "ukvi scheme",
  "not sponsored by us",
  "sponsorship is not provided",
  "we do not provide sponsorship",
  "you must not require sponsorship",
  "this role does not offer sponsorship",
  "visa sponsorship is unfortunately",
  "this position does not offer",
  "not able to offer sponsorship",
  "regret we are unable to offer",
  "this vacancy does not offer",
  "no work permit",
  "work permit will not be sponsored",
  "cannot provide certificate of sponsorship",
  "self sponsored", "self-sponsored", "sponsor yourself",
  "acquire own business", "own your own business",
  "business opportunity", "franchise opportunity"
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

const FRESHER_KW = [
  "graduate", "entry level", "junior", "trainee", "apprentice",
  "grad scheme", "graduate scheme", "graduate programme",
  "no experience required", "fresh graduate", "new graduate"
]

const ALL_ROLES = ["All Jobs", ...ALL_JOBS]
const ALL_LOCS = ["Anywhere in UK", ...ALL_LOCATIONS]
const QUICK_ROLES = ["All Jobs","Software Engineer","Registered Nurse","Data Analyst","Cyber Security Analyst","Civil Engineer","Pharmacist","Data Scientist","Accountant","Physiotherapist","Social Worker","DevOps Engineer"]





// UK Home Office 2024 eligible SOC codes for Skilled Worker visa
// Source: https://www.gov.uk/government/publications/skilled-worker-visa-eligible-occupations
// Format: "job keyword" -> { soc, minSalary, eligible, route }
const SOC_ELIGIBILITY = {
  // ============================================================
  // UK HOME OFFICE THRESHOLDS - Updated 22 July 2025
  // General Skilled Worker: GBP 41,700 (or going rate, whichever higher)
  // New entrant / ISL roles: GBP 33,400
  // Health & Care (NHS AgfC): GBP 25,000
  // Must be RQF Level 6 (degree level) from 22 July 2025
  // ============================================================

  // TECHNOLOGY - all degree level, eligible
  "software engineer": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "software developer": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "data scientist": { soc: "2425", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "data analyst": { soc: "2425", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "data engineer": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "cyber security": { soc: "2139", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "information security": { soc: "2139", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "devops": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "cloud engineer": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "cloud architect": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "machine learning": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "ai engineer": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "network engineer": { soc: "2133", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "product manager": { soc: "2424", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "it project manager": { soc: "2424", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "project manager": { soc: "2424", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "systems analyst": { soc: "2137", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "business analyst": { soc: "2424", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "solutions architect": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "penetration tester": { soc: "2139", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "platform engineer": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "site reliability": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "full stack": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "backend developer": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "frontend developer": { soc: "2136", minSalary: 41700, eligible: true, route: "Skilled Worker" },

  // HEALTHCARE - Health & Care Worker route, lower threshold GBP 25,000
  "registered nurse": { soc: "2231", minSalary: 25000, eligible: true, route: "Health & Care" },
  "mental health nurse": { soc: "2231", minSalary: 25000, eligible: true, route: "Health & Care" },
  "general practitioner": { soc: "2211", minSalary: 49923, eligible: true, route: "Health & Care" },
  "pharmacist": { soc: "2213", minSalary: 25000, eligible: true, route: "Health & Care" },
  "physiotherapist": { soc: "2217", minSalary: 25000, eligible: true, route: "Health & Care" },
  "radiographer": { soc: "2217", minSalary: 25000, eligible: true, route: "Health & Care" },
  "occupational therapist": { soc: "2217", minSalary: 25000, eligible: true, route: "Health & Care" },
  "paramedic": { soc: "3213", minSalary: 25000, eligible: true, route: "Health & Care" },
  "midwife": { soc: "2232", minSalary: 25000, eligible: true, route: "Health & Care" },
  "surgeon": { soc: "2212", minSalary: 49923, eligible: true, route: "Health & Care" },
  "dentist": { soc: "2214", minSalary: 25000, eligible: true, route: "Health & Care" },
  "psychiatrist": { soc: "2211", minSalary: 49923, eligible: true, route: "Health & Care" },
  "social worker": { soc: "2442", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "speech therapist": { soc: "2217", minSalary: 25000, eligible: true, route: "Health & Care" },
  "dietitian": { soc: "2217", minSalary: 25000, eligible: true, route: "Health & Care" },
  "biomedical scientist": { soc: "2211", minSalary: 25000, eligible: true, route: "Health & Care" },

  // ENGINEERING - degree level, eligible
  "civil engineer": { soc: "2121", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "mechanical engineer": { soc: "2122", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "electrical engineer": { soc: "2123", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "structural engineer": { soc: "2121", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "chemical engineer": { soc: "2125", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "aerospace engineer": { soc: "2122", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "robotics engineer": { soc: "2122", minSalary: 41700, eligible: true, route: "Skilled Worker" },

  // FINANCE - degree level, eligible
  "accountant": { soc: "2421", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "financial analyst": { soc: "2422", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "investment analyst": { soc: "2422", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "risk analyst": { soc: "2422", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "actuar": { soc: "2423", minSalary: 41700, eligible: true, route: "Skilled Worker" },

  // EDUCATION - on Shortage List, lower threshold GBP 33,400
  "teacher": { soc: "2314", minSalary: 33400, eligible: true, route: "Shortage List" },
  "university lecturer": { soc: "2311", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "lecturer": { soc: "2311", minSalary: 41700, eligible: true, route: "Skilled Worker" },

  // ARCHITECTURE & CONSTRUCTION
  "architect": { soc: "2431", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "quantity surveyor": { soc: "2432", minSalary: 41700, eligible: true, route: "Skilled Worker" },

  // LEGAL
  "solicitor": { soc: "2411", minSalary: 41700, eligible: true, route: "Skilled Worker" },
  "barrister": { soc: "2411", minSalary: 41700, eligible: true, route: "Skilled Worker" },

  // ============================================================
  // NOT ELIGIBLE - removed from Skilled Worker list July 2025
  // or never eligible (below RQF Level 6)
  // ============================================================
  "chef": { soc: "5434", minSalary: 999999, eligible: false, route: "Not Eligible - removed July 2025" },
  "cook": { soc: "5434", minSalary: 999999, eligible: false, route: "Not Eligible - removed July 2025" },
  "kitchen assistant": { soc: "9272", minSalary: 999999, eligible: false, route: "Not Eligible" },
  "kitchen porter": { soc: "9272", minSalary: 999999, eligible: false, route: "Not Eligible" },
  "waiter": { soc: "9272", minSalary: 999999, eligible: false, route: "Not Eligible" },
  "waitress": { soc: "9272", minSalary: 999999, eligible: false, route: "Not Eligible" },
  "barista": { soc: "9272", minSalary: 999999, eligible: false, route: "Not Eligible" },
  "hospitality": { soc: "9272", minSalary: 999999, eligible: false, route: "Not Eligible" },
  "housekeeper": { soc: "9132", minSalary: 999999, eligible: false, route: "Not Eligible" },
  "cleaner": { soc: "9132", minSalary: 999999, eligible: false, route: "Not Eligible" },
  "delivery driver": { soc: "8211", minSalary: 999999, eligible: false, route: "Not Eligible" },
  "retail assistant": { soc: "7111", minSalary: 999999, eligible: false, route: "Not Eligible" },
  "shop assistant": { soc: "7111", minSalary: 999999, eligible: false, route: "Not Eligible" },
  "teaching assistant": { soc: "6126", minSalary: 999999, eligible: false, route: "Not Eligible - below RQF6" },
  "learning support": { soc: "6126", minSalary: 999999, eligible: false, route: "Not Eligible - below RQF6" },
  "classroom assistant": { soc: "6126", minSalary: 999999, eligible: false, route: "Not Eligible - below RQF6" },
  "hlta": { soc: "6126", minSalary: 999999, eligible: false, route: "Not Eligible - below RQF6" },
  "care worker": { soc: "6145", minSalary: 999999, eligible: false, route: "Not Eligible - social care route closed July 2025" },
  "support worker": { soc: "6145", minSalary: 999999, eligible: false, route: "Not Eligible - social care route closed July 2025" },
  "healthcare assistant": { soc: "6141", minSalary: 999999, eligible: false, route: "Not Eligible - below RQF6" },
  "personal assistant": { soc: "6145", minSalary: 999999, eligible: false, route: "Not Eligible" },
  "warehouse": { soc: "8149", minSalary: 999999, eligible: false, route: "Not Eligible - below RQF6" },
  "security guard": { soc: "9241", minSalary: 999999, eligible: false, route: "Not Eligible - below RQF6" },
  "self sponsored": { soc: "N/A", minSalary: 999999, eligible: false, route: "Not a legitimate sponsorship" },
  "self-sponsored": { soc: "N/A", minSalary: 999999, eligible: false, route: "Not a legitimate sponsorship" },
}

// Check if a job is SOC-eligible and meets salary threshold
function checkSOCEligibility(title) {
  const t = title.toLowerCase()
  for (const [keyword, data] of Object.entries(SOC_ELIGIBILITY)) {
    if (t.includes(keyword)) {
      if (!data.eligible) return { eligible: false }
      return { eligible: true, route: data.route, soc: data.soc }
    }
  }
  return { eligible: true, route: "Skilled Worker", soc: "unknown" }
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
  // SOC ELIGIBILITY CHECK - before anything else
  const socCheck = checkSOCEligibility(job.title)
  if (!socCheck.eligible) {
    return { score: -1, signals: [], fresher: false, verified: false }
  }

  // Salary threshold not enforced - routes have different minimums

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
  // Show visa route from SOC check
  if (socCheck.route && socCheck.route !== "Skilled Worker" && socCheck.route !== "unknown") {
    signals.push({ type: "route", label: socCheck.route })
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

  // MINIMUM THRESHOLD:
  // Gov verified employer = always show (they CAN sponsor even if description is vague)
  // Strong visa language = always show
  // Weak signal only = remove (these are the inaccurate low-score jobs)
  if (!sponsor && !hasStrongVisa) {
    return { score: -1, signals: [], fresher: false, verified: false }
  }

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
            const c = s.type === "verified" ? "#00D68F" : s.type === "rating" ? "#00D68F" : s.type === "visa" ? "#0057FF" : s.type === "route" ? "#7C3AED" : "#FF6B35"
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
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: "linear-gradient(135deg,#0057FF,#00C2FF)", color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
          Apply Now
        </a>
        {job.sponsorInfo && <button onClick={() => navigate("/employer/" + encodeURIComponent(job.employer))} style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", color: "#4B5675", borderRadius: 8, padding: "9px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Profile</button>}
      </div>
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
