// api/recommend-roles.js
// Given a candidate's CV text (+ optional profile fields), recommends
// specific sponsorable job roles from a FIXED eligibility list.
//
// Deliberately closed-list rather than open-ended: the model is not asked to
// invent job titles, only to rank/select from ELIGIBLE_ROLES below and
// explain the fit. This list must stay in sync with the eligible entries in
// src/pages/COSCheckerPage.jsx's SOC_DATA (a server function can't import a
// .jsx file, so - same pattern already used for HEALTH_ROLES/SEARCH_TERMS
// between this codebase's api/ and src/ - it's duplicated, not shared).
// Recommending a role this app itself would mark "Not Eligible" would be
// the exact kind of false-sponsorship-confidence bug already fixed once in
// the job scorer - this list keeps that from happening here too.
const ELIGIBLE_ROLES = [
  { title: "Software Engineer / Developer", soc: "2136", route: "Skilled Worker", minSalary: 41700, searchTerm: "software engineer" },
  { title: "IT / Cyber Security / SOC Analyst", soc: "2139", route: "Skilled Worker", minSalary: 41700, searchTerm: "soc analyst" },
  { title: "Business / Data Analyst", soc: "2137", route: "Skilled Worker", minSalary: 41700, searchTerm: "data analyst" },
  { title: "Actuary / Economist / Statistician", soc: "2425", route: "Skilled Worker", minSalary: 41700, searchTerm: "actuary" },
  { title: "Accountant", soc: "2421", route: "Skilled Worker", minSalary: 41700, searchTerm: "accountant" },
  { title: "Management Consultant / Financial Analyst", soc: "2422", route: "Skilled Worker", minSalary: 41700, searchTerm: "management consultant" },
  { title: "Project / Product Manager", soc: "2424", route: "Skilled Worker", minSalary: 41700, searchTerm: "project manager" },
  { title: "Civil Engineer", soc: "2121", route: "Skilled Worker", minSalary: 41700, searchTerm: "civil engineer" },
  { title: "Mechanical Engineer", soc: "2122", route: "Skilled Worker", minSalary: 41700, searchTerm: "mechanical engineer" },
  { title: "Electrical Engineer", soc: "2123", route: "Skilled Worker", minSalary: 41700, searchTerm: "electrical engineer" },
  { title: "Chemical Engineer", soc: "2125", route: "Skilled Worker", minSalary: 41700, searchTerm: "chemical engineer" },
  { title: "Architect", soc: "2431", route: "Skilled Worker", minSalary: 41700, searchTerm: "architect" },
  { title: "Registered Nurse", soc: "2231", route: "Health & Care Worker", minSalary: 29000, searchTerm: "registered nurse" },
  { title: "Midwife", soc: "2232", route: "Health & Care Worker", minSalary: 29000, searchTerm: "midwife" },
  { title: "Doctor / Medical Practitioner", soc: "2211", route: "Health & Care Worker", minSalary: 49923, searchTerm: "doctor" },
  { title: "Pharmacist", soc: "2213", route: "Health & Care Worker", minSalary: 29000, searchTerm: "pharmacist" },
  { title: "Dentist", soc: "2214", route: "Health & Care Worker", minSalary: 29000, searchTerm: "dentist" },
  { title: "Allied Health Professional (Physio/OT/Radiographer etc.)", soc: "2217", route: "Health & Care Worker", minSalary: 29000, searchTerm: "physiotherapist" },
  { title: "Paramedic", soc: "3213", route: "Health & Care Worker", minSalary: 29000, searchTerm: "paramedic" },
  { title: "Social Worker", soc: "2442", route: "Skilled Worker", minSalary: 41700, searchTerm: "social worker" },
  { title: "Secondary School Teacher", soc: "2314", route: "Shortage Occupation", minSalary: 33400, searchTerm: "teacher" },
  { title: "Lecturer / Academic", soc: "2311", route: "Skilled Worker", minSalary: 41700, searchTerm: "lecturer" },
  { title: "Solicitor / Lawyer", soc: "2411", route: "Skilled Worker", minSalary: 41700, searchTerm: "solicitor" },
  { title: "Primary / Nursery Teacher", soc: "2312", route: "Shortage Occupation", minSalary: 33400, searchTerm: "teacher" },
]

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).end()

  const { cvText, currentRole, industry, experienceYears } = req.body || {}
  if (!cvText || cvText.length < 50) {
    return res.status(200).json({ recommendations: [], note: "Not enough CV text to generate recommendations - upload a readable CV first." })
  }

  const key = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(500).json({ error: "API key not configured" })

  const roleList = ELIGIBLE_ROLES.map(r => `- ${r.title} (${r.route}, min salary GBP ${r.minSalary.toLocaleString()})`).join("\n")

  const prompt = `You are a UK immigration recruitment specialist matching an international candidate to UK visa-sponsorable job roles.

CANDIDATE CV (may be truncated):
${cvText.slice(0, 3000)}

CANDIDATE'S STATED CURRENT ROLE: ${currentRole || "not specified"}
INDUSTRY: ${industry || "not specified"}
YEARS OF EXPERIENCE: ${experienceYears || "not specified"}

You may ONLY recommend roles from this fixed list of currently sponsorable UK job categories - do not invent or suggest anything outside it, even if the CV suggests a closely related but different job title:
${roleList}

Pick the 3-5 roles from the list above that best fit this candidate, ranked best-first. For each, give a 0-100 fit score and a one-sentence reason grounded in specific evidence from the CV.

Respond ONLY with valid JSON, no markdown:
{
  "recommendations": [
    { "title": "<exact title from the list above>", "fitScore": <0-100>, "reason": "<one sentence, specific to this CV>" }
  ]
}`

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("Anthropic error:", err)
      return res.status(500).json({ error: "Role recommendations temporarily unavailable. Please try again." })
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || "{}"
    const clean = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendations: [] }
    }

    // Defensive validation: only ever return titles that exactly match the
    // fixed eligible list, regardless of what the model actually returned.
    // This is the hard guarantee - not a prompt instruction the model could
    // drift away from - that this endpoint can never surface an ineligible
    // role as "recommended."
    const titleSet = new Map(ELIGIBLE_ROLES.map(r => [r.title, r]))
    const recommendations = (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
      .filter(r => r && titleSet.has(r.title))
      .slice(0, 5)
      .map(r => ({
        title: r.title,
        route: titleSet.get(r.title).route,
        minSalary: titleSet.get(r.title).minSalary,
        searchTerm: titleSet.get(r.title).searchTerm,
        fitScore: Math.min(100, Math.max(0, Math.round(Number(r.fitScore) || 50))),
        reason: typeof r.reason === "string" ? r.reason.slice(0, 300) : "",
      }))

    return res.status(200).json({ recommendations })
  } catch (err) {
    console.error("Recommend roles error:", err)
    return res.status(500).json({ error: "Role recommendations temporarily unavailable. Please try again." })
  }
}
