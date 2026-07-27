// api/jooble.js
// Jooble REST API proxy - runs server-side to avoid CORS issues
// Set JOOBLE_KEY in your Vercel project's Environment Variables, never in code.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET")

  const { keywords, location, page } = req.query
  const pageNum = parseInt(page || "1")

  const JOOBLE_KEY = process.env.JOOBLE_KEY
  if (!JOOBLE_KEY) {
    // Fails safe rather than throwing - if you've decided to drop Jooble
    // as a source, just leave this env var unset and this endpoint quietly
    // returns no results instead of erroring.
    return res.status(200).json({ jobs: [], totalCount: 0 })
  }

  try {
    const body = JSON.stringify({
      keywords: keywords || "visa sponsorship",
      location: location || "United Kingdom",
      page: pageNum,
      resultonpage: 20,
    })

    const r = await fetch(
      `https://jooble.org/api/${JOOBLE_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }
    )

    if (!r.ok) {
      return res.status(200).json({ jobs: [], totalCount: 0 })
    }

    const data = await r.json()
    const jobs = (data.jobs || []).map(j => ({
      id: "jooble_" + (j.id || Math.random()),
      source: "Jooble",
      title: j.title || "",
      employer: j.company || "",
      location: j.location || "United Kingdom",
      salary_min: parseSalary(j.salary, "min"),
      salary_max: parseSalary(j.salary, "max"),
      description: (j.snippet || ""),
      url: j.link || "#",
      posted: j.updated || null,
      full_time: j.type ? j.type.toLowerCase().includes("full") : null,
    }))

    res.status(200).json({ jobs, totalCount: data.totalCount || 0 })
  } catch (err) {
    res.status(200).json({ jobs: [], totalCount: 0, error: err.message })
  }
}

function parseSalary(salaryStr, type) {
  if (!salaryStr) return null
  const nums = salaryStr.replace(/[^0-9.]/g, " ").trim().split(/\s+/).map(Number).filter(n => n > 100)
  if (nums.length === 0) return null
  if (type === "min") return Math.min(...nums)
  if (type === "max") return Math.max(...nums)
  return null
}
