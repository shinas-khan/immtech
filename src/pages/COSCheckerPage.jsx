import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Nav from "../components/Nav"
import { supabase } from "../lib/supabase"

// Full SOC 2020 eligible occupations for Skilled Worker visa (July 2025 rules)
const SOC_DATA = [
  { soc: "2136", title: "Programmers and software development professionals", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["software engineer", "software developer", "programmer", "full stack", "backend", "frontend", "web developer"] },
  { soc: "2139", title: "Information technology and telecommunications professionals", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["cyber security", "information security", "network engineer", "it manager", "systems architect", "cloud engineer", "devops", "site reliability", "platform engineer"] },
  { soc: "2137", title: "IT business analysts, architects and systems designers", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["business analyst", "systems analyst", "solutions architect", "it consultant", "data analyst", "data scientist", "data engineer", "machine learning", "ai engineer"] },
  { soc: "2425", title: "Actuaries, economists and statisticians", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["actuary", "economist", "statistician", "quantitative analyst"] },
  { soc: "2421", title: "Chartered and certified accountants", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["accountant", "auditor", "chartered accountant", "finance manager", "financial controller"] },
  { soc: "2422", title: "Management consultants and business analysts", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["management consultant", "strategy consultant", "financial analyst", "investment analyst", "risk analyst"] },
  { soc: "2424", title: "Business and financial project management professionals", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["project manager", "programme manager", "product manager", "scrum master", "agile coach"] },
  { soc: "2121", title: "Civil engineers", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["civil engineer", "structural engineer", "geotechnical engineer"] },
  { soc: "2122", title: "Mechanical engineers", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["mechanical engineer", "aerospace engineer", "automotive engineer", "manufacturing engineer", "robotics engineer"] },
  { soc: "2123", title: "Electrical engineers", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["electrical engineer", "electronics engineer", "power engineer"] },
  { soc: "2125", title: "Chemical engineers", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["chemical engineer", "process engineer", "petroleum engineer"] },
  { soc: "2431", title: "Architects", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["architect", "urban planner", "landscape architect"] },
  { soc: "2231", title: "Nurses", minSalary: 29000, route: "Health & Care Worker", eligible: true, keywords: ["registered nurse", "staff nurse", "community nurse", "mental health nurse", "district nurse", "theatre nurse", "intensive care nurse"] },
  { soc: "2232", title: "Midwives", minSalary: 29000, route: "Health & Care Worker", eligible: true, keywords: ["midwife", "midwifery"] },
  { soc: "2211", title: "Medical practitioners", minSalary: 49923, route: "Health & Care Worker", eligible: true, keywords: ["doctor", "physician", "surgeon", "consultant", "general practitioner", "gp ", "psychiatrist", "radiologist"] },
  { soc: "2213", title: "Pharmacists", minSalary: 29000, route: "Health & Care Worker", eligible: true, keywords: ["pharmacist", "pharmacy manager", "clinical pharmacist"] },
  { soc: "2214", title: "Dental practitioners", minSalary: 29000, route: "Health & Care Worker", eligible: true, keywords: ["dentist", "dental surgeon", "orthodontist"] },
  { soc: "2217", title: "Allied health professionals", minSalary: 29000, route: "Health & Care Worker", eligible: true, keywords: ["physiotherapist", "occupational therapist", "radiographer", "speech therapist", "dietitian", "podiatrist", "optometrist"] },
  { soc: "3213", title: "Paramedics", minSalary: 29000, route: "Health & Care Worker", eligible: true, keywords: ["paramedic", "emergency medical"] },
  { soc: "2442", title: "Social workers", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["social worker", "probation officer", "youth worker"] },
  { soc: "2314", title: "Secondary education teaching professionals", minSalary: 33400, route: "Shortage Occupation", eligible: true, keywords: ["secondary teacher", "high school teacher", "secondary school teacher", "sixth form teacher"] },
  { soc: "2311", title: "Higher education teaching professionals", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["lecturer", "professor", "university lecturer", "academic", "researcher"] },
  { soc: "2411", title: "Solicitors, lawyers, judges and coroners", minSalary: 41700, route: "Skilled Worker", eligible: true, keywords: ["solicitor", "barrister", "lawyer", "legal counsel", "in-house counsel"] },
  { soc: "2312", title: "Primary and nursery education teaching professionals", minSalary: 33400, route: "Shortage Occupation", eligible: true, keywords: ["primary teacher", "primary school teacher", "nursery teacher", "early years teacher"] },
  // NOT ELIGIBLE
  { soc: "6126", title: "Teaching assistants and learning mentors", minSalary: null, route: "Not Eligible", eligible: false, keywords: ["teaching assistant", "learning support", "classroom assistant", "hlta", "ta "] },
  { soc: "5434", title: "Chefs", minSalary: null, route: "Not Eligible (removed 2024)", eligible: false, keywords: ["chef", "sous chef", "head chef", "kitchen", "cook "] },
  { soc: "9272", title: "Bar staff, waiters and related roles", minSalary: null, route: "Not Eligible", eligible: false, keywords: ["waiter", "waitress", "barista", "bar staff", "hospitality assistant"] },
  { soc: "9132", title: "Cleaners and domestics", minSalary: null, route: "Not Eligible", eligible: false, keywords: ["cleaner", "housekeeper", "domestic", "cleaning operative"] },
  { soc: "8211", title: "Drivers and transport operatives", minSalary: null, route: "Not Eligible", eligible: false, keywords: ["delivery driver", "van driver", "lorry driver", "hgv driver"] },
  { soc: "7111", title: "Retail sales and related roles", minSalary: null, route: "Not Eligible", eligible: false, keywords: ["retail assistant", "shop assistant", "sales assistant", "store assistant"] },
  { soc: "6141", title: "Healthcare and related personal services", minSalary: null, route: "Not Eligible (social care route closed July 2025)", eligible: false, keywords: ["care assistant", "care worker", "support worker", "healthcare assistant", "carer"] },
  { soc: "9241", title: "Security guards and related occupations", minSalary: null, route: "Not Eligible", eligible: false, keywords: ["security guard", "security officer", "door supervisor"] },
  { soc: "8149", title: "Warehouse operatives", minSalary: null, route: "Not Eligible", eligible: false, keywords: ["warehouse operative", "warehouse assistant", "packing operative", "picker packer"] },
]

function findSOC(query) {
  const q = query.toLowerCase().trim()
  if (!q) return []

  const results = []
  for (const soc of SOC_DATA) {
    let score = 0
    // Check keywords
    for (const kw of soc.keywords) {
      if (q.includes(kw) || kw.includes(q)) { score += kw === q ? 10 : 5; break }
    }
    // Check title
    if (soc.title.toLowerCase().includes(q)) score += 3
    if (score > 0) results.push({ ...soc, matchScore: score })
  }

  return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5)
}

export default function COSCheckerPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [employer, setEmployer] = useState("")
  const [sponsorResult, setSponsorResult] = useState(null)
  const [sponsorLoading, setSponsorLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const navigate = useNavigate()

  const handleSearch = () => {
    if (!query.trim()) return
    const found = findSOC(query)
    setResults(found)
    setChecked(true)
  }

  const checkEmployer = async () => {
    if (!employer.trim()) return
    setSponsorLoading(true)
    setSponsorResult(null)
    try {
      const clean = employer.replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co|corp)\.?$/gi, "").replace(/[^\w\s]/g, " ").trim()
      const { data: exact } = await supabase.from("sponsors").select("organisation_name, town, county, route, rating").ilike("organisation_name", employer).limit(3)
      if (exact && exact.length > 0) { setSponsorResult({ found: true, matches: exact }); setSponsorLoading(false); return }
      const { data: contains } = await supabase.from("sponsors").select("organisation_name, town, county, route, rating").ilike("organisation_name", "%" + clean + "%").limit(3)
      if (contains && contains.length > 0) { setSponsorResult({ found: true, matches: contains }); setSponsorLoading(false); return }
      setSponsorResult({ found: false })
    } catch { setSponsorResult({ found: false }) }
    setSponsorLoading(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "96px 5% 60px" }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#EEEDFE", borderRadius: 20, padding: "4px 12px", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#534AB7", textTransform: "uppercase", letterSpacing: 0.8 }}>COS / SOC Checker</span>
          </div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 8px", lineHeight: 1.2 }}>
            Is your role eligible for UK visa sponsorship?
          </h1>
          <p style={{ color: "#4B5675", fontSize: 15, margin: 0, lineHeight: 1.7 }}>
            Check if your job title qualifies under the Skilled Worker or Health and Care Worker visa route.
            Based on the official Home Office eligible occupations list (updated July 2025).
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #E8EEFF", padding: "24px", marginBottom: 24, boxShadow: "0 4px 24px rgba(0,57,255,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0A0F1E", marginBottom: 10 }}>
            Step 1: Check your job title
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="e.g. Software Engineer, Registered Nurse, Data Analyst..."
              style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#0A0F1E", fontFamily: "inherit", outline: "none", background: "#F8FAFF" }}
              onFocus={e => e.target.style.borderColor = "#0057FF"}
              onBlur={e => e.target.style.borderColor = "#E8EEFF"}
            />
            <button onClick={handleSearch}
              style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              Check Role
            </button>
          </div>
        </div>

        {checked && results.length === 0 && (
          <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#DC2626", marginBottom: 6 }}>Role not found in eligible occupations</div>
            <p style={{ color: "#4B5675", fontSize: 14, margin: 0, lineHeight: 1.7 }}>
              This job title does not appear on the Home Office eligible occupations list for the Skilled Worker visa.
              Try a different job title, or check the official list at gov.uk.
            </p>
          </div>
        )}

        {results.length > 0 && results.map((r, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1.5px solid " + (r.eligible ? "#00D68F40" : "#FECACA"), padding: "20px 24px", marginBottom: 16, boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ background: r.eligible ? "#EAF3DE" : "#FCEBEB", color: r.eligible ? "#3B6D11" : "#A32D2D", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                    {r.eligible ? "ELIGIBLE" : "NOT ELIGIBLE"}
                  </span>
                  <span style={{ background: "#EEEDFE", color: "#534AB7", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                    {r.route}
                  </span>
                  <span style={{ background: "#F8FAFF", color: "#4B5675", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, border: "1px solid #E8EEFF" }}>
                    SOC {r.soc}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", marginBottom: 4 }}>{r.title}</div>
              </div>
              {r.eligible && r.minSalary && (
                <div style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 10, padding: "10px 14px", textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Min. Salary</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#0057FF" }}>GBP {r.minSalary.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: "#9CA3B8" }}>per year</div>
                </div>
              )}
            </div>

            {r.eligible ? (
              <div style={{ background: "#EAF3DE", borderRadius: 10, padding: "12px 14px", marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#3B6D11", lineHeight: 1.7 }}>
                  This role is eligible for the {r.route} visa. The employer must be a licensed sponsor and pay at least
                  GBP {r.minSalary ? r.minSalary.toLocaleString() : "N/A"} per year (or the going rate for this SOC code, whichever is higher).
                  {r.route === "Shortage Occupation" && " This role is on the shortage occupation list - some salary discounts may apply."}
                  {r.route === "Health & Care Worker" && " Health & Care Worker visa has a lower salary threshold than the standard Skilled Worker route."}
                </div>
              </div>
            ) : (
              <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "12px 14px", marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#A32D2D", lineHeight: 1.7 }}>
                  This role is NOT on the eligible occupations list for the Skilled Worker visa.
                  {r.soc === "6145" && " The social care worker route was closed in July 2025."}
                  {r.soc === "5434" && " Chef roles were removed from the eligible list in 2024."}
                  {" "}Employers cannot legally issue a Certificate of Sponsorship (CoS) for this role type.
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #E8EEFF", padding: "24px", marginBottom: 24, boxShadow: "0 4px 24px rgba(0,57,255,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0A0F1E", marginBottom: 4 }}>
            Step 2: Verify the employer is a licensed sponsor
          </div>
          <div style={{ fontSize: 12, color: "#4B5675", marginBottom: 12 }}>
            Check if your employer is registered on the UK Home Office sponsor register (125,284 sponsors).
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={employer}
              onChange={e => setEmployer(e.target.value)}
              onKeyDown={e => e.key === "Enter" && checkEmployer()}
              placeholder="e.g. NHS England, Amazon UK, Barclays Bank..."
              style={{ flex: 1, border: "1.5px solid #E8EEFF", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#0A0F1E", fontFamily: "inherit", outline: "none", background: "#F8FAFF" }}
              onFocus={e => e.target.style.borderColor = "#0057FF"}
              onBlur={e => e.target.style.borderColor = "#E8EEFF"}
            />
            <button onClick={checkEmployer} disabled={sponsorLoading}
              style={{ background: "linear-gradient(135deg, #00D68F, #00A67E)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {sponsorLoading ? "Checking..." : "Verify Employer"}
            </button>
          </div>

          {sponsorResult && (
            <div style={{ marginTop: 16 }}>
              {sponsorResult.found ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#00D68F", marginBottom: 10 }}>
                    Employer found on UK Home Office register
                  </div>
                  {sponsorResult.matches.map((m, i) => (
                    <div key={i} style={{ background: "#EAF3DE", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, color: "#0A0F1E", fontSize: 14 }}>{m.organisation_name}</div>
                      <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                        {m.town && <span style={{ fontSize: 11, color: "#4B5675" }}>{m.town}{m.county ? ", " + m.county : ""}</span>}
                        {m.route && <span style={{ background: "#0057FF12", color: "#0057FF", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600 }}>{m.route.split(":")[0]}</span>}
                        {m.rating && <span style={{ background: m.rating === "A" ? "#EAF3DE" : "#FAEEDA", color: m.rating === "A" ? "#3B6D11" : "#854F0B", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 700 }}>{m.rating}-Rated</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", marginBottom: 4 }}>Employer not found on register</div>
                  <div style={{ fontSize: 12, color: "#4B5675", lineHeight: 1.7 }}>
                    This employer does not appear on the UK Home Office licensed sponsor register.
                    They cannot legally issue a Certificate of Sponsorship. Try a slightly different name or check directly at gov.uk.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #E8EEFF", padding: "24px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0A0F1E", marginBottom: 16 }}>How the Certificate of Sponsorship (CoS) works</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { step: "1", title: "Employer checks eligibility", desc: "Employer must hold a Skilled Worker sponsor licence and confirm the role meets the SOC code and salary requirements." },
              { step: "2", title: "Employer assigns a CoS", desc: "Employer assigns a Certificate of Sponsorship with a unique reference number via the Home Office Sponsorship Management System." },
              { step: "3", title: "You apply for a visa", desc: "You use the CoS reference number to apply for your Skilled Worker visa. You must apply within 3 months of the CoS being assigned." },
              { step: "4", title: "Home Office decision", desc: "Decisions typically take 3 weeks. Priority service (5 working days) and super-priority (next working day) are available for an additional fee." },
            ].map(s => (
              <div key={s.step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0057FF", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0A0F1E", marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "#4B5675", lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: "12px 14px", background: "#F8FAFF", borderRadius: 10, border: "1px solid #E8EEFF" }}>
            <div style={{ fontSize: 11, color: "#4B5675", lineHeight: 1.7 }}>
              Salary thresholds from 22 July 2025: Skilled Worker general = GBP 41,700/yr.
              Health and Care Worker = GBP 25,000/yr. Shortage occupations = GBP 33,400/yr.
              New entrants may qualify for a lower threshold. Always check the official gov.uk guidance.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#4B5675", marginBottom: 12 }}>Ready to find sponsored jobs for eligible roles?</div>
          <button onClick={() => {
            if (results.length > 0 && results[0].eligible) {
              navigate("/jobs?q=" + encodeURIComponent(query))
            } else {
              navigate("/jobs")
            }
          }} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Search Sponsored Jobs
          </button>
        </div>

      </div>
    </div>
  )
}
