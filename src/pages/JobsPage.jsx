import { useState, useCallback, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ALL_JOBS, ALL_LOCATIONS } from "../lib/constants"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

// ─── API credentials ────────────────────────────────────────────────────────
const ADZUNA_ID  = "344e86d1"
const ADZUNA_KEY = "039c47ae80bab92aef99751a471040fb"

// ─── Keyword lists ───────────────────────────────────────────────────────────
const FRESHER_KW = [
  "graduate","entry level","junior","trainee","apprentice","no experience",
  "fresh graduate","new graduate","grad scheme","graduate scheme","placement","internship",
]
const NEG_KW = [
  "must have right to work","no sponsorship","sponsorship not available",
  "cannot sponsor","uk residents only","british nationals only",
  "no visa sponsorship","must be eligible to work in the uk without sponsorship",
]
const VISA_KW = [
  "visa sponsorship","sponsor visa","certificate of sponsorship","cos provided",
  "skilled worker visa","tier 2","ukvi","sponsorship available","will sponsor",
  "sponsorship provided","visa support","sponsorship considered","open to sponsorship",
  "visa provided","relocation package","international applicants",
]

// ─── Scam detection ──────────────────────────────────────────────────────────
const SCAM_KW = [
  "earn from home","make money fast","unlimited earning","work from home and earn",
  "no experience needed earn","daily pay","instant pay","cryptocurrency","bitcoin payment",
  "whatsapp only","telegram only","no interview","guaranteed job","100% remote no office",
  "send cv to whatsapp","payment required","training fee","registration fee",
  "buy your own kit","send money","refundable deposit","mlo","multi level",
  "pyramid","referral bonus","recruit others","become your own boss earn",
]
const SCAM_EMPLOYER_PATTERNS = [
  /^(jobs?|career|work|hire|employ|staffing|recruitment)\d{2,}/i,
  /^[a-z]{3,8}\d{4,}$/i,
]

// ─── Pagination ──────────────────────────────────────────────────────────────
const JOBS_PER_PAGE = 20

// ─── Drop-down data ──────────────────────────────────────────────────────────
const ALL_ROLES   = ["All Jobs", ...ALL_JOBS]
const ALL_LOCS    = ["Anywhere in UK", ...ALL_LOCATIONS]
const QUICK_ROLES = [
  "All Jobs","Software Engineer","Registered Nurse","Data Analyst",
  "Cyber Security Analyst","Civil Engineer","Pharmacist","Data Scientist",
  "Accountant","Physiotherapist","Social Worker","DevOps Engineer",
]

// ─── SOC 2020 database ───────────────────────────────────────────────────────
// Source: GOV.UK "Skilled Worker visa: eligible occupations and codes"
// Last updated by Home Office: 22 July 2025
//
// eligible values:
//   true     = "Higher Skilled" → directly eligible for Skilled Worker route
//   "medium" = "Medium Skilled" → eligible ONLY if on Immigration Salary List
//              or Temporary Shortage List
//   false    = "Ineligible"     → cannot be sponsored on Skilled Worker route
//
const SOC_DB = [
  // ── Major Group 1: Managers, Directors & Senior Officials ────────────────
  { code:"1111", title:"Chief executives and senior officials",             eligible:true,     pattern:/chief executive|ceo|chairm|diplomat|senior official/i },
  { code:"1121", title:"Production managers (manufacturing)",               eligible:true,     pattern:/production manager.*manufactur/i },
  { code:"1122", title:"Production managers (construction)",                eligible:true,     pattern:/production manager.*construct|site manager/i },
  { code:"1131", title:"Financial managers and directors",                  eligible:true,     pattern:/financial (manager|director)|finance director|cfo|investment director/i },
  { code:"1132", title:"Marketing, sales and advertising directors",        eligible:true,     pattern:/marketing director|sales director|advertising director/i },
  { code:"1133", title:"Public relations and communications directors",     eligible:true,     pattern:/public relations director|communications director/i },
  { code:"1134", title:"Purchasing managers and directors",                 eligible:true,     pattern:/procurement director|purchasing director/i },
  { code:"1135", title:"Charitable organisation managers and directors",    eligible:true,     pattern:/charity director|charitable.*director/i },
  { code:"1136", title:"Human resource managers and directors",             eligible:true,     pattern:/hr director|human resources? director|people director|l.d director/i },
  { code:"1137", title:"Information technology directors",                  eligible:true,     pattern:/it director|technology director|cto|information (security|technology) director/i },
  { code:"1139", title:"Functional managers and directors (nec)",           eligible:true,     pattern:/r.?d director|operations director|coo|administration director/i },
  { code:"1140", title:"Directors in logistics, warehousing and transport", eligible:true,     pattern:/supply chain director|logistics director/i },
  { code:"1150", title:"Managers and directors in retail and wholesale",    eligible:"medium", pattern:/retail (manager|director)|wholesale (manager|director)/i },
  { code:"1162", title:"Senior police officers",                            eligible:true,     pattern:/chief (inspector|superintendent|constable)/i },
  { code:"1163", title:"Senior officers in fire, ambulance, prison",        eligible:true,     pattern:/senior (fire|ambulance|prison) officer/i },
  { code:"1171", title:"Health services and public health managers",        eligible:true,     pattern:/health (service|services) manager|healthcare (manager|director)|clinical governance/i },
  { code:"1172", title:"Social services managers and directors",            eligible:true,     pattern:/social services (manager|director)/i },
  { code:"1221", title:"Hotel and accommodation managers",                  eligible:"medium", pattern:/hotel manager|accommodation manager/i },
  { code:"1222", title:"Restaurant and catering managers",                  eligible:"medium", pattern:/restaurant manager|catering manager/i },
  { code:"1241", title:"Managers in transport and distribution",            eligible:true,     pattern:/transport manager|distribution manager|airport manager|fleet manager/i },
  { code:"1251", title:"Property, housing and estate managers",             eligible:"medium", pattern:/property manager|housing manager|facilities manager|estate manager/i },
  { code:"1254", title:"Waste disposal and environmental services managers",eligible:true,     pattern:/waste (management|disposal) manager|environmental services manager/i },
  { code:"1255", title:"Managers and directors in the creative industries", eligible:true,     pattern:/creative director|film production manager|publishing (manager|director)/i },
  // ── Major Group 2: Professional Occupations ──────────────────────────────
  { code:"2111", title:"Chemical scientists",                               eligible:true,     pattern:/analytical chemist|industrial chemist|research chemist|chemical scientist/i },
  { code:"2112", title:"Biological scientists",                             eligible:true,     pattern:/biologist|microbiologist|pathologist|pharmacologist|zoologist/i },
  { code:"2113", title:"Biochemists and biomedical scientists",             eligible:true,     pattern:/biochemist|biomedical scientist|biotechnologist|clinical scientist/i },
  { code:"2114", title:"Physical scientists",                               eligible:true,     pattern:/geologist|geophysicist|hydrogeologist|meteorologist/i },
  { code:"2115", title:"Social and humanities scientists",                  eligible:true,     pattern:/anthropologist|archaeologist|epidemiologist|historian|political scientist|gis analyst/i },
  { code:"2119", title:"Natural and social science professionals (nec)",    eligible:true,     pattern:/sports scientist|behavioural scientist/i },
  { code:"2121", title:"Civil engineers",                                   eligible:true,     pattern:/civil engineer|structural engineer|geotechnical engineer|transportation engineer|water engineer/i },
  { code:"2122", title:"Mechanical engineers",                              eligible:true,     pattern:/mechanical engineer|automotive engineer|marine engineer|naval architect/i },
  { code:"2123", title:"Electrical engineers",                              eligible:true,     pattern:/electrical engineer|power systems engineer|railway signal/i },
  { code:"2124", title:"Electronics engineers",                             eligible:true,     pattern:/electronics? engineer|broadcast engineer|telecommunications? engineer/i },
  { code:"2125", title:"Production and process engineers",                  eligible:true,     pattern:/chemical engineer|control.instrumentation engineer|industrial engineer|production engineer/i },
  { code:"2126", title:"Aerospace engineers",                               eligible:true,     pattern:/aerospace engineer|aeronautical engineer|aircraft engineer|avionics engineer/i },
  { code:"2127", title:"Engineering project managers",                      eligible:true,     pattern:/engineering project manager/i },
  { code:"2129", title:"Engineering professionals (nec)",                   eligible:true,     pattern:/biomedical engineer|energy engineer|food technologist|nuclear engineer|robotics engineer|mechatronic|materials engineer/i },
  { code:"2131", title:"IT project managers",                               eligible:true,     pattern:/it project manager|technology project manager/i },
  { code:"2132", title:"IT managers",                                       eligible:true,     pattern:/it manager|software development manager|network manager|it service delivery|technical support manager/i },
  { code:"2133", title:"IT business analysts, architects and systems designers", eligible:true, pattern:/it business analyst|data architect|data engineer|it systems architect|solutions architect/i },
  { code:"2134", title:"Programmers and software development professionals",eligible:true,     pattern:/software (developer|engineer|programmer)|programmer|front.?end developer|back.?end developer|full.?stack|mobile developer|web developer|computer games designer/i },
  { code:"2135", title:"Cyber security professionals",                      eligible:true,     pattern:/cyber.?security|information security|penetration test|forensic computer|secure system/i },
  { code:"2136", title:"IT quality and testing professionals",              eligible:true,     pattern:/\bqa engineer|\bquality assurance engineer|test engineer|software tester|\bsdet\b/i },
  { code:"2137", title:"IT network professionals",                          eligible:true,     pattern:/network engineer|network architect|it network professional/i },
  { code:"2139", title:"IT professionals (nec) incl. DevOps",              eligible:true,     pattern:/devops|site reliability engineer|\bsre\b|cloud engineer|webmaster|it consultant/i },
  { code:"2141", title:"Web design professionals",                          eligible:true,     pattern:/web design|ui.?ux|user experience designer|user interface designer|ux designer|ui designer/i },
  { code:"2142", title:"Graphic and multimedia designers",                  eligible:true,     pattern:/graphic designer|multimedia designer|motion designer|animator/i },
  { code:"2151", title:"Conservation professionals",                        eligible:true,     pattern:/conservationist|ecologist|heritage officer/i },
  { code:"2152", title:"Environmental professionals",                       eligible:true,     pattern:/environmental (engineer|consultant|scientist|manager)|sustainability officer|energy manager/i },
  { code:"2161", title:"Research and development managers",                 eligible:true,     pattern:/r.?d manager|research.development manager|laboratory manager/i },
  { code:"2162", title:"Other researchers (unspecified discipline)",        eligible:true,     pattern:/research fellow|research scientist|principal researcher/i },
  { code:"2211", title:"Generalist medical practitioners",                  eligible:true,     pattern:/general practitioner|\bgp\b|public health doctor/i },
  { code:"2212", title:"Specialist medical practitioners",                  eligible:true,     pattern:/anaesth|cardiologist|dermatologist|gastroenterol|gynaecolog|haematolog|neurolog|oncolog|paediatric.*(consult|doctor)|psychiatrist|radiologist|rheumatolog|surgeon/i },
  { code:"2221", title:"Physiotherapists",                                  eligible:true,     pattern:/physiotherapist|physical therapist/i },
  { code:"2222", title:"Occupational therapists",                           eligible:true,     pattern:/occupational therapist/i },
  { code:"2223", title:"Speech and language therapists",                    eligible:true,     pattern:/speech.*(language|therapy)|language therapist/i },
  { code:"2224", title:"Psychotherapists and CBT therapists",               eligible:true,     pattern:/psychotherapist|cognitive.behavi/i },
  { code:"2225", title:"Clinical psychologists",                            eligible:true,     pattern:/clinical psychologist/i },
  { code:"2226", title:"Other psychologists",                               eligible:true,     pattern:/(counselling|educational|forensic|occupational|health|research|sports) psychologist/i },
  { code:"2229", title:"Therapy professionals (nec)",                       eligible:true,     pattern:/art therapist|drama therapist|music therapist|nutritionist|orthoptist|play therapist/i },
  { code:"2231", title:"Midwifery nurses",                                  eligible:true,     pattern:/midwi/i },
  { code:"2232", title:"Registered community nurses",                       eligible:true,     pattern:/community nurse|district nurse/i },
  { code:"2233", title:"Registered specialist nurses",                      eligible:true,     pattern:/specialist nurse|intensive care nurse|theatre nurse|diabetes.*nurse/i },
  { code:"2234", title:"Registered nurse practitioners",                    eligible:true,     pattern:/nurse practitioner|advanced nurse/i },
  { code:"2235", title:"Registered mental health nurses",                   eligible:true,     pattern:/mental health nurse|\brmn\b/i },
  { code:"2236", title:"Registered children's nurses",                      eligible:true,     pattern:/children.?s nurse|paediatric nurse|neonatal nurse|school nurse/i },
  { code:"2237", title:"Other registered nursing professionals",            eligible:true,     pattern:/registered nurse|\brn\b|\brnld\b|\brnmh\b|staff nurse/i },
  { code:"2240", title:"Veterinarians",                                     eligible:true,     pattern:/veterinarian|vet surgeon/i },
  { code:"2251", title:"Pharmacists",                                       eligible:true,     pattern:/pharmacist/i },
  { code:"2252", title:"Optometrists",                                      eligible:true,     pattern:/optometrist/i },
  { code:"2253", title:"Dental practitioners",                              eligible:true,     pattern:/dentist|dental surgeon|orthodontist|periodontist|endodontist/i },
  { code:"2254", title:"Medical radiographers",                             eligible:true,     pattern:/radiographer|sonographer|vascular scientist/i },
  { code:"2255", title:"Paramedics",                                        eligible:true,     pattern:/paramedic/i },
  { code:"2256", title:"Podiatrists",                                       eligible:true,     pattern:/podiatrist/i },
  { code:"2259", title:"Other health professionals (nec)",                  eligible:true,     pattern:/audiologist|cardiac physiologist|dietitian|health promotion officer|operating department|orthotist/i },
  { code:"2311", title:"Higher education teaching professionals",           eligible:true,     pattern:/university (lecturer|professor|tutor)|higher education teacher/i },
  { code:"2312", title:"Further education teaching professionals",          eligible:true,     pattern:/further education teacher|college lecturer/i },
  { code:"2313", title:"Secondary education teaching professionals",        eligible:true,     pattern:/secondary (school )?(teacher|tutor)|secondary education|high school teacher/i },
  { code:"2314", title:"Primary education teaching professionals",          eligible:true,     pattern:/primary (school )?(teacher|tutor)|primary education/i },
  { code:"2315", title:"Nursery education teaching professionals",          eligible:true,     pattern:/nursery teacher/i },
  { code:"2316", title:"Special needs education teaching professionals",    eligible:true,     pattern:/special (needs |educational )?teacher|sen teacher/i },
  { code:"2317", title:"Teachers of English as a foreign language",         eligible:true,     pattern:/\befl teacher|\belts teacher|english as a foreign language|tefl/i },
  { code:"2321", title:"Head teachers and principals",                      eligible:true,     pattern:/head ?teacher|school principal/i },
  { code:"2322", title:"Education managers",                                eligible:true,     pattern:/education manager/i },
  { code:"2411", title:"Barristers and judges",                             eligible:true,     pattern:/barrister|judge|advocate/i },
  { code:"2412", title:"Solicitors and lawyers",                            eligible:true,     pattern:/solicitor|lawyer/i },
  { code:"2419", title:"Legal professionals (nec)",                         eligible:true,     pattern:/paralegal|patent attorney|trademark attorney|conveyancer|litigation executive/i },
  { code:"2421", title:"Chartered and certified accountants",               eligible:true,     pattern:/chartered accountant|certified accountant|cpa |auditor|financial accountant|forensic accountant|management accountant/i },
  { code:"2422", title:"Finance and investment analysts and advisers",      eligible:true,     pattern:/financial (analyst|adviser|planner)|credit analyst|investment analyst|mortgage adviser/i },
  { code:"2423", title:"Taxation experts",                                  eligible:true,     pattern:/tax (adviser|consultant|manager|specialist)|taxation expert/i },
  { code:"2431", title:"Management consultants and business analysts",      eligible:true,     pattern:/management consultant|business (analyst|consultant)|risk analyst/i },
  { code:"2432", title:"Marketing and commercial managers",                 eligible:true,     pattern:/marketing manager|commercial manager/i },
  { code:"2433", title:"Actuaries, economists and statisticians",           eligible:true,     pattern:/actuar|economist|statistician|data scientist|mathematician/i },
  { code:"2440", title:"Business and financial project management professionals", eligible:true, pattern:/business (change|project) manager|clinical trials coordinator|risk manager/i },
  { code:"2451", title:"Architects",                                        eligible:true,     pattern:/\barchitect\b|landscape architect/i },
  { code:"2452", title:"Chartered architectural technologists and planning officers", eligible:true, pattern:/architectural technologist|town planning officer|urban designer/i },
  { code:"2453", title:"Quantity surveyors",                                eligible:true,     pattern:/quantity surveyor/i },
  { code:"2454", title:"Chartered surveyors",                               eligible:true,     pattern:/chartered surveyor|building control surveyor|land surveyor|property surveyor/i },
  { code:"2455", title:"Construction project managers",                     eligible:true,     pattern:/construction project manager|transport planner/i },
  { code:"2461", title:"Social workers",                                    eligible:true,     pattern:/social worker/i },
  { code:"2462", title:"Probation officers",                                eligible:true,     pattern:/probation officer/i },
  { code:"2464", title:"Youth work professionals",                          eligible:true,     pattern:/youth work professional/i },
  { code:"2471", title:"Librarians",                                        eligible:true,     pattern:/\blibrarian\b/i },
  { code:"2472", title:"Archivists, conservators and curators",             eligible:true,     pattern:/archivist|curator|conservator/i },
  { code:"2481", title:"Quality control and planning engineers",            eligible:true,     pattern:/quality control engineer|planning engineer|garment technologist/i },
  { code:"2482", title:"Quality assurance and regulatory professionals",    eligible:true,     pattern:/quality assurance (professional|manager)|regulatory (professional|affairs)/i },
  { code:"2483", title:"Environmental health professionals",                eligible:true,     pattern:/environmental health (officer|professional)/i },
  { code:"2491", title:"Newspaper, periodical and broadcast editors",       eligible:true,     pattern:/newspaper editor|broadcast editor|periodical editor/i },
  { code:"2492", title:"Journalists and reporters",                         eligible:true,     pattern:/journalist|reporter/i },
  { code:"2493", title:"Public relations professionals",                    eligible:true,     pattern:/public relations|press officer|social media manager|pr officer/i },
  { code:"2494", title:"Advertising accounts managers and creative directors", eligible:true,  pattern:/advertising account manager|creative director|fundraising manager/i },
  // ── Major Group 3: Associate Professional Occupations ───────────────────
  { code:"3111", title:"Laboratory technicians",                            eligible:"medium", pattern:/laboratory technician|lab technician/i },
  { code:"3112", title:"Electrical and electronics technicians",            eligible:"medium", pattern:/electrical technician|electronics technician|avionics technician/i },
  { code:"3113", title:"Engineering technicians",                           eligible:"medium", pattern:/engineering technician|aerospace technician|wind turbine technician/i },
  { code:"3114", title:"Building and civil engineering technicians",        eligible:"medium", pattern:/building technician|civil engineering technician|surveying technician/i },
  { code:"3131", title:"IT operations technicians",                         eligible:"medium", pattern:/it (support|technician|operations)|network (administrator|technician)|systems administrator|games tester/i },
  { code:"3132", title:"IT user support technicians",                       eligible:"medium", pattern:/it user support|helpdesk (technician|analyst)/i },
  { code:"3133", title:"Database administrators and web content technicians",eligible:"medium",pattern:/database administrator|\bdba\b|web content (technician|manager)/i },
  { code:"3211", title:"Dispensing opticians",                              eligible:"medium", pattern:/dispensing optician/i },
  { code:"3212", title:"Pharmaceutical technicians",                        eligible:"medium", pattern:/pharmaceutical technician/i },
  { code:"3213", title:"Medical and dental technicians",                    eligible:"medium", pattern:/dental (technician|hygienist)|cardiac technician|hearing aid dispenser|nursing associate/i },
  { code:"3221", title:"Youth and community workers",                       eligible:"medium", pattern:/youth worker|community worker|family support worker/i },
  { code:"3224", title:"Counsellors",                                       eligible:"medium", pattern:/counsellor|life coach|debt adviser|bereavement/i },
  { code:"3240", title:"Veterinary nurses",                                 eligible:"medium", pattern:/veterinary nurse/i },
  { code:"3312", title:"Police officers (sergeant and below)",              eligible:"medium", pattern:/police (constable|officer|sergeant)/i },
  { code:"3313", title:"Fire service officers (watch manager and below)",   eligible:"medium", pattern:/firefighter|fire officer|watch manager/i },
  { code:"3314", title:"Prison service officers",                           eligible:"medium", pattern:/prison officer|prison service/i },
  { code:"3411", title:"Artists",                                           eligible:"medium", pattern:/\bartist\b|illustrator|sculptor|tattoo artist/i },
  { code:"3412", title:"Authors, writers and translators",                  eligible:"medium", pattern:/\bauthor\b|copywriter|technical writer|translator|interpreter|scriptwriter/i },
  { code:"3413", title:"Actors, entertainers and presenters",               eligible:"medium", pattern:/\bactor\b|entertainer|presenter|broadcaster|comedian|singer|model/i },
  { code:"3414", title:"Dancers and choreographers",                        eligible:"medium", pattern:/dancer|choreographer|dance teacher/i },
  { code:"3415", title:"Musicians",                                         eligible:true,     pattern:/musician|composer|conductor|instrumentalist/i },
  { code:"3416", title:"Arts officers, producers and directors",            eligible:true,     pattern:/arts officer|producer|broadcasting.*director|studio manager/i },
  { code:"3417", title:"Photographers and audio-visual technicians",        eligible:"medium", pattern:/photographer|camera operator|videographer|sound engineer|lighting designer/i },
  { code:"3421", title:"Interior designers",                                eligible:"medium", pattern:/interior designer/i },
  { code:"3422", title:"Clothing, fashion and accessories designers",        eligible:"medium", pattern:/fashion designer|clothing designer|textile designer|jewellery designer/i },
  { code:"3429", title:"Design occupations (nec)",                          eligible:"medium", pattern:/industrial designer|product designer|packaging designer|set designer/i },
  { code:"3511", title:"Aircraft pilots and air traffic controllers",       eligible:true,     pattern:/airline pilot|air traffic controller|helicopter pilot|flying instructor/i },
  { code:"3512", title:"Ship and hovercraft officers",                      eligible:"medium", pattern:/ship (captain|officer)|hovercraft officer/i },
  { code:"3531", title:"Brokers",                                           eligible:true,     pattern:/\bbroker\b|stockbroker|insurance broker|shipbroker|commodity trader/i },
  { code:"3532", title:"Insurance underwriters",                            eligible:"medium", pattern:/insurance underwriter/i },
  { code:"3533", title:"Financial and accounting technicians",              eligible:"medium", pattern:/accounting technician|financial control technician/i },
  { code:"3534", title:"Financial accounts managers",                       eligible:true,     pattern:/investment manager|credit manager|claims manager|relationship manager/i },
  { code:"3544", title:"Data analysts",                                     eligible:"medium", pattern:/data analyst|bi analyst|reporting analyst/i },
  { code:"3549", title:"Business associate professionals (nec)",            eligible:"medium", pattern:/business support officer|business systems analyst|clinical coder|research coordinator/i },
  { code:"3551", title:"Buyers and procurement officers",                   eligible:"medium", pattern:/buyer|procurement officer|purchasing officer/i },
  { code:"3552", title:"Business sales executives",                         eligible:"medium", pattern:/sales executive|business development executive/i },
  { code:"3554", title:"Advertising and marketing associate professionals", eligible:"medium", pattern:/marketing executive|advertising executive|market researcher|fundraiser/i },
  { code:"3556", title:"Sales accounts and business development managers",  eligible:true,     pattern:/sales account manager|business development manager|brand manager/i },
  { code:"3557", title:"Events managers and organisers",                    eligible:"medium", pattern:/events? manager|events? organiser|conference manager|wedding planner|festival manager/i },
  { code:"3571", title:"Human resources and industrial relations officers", eligible:"medium", pattern:/hr (officer|adviser|advisor)|human resources? (officer|adviser)|recruitment consultant/i },
  { code:"3572", title:"Careers advisers and vocational guidance specialists",eligible:"medium",pattern:/careers? adviser|careers? coach|vocational guidance/i },
  { code:"3581", title:"Inspectors of standards and regulations",           eligible:"medium", pattern:/health.safety inspector|building control officer|driving examiner|trading standards/i },
  { code:"3582", title:"Health and safety managers and officers",           eligible:"medium", pattern:/health.?and.?safety (manager|officer)|fire safety|occupational hygienist/i },
  // ── Major Group 4: Administrative & Secretarial ─────────────────────────
  { code:"4122", title:"Book-keepers, payroll managers and wages clerks",   eligible:"medium", pattern:/bookkeeper|payroll (manager|officer)|wages clerk/i },
  { code:"4124", title:"Finance officers",                                  eligible:"medium", pattern:/finance officer/i },
  { code:"4141", title:"Office managers",                                   eligible:"medium", pattern:/office manager/i },
  { code:"4143", title:"Customer service managers",                         eligible:"medium", pattern:/customer service manager|call centre manager/i },
  // ── Major Group 5: Skilled Trades ───────────────────────────────────────
  { code:"5111", title:"Farmers",                                           eligible:"medium", pattern:/\bfarmer\b|arable farm|dairy farm|livestock farm/i },
  { code:"5221", title:"Electricians and electrical fitters",               eligible:"medium", pattern:/electrician|electrical fitter/i },
  { code:"5230", title:"Heating, cooling and ventilation engineers",        eligible:"medium", pattern:/hvac engineer|heating engineer|ventilation engineer|refrigeration engineer/i },
  { code:"5241", title:"Plumbers",                                          eligible:"medium", pattern:/\bplumber\b/i },
  { code:"5250", title:"Construction and building trades",                  eligible:"medium", pattern:/bricklayer|carpenter|joiner|roofer|scaffolder|dryliner/i },
  { code:"5434", title:"Chefs",                                             eligible:"medium", pattern:/\bchef\b|sous chef|head chef|commis chef/i },
  // ── Major Group 6: Caring, Leisure & Other Services ────────────────────
  { code:"6131", title:"Nursing auxiliaries and assistants",                eligible:"medium", pattern:/nursing auxiliary|nursing assistant|healthcare assistant|\bhca\b/i },
  { code:"6135", title:"Care workers and home carers",                      eligible:"medium", pattern:/care worker|home carer|care assistant/i },
  { code:"6136", title:"Senior care workers",                               eligible:"medium", pattern:/senior care worker/i },
  // ── Major Group 8: Process, Plant & Machine Operatives ──────────────────
  { code:"8211", title:"Large goods vehicle drivers",                       eligible:false,    pattern:/\bhgv driver|\blgv driver|lorry driver/i },
  // ── Major Group 9: Elementary Occupations ───────────────────────────────
  { code:"9233", title:"Cleaners and domestics",                            eligible:false,    pattern:/cleaner|cleaning operative/i },
  { code:"9241", title:"Security guards",                                   eligible:false,    pattern:/security guard|door supervisor/i },
  { code:"9259", title:"Elementary storage occupations",                    eligible:false,    pattern:/warehouse (operative|assistant)|picker.packer|\bpacker\b/i },
]

const SOC_ELIGIBLE_LABEL = {
  true:     "Higher Skilled — directly eligible for Skilled Worker route",
  medium:   "Medium Skilled — eligible only if on Immigration Salary List or Temporary Shortage List",
  false:    "Ineligible — cannot be sponsored on Skilled Worker route",
}
const SOC_ELIGIBLE_COLOR = {
  true:   { bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8" },
  medium: { bg: "#FEF3C7", border: "#FDE68A", color: "#92400E" },
  false:  { bg: "#FEF2F2", border: "#FECACA", color: "#991B1B" },
}

function detectSOC(title) {
  for (const entry of SOC_DB) {
    if (entry.pattern.test(title)) return entry
  }
  return null
}

// ─── Window width hook ───────────────────────────────────────────────────────
function useW() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener("resize", fn)
    return () => window.removeEventListener("resize", fn)
  }, [])
  return w
}

// ─── Sponsor lookup (Supabase) ───────────────────────────────────────────────
async function checkSponsor(employerName) {
  if (!employerName || employerName === "Unknown") return null
  try {
    const clean = employerName
      .replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co|corp|corporation|holdings|services|solutions|international|technologies|technology|systems|consulting|consultancy|recruitment|staffing|agency)\.?$/gi, "")
      .replace(/[^\w\s]/g, " ").trim()
    if (clean.length < 2) return null
    const { data: exact }    = await supabase.from("sponsors").select("organisation_name,town,route,rating").ilike("organisation_name", employerName).limit(1)
    if (exact?.[0]) return exact[0]
    const { data: contains } = await supabase.from("sponsors").select("organisation_name,town,route,rating").ilike("organisation_name", `%${clean}%`).limit(1)
    if (contains?.[0]) return contains[0]
    const firstWord = clean.split(" ")[0]
    if (firstWord.length >= 4) {
      const { data: partial } = await supabase.from("sponsors").select("organisation_name,town,route,rating").ilike("organisation_name", `${firstWord}%`).limit(1)
      if (partial?.[0]) return partial[0]
    }
    return null
  } catch { return null }
}

async function batchCheckSponsors(employers) {
  const unique  = [...new Set(employers.filter(Boolean))]
  const results = {}
  for (let i = 0; i < unique.length; i += 8) {
    const batch = unique.slice(i, i + 8)
    await Promise.all(batch.map(async emp => { results[emp] = await checkSponsor(emp) }))
  }
  return results
}

// ─── Scam detection ──────────────────────────────────────────────────────────
function detectScam(job) {
  const text = `${job.title} ${job.description} ${job.employer}`.toLowerCase()
  const hits  = []
  for (const kw of SCAM_KW) { if (text.includes(kw)) hits.push(kw) }
  for (const pat of SCAM_EMPLOYER_PATTERNS) { if (pat.test(job.employer)) hits.push("suspicious employer name") }
  if (job.salary_min && job.salary_min > 200000) hits.push("implausible salary")
  const unique = [...new Set(hits)].slice(0, 4)
  const risk   = unique.length === 0 ? "safe" : unique.length === 1 ? "low" : unique.length <= 3 ? "medium" : "high"
  return { risk, hits: unique }
}

// ─── Sponsorship scoring ─────────────────────────────────────────────────────
function scoreJob(job, sponsorData) {
  const text = `${job.title} ${job.description} ${job.employer}`.toLowerCase()
  let score = 0; let signals = []; let fresherFriendly = false
  for (const neg of NEG_KW) { if (text.includes(neg)) return { score: -1, signals: [], fresherFriendly: false, verified: false } }
  if (sponsorData) {
    score += 55
    signals.push({ type: "verified", label: "Gov Verified" })
    if (sponsorData.rating === "A") { score += 10; signals.push({ type: "rating", label: "A-Rated" }) }
  }
  let visaFound = 0
  for (const kw of VISA_KW) {
    if (text.includes(kw) && visaFound < 2) { score += 12; signals.push({ type: "visa", label: kw }); visaFound++ }
  }
  for (const kw of FRESHER_KW) { if (text.includes(kw)) { fresherFriendly = true; break } }
  if (job.salary_min || job.salary_max) { score += 5; signals.push({ type: "salary", label: "Salary shown" }) }
  return {
    score: Math.min(100, Math.max(0, score)),
    signals: [...new Map(signals.map(s => [s.label, s])).values()].slice(0, 4),
    fresherFriendly, verified: !!sponsorData,
  }
}

// ─── API fetches ─────────────────────────────────────────────────────────────
async function fetchAdzuna(q, loc, page) {
  const what   = q ? `${q} visa sponsorship` : "visa sponsorship uk jobs"
  const where  = loc && loc !== "Anywhere in UK" ? loc : "UK"
  const params = new URLSearchParams({ app_id: ADZUNA_ID, app_key: ADZUNA_KEY, what, where, results_per_page: 20 })
  const r      = await fetch(`https://api.adzuna.com/v1/api/jobs/gb/search/${page}?${params}`)
  if (!r.ok) throw new Error(`Adzuna ${r.status}`)
  const data   = await r.json()
  return (data.results || []).map(j => ({
    id: `adzuna_${j.id}`, source: "Adzuna",
    title: j.title || "", employer: j.company?.display_name || "Unknown",
    location: j.location?.display_name || "UK",
    salary_min: j.salary_min, salary_max: j.salary_max,
    description: j.description || "", url: j.redirect_url || "#",
    posted: j.created, full_time: j.contract_time === "full_time",
  }))
}

async function fetchReed(q, loc, page) {
  const keywords     = q ? `${q} visa sponsorship` : "visa sponsorship"
  const locationName = loc && loc !== "Anywhere in UK" ? loc : "United Kingdom"
  const params       = new URLSearchParams({ keywords, locationName, resultsToTake: 20, resultsToSkip: (page - 1) * 20 })
  const r            = await fetch(`https://uk-visa-jobs-six.vercel.app/api/reed?${params}`)
  if (!r.ok) throw new Error(`Reed ${r.status}`)
  const data         = await r.json()
  return (data.results || []).map(j => ({
    id: `reed_${j.jobId}`, source: "Reed",
    title: j.jobTitle || "", employer: j.employerName || "Unknown",
    location: j.locationName || "",
    salary_min: j.minimumSalary, salary_max: j.maximumSalary,
    description: j.jobDescription || "", url: j.jobUrl || "#",
    posted: j.date, full_time: j.fullTime,
  }))
}

// ─── Scam badge ──────────────────────────────────────────────────────────────
function ScamBadge({ scam }) {
  const [open, setOpen] = useState(false)
  if (!scam || scam.risk === "safe") return null
  const cfg = {
    low:    { bg: "#FFF7ED", border: "#FED7AA", color: "#C2410C" },
    medium: { bg: "#FEF3C7", border: "#FDE68A", color: "#B45309" },
    high:   { bg: "#FEF2F2", border: "#FECACA", color: "#DC2626" },
  }[scam.risk]
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <span onClick={() => setOpen(o => !o)} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, cursor: "pointer", userSelect: "none" }}>
        {scam.risk === "high" ? "SCAM" : scam.risk === "medium" ? "SUSPICIOUS" : "LOW RISK"}
      </span>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 500, background: "#fff", border: `1px solid ${cfg.border}`, borderRadius: 10, padding: "10px 14px", minWidth: 220, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: cfg.color, marginBottom: 6 }}>Scam signals detected:</div>
          {scam.hits.map((h, i) => <div key={i} style={{ fontSize: 11, color: "#374151", padding: "2px 0", borderBottom: i < scam.hits.length - 1 ? "1px solid #F3F4F6" : "none" }}>- {h}</div>)}
          <div style={{ fontSize: 10, color: "#9CA3B8", marginTop: 6 }}>Always research employers before applying.</div>
        </div>
      )}
    </div>
  )
}

// ─── SOC badge ───────────────────────────────────────────────────────────────
function SOCBadge({ soc }) {
  const [open, setOpen] = useState(false)
  if (!soc) return null
  const key = soc.eligible === true ? true : soc.eligible === false ? false : "medium"
  const cfg = SOC_ELIGIBLE_COLOR[key]
  const tick = soc.eligible === true ? " \u2713" : soc.eligible === false ? " \u2717" : " ~"
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <span onClick={() => setOpen(o => !o)} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, cursor: "pointer", userSelect: "none" }}>
        SOC {soc.code}{tick}
      </span>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 500, background: "#fff", border: "1px solid #E8EEFF", borderRadius: 10, padding: "12px 14px", minWidth: 290, boxShadow: "0 8px 32px rgba(0,57,255,0.1)" }}>
          <div style={{ fontSize: 10, color: "#9CA3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>SOC 2020 Code {soc.code}</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>{soc.title}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 6, padding: "5px 8px", lineHeight: 1.5 }}>
            {SOC_ELIGIBLE_LABEL[key]}
          </div>
          <div style={{ fontSize: 10, color: "#9CA3B8", marginTop: 6 }}>
            Source: GOV.UK Appendix Skilled Occupations (updated 22 July 2025).
          </div>
        </div>
      )}
    </div>
  )
}

// ─── JobCard ─────────────────────────────────────────────────────────────────
function JobCard({ job, onSave, saved, navigate, mob }) {
  const [expanded,   setExpanded]   = useState(false)
  const [careersUrl, setCareersUrl] = useState(null)

  useEffect(() => {
    if (!job.employer || job.employer === "Unknown") return
    fetch(`/api/employer-careers?employer=${encodeURIComponent(job.employer)}`)
      .then(r => r.json()).then(d => { if (d.found) setCareersUrl(d.url) }).catch(() => {})
  }, [job.employer])

  const salary     = job.salary_min || job.salary_max ? `GBP ${(job.salary_min || 0).toLocaleString()}${job.salary_max ? ` - GBP ${job.salary_max.toLocaleString()}` : "+"}` : null
  const posted     = job.posted ? new Date(job.posted).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""
  const scoreColor = job.verified ? "#00D68F" : job.score >= 60 ? "#0057FF" : job.score >= 30 ? "#FF6B35" : "#9CA3B8"
  const scoreLabel = job.verified ? "Verified" : job.score >= 60 ? "Very Likely" : job.score >= 30 ? "Likely" : "Possible"
  const isHighRisk = job.scam?.risk === "high"
  const borderColor = isHighRisk ? "#FECACA" : job.verified ? "#00D68F35" : "#E8EEFF"

  return (
    <div style={{ background: isHighRisk ? "#FFFBFB" : "#fff", border: `1.5px solid ${borderColor}`, borderRadius: 16, padding: mob ? "14px" : "20px 24px", transition: "all 0.2s", position: "relative", opacity: isHighRisk ? 0.85 : 1 }}
      onMouseEnter={e => { if (!mob && !isHighRisk) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,57,255,0.07)" } }}
      onMouseLeave={e => { if (!mob) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" } }}
    >
      {job.verified && !isHighRisk && <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #00D68F, #00A67E)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 10px", borderRadius: "0 16px 0 8px", letterSpacing: 0.5 }}>UK GOV VERIFIED</div>}
      {isHighRisk && <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #DC2626, #B91C1C)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 10px", borderRadius: "0 16px 0 8px", letterSpacing: 0.5 }}>POSSIBLE SCAM</div>}

      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start", marginTop: (job.verified || isHighRisk) ? 8 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ background: job.source === "Reed" ? "#e8534215" : "#7c4dff15", color: job.source === "Reed" ? "#e85342" : "#7c4dff", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{job.source}</span>
            {job.fresherFriendly && <span style={{ background: "#00D68F15", color: "#00D68F", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>Fresher Friendly</span>}
            {job.sponsorInfo?.town && <span style={{ background: "#0057FF08", color: "#0057FF", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>{job.sponsorInfo.town}</span>}
            <ScamBadge scam={job.scam} />
            <SOCBadge soc={job.soc} />
          </div>
          <h3 style={{ fontSize: mob ? 14 : 15, fontWeight: 800, color: "#0A0F1E", margin: "0 0 3px", lineHeight: 1.3 }}>{job.title}</h3>
          <div style={{ color: "#4B5675", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.employer} - {job.location}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
          <div style={{ background: `${scoreColor}15`, border: `1px solid ${scoreColor}40`, borderRadius: 20, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: scoreColor, whiteSpace: "nowrap" }}>{scoreLabel} {job.score}%</div>
          <button onClick={() => onSave(job)} style={{ background: saved ? "#0057FF10" : "none", border: `1px solid ${saved ? "#0057FF" : "#E8EEFF"}`, color: saved ? "#0057FF" : "#9CA3B8", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{saved ? "Saved" : "Save"}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 7, fontSize: 11, color: "#4B5675", flexWrap: "wrap" }}>
        {salary && <span>{salary}</span>}
        {posted && <span>Posted {posted}</span>}
        {job.sponsorInfo?.route && <span>{job.sponsorInfo.route.split(":")[0]}</span>}
      </div>

      {job.signals?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {job.signals.map((s, i) => {
            const cols = { verified: "#00D68F", rating: "#00D68F", visa: "#0057FF", salary: "#FF6B35" }
            return <span key={i} style={{ background: `${cols[s.type] || "#888"}12`, color: cols[s.type] || "#888", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 600 }}>{s.label}</span>
          })}
        </div>
      )}

      {job.description && (
        <>
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: "#0057FF", fontSize: 11, cursor: "pointer", marginTop: 6, padding: 0, fontFamily: "inherit" }}>
            {expanded ? "Hide description" : "Show description"}
          </button>
          {expanded && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#4B5675", lineHeight: 1.7, borderTop: "1px solid #E8EEFF", paddingTop: 8, maxHeight: 150, overflow: "auto" }}>
              {job.description.replace(/<[^>]*>/g, "").slice(0, 500)}{job.description.length > 500 ? "..." : ""}
            </p>
          )}
        </>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: isHighRisk ? "#9CA3B8" : "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center", minWidth: 80 }}>Apply via {job.source}</a>
        {careersUrl && <a href={careersUrl} target="_blank" rel="noopener noreferrer" style={{ background: "#00D68F", color: "#fff", borderRadius: 8, padding: "9px 12px", fontSize: 11, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>Direct Careers Page</a>}
        {job.sponsorInfo && <button onClick={() => navigate(`/employer/${encodeURIComponent(job.employer)}`)} style={{ background: "#F0F5FF", border: "1px solid #0057FF20", color: "#0057FF", borderRadius: 8, padding: "9px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Profile</button>}
      </div>
    </div>
  )
}

// ─── Pagination ──────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPage }) {
  if (totalPages <= 1) return null
  const getPages = () => {
    const pages = []
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i) }
    else {
      pages.push(1)
      if (currentPage > 3) pages.push("...")
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push("...")
      pages.push(totalPages)
    }
    return pages
  }
  const btnBase = { border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", minWidth: 36 }
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 24 }}>
      <button onClick={() => onPage(currentPage - 1)} disabled={currentPage === 1} style={{ ...btnBase, background: currentPage === 1 ? "#F8FAFF" : "#fff", color: currentPage === 1 ? "#C4C9D8" : "#4B5675", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>Prev</button>
      {getPages().map((p, i) =>
        p === "..." ? <span key={`d${i}`} style={{ color: "#9CA3B8", fontSize: 13, padding: "0 2px" }}>...</span> : (
          <button key={p} onClick={() => onPage(p)} style={{ ...btnBase, background: p === currentPage ? "linear-gradient(135deg, #0057FF, #00C2FF)" : "#fff", color: p === currentPage ? "#fff" : "#4B5675", border: p === currentPage ? "1.5px solid transparent" : "1.5px solid #E8EEFF" }}>{p}</button>
        )
      )}
      <button onClick={() => onPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ ...btnBase, background: currentPage === totalPages ? "#F8FAFF" : "#fff", color: currentPage === totalPages ? "#C4C9D8" : "#4B5675", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>Next</button>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function JobsPage() {
  const [searchParams]    = useSearchParams()
  const [q,     setQ]     = useState(searchParams.get("q")   || "")
  const [loc,   setLoc]   = useState(searchParams.get("loc") || "")
  const [showQ, setShowQ] = useState(false)
  const [showL, setShowL] = useState(false)
  const [showFilters,  setShowFilters]  = useState(false)
  const [fresherOnly,  setFresherOnly]  = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [hideScams,    setHideScams]    = useState(false)
  const [filters, setFilters] = useState({ salaryMin: "", salaryMax: "", jobType: "", source: "", sortBy: "Score" })

  const [allJobs,      setAllJobs]      = useState([])
  const [displayPage,  setDisplayPage]  = useState(1)
  const [apiPage,      setApiPage]      = useState(0)
  const [canFetchMore, setCanFetchMore] = useState(true)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState("")
  const [searched,     setSearched]     = useState(false)
  const [savedJobs,    setSavedJobs]    = useState(new Set())

  const navigate = useNavigate()
  const w   = useW()
  const mob = w < 768

  const activeCount   = Object.values(filters).filter(v => v !== "" && v !== "Score").length
  const filteredRoles = q.length > 0   ? ALL_ROLES.filter(r => r.toLowerCase().includes(q.toLowerCase())) : ALL_ROLES
  const filteredLocs  = loc.length > 0 ? ALL_LOCS.filter(l => l.toLowerCase().includes(loc.toLowerCase())) : ALL_LOCS
  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: f[k] === v ? "" : v }))

  const displayJobs = (() => {
    let jobs = [...allJobs]
    if (fresherOnly)  jobs = jobs.filter(j => j.fresherFriendly)
    if (verifiedOnly) jobs = jobs.filter(j => j.verified)
    if (hideScams)    jobs = jobs.filter(j => !j.scam || j.scam.risk === "safe" || j.scam.risk === "low")
    if (filters.jobType === "Full-time")  jobs = jobs.filter(j => j.full_time === true)
    if (filters.jobType === "Part-time")  jobs = jobs.filter(j => j.full_time === false)
    if (filters.salaryMin) jobs = jobs.filter(j => (j.salary_min || 0) >= parseInt(filters.salaryMin))
    if (filters.salaryMax) jobs = jobs.filter(j => (j.salary_max || 999999) <= parseInt(filters.salaryMax))
    if (filters.source === "Reed")   jobs = jobs.filter(j => j.source === "Reed")
    if (filters.source === "Adzuna") jobs = jobs.filter(j => j.source === "Adzuna")
    jobs.sort((a, b) => {
      if (a.verified && !b.verified) return -1
      if (!a.verified && b.verified) return 1
      if (filters.sortBy === "Salary") return (b.salary_min || 0) - (a.salary_min || 0)
      if (filters.sortBy === "Date")   return new Date(b.posted || 0) - new Date(a.posted || 0)
      return b.score - a.score
    })
    return jobs
  })()

  const totalPages  = Math.max(1, Math.ceil(displayJobs.length / JOBS_PER_PAGE))
  const safeDisplay = Math.min(displayPage, totalPages)
  const pageJobs    = displayJobs.slice((safeDisplay - 1) * JOBS_PER_PAGE, safeDisplay * JOBS_PER_PAGE)

  const stats = {
    total:    displayJobs.length,
    verified: displayJobs.filter(j => j.verified).length,
    fresher:  displayJobs.filter(j => j.fresherFriendly).length,
    scam:     displayJobs.filter(j => j.scam?.risk === "high" || j.scam?.risk === "medium").length,
  }

  const handleSave = async (job) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate("/auth"); return }
    if (savedJobs.has(job.id)) return
    await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: job.id, job_title: job.title, employer: job.employer, location: job.location, salary_min: job.salary_min, salary_max: job.salary_max, job_url: job.url, source: job.source, sponsorship_score: job.score })
    setSavedJobs(s => new Set([...s, job.id]))
  }

  const fetchAndMerge = useCallback(async (apiP, searchQ, searchLoc, replace = false) => {
    setLoading(true); setError("")
    try {
      const cleanLoc = searchLoc && searchLoc !== "Anywhere in UK" ? searchLoc : ""
      const [reedRes, adzunaRes] = await Promise.allSettled([fetchReed(searchQ, cleanLoc, apiP), fetchAdzuna(searchQ, cleanLoc, apiP)])
      let batch = []
      if (reedRes.status   === "fulfilled") batch.push(...reedRes.value)
      if (adzunaRes.status === "fulfilled") batch.push(...adzunaRes.value)
      if (batch.length === 0) { setCanFetchMore(false); return }

      const existingKeys = new Set((replace ? [] : allJobs).map(j => `${j.title.toLowerCase().slice(0, 30)}|${j.employer.toLowerCase()}`))
      batch = batch.filter(j => {
        const key = `${j.title.toLowerCase().slice(0, 30)}|${j.employer.toLowerCase()}`
        if (existingKeys.has(key)) return false; existingKeys.add(key); return true
      })

      const sponsorMap = await batchCheckSponsors(batch.map(j => j.employer))
      const scored = batch.map(j => {
        const sponsorInfo = sponsorMap[j.employer]
        const { score, signals, fresherFriendly, verified } = scoreJob(j, sponsorInfo)
        const scam = detectScam(j)
        const soc  = detectSOC(j.title)
        return { ...j, score, signals, fresherFriendly, verified, sponsorInfo, scam, soc }
      }).filter(j => j.score >= 0)

      setAllJobs(prev => replace ? scored : [...prev, ...scored])
      setCanFetchMore(batch.length >= 15)
      setSearched(true)
      setApiPage(apiP)
    } catch { setError("Search failed. Please try again.") }
    finally { setLoading(false) }
  }, [allJobs])

  useEffect(() => { fetchAndMerge(1, "", "", true) }, []) // eslint-disable-line

  const doSearch = useCallback((searchQ, searchLoc) => {
    setAllJobs([]); setDisplayPage(1); setApiPage(0); setCanFetchMore(true)
    fetchAndMerge(1, searchQ, searchLoc, true)
  }, []) // eslint-disable-line

  const handlePage = (p) => {
    if (p * JOBS_PER_PAGE > displayJobs.length && canFetchMore && !loading) {
      fetchAndMerge(apiPage + 1, q, loc)
    }
    setDisplayPage(p)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const pillStyle = (active) => ({ padding: "5px 11px", borderRadius: 100, fontSize: mob ? 11 : 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? "#0057FF" : "#E8EEFF"}`, background: active ? "#0057FF0D" : "#fff", color: active ? "#0057FF" : "#4B5675", transition: "all 0.15s", fontFamily: "inherit", whiteSpace: "nowrap" })
  const filterPillStyle = (active) => ({ padding: "6px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? "#0057FF" : "#E8EEFF"}`, background: active ? "#0057FF0D" : "#F8FAFF", color: active ? "#0057FF" : "#4B5675", transition: "all 0.15s", fontFamily: "inherit" })
  const dropStyle = { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", borderRadius: 14, border: "1px solid #E8EEFF", boxShadow: "0 16px 48px rgba(0,57,255,0.1)", maxHeight: 360, overflowY: "auto", zIndex: 300 }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: mob ? "82px 4% 40px" : "96px 5% 60px" }}>

        <div style={{ marginBottom: mob ? 14 : 20 }}>
          <h1 style={{ fontSize: mob ? 20 : 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 4px", letterSpacing: -0.8 }}>Find UK Visa Sponsored Jobs</h1>
          <p style={{ color: "#4B5675", fontSize: mob ? 12 : 14, margin: 0 }}>125,284 verified UK Home Office licensed sponsors - Verified results shown first</p>
        </div>

        {/* Search box */}
        <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 16, marginBottom: 10, boxShadow: "0 4px 24px rgba(0,57,255,0.06)", position: "relative", zIndex: 20 }}>
          <div style={{ position: "relative", borderBottom: "1px solid #E8EEFF" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3B8", fontSize: 14, pointerEvents: "none" }}>Search</span>
            <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => { setShowQ(true); setShowL(false) }} onBlur={() => setTimeout(() => setShowQ(false), 200)} onKeyDown={e => { if (e.key === "Enter") { doSearch(q, loc); setShowQ(false) } }} placeholder="Job title or keyword - or leave empty to see all jobs" style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: mob ? "14px 80px 14px 70px" : "14px 90px 14px 72px", fontSize: mob ? 14 : 15, color: "#0A0F1E", fontFamily: "inherit" }} />
            {q && <button onClick={() => { setQ(""); doSearch("", loc); setShowQ(false) }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#4B5675", cursor: "pointer", fontFamily: "inherit" }}>Clear</button>}
            {showQ && (
              <div style={dropStyle}>
                <div style={{ padding: "10px 14px 8px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #F8FAFF" }}>{q ? `${filteredRoles.length} matching roles` : `All ${ALL_ROLES.length - 1} roles`}</div>
                {filteredRoles.map(role => (
                  <div key={role} onMouseDown={() => { setQ(role === "All Jobs" ? "" : role); doSearch(role === "All Jobs" ? "" : role, loc); setShowQ(false) }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: role === "All Jobs" ? "#0057FF" : "#0A0F1E", fontWeight: role === "All Jobs" ? 700 : 400, background: role === "All Jobs" ? "#F0F5FF" : "transparent", borderBottom: "1px solid rgba(232,238,255,0.4)" }} onMouseEnter={e => e.currentTarget.style.background = role === "All Jobs" ? "#E8F0FF" : "#F8FAFF"} onMouseLeave={e => e.currentTarget.style.background = role === "All Jobs" ? "#F0F5FF" : "transparent"}>
                    {role === "All Jobs" ? "*  " : ""}{role}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9CA3B8", fontSize: 12, pointerEvents: "none" }}>Location</span>
              <input value={loc} onChange={e => setLoc(e.target.value)} onFocus={() => { setShowL(true); setShowQ(false) }} onBlur={() => setTimeout(() => setShowL(false), 200)} onKeyDown={e => { if (e.key === "Enter") { doSearch(q, loc); setShowL(false) } }} placeholder="Any UK city or remote..." style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: "12px 12px 12px 72px", fontSize: 13, color: "#0A0F1E", fontFamily: "inherit" }} />
              {showL && (
                <div style={dropStyle}>
                  <div style={{ padding: "10px 14px 8px", fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #F8FAFF" }}>{loc ? `${filteredLocs.length} locations` : `All ${ALL_LOCS.length - 1} UK cities`}</div>
                  {filteredLocs.map(city => (
                    <div key={city} onMouseDown={() => { setLoc(city === "Anywhere in UK" ? "" : city); doSearch(q, city === "Anywhere in UK" ? "" : city); setShowL(false) }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: city === "Anywhere in UK" ? "#0057FF" : "#0A0F1E", fontWeight: city === "Anywhere in UK" ? 700 : 400, background: city === "Anywhere in UK" ? "#F0F5FF" : "transparent", borderBottom: "1px solid rgba(232,238,255,0.4)" }} onMouseEnter={e => e.currentTarget.style.background = city === "Anywhere in UK" ? "#E8F0FF" : "#F8FAFF"} onMouseLeave={e => e.currentTarget.style.background = city === "Anywhere in UK" ? "#F0F5FF" : "transparent"}>
                      {city === "Anywhere in UK" ? "*  " : ""}{city}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 1, height: 32, background: "#E8EEFF", flexShrink: 0 }} />
            <button onClick={() => setShowFilters(f => !f)} style={{ background: "none", border: "none", color: showFilters ? "#0057FF" : "#4B5675", padding: "0 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, height: 44, whiteSpace: "nowrap" }}>
              Filters {activeCount > 0 && <span style={{ background: "#0057FF", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>}
            </button>
            <button onClick={() => { doSearch(q, loc); setShowQ(false); setShowL(false) }} disabled={loading} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: "0 0 14px 0", padding: mob ? "12px 14px" : "12px 22px", fontSize: mob ? 13 : 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", height: 44, whiteSpace: "nowrap" }}>Search</button>
          </div>
        </div>

        {/* Quick role pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {QUICK_ROLES.map(role => (
            <button key={role} onClick={() => { const v = role === "All Jobs" ? "" : role; setQ(v); doSearch(v, loc) }} style={pillStyle((role === "All Jobs" && !q) || q === role)}>{role}</button>
          ))}
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
          {[
            { label: "Fresher friendly only", val: fresherOnly,  set: () => setFresherOnly(v => !v),  color: "#FF6B35" },
            { label: "Verified sponsors only", val: verifiedOnly, set: () => setVerifiedOnly(v => !v), color: "#00D68F" },
            { label: "Hide suspicious / scam", val: hideScams,    set: () => setHideScams(v => !v),    color: "#DC2626" },
          ].map(t => (
            <div key={t.label} onClick={t.set} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: t.val ? t.color : "#E8EEFF", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: t.val ? 15 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 12, color: t.val ? t.color : "#4B5675", fontWeight: 600 }}>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div style={{ background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 14, padding: mob ? "14px" : "18px 22px", marginBottom: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Contract Type</div>
                <div style={{ display: "flex", gap: 6 }}>{["Full-time","Part-time","Contract"].map(v => <button key={v} onClick={() => setFilter("jobType", v)} style={filterPillStyle(filters.jobType === v)}>{v}</button>)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Sort By</div>
                <div style={{ display: "flex", gap: 6 }}>{["Score","Date","Salary"].map(v => <button key={v} onClick={() => setFilter("sortBy", v)} style={filterPillStyle(filters.sortBy === v)}>{v}</button>)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Source</div>
                <div style={{ display: "flex", gap: 6 }}>{["Reed","Adzuna"].map(v => <button key={v} onClick={() => setFilter("source", v)} style={filterPillStyle(filters.source === v)}>{v}</button>)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#9CA3B8", whiteSpace: "nowrap" }}>Salary GBP </span>
              <input value={filters.salaryMin} onChange={e => setFilter("salaryMin", e.target.value)} placeholder="Min e.g. 25000" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              <span style={{ color: "#9CA3B8", fontSize: 12 }}>to</span>
              <input value={filters.salaryMax} onChange={e => setFilter("salaryMax", e.target.value)} placeholder="Max e.g. 80000" type="number" style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              {activeCount > 0 && <button onClick={() => setFilters({ salaryMin: "", salaryMax: "", jobType: "", source: "", sortBy: "Score" })} style={{ background: "none", border: "none", color: "#4B5675", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>Clear all</button>}
            </div>
          </div>
        )}

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#DC2626", fontSize: 13 }}>{error}</div>}

        {/* Stats */}
        {allJobs.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
            {[
              { label: "Results",          value: stats.total,    color: "#0057FF" },
              { label: "Gov Verified",     value: stats.verified, color: "#00D68F" },
              { label: "Fresher Friendly", value: stats.fresher,  color: "#FF6B35" },
              { label: "Flagged",          value: stats.scam,     color: "#DC2626" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", border: `1px solid ${s.color}20`, borderRadius: 10, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: mob ? 16 : 18, fontWeight: 900, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 10, color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.label}</span>
              </div>
            ))}
            <div style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3B8", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              Page {safeDisplay} of {totalPages}
              {loading && <span style={{ color: "#0057FF" }}>Loading more...</span>}
            </div>
          </div>
        )}

        {/* Skeletons */}
        {loading && allJobs.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1px solid #E8EEFF", opacity: 1 - i * 0.15 }}>
                <div style={{ height: 14, background: "#F0F0F0", borderRadius: 4, width: `${55 + i * 8}%`, marginBottom: 10 }} />
                <div style={{ height: 11, background: "#F0F0F0", borderRadius: 4, width: "35%" }} />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {pageJobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: mob ? 10 : 12 }}>
            {pageJobs.map(job => <JobCard key={job.id} job={job} onSave={handleSave} saved={savedJobs.has(job.id)} navigate={navigate} mob={mob} />)}
          </div>
        )}

        <Pagination currentPage={safeDisplay} totalPages={totalPages} onPage={handlePage} />

        {searched && displayJobs.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "48px 20px", background: "#fff", borderRadius: 20, border: "1px solid #E8EEFF" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>?</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>No results found</div>
            <div style={{ fontSize: 13, color: "#4B5675", marginBottom: 16 }}>Try a broader search or remove filters</div>
            <button onClick={() => { setQ(""); setLoc(""); setVerifiedOnly(false); setFresherOnly(false); setHideScams(false); doSearch("", "") }} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Show All Sponsored Jobs</button>
          </div>
        )}

      </div>
    </div>
  )
}
