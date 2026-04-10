// api/scrape-desc.js
// Fetches the full job description from an Adzuna redirect URL
// Adzuna free API only gives ~200 char snippets - this gets the full text
// Runs server-side on Vercel to avoid CORS issues

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")

  const { url } = req.query
  if (!url) return res.status(400).json({ description: null })

  try {
    // Follow the Adzuna redirect to the actual job page
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IMMTECH Job Checker)",
        "Accept": "text/html",
      },
      redirect: "follow",
    })

    if (!r.ok) return res.status(200).json({ description: null })

    const html = await r.text()

    // Extract text content - remove all HTML tags
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#\d+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    // Return first 3000 chars - enough to catch any rejection phrases
    // but not so much it slows things down
    const description = text.slice(0, 3000)

    res.status(200).json({ description })
  } catch (err) {
    // Always return 200 so a scrape failure doesn't break the job search
    res.status(200).json({ description: null })
  }
}
