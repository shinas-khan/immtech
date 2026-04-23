// api/cache-jobs.js
// Vercel cron job - runs every 2 hours automatically
// Fetches jobs from Reed, Adzuna, Jooble
// Scores them against the Home Office sponsor register
// Stores results in Supabase cached_jobs table
// JobsPage then reads from Supabase instead of live APIs = sub 1 second loads

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const ADZUNA_ID   = "344e86d1"
const ADZUNA_KEY  = "039c47ae80bab92aef99751a471040fb"
const JOOBLE_KEY  = "383af7e3-137d-47a4-a34d-060e1b12f9c9"

const REED_PROXY  = "https://uk-visa-jobs-six.vercel.app/api/reed"

// Top searches to cache - covers most common searches on IMMTECH
const SEARCH_TERMS = [
  "software engineer",
  "data analyst",
  "registered nurse",
  "cyber security",
  "civil engineer",
  "accountant",
  "data scientist",
  "social worker",
  "pharmacist",
  "mechanical engineer",
  "project manager",
  "business analyst",
  "devops engineer",
  "physiotherapist",
  "electrical engineer",
  "java developer",
  "python developer",
  "full stack developer",
  "machine learning",
  "network engineer",
  "care worker",
  "doctor",
  "teacher",
  "chef",
  "architect",
]

// Hard reject phrases
const HARD_REJECT_KW = [
  "no sponsorship", "no visa sponsorship", "sponsorship not available",
  "cannot sponsor", "unable to sponsor", "we do not sponsor",
  "must have right to work", "must have the right to work",
  "uk residents only", "british nationals only",
  "sponsorship is not available", "not able to offer sponsorship",
  "we are unable to offer visa", "we cannot offer sponsorship",
  "no work permit", "self sponsored", "commission only",
  "registration fee", "upfront fee", "pyramid",
  "unable to accept applications from candidates who require visa",
  "we are unable to accept applications from candidates who require",
]

const CONFIRM_KW = [
  "certificate of sponsorship", "cos will be provided", "cos provided",
  "we will sponsor", "visa sponsorship provided", "visa sponsorship available",
  "sponsorship is available", "sponsorship provided", "sponsorship available",
  "will sponsor", "open to sponsorship", "able to offer sponsorship",
  "happy to sponsor", "can provide sponsorship", "tier 2 sponsorship",
  "skilled worker visa sponsorship", "visa support provided",
]

const MENTION_KW = [
  "visa sponsorship", "sponsor visa", "skilled worker visa",
  "tier 2", "ukvi", "sponsorship considered",
  "international applicants welcome", "relocation package",
]

const HEALTH_ROLES = [
  "nurse", "midwife", "paramedic", "pharmacist", "dentist",
  "physiotherapist", "radiographer", "occupational therapist",
  "doctor", "surgeon", "physician", "healthcare", "clinical",
]

const SHORTAGE_ROLES = [
  "teacher", "secondary teacher", "primary teacher",
  "social worker", "civil engineer", "mechanical engineer",
  "electrical engineer", "chef", "cook",
]

const MIN_SALARY_STANDARD = 41700
const MIN_SALARY_SHORTAGE = 33400
const MIN_SALARY_HEALTH   = 29000

function scoreJob(job) {
  const text = ((job.title || "") + " " + (job.description || "") + " " + (job.employer || "")).toLowerCase()
  const Z = { score: 0, likelihood: "", signals: [], fresher_friendly: false, verified: false }

  for (const neg of HARD_REJECT_KW) {
    if (text.includes(neg)) return Z
  }

  const isHealth   = HEALTH_ROLES.some(r => text.includes(r))
  const isShortage = SHORTAGE_ROLES.some(r => text.includes(r))
  const minSal = isHealth ? MIN_SALARY_HEALTH : (isShortage ? MIN_SALARY_SHORTAGE : MIN_SALARY_STANDARD)

  if (job.salary_max && job.salary_max > 0) {
    if (job.salary_max < 500) return Z
    if (job.salary_max < minSal && !isHealth && !isShortage) return Z
    if (isHealth   && job.salary_max < MIN_SALARY_HEALTH)   return Z
    if (isShortage && job.salary_max < MIN_SALARY_SHORTAGE) return Z
  }

  let score = 0
  const signals = []

  if (job.sponsor_verified) {
    score += 60
    signals.push({ type: "verified", label: "Gov Verified" })
    if (job.sponsor_rating === "A") {
      score += 8
      signals.push({ type: "rating", label: "A-Rated" })
    }
  }

  let hasConfirm = false
  for (const kw of CONFIRM_KW) {
    if (text.includes(kw)) {
      score += 25; hasConfirm = true
      signals.push({ type: "visa", label: "Sponsorship Confirmed" })
      break
    }
  }

  if (!hasConfirm) {
    for (const kw of MENTION_KW) {
      if (text.includes(kw)) {
        score += 12
        signals.push({ type: "visa", label: "Visa Mentioned" })
        break
      }
    }
  }

  // Jooble pre-filters by visa keywords - give baseline if no other signal
  if (score === 0 && job.source === "Jooble") {
    score = 20
    signals.push({ type: "visa", label: "Via Jooble" })
  }

  if (score === 0) return Z

  if (job.salary_min && job.salary_min >= minSal) {
    score += 7
    signals.push({ type: "salary", label: "Salary eligible" })
  }

  const FRESHER_KW = ["graduate", "junior", "entry level", "entry-level", "new graduate", "recent graduate", "0-1 year", "0-2 year", "no experience required"]
  const fresher_friendly = FRESHER_KW.some(kw => text.includes(kw))

  const s = Math.min(100, score)
  const likelihood = s >= 80 ? "Confirmed" : s >= 60 ? "Very Likely" : s >= 40 ? "Likely" : "Possible"

  return { score: s, likelihood, signals, fresher_friendly, verified: !!job.sponsor_verified }
}

function parseDate(raw) {
  if (!raw) return null
  try {
    // Handle DD/MM/YYYY format from Reed
    if (typeof raw === "string" && raw.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = raw.split("/")
      return new Date(y + "-" + m + "-" + d).toISOString()
    }
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch { return null }
}

async function fetchReed(keywords, page) {
  try {
    const params = new URLSearchParams({
      keywords: keywords + " visa sponsorship",
      resultsToTake: 25,
      resultsToSkip: (page - 1) * 25,
    })
    const r = await fetch(REED_PROXY + "?" + params, { signal: AbortSignal.timeout(10000) })
    if (!r.ok) return []
    const data = await r.json()
    return (data.results || []).map(j => ({
      id: "reed_" + j.jobId,
      source: "Reed",
      title: j.jobTitle || "",
      employer: j.employerName || "",
      location: j.locationName || "",
      salary_min: j.minimumSalary || null,
      salary_max: j.maximumSalary || null,
      description: j.jobDescription || "",
      url: j.jobUrl || "#",
      posted: parseDate(j.date),
      full_time: j.fullTime || null,
    }))
  } catch { return [] }
}

async function fetchAdzuna(keywords, page) {
  try {
    const params = new URLSearchParams({
      app_id: ADZUNA_ID, app_key: ADZUNA_KEY,
      what: keywords + " visa sponsorship",
      where: "uk", results_per_page: 25,
    })
    const r = await fetch("https://api.adzuna.com/v1/api/jobs/gb/search/" + page + "?" + params, { signal: AbortSignal.timeout(10000) })
    if (!r.ok) return []
    const data = await r.json()
    return (data.results || []).map(j => ({
      id: "adzuna_" + j.id,
      source: "Adzuna",
      title: j.title || "",
      employer: (j.company && j.company.display_name) || "",
      location: (j.location && j.location.display_name) || "",
      salary_min: j.salary_min ? Math.floor(j.salary_min) : null,
      salary_max: j.salary_max ? Math.floor(j.salary_max) : null,
      description: j.description || "",
      url: j.redirect_url || "#",
      posted: parseDate(j.created),
      full_time: j.contract_time === "full_time",
    }))
  } catch { return [] }
}

async function fetchJooble(keywords, page) {
  try {
    const r = await fetch("https://jooble.org/api/" + JOOBLE_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: keywords + " visa sponsorship uk", page }),
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) return []
    const data = await r.json()
    return (data.jobs || []).map(j => ({
      id: "jooble_" + (j.id || Math.random()),
      source: "Jooble",
      title: j.title || "",
      employer: j.company || "",
      location: j.location || "UK",
      salary_min: null,
      salary_max: null,
      description: j.snippet || "",
      url: j.link || "#",
      posted: parseDate(j.updated),
      full_time: null,
    }))
  } catch { return [] }
}

async function checkSponsors(supabase, employers) {
  const unique = [...new Set(employers.filter(Boolean))]
  const results = {}
  for (let i = 0; i < unique.length; i += 20) {
    const batch = unique.slice(i, i + 20)
    for (const emp of batch) {
      try {
        const clean = emp.replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co)\.*$/gi, "").trim()
        const { data } = await supabase.from("sponsors")
          .select("organisation_name, rating, route")
          .ilike("organisation_name", "%" + clean + "%")
          .limit(1)
        if (data && data[0]) results[emp] = data[0]
      } catch {}
    }
  }
  return results
}

export default async function handler(req, res) {
  // Security - only allow Vercel cron or manual trigger with secret
  const authHeader = req.headers.authorization
  if (authHeader !== "Bearer " + process.env.CRON_SECRET && req.method !== "GET") {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  let totalFetched = 0
  let totalCached = 0
  const errors = []

  console.log("Starting job cache refresh...")

  for (const term of SEARCH_TERMS) {
    try {
      // Fetch from all 3 sources simultaneously (2 pages each)
      const [r1, r2, a1, a2, j1] = await Promise.allSettled([
        fetchReed(term, 1),
        fetchReed(term, 2),
        fetchAdzuna(term, 1),
        fetchAdzuna(term, 2),
        fetchJooble(term, 1),
      ])

      let jobs = []
      for (const res of [r1, r2, a1, a2, j1]) {
        if (res.status === "fulfilled") jobs.push(...res.value)
      }

      // Deduplicate
      const seen = new Set()
      jobs = jobs.filter(j => {
        const key = (j.title || "").toLowerCase().slice(0, 25) + "|" + (j.employer || "").toLowerCase()
        if (seen.has(key)) return false
        seen.add(key); return true
      })

      totalFetched += jobs.length

      // Check sponsors
      const sponsorMap = await checkSponsors(supabase, jobs.map(j => j.employer))

      // Score jobs
      const scoredJobs = jobs
        .map(j => {
          const sponsorData = sponsorMap[j.employer]
          const jobWithSponsor = {
            ...j,
            sponsor_verified: !!sponsorData,
            sponsor_rating: sponsorData ? sponsorData.rating : null,
            sponsor_route: sponsorData ? sponsorData.route : null,
          }
          const { score, likelihood, signals, fresher_friendly, verified } = scoreJob(jobWithSponsor)
          return { ...jobWithSponsor, score, likelihood, signals, fresher_friendly, verified, search_keywords: [term] }
        })
        .filter(j => j.score > 0)

      // Upsert into Supabase
      if (scoredJobs.length > 0) {
        const rows = scoredJobs.map(j => ({
          id: j.id,
          source: j.source,
          title: j.title,
          employer: j.employer,
          location: j.location,
          salary_min: j.salary_min ? Math.floor(j.salary_min) : null,
          salary_max: j.salary_max ? Math.floor(j.salary_max) : null,
          description: (j.description || "").slice(0, 2000),
          url: j.url,
          posted: j.posted ? (typeof j.posted === 'string' && j.posted.match(/^\d{2}\/\d{2}\/\d{4}$/) ? (() => { const [d,m,y] = j.posted.split('/'); return new Date(y+'-'+m+'-'+d).toISOString() })() : j.posted) : null,
          full_time: j.full_time,
          score: j.score,
          likelihood: j.likelihood,
          verified: j.verified,
          sponsor_rating: j.sponsor_rating,
          sponsor_route: j.sponsor_route,
          signals: j.signals,
          fresher_friendly: j.fresher_friendly,
          search_keywords: j.search_keywords,
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        }))

        const { error } = await supabase
          .from("cached_jobs")
          .upsert(rows, { onConflict: "id" })

        if (error) {
          errors.push({ term, error: error.message })
        } else {
          totalCached += rows.length
        }
      }
    } catch (err) {
      errors.push({ term, error: err.message })
    }
  }

  // Clean up expired jobs older than 6 hours
  await supabase
    .from("cached_jobs")
    .delete()
    .lt("expires_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())

  console.log("Cache refresh complete:", { totalFetched, totalCached, errors: errors.length })

  res.status(200).json({
    success: true,
    totalFetched,
    totalCached,
    searchTerms: SEARCH_TERMS.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
