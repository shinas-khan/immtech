import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Nav from "../components/Nav"
import { NATIONALITIES, ALL_JOBS } from "../lib/constants"

function useW() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn) }, [])
  return w
}

const SOC_DATA = {
  "Software Engineer": { code: "2136", minSalary: 34200, goingRate: 38700 },
  "Data Scientist": { code: "2425", minSalary: 34200, goingRate: 38700 },
  "Data Analyst": { code: "2425", minSalary: 30700, goingRate: 34500 },
  "Data Engineer": { code: "2136", minSalary: 34200, goingRate: 40000 },
  "Machine Learning Engineer": { code: "2136", minSalary: 34200, goingRate: 45000 },
  "AI Engineer": { code: "2136", minSalary: 34200, goingRate: 45000 },
  "Cyber Security Analyst": { code: "2139", minSalary: 34200, goingRate: 40000 },
  "Cyber Security Engineer": { code: "2139", minSalary: 34200, goingRate: 42000 },
  "Network Engineer": { code: "2133", minSalary: 34200, goingRate: 38000 },
  "DevOps Engineer": { code: "2136", minSalary: 34200, goingRate: 42000 },
  "Cloud Engineer": { code: "2136", minSalary: 34200, goingRate: 42000 },
  "Frontend Developer": { code: "2136", minSalary: 30700, goingRate: 36000 },
  "Full Stack Developer": { code: "2136", minSalary: 34200, goingRate: 40000 },
  "Backend Developer": { code: "2136", minSalary: 34200, goingRate: 40000 },
  "Product Manager": { code: "2424", minSalary: 34200, goingRate: 50000 },
  "Project Manager": { code: "2424", minSalary: 34200, goingRate: 45000 },
  "IT Project Manager": { code: "2424", minSalary: 34200, goingRate: 48000 },
  "Registered Nurse": { code: "2231", minSalary: 29000, goingRate: 35000, health: true },
  "Mental Health Nurse": { code: "2231", minSalary: 29000, goingRate: 36000, health: true },
  "General Practitioner": { code: "2211", minSalary: 43000, goingRate: 65000, health: true },
  "NHS Doctor": { code: "2211", minSalary: 43000, goingRate: 55000, health: true },
  "Pharmacist": { code: "2213", minSalary: 29000, goingRate: 42000, health: true },
  "Physiotherapist": { code: "2217", minSalary: 29000, goingRate: 35000, health: true },
  "Radiographer": { code: "2217", minSalary: 29000, goingRate: 35000, health: true },
  "Surgeon": { code: "2212", minSalary: 53000, goingRate: 90000, health: true },
  "Dentist": { code: "2214", minSalary: 41500, goingRate: 55000, health: true },
  "Paramedic": { code: "3213", minSalary: 29000, goingRate: 35000, health: true },
  "Midwife": { code: "2231", minSalary: 29000, goingRate: 36000, health: true },
  "Occupational Therapist": { code: "2217", minSalary: 29000, goingRate: 35000, health: true },
  "Speech Therapist": { code: "2217", minSalary: 29000, goingRate: 35000, health: true },
  "Civil Engineer": { code: "2121", minSalary: 31900, goingRate: 38000 },
  "Mechanical Engineer": { code: "2122", minSalary: 30200, goingRate: 36000 },
  "Electrical Engineer": { code: "2123", minSalary: 30200, goingRate: 36000 },
  "Structural Engineer": { code: "2121", minSalary: 31900, goingRate: 40000 },
  "Chemical Engineer": { code: "2125", minSalary: 30200, goingRate: 38000 },
  "Accountant": { code: "2421", minSalary: 28500, goingRate: 38000 },
  "Financial Analyst": { code: "2422", minSalary: 28500, goingRate: 42000 },
  "Architect": { code: "2431", minSalary: 31900, goingRate: 40000 },
  "Quantity Surveyor": { code: "2432", minSalary: 31900, goingRate: 40000 },
  "Teacher": { code: "2314", minSalary: 30000, goingRate: 36000 },
  "University Lecturer": { code: "2311", minSalary: 34200, goingRate: 45000 },
  "Social Worker": { code: "2442", minSalary: 28000, goingRate: 34000 },
  "Solicitor": { code: "2411", minSalary: 34200, goingRate: 50000 },
  "Research Scientist": { code: "2111", minSalary: 34200, goingRate: 42000 },
}
const DEFAULT_SOC = { code: "varies", minSalary: 26200, goingRate: 34000 }

// Jobs recommended based on visa eligibility results
const ROLE_RELATED_JOBS = {
  health: ["Registered Nurse", "Pharmacist", "Physiotherapist", "Radiographer", "General Practitioner", "Paramedic", "Midwife", "Occupational Therapist", "Dentist"],
  tech: ["Software Engineer", "Data Analyst", "Data Scientist", "DevOps Engineer", "Cyber Security Analyst", "Cloud Engineer", "Machine Learning Engineer", "Full Stack Developer"],
  engineering: ["Civil Engineer", "Mechanical Engineer", "Electrical Engineer", "Structural Engineer", "Chemical Engineer"],
  finance: ["Accountant", "Financial Analyst", "Data Analyst", "Business Analyst", "Solicitor"],
  general: ["Software Engineer", "Registered Nurse", "Data Analyst", "Civil Engineer", "Accountant", "Pharmacist"],
}

export default function VisaCheckerPage() {
  const navigate = useNavigate()
  const w = useW()
  const mob = w < 768
  const [form, setForm] = useState({ nationality: "", occupation: "", salary: "", english: "", experience: "", education: "", hasJobOffer: "" })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const pill = (active, color = "#0057FF") => ({ padding: mob ? "11px 16px" : "10px 18px", borderRadius: 100, fontSize: mob ? 14 : 14, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? color : "#E8EEFF"}`, background: active ? `${color}0D` : "#F8FAFF", color: active ? color : "#4B5675", transition: "all 0.18s", fontFamily: "inherit", flex: 1 })
  const inp = { width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 12, padding: mob ? "14px" : "14px 16px", fontSize: mob ? 16 : 15, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" }
  const lbl = { display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }

  const checkEligibility = () => {
    if (!form.nationality || !form.occupation || !form.salary) return
    setLoading(true)
    setTimeout(() => {
      const sal = parseInt(form.salary)
      const socInfo = SOC_DATA[form.occupation] || DEFAULT_SOC
      const meetsMin = sal >= socInfo.minSalary
      const meetsGoingRate = sal >= socInfo.goingRate
      const isHealthRole = socInfo.health === true
      const isGlobalTalent = ["AI Engineer","Machine Learning Engineer","Data Scientist","Research Scientist","Neuroscientist"].includes(form.occupation)
      const hasUKDegree = form.education === "UK Degree"
      const paths = []

      if (meetsMin) {
        paths.push({ name: "Skilled Worker Visa", icon: "💼", color: "#0057FF", match: "eligible", processingTime: "3–8 weeks", duration: "Up to 5 years", note: meetsGoingRate ? "✓ Meets going rate — strong application" : `⚠️ Meets minimum but below going rate (£${socInfo.goingRate.toLocaleString()})` })
      } else {
        const gap = socInfo.minSalary - sal
        paths.push({ name: "Skilled Worker Visa", icon: "💼", color: "#0057FF", match: "gap", processingTime: "3–8 weeks", duration: "Up to 5 years", note: `Need £${gap.toLocaleString()} more/year. Minimum for ${form.occupation}: £${socInfo.minSalary.toLocaleString()}` })
      }
      if (isHealthRole && sal >= 29000) paths.push({ name: "Health & Care Worker Visa", icon: "🏥", color: "#00D68F", match: "eligible", processingTime: "2–3 weeks", duration: "Up to 5 years", note: "✓ Your role qualifies for this faster, cheaper route" })
      if (hasUKDegree) paths.push({ name: "Graduate Visa", icon: "🎓", color: "#FF6B35", match: "eligible", processingTime: "8 weeks", duration: "2–3 years", note: "✓ Your UK degree qualifies you — can switch to Skilled Worker later" })
      if (isGlobalTalent) paths.push({ name: "Global Talent Visa", icon: "🌟", color: "#7C3AED", match: "possible", processingTime: "3–8 weeks", duration: "Up to 5 years", note: "Your role may qualify — requires endorsement from Tech Nation" })

      let score = 0
      if (meetsMin) score += 40
      if (meetsGoingRate) score += 20
      if (form.english === "Fluent") score += 15
      else if (form.english === "Intermediate") score += 8
      if (["3-5","5-10","10+"].includes(form.experience)) score += 15
      if (form.hasJobOffer === "Yes") score += 10
      if (hasUKDegree) score += 10
      score = Math.min(99, score)

      // Determine related jobs to show
      let relatedJobs = ROLE_RELATED_JOBS.general
      if (isHealthRole) relatedJobs = ROLE_RELATED_JOBS.health
      else if (["Software Engineer","Data Scientist","Data Analyst","Machine Learning Engineer","AI Engineer","DevOps Engineer","Cloud Engineer","Cyber Security Analyst","Full Stack Developer","Backend Developer","Frontend Developer"].includes(form.occupation)) relatedJobs = ROLE_RELATED_JOBS.tech
      else if (["Civil Engineer","Mechanical Engineer","Electrical Engineer","Structural Engineer","Chemical Engineer"].includes(form.occupation)) relatedJobs = ROLE_RELATED_JOBS.engineering
      else if (["Accountant","Financial Analyst","Solicitor"].includes(form.occupation)) relatedJobs = ROLE_RELATED_JOBS.finance

      setResult({ score, paths, sal, socInfo, occupation: form.occupation, nationality: form.nationality, eligible: meetsMin, relatedJobs: relatedJobs.filter(j => j !== form.occupation).slice(0, 6) })
      setLoading(false)
    }, 1200)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: mob ? "86px 4% 40px" : "110px 6% 80px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: mob ? 28 : 48 }}>
          <div style={{ display: "inline-block", background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 100, padding: "7px 18px", color: "#0057FF", fontSize: mob ? 12 : 13, fontWeight: 700, marginBottom: 16 }}>🛂 UK Visa Eligibility Engine</div>
          <h1 style={{ fontSize: mob ? 26 : 52, fontWeight: 900, color: "#0A0F1E", margin: "0 0 14px", letterSpacing: -1.5, lineHeight: 1.1 }}>
            Know your chances<br /><span style={{ color: "#0057FF" }}>before you apply</span>
          </h1>
          <p style={{ color: "#4B5675", fontSize: mob ? 14 : 17, maxWidth: 500, margin: "0 auto", lineHeight: 1.8 }}>
            Based on official UK Home Office SOC code salary thresholds. Get matched with jobs you're eligible for.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: result && !mob ? "1fr 1fr" : "1fr", gap: mob ? 20 : 32, alignItems: "start", maxWidth: result ? "100%" : 600, margin: "0 auto" }}>

          {/* Form */}
          <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: mob ? "20px" : "36px 32px", boxShadow: "0 8px 40px rgba(0,57,255,0.06)" }}>
            <h2 style={{ fontSize: mob ? 18 : 20, fontWeight: 900, color: "#0A0F1E", margin: "0 0 4px" }}>Check Your Eligibility</h2>
            <p style={{ color: "#9CA3B8", fontSize: 13, margin: "0 0 24px" }}>Under 2 minutes · Based on 2024 UK immigration rules</p>

            <div style={{ display: "flex", flexDirection: "column", gap: mob ? 18 : 20 }}>
              <div>
                <label style={lbl}>Your Nationality *</label>
                <select value={form.nationality} onChange={e => set("nationality", e.target.value)} style={{ ...inp, cursor: "pointer" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"}>
                  <option value="">Select nationality...</option>
                  {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Job / Occupation *</label>
                <select value={form.occupation} onChange={e => set("occupation", e.target.value)} style={{ ...inp, cursor: "pointer" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"}>
                  <option value="">Select your occupation...</option>
                  {ALL_JOBS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
                {form.occupation && SOC_DATA[form.occupation] && (
                  <div style={{ marginTop: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#1D4ED8" }}>
                    SOC {SOC_DATA[form.occupation].code} · Min: £{SOC_DATA[form.occupation].minSalary.toLocaleString()} · Going rate: £{SOC_DATA[form.occupation].goingRate.toLocaleString()}
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Expected Salary (£/year) *</label>
                <input value={form.salary} onChange={e => set("salary", e.target.value)} placeholder="e.g. 35000" type="number" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              </div>
              <div>
                <label style={lbl}>Do you have a UK job offer?</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Yes","No","Not yet"].map(v => <button key={v} onClick={() => set("hasJobOffer", v)} style={pill(form.hasJobOffer === v)}>{v}</button>)}
                </div>
              </div>
              <div>
                <label style={lbl}>English Level</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Basic","Intermediate","Fluent"].map(l => <button key={l} onClick={() => set("english", l)} style={pill(form.english === l)}>{l}</button>)}
                </div>
              </div>
              <div>
                <label style={lbl}>Years of Experience</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["0-1","1-3","3-5","5-10","10+"].map(y => <button key={y} onClick={() => set("experience", y)} style={pill(form.experience === y)}>{y}yr</button>)}
                </div>
              </div>
              <div>
                <label style={lbl}>Education</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["High School","Bachelor's","Master's","PhD","UK Degree"].map(e => <button key={e} onClick={() => set("education", e)} style={pill(form.education === e)}>{e}</button>)}
                </div>
              </div>
              <button onClick={checkEligibility} disabled={loading || !form.nationality || !form.occupation || !form.salary} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 14, padding: mob ? "16px" : "16px", fontSize: mob ? 16 : 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 24px #0057FF35", opacity: loading || !form.nationality || !form.occupation || !form.salary ? 0.7 : 1 }}>
                {loading ? "⏳ Checking..." : "Check My Eligibility →"}
              </button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Score card */}
              <div style={{ background: result.eligible ? "linear-gradient(135deg, #0038CC, #0057FF)" : "linear-gradient(135deg, #DC2626, #FF6B35)", borderRadius: 20, padding: mob ? "24px 20px" : "28px 32px", display: "flex", gap: 20, alignItems: "center", flexDirection: mob ? "column" : "row", textAlign: mob ? "center" : "left" }}>
                <div style={{ flexShrink: 0, textAlign: "center" }}>
                  <div style={{ fontSize: mob ? 64 : 72, fontWeight: 900, color: "#fff", letterSpacing: -4, lineHeight: 1 }}>{result.score}%</div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 }}>Eligibility Score</div>
                </div>
                <div>
                  <div style={{ fontSize: mob ? 16 : 18, fontWeight: 900, color: "#fff", marginBottom: 6 }}>
                    {result.score >= 75 ? "✓ Strong Eligibility" : result.score >= 50 ? "⚠️ Moderate — Action Needed" : "✗ Significant Barriers"}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.6 }}>
                    {result.eligible ? "You meet the core requirements for at least one UK visa route" : "You currently don't meet the minimum salary threshold"}
                  </div>
                </div>
              </div>

              {/* Salary check */}
              <div style={{ background: "#fff", border: `1px solid ${result.sal >= result.socInfo.minSalary ? "#00D68F40" : "#FF6B3540"}`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Your Salary", val: `£${result.sal.toLocaleString()}`, color: "#0057FF" },
                    { label: "Min Required", val: `£${result.socInfo.minSalary.toLocaleString()}`, color: result.sal >= result.socInfo.minSalary ? "#00D68F" : "#DC2626" },
                    { label: "Going Rate", val: `£${result.socInfo.goingRate.toLocaleString()}`, color: result.sal >= result.socInfo.goingRate ? "#00D68F" : "#FF6B35" },
                    { label: "SOC Code", val: result.socInfo.code, color: "#7C3AED" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#F8FAFF", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: mob ? 16 : 18, fontWeight: 900, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: "#9CA3B8", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visa pathways */}
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0A0F1E" }}>Your Visa Pathways</div>
              {result.paths.map((path, i) => (
                <div key={i} style={{ background: "#fff", border: `1.5px solid ${path.match === "eligible" ? `${path.color}30` : path.match === "gap" ? "#FF6B3530" : "#E8EEFF"}`, borderRadius: 16, padding: mob ? "16px" : "18px 20px" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${path.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{path.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#0A0F1E" }}>{path.name}</div>
                        <span style={{ background: path.match === "eligible" ? `${path.color}15` : path.match === "gap" ? "#FF6B3515" : "#F8FAFF", color: path.match === "eligible" ? path.color : path.match === "gap" ? "#DC2626" : "#9CA3B8", borderRadius: 100, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                          {path.match === "eligible" ? "✓ Eligible" : path.match === "gap" ? "✗ Gap" : "◎ Possible"}
                        </span>
                      </div>
                      <div style={{ background: path.match === "gap" ? "#FFF7ED" : `${path.color}08`, border: `1px solid ${path.match === "gap" ? "#FED7AA" : `${path.color}20`}`, borderRadius: 7, padding: "7px 10px", fontSize: 12, color: path.match === "gap" ? "#C2410C" : path.color, marginBottom: 8 }}>{path.note}</div>
                      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#9CA3B8" }}>
                        <span>⏱ {path.processingTime}</span><span>📅 {path.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Related jobs section */}
              <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 16, padding: mob ? "18px" : "22px 24px" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0A0F1E", marginBottom: 6 }}>🎯 Sponsored Jobs You Can Apply For</div>
                <div style={{ color: "#4B5675", fontSize: 13, marginBottom: 14 }}>Based on your visa eligibility, these roles are available with sponsorship right now:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  {result.relatedJobs.map(role => (
                    <button key={role} onClick={() => navigate(`/jobs?q=${encodeURIComponent(role)}`)} style={{ background: "#F0F5FF", border: "1px solid #0057FF25", color: "#0057FF", borderRadius: 100, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#0057FF"; e.currentTarget.style.color = "#fff" }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#F0F5FF"; e.currentTarget.style.color = "#0057FF" }}
                    >{role} →</button>
                  ))}
                </div>
                <button onClick={() => navigate(`/jobs?q=${encodeURIComponent(result.occupation)}`)} style={{ width: "100%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Find {result.occupation} Jobs →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
