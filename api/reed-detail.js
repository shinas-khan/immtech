// api/reed-detail.js
// Fetches the FULL job description from Reed for a specific job ID
// The main Reed search API only returns ~200 chars - this gets the complete text
// Used by JobsPage to check for rejection phrases buried deeper in descriptions

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  const { jobId } = req.query
  if (!jobId) return res.status(400).json({ error: "jobId required" })

  try {
    const REED_KEY = process.env.REED_API_KEY || ""
    const auth = Buffer.from(REED_KEY + ":").toString("base64")
    const r = await fetch("https://www.reed.co.uk/api/1.0/jobs/" + jobId, {
      headers: { Authorization: "Basic " + auth }
    })
    if (!r.ok) return res.status(200).json({ jobDescription: null })
    const data = await r.json()
    res.status(200).json({ jobDescription: data.jobDescription || null })
  } catch (err) {
    res.status(200).json({ jobDescription: null })
  }
}
