export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { cvText, jobRole } = req.body || {}

  // Extract readable text from binary .docx
  let text = cvText || ""
  if (!text || text.length < 30) {
    return res.status(200).json({
      ukFormat: 50, visaKeywords: 40, atsScore: 55, sponsorMatch: 45,
      overallScore: 47,
      ukFormatFeedback: "Could not read your CV file fully. Please save it as a .txt file and re-upload for accurate scoring.",
      visaKeywordsFeedback: "Upload a .txt version of your CV for detailed keyword analysis.",
      atsFeedback: "Please upload your CV as a plain text (.txt) file for full ATS analysis.",
      sponsorMatchFeedback: "Re-upload as .txt to see how well your experience matches UK sponsors.",
      topImprovements: ["Save your CV as .txt and re-upload", "Add Certificate of Sponsorship keywords", "Include your visa status clearly"]
    })
  }

  const key = process.env.ANTHROPIC_KEY
  if (!key) {
    return res.status(500).json({ error: "API key not configured" })
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Analyse this CV for a UK visa sponsorship job application for "${jobRole || 'Skilled Worker'}".

Score 0-100 for each:
1. UK Format Compliance
2. Visa Sponsorship Keywords  
3. ATS Compatibility
4. Sponsor Company Match

CV: ${text.slice(0, 2000)}

Reply ONLY with valid JSON:
{"ukFormat":75,"visaKeywords":60,"atsScore":85,"sponsorMatch":70,"overallScore":72,"ukFormatFeedback":"feedback","visaKeywordsFeedback":"feedback","atsFeedback":"feedback","sponsorMatchFeedback":"feedback","topImprovements":["tip1","tip2","tip3"]}`
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("Anthropic error:", err)
      return res.status(500).json({ error: "Anthropic API failed: " + err })
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || "{}"
    const clean = rawText.replace(/```json|```/g, "").trim()
    const result = JSON.parse(clean)
    return res.status(200).json(result)

  } catch (err) {
    console.error("Score CV error:", err)
    return res.status(500).json({ error: err.message })
  }
}