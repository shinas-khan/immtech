export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).end()

  const { cvText, jobRole } = req.body || {}

  // If CV text is too short or unreadable, return helpful guidance
  if (!cvText || cvText.length < 50) {
    return res.status(200).json({
      ukFormat: 45,
      visaKeywords: 35,
      atsScore: 50,
      sponsorMatch: 40,
      overallScore: 42,
      ukFormatFeedback: "Could not fully read your CV file. For best results, save your CV as a .txt file and re-upload — this gives our AI the full text to analyse.",
      visaKeywordsFeedback: "Upload a .txt version of your CV for detailed sponsorship keyword analysis.",
      atsFeedback: "Please upload your CV as plain text (.txt) for full ATS compatibility scoring.",
      sponsorMatchFeedback: "Re-upload as .txt to see how well your profile matches UK Home Office licensed sponsors.",
      topImprovements: [
        "Save your CV as a .txt file and re-upload for accurate AI scoring",
        "Add 'Certificate of Sponsorship', 'Skilled Worker Visa' or 'visa sponsorship required' to your CV",
        "Include your current visa status and right to work information",
        "Make sure your full name, contact details and work history dates are clearly formatted",
        "Quantify your achievements with numbers (e.g. 'reduced costs by 30%', 'managed team of 8')"
      ]
    })
  }

  const key = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
  if (!key) {
    return res.status(500).json({ error: "API key not configured" })
  }

  // Truncate CV text to a sensible limit for the API
  const cvSample = cvText.slice(0, 3500)
  const role = jobRole || "Skilled Worker"

  const prompt = `You are a senior UK immigration recruitment specialist with 15 years of experience helping international professionals find visa-sponsored jobs in the UK.

Analyse this CV for someone applying for a "${role}" position in the UK who needs Skilled Worker visa sponsorship.

Score the CV on 4 dimensions (0-100 each):

1. UK FORMAT COMPLIANCE (ukFormat)
   - Is it 1-2 pages? UK CVs should NOT be more than 2 pages
   - Does it have: Name, contact details, professional summary, work history (reverse chronological), education, skills?
   - Are work history dates clearly formatted? (Month Year - Month Year)
   - Does it avoid American-style features like "Resume", "Objective statement", photos, or references section?
   - Is the layout clean and ATS-readable (no tables, columns, text boxes if possible)?

2. VISA SPONSORSHIP KEYWORDS (visaKeywords)
   - Does it mention visa status, right to work, or immigration requirements?
   - Does it include relevant sponsorship language UK employers look for?
   - Does it avoid language that might flag as a risk (e.g., unclear employment gaps)?
   - Are salary expectations or SOC code-relevant skills clearly evidenced?
   - Does it demonstrate meeting the minimum salary threshold for the role?

3. ATS COMPATIBILITY (atsScore)
   - Are job titles clear and standard (matching common UK job titles)?
   - Are skills listed with industry-standard terms?
   - Is formatting simple enough to parse (avoid complex tables, images, headers/footers)?
   - Are employment dates in a clear format?
   - Does it use relevant keywords for the target role?

4. SPONSOR COMPANY MATCH (sponsorMatch)
   - Does the experience level match what UK Home Office licensed sponsors typically hire?
   - Is the salary history/expectation realistic for the UK market and this role?
   - Does it show progression and seniority appropriate for sponsorship (usually 3+ years experience)?
   - Does it demonstrate skills that are on the UK Shortage Occupation List or in high demand?
   - Would a UK compliance team feel confident sponsoring this candidate?

CV TEXT:
${cvSample}

TARGET ROLE: ${role}

Respond ONLY with a valid JSON object. No markdown, no explanation, no preamble. Just the JSON:
{
  "ukFormat": <number 0-100>,
  "visaKeywords": <number 0-100>,
  "atsScore": <number 0-100>,
  "sponsorMatch": <number 0-100>,
  "overallScore": <weighted average, ukFormat*0.25 + visaKeywords*0.25 + atsScore*0.25 + sponsorMatch*0.25>,
  "ukFormatFeedback": "<specific, actionable feedback about UK CV format — 1-2 sentences>",
  "visaKeywordsFeedback": "<specific feedback about sponsorship keywords and immigration-relevant content — 1-2 sentences>",
  "atsFeedback": "<specific ATS feedback — 1-2 sentences>",
  "sponsorMatchFeedback": "<specific feedback on likelihood of getting sponsored — 1-2 sentences>",
  "topImprovements": [
    "<most impactful specific improvement #1 — be concrete>",
    "<specific improvement #2>",
    "<specific improvement #3>",
    "<specific improvement #4 — optional>",
    "<specific improvement #5 — optional>"
  ]
}`

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
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("Anthropic error:", err)
      return res.status(500).json({ error: "AI scoring temporarily unavailable. Please try again." })
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || "{}"

    // Clean up any markdown formatting the model might add
    const clean = rawText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim()

    let result
    try {
      result = JSON.parse(clean)
    } catch (parseErr) {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("Could not parse AI response")
      }
    }

    // Validate and sanitise the result
    const sanitised = {
      ukFormat: Math.min(100, Math.max(0, Math.round(result.ukFormat || 50))),
      visaKeywords: Math.min(100, Math.max(0, Math.round(result.visaKeywords || 50))),
      atsScore: Math.min(100, Math.max(0, Math.round(result.atsScore || 50))),
      sponsorMatch: Math.min(100, Math.max(0, Math.round(result.sponsorMatch || 50))),
      overallScore: 0,
      ukFormatFeedback: result.ukFormatFeedback || "Review your CV format against UK standards.",
      visaKeywordsFeedback: result.visaKeywordsFeedback || "Add more visa sponsorship-relevant keywords.",
      atsFeedback: result.atsFeedback || "Ensure your CV is ATS-compatible.",
      sponsorMatchFeedback: result.sponsorMatchFeedback || "Strengthen your profile to improve sponsorship likelihood.",
      topImprovements: Array.isArray(result.topImprovements) ? result.topImprovements.slice(0, 5) : [
        "Add your current visa status or right to work information",
        "Include specific salary figures from previous roles",
        "Make sure employment dates are in clear Month Year format",
        "Add a professional summary at the top of your CV",
        "Include skills relevant to UK employers for this role"
      ]
    }

    // Recalculate overall score as a weighted average
    sanitised.overallScore = Math.round(
      (sanitised.ukFormat * 0.25) +
      (sanitised.visaKeywords * 0.30) +
      (sanitised.atsScore * 0.20) +
      (sanitised.sponsorMatch * 0.25)
    )

    return res.status(200).json(sanitised)

  } catch (err) {
    console.error("Score CV error:", err)

    // Return a helpful fallback rather than an error
    return res.status(200).json({
      ukFormat: 55,
      visaKeywords: 45,
      atsScore: 60,
      sponsorMatch: 50,
      overallScore: 52,
      ukFormatFeedback: "We had trouble analysing your CV. Please try re-uploading as a .txt file for the most accurate results.",
      visaKeywordsFeedback: "For better keyword analysis, save your CV as plain text (.txt) and re-upload.",
      atsFeedback: "Your CV has been received but could not be fully parsed. .txt format works best.",
      sponsorMatchFeedback: "Re-upload as .txt to get your full sponsor match score.",
      topImprovements: [
        "Re-upload your CV as a .txt file for accurate AI scoring",
        "Ensure your CV mentions your visa status and sponsorship requirements",
        "Add a clear professional summary at the top",
        "List your key technical skills with UK-standard terminology",
        "Include quantified achievements (percentages, team sizes, revenue figures)"
      ]
    })
  }
}
