// api/employer-jobs.js
// Fetches jobs from Reed + Adzuna specifically for top known sponsors
// Called by JobsPage when user searches - supplements general search results
// with targeted employer-specific searches for maximum accuracy

const ADZUNA_ID  = "344e86d1"
const ADZUNA_KEY = "039c47ae80bab92aef99751a471040fb"

async function fetchReedForEmployer(searchTerm, loc, jobRole) {
  try {
    const keywords = jobRole
      ? jobRole + " " + searchTerm
      : searchTerm + " visa sponsorship"
    const locationName = loc || "United Kingdom"
    const params = new URLSearchParams({
      keywords,
      locationName,
      resultsToTake: 10,
      resultsToSkip: 0,
    })
    const r = await fetch("https://uk-visa-jobs-six.vercel.app/api/reed?" + params)
    if (!r.ok) return []
    const data = await r.json()
    return (data.results || []).map(j => ({
      id: "reed_" + j.jobId,
      source: "Reed",
      employer_search: searchTerm,
      title: j.jobTitle || "",
      employer: j.employerName || searchTerm,
      location: j.locationName || "",
      salary_min: j.minimumSalary,
      salary_max: j.maximumSalary,
      description: j.jobDescription || "",
      url: j.jobUrl || "#",
      posted: j.date,
      full_time: j.fullTime,
    }))
  } catch { return [] }
}

async function fetchAdzunaForEmployer(searchTerm, loc, jobRole) {
  try {
    const what = jobRole
      ? jobRole + " " + searchTerm
      : searchTerm + " jobs"
    const where = loc || "UK"
    const params = new URLSearchParams({
      app_id: ADZUNA_ID,
      app_key: ADZUNA_KEY,
      what,
      where,
      results_per_page: 10,
    })
    const r = await fetch("https://api.adzuna.com/v1/api/jobs/gb/search/1?" + params)
    if (!r.ok) return []
    const data = await r.json()
    return (data.results || []).map(j => ({
      id: "adzuna_" + j.id,
      source: "Adzuna",
      employer_search: searchTerm,
      title: j.title || "",
      employer: (j.company && j.company.display_name) || searchTerm,
      location: (j.location && j.location.display_name) || "UK",
      salary_min: j.salary_min,
      salary_max: j.salary_max,
      description: j.description || "",
      url: j.redirect_url || "#",
      posted: j.created,
      full_time: j.contract_time === "full_time",
    }))
  } catch { return [] }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET")

  const { role, loc } = req.query

  // Top employer search terms - confirmed from gov register
  // Tier 1 = global brands, Tier 2 = large UK orgs
  const TOP_EMPLOYERS = [
    // Tech
    { term: "Amazon",       tier: 1 },
    { term: "Google",       tier: 1 },
    { term: "Microsoft",    tier: 1 },
    { term: "Apple",        tier: 1 },
    { term: "Meta",         tier: 1 },
    { term: "IBM",          tier: 1 },
    { term: "Oracle",       tier: 1 },
    { term: "Cisco",        tier: 1 },
    { term: "Accenture",    tier: 1 },
    { term: "Capgemini",    tier: 1 },
    { term: "Infosys",      tier: 1 },
    { term: "TCS",          tier: 1 },
    { term: "Wipro",        tier: 1 },
    { term: "Cognizant",    tier: 1 },
    { term: "Deloitte",     tier: 1 },
    { term: "KPMG",         tier: 1 },
    { term: "PwC",          tier: 1 },
    { term: "EY",           tier: 1 },
    { term: "McKinsey",     tier: 1 },
    { term: "BCG",          tier: 1 },
    { term: "ARM",          tier: 1 },
    { term: "Siemens",      tier: 1 },
    { term: "Ericsson",     tier: 1 },
    { term: "Vodafone",     tier: 1 },
    { term: "BT",           tier: 1 },
    // Finance
    { term: "Barclays",     tier: 1 },
    { term: "HSBC",         tier: 1 },
    { term: "Lloyds",       tier: 1 },
    { term: "NatWest",      tier: 1 },
    { term: "Goldman Sachs",tier: 1 },
    { term: "Morgan Stanley",tier: 1 },
    { term: "JPMorgan",     tier: 1 },
    { term: "BlackRock",    tier: 1 },
    { term: "Santander",    tier: 1 },
    { term: "Revolut",      tier: 1 },
    { term: "Monzo",        tier: 1 },
    { term: "Wise",         tier: 1 },
    // Pharma
    { term: "AstraZeneca",  tier: 1 },
    { term: "GSK",          tier: 1 },
    { term: "Pfizer",       tier: 1 },
    { term: "Novartis",     tier: 1 },
    { term: "Roche",        tier: 1 },
    // Energy & Industry
    { term: "Shell",        tier: 1 },
    { term: "BP",           tier: 1 },
    { term: "Rolls-Royce",  tier: 1 },
    { term: "Jaguar Land Rover", tier: 1 },
    { term: "BAE Systems",  tier: 1 },
    { term: "Airbus",       tier: 1 },
    { term: "Deliveroo",    tier: 1 },
    // Universities
    { term: "University of Oxford",    tier: 2 },
    { term: "University of Cambridge", tier: 2 },
    { term: "Imperial College London", tier: 2 },
    { term: "UCL",                     tier: 2 },
    { term: "Kings College London",    tier: 2 },
    { term: "University of Manchester",tier: 2 },
    { term: "University of Edinburgh", tier: 2 },
    { term: "University of Birmingham",tier: 2 },
    { term: "University of Leeds",     tier: 2 },
    { term: "University of Bristol",   tier: 2 },
    { term: "NHS",                     tier: 2 },
  ]

  try {
    // For the given role, search Reed + Adzuna for each top employer
    // Run in batches of 5 to avoid overwhelming APIs
    const allJobs = []
    const batchSize = 5

    for (let i = 0; i < TOP_EMPLOYERS.length; i += batchSize) {
      const batch = TOP_EMPLOYERS.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.flatMap(emp => [
          fetchReedForEmployer(emp.term, loc, role),
          fetchAdzunaForEmployer(emp.term, loc, role),
        ])
      )
      for (const r of results) {
        if (r.status === "fulfilled") allJobs.push(...r.value)
      }
    }

    // Deduplicate
    const seen = new Set()
    const unique = allJobs.filter(j => {
      const key = j.title.toLowerCase().slice(0, 30) + "|" + j.employer.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    res.status(200).json({
      jobs: unique,
      total: unique.length,
      employers_searched: TOP_EMPLOYERS.length,
    })
  } catch (err) {
    res.status(500).json({ error: err.message, jobs: [] })
  }
}
