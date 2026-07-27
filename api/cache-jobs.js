// api/cache-jobs.js
// Vercel cron job - runs every 2 hours automatically
// Fetches jobs from Reed, Adzuna, Jooble
// Scores them against the Home Office sponsor register
// Stores results in Supabase cached_jobs table
// JobsPage then reads from Supabase instead of live APIs = sub 1 second loads

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
// Set these three in your Vercel project's Environment Variables, never in code.
const ADZUNA_ID   = process.env.ADZUNA_ID
const ADZUNA_KEY  = process.env.ADZUNA_KEY
const JOOBLE_KEY  = process.env.JOOBLE_KEY

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
  "care assistant",
  "healthcare assistant",
  "support worker",
  "doctor",
  "teacher",
  "teaching assistant",
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
  // "care worker" was a SEARCH_TERM but wasn't in this list, so every care
  // worker job (realistically salaried well under the 41,700 standard rate)
  // was hard-rejected below. These are Health & Care Worker visa route roles
  // with their own lower going rate - they belong here, not on the standard
  // rate check.
  "care worker", "care assistant", "healthcare assistant",
  "support worker", "senior care worker",
]

const SHORTAGE_ROLES = [
  "teacher", "secondary teacher", "primary teacher",
  "social worker", "civil engineer", "mechanical engineer",
  "electrical engineer", "chef", "cook", "teaching assistant",
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
    // Deliberately NOT appending "visa sponsorship" to the search string.
    // Reed is a general job board - almost no real posting contains that
    // literal phrase in its searchable text, so tacking it onto the query
    // was starving the raw result pool to near-nothing before scoreJob()
    // ever got a chance to run. Search broad, let CONFIRM_KW/MENTION_KW/
    // sponsor_verified do the actual sponsorship-relevance filtering.
    const params = new URLSearchParams({
      keywords,
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
    // Same reasoning as fetchReed() above - search the plain role, don't
    // choke the query with a phrase real postings rarely contain verbatim.
    const params = new URLSearchParams({
      app_id: ADZUNA_ID, app_key: ADZUNA_KEY,
      what: keywords,
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
    // Deliberately NOT changed like fetchReed()/fetchAdzuna() above - the
    // scorer gives Jooble results a flat +20 baseline specifically because
    // this query still narrows to visa-related postings (see scoreJob()'s
    // "Jooble pre-filters by visa keywords" comment). Stripping the phrase
    // here without also removing that baseline would just recreate the same
    // "fake volume from an unearned pass" problem the sponsor-match fix
    // just solved, from a different angle.
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
        // This was the one remaining copy of the old ilike '%x%' substring
        // match - the same pattern already replaced with word-boundary regex
        // in src/pages/JobsPage.jsx and api/check-sponsor.js after it was
        // shown to false-match short/common employer fragments. This is the
        // function that actually decides "verified" on the live job board
        // (the other two only affect the extension and the manual checker
        // page), so leaving it unfixed here meant the site's real "Gov
        // Verified" badge was still running on the risky logic.
        const clean = emp
          .replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co|corp|corporation|holdings|services|solutions|international|technologies|technology|systems|consulting|consultancy|recruitment|staffing|agency)\.?$/gi, "")
          .replace(/[^\w\s]/g, " ")
          .trim()
        if (clean.length < 3) continue

        const { data: exact } = await supabase.from("sponsors")
          .select("organisation_name, rating, route")
          .ilike("organisation_name", emp)
          .limit(1)
        if (exact && exact[0]) { results[emp] = exact[0]; continue }

        const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const { data: wordMatch } = await supabase.from("sponsors")
          .select("organisation_name, rating, route")
          .filter("organisation_name", "imatch", `\\y${escaped}\\y`)
          .limit(1)
        if (wordMatch && wordMatch[0]) results[emp] = wordMatch[0]
      } catch {}
    }
  }
  return results
}

export default async function handler(req, res) {
  // Security - Vercel injects "Authorization: Bearer $CRON_SECRET" automatically
  // on its own cron invocations (GET requests) when CRON_SECRET is set, so
  // requiring it here doesn't break the real cron. The previous check only
  // enforced this for non-GET requests, which meant anyone who found this URL
  // could send a plain GET and force a full refresh - burning through the
  // Adzuna/Jooble free-tier quota for the day and leaving nothing left for
  // the real 6am run. Now every request needs the secret.
  const authHeader = req.headers.authorization
  if (!process.env.CRON_SECRET || authHeader !== "Bearer " + process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  let totalFetched = 0
  let totalCached = 0
  const errors = []

  console.log("Starting job cache refresh...")

  for (const term of SEARCH_TERMS) {
    try {
      // Fetch from all 3 sources simultaneously. This only runs once a day
      // (see vercel.json's cron schedule), so there's real headroom on the
      // free-tier API caps - went from 2 pages each (Reed/Adzuna) + 1
      // (Jooble) to 4/4/2 to roughly triple the raw pool feeding the scorer,
      // since "only 18 jobs survive" was as much a volume problem as a
      // scoring-threshold problem.
      const [r1, r2, r3, r4, a1, a2, a3, a4, j1, j2] = await Promise.allSettled([
        fetchReed(term, 1),
        fetchReed(term, 2),
        fetchReed(term, 3),
        fetchReed(term, 4),
        fetchAdzuna(term, 1),
        fetchAdzuna(term, 2),
        fetchAdzuna(term, 3),
        fetchAdzuna(term, 4),
        fetchJooble(term, 1),
        fetchJooble(term, 2),
      ])

      let jobs = []
      for (const res of [r1, r2, r3, r4, a1, a2, a3, a4, j1, j2]) {
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
