export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const { cvText, jobRole } = req.body
  if (!cvText || cvText.length < 20) {
    return res.status(400).json({ error: "CV text too short or unreadable" })
  }
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are a UK immigration and recruitment expert. Analyse this CV for someone applying for "${jobRole || 'a skilled worker'}" role in the UK with visa sponsorship.\n\nScore these 4 areas from 0-100:\n1. UK Format Compliance\n2. Visa Sponsorship Keywords\n3. ATS Compatibility\n4. Sponsor Company Match\n\nCV TEXT:\n${cvText.slice(0, 3000)}\n\nRespond ONLY with this exact JSON:\n{\n  "ukFormat": 75,\n  "visaKeywords": 60,\n  "atsScore": 85,\n  "sponsorMatch": 70,\n  "overallScore": 72,\n  "ukFormatFeedback": "feedback here",\n  "visaKeywordsFeedback": "feedback here",\n  "atsFeedback": "feedback here",\n  "sponsorMatchFeedback": "feedback here",\n  "topImprovements": ["improvement 1", "improvement 2", "improvement 3"]\n}`
        }]
      })
    })
    const data = await response.json()
    const text = data.content?.[0]?.text || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const result = JSON.parse(clean)
    res.status(200).json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to score CV" })
  }
}
