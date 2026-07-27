// api/adzuna-search.js
// Server-side proxy for Adzuna job search.
//
// Previously src/pages/JobsPage.jsx called api.adzuna.com directly from the
// browser with app_id/app_key in the URL - meaning the key was visible to
// anyone who opened dev tools on the live site, independent of anything in
// git history. This endpoint does the same job server-side, the same way
// api/jooble.js already proxies Jooble, so the real key never reaches the
// browser at all.
//
// Set ADZUNA_ID and ADZUNA_KEY in your Vercel project's Environment
// Variables, never in code.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET")

  const ADZUNA_ID = process.env.ADZUNA_ID
  const ADZUNA_KEY = process.env.ADZUNA_KEY
  if (!ADZUNA_ID || !ADZUNA_KEY) {
    return res.status(200).json({ results: [] })
  }

  const { what, where, page } = req.query
  const pageNum = parseInt(page || "1")

  try {
    const params = new URLSearchParams({
      app_id: ADZUNA_ID,
      app_key: ADZUNA_KEY,
      what: what || "visa sponsorship uk jobs",
      where: where || "UK",
      results_per_page: "40",
    })
    const r = await fetch(`https://api.adzuna.com/v1/api/jobs/gb/search/${pageNum}?${params}`)
    if (!r.ok) return res.status(200).json({ results: [] })
    const data = await r.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(200).json({ results: [], error: err.message })
  }
}
