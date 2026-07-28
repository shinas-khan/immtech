// api/generate-cv-cover.js
// Generates an ATS-friendly UK CV rewrite + a tailored cover letter from the
// candidate's existing CV text and a target role/job description.
//
// Output is plain text, deliberately - the site's own CV-scoring prompt
// (api/score-cv.js) already tells candidates that simple, table-free,
// image-free formatting IS what "ATS-friendly" means. Generating a
// fancy-formatted .docx here would contradict that advice inside the same
// product.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).end()

  const { cvText, targetRole, jobDescription, fullName } = req.body || {}
  if (!cvText || cvText.length < 50) {
    return res.status(200).json({ error: "Not enough CV text to work from - upload a readable CV first." })
  }
  if (!targetRole || !targetRole.trim()) {
    return res.status(200).json({ error: "Tell us the role you're targeting first." })
  }

  const key = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(500).json({ error: "API key not configured" })

  const prompt = `You are a senior UK recruitment writer specialising in CVs and cover letters for international candidates applying for UK Skilled Worker / Health & Care visa-sponsored roles.

CANDIDATE'S EXISTING CV (source material - use its real facts, dates and achievements, do not invent experience it doesn't contain):
${cvText.slice(0, 3500)}

CANDIDATE NAME: ${fullName || "(use a placeholder like [Your Name] if not given)"}
TARGET ROLE: ${targetRole}
${jobDescription ? `TARGET JOB DESCRIPTION (tailor to this specifically):\n${jobDescription.slice(0, 1500)}` : ""}

Produce two things:

1. An ATS-FRIENDLY UK CV rewrite. Rules: plain text only, no tables/columns/graphics. Reverse-chronological work history with Month Year - Month Year dates. 1-2 pages worth of content. UK spelling. Include a short professional summary, work history with quantified achievements where the source CV supports it, education, and skills relevant to the target role. Do NOT fabricate employers, dates, or achievements not present in the source CV - only reword, restructure and emphasise what's genuinely there.

2. A tailored COVER LETTER (UK business letter tone, ~250-350 words) for the target role, referencing specific real experience from the CV and, if a job description was given, mirroring its key requirements honestly.

Respond ONLY with valid JSON, no markdown:
{
  "atsCv": "<full CV text, use \\n for line breaks>",
  "coverLetter": "<full cover letter text, use \\n for line breaks>"
}`

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("Anthropic error:", err)
      return res.status(500).json({ error: "Generation temporarily unavailable. Please try again." })
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || "{}"
    const clean = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    }

    if (!parsed || typeof parsed.atsCv !== "string" || typeof parsed.coverLetter !== "string") {
      return res.status(500).json({ error: "Could not generate documents from the AI response. Please try again." })
    }

    return res.status(200).json({ atsCv: parsed.atsCv, coverLetter: parsed.coverLetter })
  } catch (err) {
    console.error("Generate CV/cover error:", err)
    return res.status(500).json({ error: "Generation temporarily unavailable. Please try again." })
  }
}
