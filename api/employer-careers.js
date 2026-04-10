export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "GET") return res.status(405).end()

  const { employer } = req.query
  if (!employer) return res.status(400).json({ error: "No employer provided" })

  const name = employer.trim()

  // ─────────────────────────────────────────────
  // LAYER 1: Curated database of known UK sponsors
  // ─────────────────────────────────────────────
  const CAREERS_DB = {
    // Big Tech
    "amazon": "https://www.amazon.jobs/en-gb",
    "google": "https://careers.google.com",
    "microsoft": "https://careers.microsoft.com",
    "apple": "https://www.apple.com/careers/uk",
    "meta": "https://www.metacareers.com",
    "ibm": "https://www.ibm.com/careers/uk-en",
    "oracle": "https://www.oracle.com/uk/careers",
    "salesforce": "https://careers.salesforce.com",
    "adobe": "https://careers.adobe.com",
    "intel": "https://jobs.intel.com",
    "cisco": "https://jobs.cisco.com",
    "nvidia": "https://www.nvidia.com/en-gb/about-nvidia/careers",
    "samsung": "https://www.samsung.com/uk/aboutsamsung/careers",
    "qualcomm": "https://careers.qualcomm.com",
    "hp": "https://jobs.hp.com",
    "dell": "https://jobs.dell.com",

    // UK Banks & Finance
    "barclays": "https://home.barclays/careers",
    "hsbc": "https://www.hsbc.com/careers",
    "lloyds": "https://www.lloydsbankinggroup.com/careers.html",
    "natwest": "https://www.natwestgroup.com/careers.html",
    "standard chartered": "https://careers.standardchartered.com",
    "goldman sachs": "https://www.goldmansachs.com/careers",
    "jp morgan": "https://careers.jpmorgan.com",
    "jpmorgan": "https://careers.jpmorgan.com",
    "morgan stanley": "https://www.morganstanley.com/people/careers",
    "deutsche bank": "https://careers.db.com",
    "ubs": "https://www.ubs.com/global/en/careers.html",
    "blackrock": "https://careers.blackrock.com",
    "schroders": "https://www.schroders.com/en/global/individual/careers",
    "legal & general": "https://careers.legalandgeneral.com",
    "aviva": "https://careers.aviva.co.uk",
    "axa": "https://www.axa.co.uk/about-us/careers",

    // Consulting & Professional Services
    "deloitte": "https://www2.deloitte.com/uk/en/careers.html",
    "pwc": "https://www.pwc.co.uk/careers.html",
    "kpmg": "https://www.kpmg.com/uk/en/home/careers.html",
    "ernst & young": "https://www.ey.com/en_uk/careers",
    "ey": "https://www.ey.com/en_uk/careers",
    "accenture": "https://www.accenture.com/gb-en/careers",
    "mckinsey": "https://www.mckinsey.com/careers",
    "boston consulting group": "https://www.bcg.com/careers",
    "bcg": "https://www.bcg.com/careers",
    "bain": "https://www.bain.com/careers",
    "capgemini": "https://www.capgemini.com/gb-en/careers",
    "cognizant": "https://careers.cognizant.com",
    "infosys": "https://www.infosys.com/careers",
    "tata consultancy": "https://www.tcs.com/careers",
    "tcs": "https://www.tcs.com/careers",
    "wipro": "https://careers.wipro.com",

    // NHS & Healthcare
    "nhs": "https://www.jobs.nhs.uk",
    "bupa": "https://careers.bupa.co.uk",
    "nuffield health": "https://www.nuffieldhealth.com/careers",
    "spire healthcare": "https://jobs.spirehealthcare.com",
    "astrazeneca": "https://careers.astrazeneca.com",
    "gsk": "https://careers.gsk.com",
    "glaxosmithkline": "https://careers.gsk.com",
    "pfizer": "https://www.pfizer.co.uk/careers",
    "novartis": "https://www.novartis.com/careers",
    "roche": "https://www.roche.com/careers",
    "sanofi": "https://www.sanofi.com/en/careers",

    // Telecoms
    "bt": "https://careers.bt.com",
    "vodafone": "https://careers.vodafone.com/uk",
    "sky": "https://careers.sky.com",
    "virgin media": "https://careers.virginmedia.com",
    "three": "https://www.three.co.uk/about-three/careers",

    // Engineering
    "rolls royce": "https://careers.rolls-royce.com",
    "rolls-royce": "https://careers.rolls-royce.com",
    "bae systems": "https://careers.baesystems.com",
    "airbus": "https://www.airbus.com/en/careers",
    "boeing": "https://jobs.boeing.com",
    "siemens": "https://new.siemens.com/global/en/company/jobs.html",
    "dyson": "https://careers.dyson.com",
    "jaguar land rover": "https://www.jaguarlandrover.com/careers",
    "arup": "https://www.arup.com/careers",
    "aecom": "https://careers.aecom.com",
    "bp": "https://www.bp.com/en/global/corporate/careers.html",
    "shell": "https://www.shell.com/careers.html",

    // Fintech
    "revolut": "https://www.revolut.com/careers",
    "monzo": "https://monzo.com/careers",
    "wise": "https://www.wise.jobs",
    "starling bank": "https://www.starlingbank.com/careers",
    "checkout.com": "https://www.checkout.com/careers",
    "klarna": "https://www.klarna.com/careers",

    // Transport
    "british airways": "https://careers.ba.com",
    "easyjet": "https://careers.easyjet.com",
    "dhl": "https://careers.dhl.com",
    "royal mail": "https://jobs.royalmail.com",
    "network rail": "https://www.networkrail.co.uk/careers",
    "transport for london": "https://tfl.gov.uk/corporate/careers",

    // Media & Other
    "bbc": "https://careers.bbc.co.uk",
    "bloomberg": "https://careers.bloomberg.com",
    "reuters": "https://careers.thomsonreuters.com",
    "lseg": "https://careers.lseg.com",
    "london stock exchange": "https://careers.lseg.com",
    "capita": "https://careers.capita.com",
    "serco": "https://careers.serco.com",
    "cbre": "https://careers.cbre.com",
    "jll": "https://careers.jll.com",
  }

  // Clean company name for matching (remove legal suffixes)
  const cleanName = name
    .toLowerCase()
    .replace(/\s+(ltd|limited|plc|llp|inc|group|uk|corporation|holdings|international|services|solutions|global|technologies|technology)\.?(\s+.*)?$/gi, "")
    .trim()

  // Try exact and partial matches
  const match = Object.keys(CAREERS_DB).find(key => {
    const nameLower = name.toLowerCase()
    return (
      nameLower === key ||
      nameLower.startsWith(key) ||
      key.startsWith(cleanName) ||
      cleanName === key ||
      (cleanName.length > 4 && key.includes(cleanName)) ||
      (key.length > 4 && cleanName.includes(key))
    )
  })

  if (match) {
    return res.status(200).json({
      found: true,
      source: "curated",
      confidence: "high",
      url: CAREERS_DB[match],
      matched_as: match,
    })
  }

  // ─────────────────────────────────────────────
  // LAYER 2: Smart domain guessing
  // Build likely careers URLs from company name
  // ─────────────────────────────────────────────
  const domainBase = cleanName
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")

  const guessedUrls = [
    `https://careers.${domainBase}.com`,
    `https://jobs.${domainBase}.com`,
    `https://www.${domainBase}.com/careers`,
    `https://www.${domainBase}.co.uk/careers`,
    `https://www.${domainBase}.com/jobs`,
    `https://www.${domainBase}.co.uk/jobs`,
    `https://boards.greenhouse.io/${domainBase}`,
    `https://jobs.lever.co/${domainBase}`,
    `https://${domainBase}.workday.com/careers`,
  ]

  // ─────────────────────────────────────────────
  // LAYER 3: AI-powered lookup via Anthropic API
  // ─────────────────────────────────────────────
  try {
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: `You are a UK employment researcher. When given a UK company name, you return ONLY a JSON object with the company's official careers page URL. 
        
        Rules:
        - Return ONLY valid JSON, no other text
        - If you know the careers URL with high confidence, set "confidence": "high"
        - If you're guessing based on typical patterns, set "confidence": "medium"  
        - If you have no idea, set "found": false
        - Never make up URLs for companies you don't recognise
        - Focus on UK-based careers pages where possible
        
        Response format:
        {"found": true, "url": "https://...", "confidence": "high"|"medium"}
        OR
        {"found": false}`,
        messages: [
          {
            role: "user",
            content: `What is the official careers/jobs page URL for this UK company: "${name}"? 
            
            This company is on the UK Home Office licensed sponsor register, meaning they can sponsor Skilled Worker visas.
            
            Return only the JSON response.`,
          },
        ],
      }),
    })

    if (aiResponse.ok) {
      const aiData = await aiResponse.json()
      const aiText = aiData.content?.[0]?.text?.trim()

      if (aiText) {
        try {
          // Strip any markdown formatting if present
          const cleaned = aiText.replace(/```json|```/g, "").trim()
          const parsed = JSON.parse(cleaned)

          if (parsed.found && parsed.url) {
            return res.status(200).json({
              found: true,
              source: "ai",
              confidence: parsed.confidence || "medium",
              url: parsed.url,
              guessed_urls: guessedUrls,
            })
          }
        } catch (parseErr) {
          // AI returned something unparseable, fall through
        }
      }
    }
  } catch (aiErr) {
    // AI call failed, fall through to fallback
    console.error("AI lookup failed:", aiErr.message)
  }

  // ─────────────────────────────────────────────
  // LAYER 4: Fallback — return search URL + guesses
  // ─────────────────────────────────────────────
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(name + " careers jobs uk site:jobs.* OR site:careers.*")}`

  return res.status(200).json({
    found: false,
    source: "fallback",
    message: "No careers page found in database or AI lookup",
    search_url: searchUrl,
    guessed_urls: guessedUrls,
    note: "guessed_urls are pattern-based and unverified — check manually",
  })
}
