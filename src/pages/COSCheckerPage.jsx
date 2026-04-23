import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Nav from "../components/Nav"
import { supabase } from "../lib/supabase"

const SOC_DATA = [
  { soc: "2136", title: "Programmers and software development professionals", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "01", color: "#0057FF", keywords: ["software engineer", "software developer", "programmer", "full stack", "backend", "frontend", "web developer", "react", "node", "python developer", "java developer"] },
  { soc: "2139", title: "IT and telecommunications professionals", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "02", color: "#0057FF", keywords: ["cyber security", "information security", "network engineer", "it manager", "systems architect", "cloud engineer", "devops", "site reliability", "platform engineer"] },
  { soc: "2137", title: "IT business analysts and systems designers", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "03", color: "#0057FF", keywords: ["business analyst", "systems analyst", "solutions architect", "it consultant", "data analyst", "data scientist", "data engineer", "machine learning", "ai engineer"] },
  { soc: "2425", title: "Actuaries, economists and statisticians", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "04", color: "#0057FF", keywords: ["actuary", "economist", "statistician", "quantitative analyst"] },
  { soc: "2421", title: "Chartered and certified accountants", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "05", color: "#0057FF", keywords: ["accountant", "auditor", "chartered accountant", "finance manager", "financial controller"] },
  { soc: "2422", title: "Management consultants and business analysts", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "06", color: "#0057FF", keywords: ["management consultant", "strategy consultant", "financial analyst", "investment analyst", "risk analyst"] },
  { soc: "2424", title: "Business and financial project management", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "07", color: "#0057FF", keywords: ["project manager", "programme manager", "product manager", "scrum master", "agile coach"] },
  { soc: "2121", title: "Civil engineers", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "08", color: "#0057FF", keywords: ["civil engineer", "structural engineer", "geotechnical engineer"] },
  { soc: "2122", title: "Mechanical engineers", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "09", color: "#0057FF", keywords: ["mechanical engineer", "aerospace engineer", "automotive engineer", "manufacturing engineer", "robotics engineer"] },
  { soc: "2123", title: "Electrical engineers", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "10", color: "#0057FF", keywords: ["electrical engineer", "electronics engineer", "power engineer"] },
  { soc: "2125", title: "Chemical engineers", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "11", color: "#0057FF", keywords: ["chemical engineer", "process engineer", "petroleum engineer"] },
  { soc: "2431", title: "Architects", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "12", color: "#0057FF", keywords: ["architect", "urban planner", "landscape architect"] },
  { soc: "2231", title: "Nurses", minSalary: 29000, newEntrant: 23200, route: "Health & Care Worker", eligible: true, icon: "13", color: "#00B86B", keywords: ["registered nurse", "staff nurse", "community nurse", "mental health nurse", "district nurse", "theatre nurse", "intensive care nurse", "icu nurse"] },
  { soc: "2232", title: "Midwives", minSalary: 29000, newEntrant: 23200, route: "Health & Care Worker", eligible: true, icon: "14", color: "#00B86B", keywords: ["midwife", "midwifery"] },
  { soc: "2211", title: "Medical practitioners", minSalary: 49923, newEntrant: 49923, route: "Health & Care Worker", eligible: true, icon: "15", color: "#00B86B", keywords: ["doctor", "physician", "surgeon", "consultant", "general practitioner", "gp ", "psychiatrist", "radiologist"] },
  { soc: "2213", title: "Pharmacists", minSalary: 29000, newEntrant: 23200, route: "Health & Care Worker", eligible: true, icon: "16", color: "#00B86B", keywords: ["pharmacist", "pharmacy manager", "clinical pharmacist"] },
  { soc: "2214", title: "Dental practitioners", minSalary: 29000, newEntrant: 23200, route: "Health & Care Worker", eligible: true, icon: "17", color: "#00B86B", keywords: ["dentist", "dental surgeon", "orthodontist"] },
  { soc: "2217", title: "Allied health professionals", minSalary: 29000, newEntrant: 23200, route: "Health & Care Worker", eligible: true, icon: "18", color: "#00B86B", keywords: ["physiotherapist", "occupational therapist", "radiographer", "speech therapist", "dietitian", "podiatrist", "optometrist"] },
  { soc: "3213", title: "Paramedics", minSalary: 29000, newEntrant: 23200, route: "Health & Care Worker", eligible: true, icon: "19", color: "#00B86B", keywords: ["paramedic", "emergency medical"] },
  { soc: "2442", title: "Social workers", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "20", color: "#0057FF", keywords: ["social worker", "probation officer", "youth worker"] },
  { soc: "2314", title: "Secondary education teaching professionals", minSalary: 33400, newEntrant: 25800, route: "Shortage Occupation", eligible: true, icon: "21", color: "#FF6B35", keywords: ["secondary teacher", "high school teacher", "secondary school teacher", "sixth form teacher"] },
  { soc: "2311", title: "Higher education teaching professionals", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "22", color: "#0057FF", keywords: ["lecturer", "professor", "university lecturer", "academic", "researcher"] },
  { soc: "2411", title: "Solicitors, lawyers, judges and coroners", minSalary: 41700, newEntrant: 33400, route: "Skilled Worker", eligible: true, icon: "23", color: "#0057FF", keywords: ["solicitor", "barrister", "lawyer", "legal counsel", "in-house counsel"] },
  { soc: "2312", title: "Primary and nursery education teaching professionals", minSalary: 33400, newEntrant: 25800, route: "Shortage Occupation", eligible: true, icon: "24", color: "#FF6B35", keywords: ["primary teacher", "primary school teacher", "nursery teacher", "early years teacher"] },
  { soc: "6126", title: "Teaching assistants and learning mentors", minSalary: null, newEntrant: null, route: "Not Eligible", eligible: false, icon: "x", color: "#E24B4A", keywords: ["teaching assistant", "learning support", "classroom assistant", "ta "] },
  { soc: "5434", title: "Chefs", minSalary: null, newEntrant: null, route: "Not Eligible (removed 2024)", eligible: false, icon: "x", color: "#E24B4A", keywords: ["chef", "sous chef", "head chef", "kitchen", "cook "] },
  { soc: "9272", title: "Bar staff, waiters and related roles", minSalary: null, newEntrant: null, route: "Not Eligible", eligible: false, icon: "x", color: "#E24B4A", keywords: ["waiter", "waitress", "barista", "bar staff"] },
  { soc: "9132", title: "Cleaners and domestics", minSalary: null, newEntrant: null, route: "Not Eligible", eligible: false, icon: "x", color: "#E24B4A", keywords: ["cleaner", "housekeeper", "domestic", "cleaning operative"] },
  { soc: "8211", title: "Drivers and transport operatives", minSalary: null, newEntrant: null, route: "Not Eligible", eligible: false, icon: "x", color: "#E24B4A", keywords: ["delivery driver", "van driver", "lorry driver", "hgv driver"] },
  { soc: "7111", title: "Retail sales and related roles", minSalary: null, newEntrant: null, route: "Not Eligible", eligible: false, icon: "x", color: "#E24B4A", keywords: ["retail assistant", "shop assistant", "sales assistant", "store assistant"] },
  { soc: "6141", title: "Care assistants (social care route closed July 2025)", minSalary: null, newEntrant: null, route: "Not Eligible", eligible: false, icon: "x", color: "#E24B4A", keywords: ["care assistant", "care worker", "support worker", "healthcare assistant", "carer"] },
  { soc: "9241", title: "Security guards", minSalary: null, newEntrant: null, route: "Not Eligible", eligible: false, icon: "x", color: "#E24B4A", keywords: ["security guard", "security officer", "door supervisor"] },
  { soc: "8149", title: "Warehouse operatives", minSalary: null, newEntrant: null, route: "Not Eligible", eligible: false, icon: "x", color: "#E24B4A", keywords: ["warehouse operative", "warehouse assistant", "picker packer"] },
]

function findSOC(query) {
  const q = query.toLowerCase().trim()
  if (!q || q.length < 2) return []
  const results = []
  for (const soc of SOC_DATA) {
    let score = 0
    for (const kw of soc.keywords) {
      if (q === kw) { score += 10; break }
      if (q.includes(kw) || kw.includes(q)) { score += 5; break }
    }
    if (soc.title.toLowerCase().includes(q)) score += 3
    if (score > 0) results.push({ ...soc, matchScore: score })
  }
  return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 4)
}

const QUICK_SEARCHES = [
  "Software Engineer", "Registered Nurse", "Data Scientist",
  "Civil Engineer", "Pharmacist", "Social Worker", "Doctor", "Teacher",
]

const COS_STEPS = [
  { num: "01", title: "Employer checks eligibility", desc: "Employer must hold a Skilled Worker sponsor licence and confirm the role meets the SOC code and salary requirements." },
  { num: "02", title: "Employer assigns a CoS", desc: "Employer assigns a Certificate of Sponsorship via the Home Office Sponsorship Management System. You get a unique reference number." },
  { num: "03", title: "You apply for a visa", desc: "Use the CoS reference number to apply for your Skilled Worker visa within 3 months of it being assigned." },
  { num: "04", title: "Home Office decision", desc: "Standard decisions take 3 weeks. Priority service (5 days) and super-priority (next day) are available at extra cost." },
]

export default function COSCheckerPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [employer, setEmployer] = useState("")
  const [sponsorResult, setSponsorResult] = useState(null)
  const [sponsorLoading, setSponsorLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const [selectedResult, setSelectedResult] = useState(null)
  const [animIn, setAnimIn] = useState(false)
  const [typingTimer, setTypingTimer] = useState(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    setTimeout(() => setAnimIn(true), 80)
  }, [])

  const handleSearch = (q) => {
    const val = q !== undefined ? q : query
    if (!val.trim()) return
    setQuery(val)
    const found = findSOC(val)
    setResults(found)
    setChecked(true)
    setSelectedResult(found.length === 1 ? found[0] : null)
  }

  const handleType = (val) => {
    setQuery(val)
    if (typingTimer) clearTimeout(typingTimer)
    if (val.length >= 3) {
      setTypingTimer(setTimeout(() => handleSearch(val), 400))
    } else {
      setResults([]); setChecked(false); setSelectedResult(null)
    }
  }

  const checkEmployer = async () => {
    if (!employer.trim()) return
    setSponsorLoading(true); setSponsorResult(null)
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

  const routeColor = { "Skilled Worker": "#0057FF", "Health & Care Worker": "#00B86B", "Shortage Occupation": "#FF6B35", "Not Eligible": "#E24B4A" }
  const routeBg = { "Skilled Worker": "#E6F1FB", "Health & Care Worker": "#E8F8F0", "Shortage Occupation": "#FFF0EB", "Not Eligible": "#FEF2F2" }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
        .fade-up { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .scale-in { animation: scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        .slide-down { animation: slideDown 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .result-card { transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1); cursor: pointer; }
        .result-card:hover { transform: translateY(-3px) scale(1.01); }
        .quick-pill { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); cursor: pointer; }
        .quick-pill:hover { transform: translateY(-2px) scale(1.04); }
        .check-btn { transition: all 0.2s; }
        .check-btn:hover { transform: translateY(-2px); filter: brightness(1.08); }
        .check-btn:active { transform: scale(0.97); }
        .step-card { transition: all 0.3s; }
        .step-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,87,255,0.08); }
        .emp-badge { transition: all 0.2s; }
        .emp-badge:hover { transform: scale(1.02); }
      `}</style>

      <Nav />

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "96px 5% 80px" }}>

        {/* Hero */}
        <div className={animIn ? "fade-up" : ""} style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0057FF12", borderRadius: 20, padding: "6px 16px", marginBottom: 20 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0057FF", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0057FF", letterSpacing: 0.6 }}>UK Home Office  2025 rules</span>
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, color: "#0A0F1E", letterSpacing: -2, lineHeight: 1.05, marginBottom: 16 }}>
            COS Checker
          </h1>
          <p style={{ fontSize: 17, color: "#666", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
            Find out instantly if your job title can be sponsored, which visa route applies, and exactly what salary you need.
          </p>
        </div>

        {/* Main search */}
        <div className={animIn ? "fade-up" : ""} style={{ animationDelay: "0.1s", background: "#fff", borderRadius: 24, border: "1.5px solid #E8EEFF", padding: "32px", marginBottom: 24, boxShadow: "0 8px 40px rgba(0,87,255,0.08)" }}>

          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
            Job title or keyword
          </label>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input ref={inputRef} value={query}
                onChange={e => handleType(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="e.g. Software Engineer, Registered Nurse, Data Scientist..."
                style={{ width: "100%", border: "2px solid " + (checked && results.length > 0 ? (results[0].eligible ? "#0057FF" : "#E24B4A") : "#E8EEFF"), borderRadius: 14, padding: "16px 20px", fontSize: 16, color: "#0A0F1E", fontFamily: "inherit", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box", background: "#F8FAFF" }}
                onFocus={e => { e.target.style.borderColor = "#0057FF"; e.target.style.boxShadow = "0 0 0 4px #0057FF15" }}
                onBlur={e => { e.target.style.borderColor = checked && results.length > 0 ? (results[0].eligible ? "#0057FF" : "#E24B4A") : "#E8EEFF"; e.target.style.boxShadow = "none" }}
              />
            </div>
            <button className="check-btn" onClick={() => handleSearch()}
              style={{ background: "#0057FF", color: "#fff", border: "none", borderRadius: 14, padding: "16px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
              Check
            </button>
          </div>

          {/* Quick search pills */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#aaa", marginBottom: 10, letterSpacing: 0.5 }}>POPULAR SEARCHES</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {QUICK_SEARCHES.map(r => (
                <button key={r} className="quick-pill"
                  onClick={() => handleSearch(r)}
                  style={{ background: query === r ? "#0057FF" : "#F0F4FF", color: query === r ? "#fff" : "#0057FF", border: "none", borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {checked && results.length > 0 && (
          <div className="slide-down" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: 0.8, marginBottom: 14, textTransform: "uppercase" }}>
              {results.length} result{results.length > 1 ? "s" : ""} found
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map((r, i) => (
                <div key={r.soc} className="result-card scale-in"
                  style={{ animationDelay: (i * 0.07) + "s", background: "#fff", borderRadius: 20, border: "2px solid " + (selectedResult && selectedResult.soc === r.soc ? r.color : "#E8EEFF"), padding: "22px 24px", boxShadow: selectedResult && selectedResult.soc === r.soc ? "0 8px 32px " + r.color + "20" : "0 2px 12px rgba(0,0,0,0.04)" }}
                  onClick={() => setSelectedResult(selectedResult && selectedResult.soc === r.soc ? null : r)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ background: r.eligible ? routeBg[r.route] : "#FEF2F2", borderRadius: 8, padding: "4px 10px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: r.eligible ? routeColor[r.route] : "#E24B4A" }}>SOC {r.soc}</span>
                        </div>
                        <div style={{ background: r.eligible ? routeBg[r.route] : "#FEF2F2", borderRadius: 8, padding: "4px 10px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: r.eligible ? routeColor[r.route] : "#E24B4A" }}>{r.route}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#0A0F1E", marginBottom: 6, letterSpacing: -0.3 }}>{r.title}</div>
                      {r.eligible ? (
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, marginBottom: 2 }}>STANDARD MIN SALARY</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: routeColor[r.route] }}>GBP {r.minSalary.toLocaleString()}</div>
                          </div>
                          {r.newEntrant && r.newEntrant < r.minSalary && (
                            <div>
                              <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, marginBottom: 2 }}>NEW ENTRANT RATE</div>
                              <div style={{ fontSize: 16, fontWeight: 900, color: "#FF6B35" }}>GBP {r.newEntrant.toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "#E24B4A", fontWeight: 600 }}>This role cannot currently be sponsored for a UK visa</div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {r.eligible ? (
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: routeBg[r.route], display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 20 }}>&#10003;</span>
                        </div>
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 20 }}>&#10007;</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {selectedResult && selectedResult.soc === r.soc && (
                    <div className="slide-down" style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #F0F0F0" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
                        {r.eligible && [
                          { label: "Visa route", val: r.route },
                          { label: "SOC code 2020", val: r.soc },
                          { label: "Standard minimum", val: "GBP " + r.minSalary.toLocaleString() + "/yr" },
                          { label: "New entrant rate", val: r.newEntrant ? "GBP " + r.newEntrant.toLocaleString() + "/yr" : "N/A" },
                        ].map(item => (
                          <div key={item.label} style={{ background: "#F8FAFF", borderRadius: 12, padding: "14px 16px" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#0A0F1E" }}>{item.val}</div>
                          </div>
                        ))}
                      </div>
                      {r.eligible && (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button className="check-btn" onClick={() => navigate("/jobs?q=" + encodeURIComponent(query))}
                            style={{ background: routeColor[r.route], color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                            Find {query} jobs
                          </button>
                          <button className="check-btn" onClick={() => { setSelectedResult(null); setTimeout(() => document.getElementById("emp-check").scrollIntoView({ behavior: "smooth" }), 100) }}
                            style={{ background: "#F0F4FF", color: "#0057FF", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                            Check your employer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {checked && results.length === 0 && (
          <div className="slide-down" style={{ background: "#fff", borderRadius: 20, border: "2px solid #E8EEFF", padding: "32px", textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>&#128270;</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>No exact match found</div>
            <div style={{ fontSize: 14, color: "#888", lineHeight: 1.7, maxWidth: 440, margin: "0 auto 24px" }}>
              Try searching for the official job title. Common examples: Software Engineer, Registered Nurse, Data Scientist, Civil Engineer.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {QUICK_SEARCHES.map(r => (
                <button key={r} className="quick-pill"
                  onClick={() => handleSearch(r)}
                  style={{ background: "#F0F4FF", color: "#0057FF", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Employer check */}
        <div id="emp-check" className={animIn ? "fade-up" : ""} style={{ animationDelay: "0.2s", background: "#fff", borderRadius: 24, border: "1.5px solid #E8EEFF", padding: "32px", marginBottom: 24, boxShadow: "0 4px 24px rgba(0,87,255,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#EAF3DE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>&#127959;</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#0A0F1E", marginBottom: 2 }}>Verify your employer</div>
              <div style={{ fontSize: 13, color: "#888" }}>Check if they hold a UK Home Office sponsor licence (125,284 verified)</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={employer} onChange={e => setEmployer(e.target.value)}
              onKeyDown={e => e.key === "Enter" && checkEmployer()}
              placeholder="e.g. NHS England, Amazon UK, Barclays Bank..."
              style={{ flex: 1, border: "2px solid #E8EEFF", borderRadius: 12, padding: "14px 18px", fontSize: 15, color: "#0A0F1E", fontFamily: "inherit", outline: "none", background: "#F8FAFF", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = "#00B86B"}
              onBlur={e => e.target.style.borderColor = "#E8EEFF"}
            />
            <button className="check-btn" onClick={checkEmployer} disabled={sponsorLoading}
              style={{ background: "#00B86B", color: "#fff", border: "none", borderRadius: 12, padding: "14px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {sponsorLoading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Checking...
                </span>
              ) : "Verify"}
            </button>
          </div>

          {sponsorResult && (
            <div className="slide-down" style={{ marginTop: 16 }}>
              {sponsorResult.found ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00B86B" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#00B86B" }}>Found on UK Home Office register</span>
                  </div>
                  {sponsorResult.matches.map((m, i) => (
                    <div key={i} className="emp-badge" style={{ background: "#EAF3DE", borderRadius: 14, padding: "16px 18px", marginBottom: 8, border: "1px solid #00B86B30" }}>
                      <div style={{ fontWeight: 800, color: "#0A0F1E", fontSize: 15, marginBottom: 8 }}>{m.organisation_name}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {m.town && <span style={{ background: "#fff", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#555", fontWeight: 500 }}>{m.town}{m.county ? ", " + m.county : ""}</span>}
                        {m.route && <span style={{ background: "#0057FF15", color: "#0057FF", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{m.route.split(":")[0]}</span>}
                        {m.rating && <span style={{ background: m.rating === "A" ? "#00B86B20" : "#FF6B3520", color: m.rating === "A" ? "#00B86B" : "#FF6B35", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 800 }}>{m.rating}-Rated</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: "#FEF2F2", borderRadius: 14, padding: "18px 20px", border: "1px solid #E24B4A30" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E24B4A" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#E24B4A" }}>Not found on sponsor register</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>
                    This employer does not appear on the UK Home Office register. They cannot legally issue a Certificate of Sponsorship. Try a slightly different spelling, or check directly at gov.uk.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* How CoS works */}
        <div className={animIn ? "fade-up" : ""} style={{ animationDelay: "0.3s", marginBottom: 24 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0A0F1E", letterSpacing: -0.8, marginBottom: 8 }}>How the CoS process works</h2>
            <p style={{ fontSize: 14, color: "#888" }}>Four steps from job offer to visa approval</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
            {COS_STEPS.map((s, i) => (
              <div key={s.num} className="step-card" style={{ background: "#fff", borderRadius: 20, padding: "24px 20px", border: "1.5px solid #E8EEFF", position: "relative" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#0057FF", opacity: 0.12, letterSpacing: -2, marginBottom: 12, lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0A0F1E", marginBottom: 10, lineHeight: 1.3 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#888", lineHeight: 1.7 }}>{s.desc}</div>
                {i < COS_STEPS.length - 1 && (
                  <div style={{ position: "absolute", top: "50%", right: -12, width: 24, height: 24, borderRadius: "50%", background: "#E8EEFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#0057FF", fontWeight: 700, zIndex: 1 }}>
                    &#8594;
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Salary threshold reference */}
        <div className={animIn ? "fade-up" : ""} style={{ animationDelay: "0.4s", background: "#0A0F1E", borderRadius: 24, padding: "32px", marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 20 }}>2025 salary thresholds at a glance</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            {[
              { route: "Skilled Worker", min: "GBP 41,700", ne: "GBP 33,400", color: "#0057FF" },
              { route: "Health & Care", min: "GBP 29,000", ne: "GBP 23,200", color: "#00B86B" },
              { route: "Shortage Occupation", min: "GBP 33,400", ne: "GBP 25,800", color: "#FF6B35" },
              { route: "Medical Practitioners", min: "GBP 49,923", ne: "GBP 49,923", color: "#534AB7" },
            ].map(t => (
              <div key={t.route} style={{ background: "#161B2E", borderRadius: 14, padding: "18px 16px", border: "1px solid #1E2640" }}>
                <div style={{ width: 3, height: 28, borderRadius: 2, background: t.color, marginBottom: 12 }} />
                <div style={{ fontSize: 11, color: "#666", marginBottom: 4, fontWeight: 600 }}>{t.route}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: t.color, marginBottom: 4, letterSpacing: -0.5 }}>{t.min}</div>
                <div style={{ fontSize: 11, color: "#555" }}>New entrant: {t.ne}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: "#444", lineHeight: 1.7 }}>
            Thresholds effective from 22 July 2025. Always verify at official gov.uk guidance. New entrant rate applies to recent graduates and those with less than 3 years post-qualification experience.
          </div>
        </div>

        {/* Final CTA */}
        <div className={animIn ? "fade-up" : ""} style={{ animationDelay: "0.5s", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>Ready to find sponsored jobs for eligible roles?</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="check-btn" onClick={() => navigate("/jobs" + (results.length > 0 && results[0].eligible ? "?q=" + encodeURIComponent(query) : ""))}
              style={{ background: "#0057FF", color: "#fff", border: "none", borderRadius: 14, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Find sponsored jobs
            </button>
            <button className="check-btn" onClick={() => navigate("/visa-checker")}
              style={{ background: "#fff", color: "#0057FF", border: "2px solid #0057FF", borderRadius: 14, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Check visa eligibility
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
