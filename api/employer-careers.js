export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  if (req.method !== "GET") return res.status(405).end()

  const { employer } = req.query
  if (!employer) return res.status(400).json({ error: "No employer" })

  const name = employer.toLowerCase().trim()

  // Curated database of 200+ major UK visa sponsors with direct careers pages
  const CAREERS_DB = {
    // Big Tech
    "amazon": "https://www.amazon.jobs/en-gb",
    "amazon uk": "https://www.amazon.jobs/en-gb",
    "google": "https://careers.google.com",
    "google uk": "https://careers.google.com",
    "microsoft": "https://careers.microsoft.com",
    "microsoft uk": "https://careers.microsoft.com",
    "apple": "https://www.apple.com/careers/uk",
    "meta": "https://www.metacareers.com",
    "ibm": "https://www.ibm.com/careers/uk-en",
    "ibm uk": "https://www.ibm.com/careers/uk-en",
    "oracle": "https://www.oracle.com/uk/careers",
    "salesforce": "https://careers.salesforce.com",
    "adobe": "https://careers.adobe.com",
    "intel": "https://jobs.intel.com",
    "cisco": "https://jobs.cisco.com",
    "hp": "https://jobs.hp.com",
    "dell": "https://jobs.dell.com",
    "samsung": "https://www.samsung.com/uk/aboutsamsung/careers",
    "qualcomm": "https://careers.qualcomm.com",
    "nvidia": "https://www.nvidia.com/en-gb/about-nvidia/careers",

    // UK Banks & Finance
    "barclays": "https://home.barclays/careers",
    "hsbc": "https://www.hsbc.com/careers",
    "lloyds": "https://www.lloydsbankinggroup.com/careers.html",
    "lloyds bank": "https://www.lloydsbankinggroup.com/careers.html",
    "natwest": "https://www.natwestgroup.com/careers.html",
    "rbs": "https://www.natwestgroup.com/careers.html",
    "standard chartered": "https://careers.standardchartered.com",
    "goldman sachs": "https://www.goldmansachs.com/careers",
    "jp morgan": "https://careers.jpmorgan.com",
    "jpmorgan": "https://careers.jpmorgan.com",
    "morgan stanley": "https://www.morganstanley.com/people/careers",
    "deutsche bank": "https://careers.db.com",
    "ubs": "https://www.ubs.com/global/en/careers.html",
    "credit suisse": "https://www.credit-suisse.com/careers",
    "blackrock": "https://careers.blackrock.com",
    "fidelity": "https://jobs.fidelityinternational.com",
    "man group": "https://www.man.com/careers",
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
    "hcl": "https://www.hcltech.com/careers",
    "tech mahindra": "https://careers.techmahindra.com",

    // NHS & Healthcare
    "nhs": "https://www.jobs.nhs.uk",
    "nhs england": "https://www.jobs.nhs.uk",
    "nhs trust": "https://www.jobs.nhs.uk",
    "bupa": "https://careers.bupa.co.uk",
    "nuffield health": "https://www.nuffieldhealth.com/careers",
    "spire healthcare": "https://jobs.spirehealthcare.com",
    "hca healthcare": "https://careers.hcahealthcare.co.uk",
    "care uk": "https://careers.careuk.com",
    "four seasons health care": "https://www.fshc.co.uk/careers",
    "priory group": "https://www.priorygroup.com/careers",
    "astrazeneca": "https://careers.astrazeneca.com",
    "glaxosmithkline": "https://careers.gsk.com",
    "gsk": "https://careers.gsk.com",
    "pfizer": "https://www.pfizer.co.uk/careers",
    "novartis": "https://www.novartis.com/careers",
    "roche": "https://www.roche.com/careers",
    "johnson & johnson": "https://jobs.jnj.com",
    "j&j": "https://jobs.jnj.com",
    "astrazeneca": "https://careers.astrazeneca.com",
    "sanofi": "https://www.sanofi.com/en/careers",
    "abbvie": "https://careers.abbvie.com",
    "eli lilly": "https://careers.lilly.com",
    "bristol myers squibb": "https://careers.bms.com",
    "merck": "https://jobs.merck.com",

    // Telecoms
    "bt": "https://careers.bt.com",
    "bt group": "https://careers.bt.com",
    "vodafone": "https://careers.vodafone.com/uk",
    "o2": "https://www.o2.co.uk/abouto2/careers",
    "ee": "https://careers.bt.com",
    "three": "https://www.three.co.uk/about-three/careers",
    "sky": "https://careers.sky.com",
    "virgin media": "https://careers.virginmedia.com",
    "openreach": "https://careers.bt.com/openreach",

    // Engineering & Manufacturing
    "rolls royce": "https://careers.rolls-royce.com",
    "rolls-royce": "https://careers.rolls-royce.com",
    "bae systems": "https://careers.baesystems.com",
    "airbus": "https://www.airbus.com/en/careers",
    "boeing": "https://jobs.boeing.com",
    "siemens": "https://new.siemens.com/global/en/company/jobs.html",
    "ge": "https://jobs.gecareers.com",
    "general electric": "https://jobs.gecareers.com",
    "caterpillar": "https://careers.caterpillar.com",
    "dyson": "https://careers.dyson.com",
    "jaguar land rover": "https://www.jaguarlandrover.com/careers",
    "jlr": "https://www.jaguarlandrover.com/careers",
    "arup": "https://www.arup.com/careers",
    "atkins": "https://careers.atkinsrealis.com",
    "aecom": "https://careers.aecom.com",
    "mott macdonald": "https://www.mottmac.com/careers",
    "wsp": "https://www.wsp.com/en-gb/careers",
    "jacobs": "https://careers.jacobs.com",
    "wood group": "https://www.woodplc.com/careers",
    "petrofac": "https://www.petrofac.com/careers",
    "bp": "https://www.bp.com/en/global/corporate/careers.html",
    "shell": "https://www.shell.com/careers.html",
    "total": "https://careers.totalenergies.com",

    // Retail & FMCG
    "tesco": "https://www.tesco-careers.com",
    "sainsburys": "https://jobs.sainsburys.co.uk",
    "asda": "https://careers.asda.com",
    "marks & spencer": "https://jobs.marksandspencer.com",
    "m&s": "https://jobs.marksandspencer.com",
    "waitrose": "https://jobs.waitrose.com",
    "john lewis": "https://jobs.johnlewispartnership.co.uk",
    "boots": "https://jobs.boots.com",
    "unilever": "https://careers.unilever.com",
    "procter & gamble": "https://www.pgcareers.com",
    "p&g": "https://www.pgcareers.com",
    "nestle": "https://www.nestle.com/jobs",
    "diageo": "https://www.diageo.com/en/careers",
    "reckitt": "https://careers.reckitt.com",
    "ikea": "https://www.ikea.com/gb/en/ikea-business/careers",
    "amazon logistics": "https://www.amazon.jobs/en-gb",

    // Transport & Logistics
    "british airways": "https://careers.ba.com",
    "virgin atlantic": "https://careers.virginatlantic.com",
    "easyjet": "https://careers.easyjet.com",
    "ryanair": "https://careers.ryanair.com",
    "dhl": "https://careers.dhl.com",
    "ups": "https://jobs.ups.com",
    "fedex": "https://careers.fedex.com",
    "royal mail": "https://jobs.royalmail.com",
    "network rail": "https://www.networkrail.co.uk/careers",
    "transport for london": "https://tfl.gov.uk/corporate/careers",
    "tfl": "https://tfl.gov.uk/corporate/careers",

    // Financial Tech
    "revolut": "https://www.revolut.com/careers",
    "monzo": "https://monzo.com/careers",
    "wise": "https://www.wise.jobs",
    "transferwise": "https://www.wise.jobs",
    "starling bank": "https://www.starlingbank.com/careers",
    "checkout.com": "https://www.checkout.com/careers",
    "worldpay": "https://careers.worldpay.com",
    "klarna": "https://www.klarna.com/careers",

    // Other Major UK Employers
    "bt sport": "https://careers.bt.com",
    "bbc": "https://careers.bbc.co.uk",
    "channel 4": "https://jobs.channel4.com",
    "sky news": "https://careers.sky.com",
    "civil service": "https://www.civil-service-careers.gov.uk",
    "home office": "https://www.civil-service-careers.gov.uk",
    "nhs digital": "https://digital.nhs.uk/careers",
    "hmrc": "https://www.civil-service-careers.gov.uk",
    "ministry of defence": "https://www.civil-service-careers.gov.uk",
    "pwc uk": "https://www.pwc.co.uk/careers.html",
    "societe generale": "https://careers.societegenerale.com",
    "bnp paribas": "https://careers.bnpparibas.com",
    "credit agricole": "https://careers.credit-agricole.com",
    "natixis": "https://careers.natixis.com",
    "refinitiv": "https://careers.lseg.com",
    "lseg": "https://careers.lseg.com",
    "london stock exchange": "https://careers.lseg.com",
    "bloomberg": "https://careers.bloomberg.com",
    "reuters": "https://careers.thomsonreuters.com",
    "sky uk": "https://careers.sky.com",
    "capita": "https://careers.capita.com",
    "serco": "https://careers.serco.com",
    "g4s": "https://careers.g4s.com",
    "sodexo": "https://uk.sodexo.com/careers.html",
    "compass group": "https://careers.compass-group.co.uk",
    "iss": "https://careers.issworld.com",
    "cbre": "https://careers.cbre.com",
    "jll": "https://careers.jll.com",
    "knight frank": "https://www.knightfrank.com/careers",
    "savills": "https://careers.savills.com",
    "colliers": "https://careers.colliers.com",
  }

  // Try to match employer name to careers URL
  const match = Object.keys(CAREERS_DB).find(key => {
    const empClean = name.replace(/\s+(ltd|limited|plc|llp|inc|group|uk|corporation|holdings)\.?$/gi, "").trim()
    return name.includes(key) || key.includes(empClean) || empClean.includes(key)
  })

  if (match) {
    return res.status(200).json({
      found: true,
      url: CAREERS_DB[match],
      name: match,
    })
  }

  // Try Google search fallback URL (won't work in browser due to CORS but useful as a hint)
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(employer + " careers jobs uk")}`
  return res.status(200).json({ found: false, searchUrl })
}
