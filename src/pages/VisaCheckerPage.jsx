import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Nav from "../components/Nav"
import { NATIONALITIES, ALL_JOBS } from "../lib/constants"

// Full SOC code salary thresholds from UK Home Office 2024
const SOC_DATA = {
  "Software Engineer": { code: "2136", minSalary: 34200, goingRate: 38700, title: "Programmers and software development professionals" },
  "Data Scientist": { code: "2425", minSalary: 34200, goingRate: 38700, title: "Data Scientists" },
  "Data Analyst": { code: "2425", minSalary: 30700, goingRate: 34500, title: "Data Analysts" },
  "Data Engineer": { code: "2136", minSalary: 34200, goingRate: 40000, title: "Data Engineers" },
  "Machine Learning Engineer": { code: "2136", minSalary: 34200, goingRate: 45000, title: "AI/ML Engineers" },
  "AI Engineer": { code: "2136", minSalary: 34200, goingRate: 45000, title: "AI Engineers" },
  "Cyber Security Analyst": { code: "2139", minSalary: 34200, goingRate: 40000, title: "IT security specialists" },
  "Cyber Security Engineer": { code: "2139", minSalary: 34200, goingRate: 42000, title: "IT security specialists" },
  "Network Engineer": { code: "2133", minSalary: 34200, goingRate: 38000, title: "IT network professionals" },
  "DevOps Engineer": { code: "2136", minSalary: 34200, goingRate: 42000, title: "DevOps Engineers" },
  "Cloud Engineer": { code: "2136", minSalary: 34200, goingRate: 42000, title: "Cloud Engineers" },
  "Frontend Developer": { code: "2136", minSalary: 30700, goingRate: 36000, title: "Web developers" },
  "Full Stack Developer": { code: "2136", minSalary: 34200, goingRate: 40000, title: "Full Stack Developers" },
  "Backend Developer": { code: "2136", minSalary: 34200, goingRate: 40000, title: "Backend Developers" },
  "Product Manager": { code: "2424", minSalary: 34200, goingRate: 50000, title: "Product Managers" },
  "Project Manager": { code: "2424", minSalary: 34200, goingRate: 45000, title: "Project Managers" },
  "IT Project Manager": { code: "2424", minSalary: 34200, goingRate: 48000, title: "IT Project Managers" },
  "Registered Nurse": { code: "2231", minSalary: 29000, goingRate: 35000, title: "Nurses", route: "Health & Care Worker Visa" },
  "Mental Health Nurse": { code: "2231", minSalary: 29000, goingRate: 36000, title: "Mental health nurses", route: "Health & Care Worker Visa" },
  "General Practitioner": { code: "2211", minSalary: 43000, goingRate: 65000, title: "Medical practitioners", route: "Health & Care Worker Visa" },
  "NHS Doctor": { code: "2211", minSalary: 43000, goingRate: 55000, title: "Medical practitioners", route: "Health & Care Worker Visa" },
  "Pharmacist": { code: "2213", minSalary: 29000, goingRate: 42000, title: "Pharmacists", route: "Health & Care Worker Visa" },
  "Physiotherapist": { code: "2217", minSalary: 29000, goingRate: 35000, title: "Physiotherapists", route: "Health & Care Worker Visa" },
  "Radiographer": { code: "2217", minSalary: 29000, goingRate: 35000, title: "Radiographers", route: "Health & Care Worker Visa" },
  "Surgeon": { code: "2212", minSalary: 53000, goingRate: 90000, title: "Surgeons", route: "Health & Care Worker Visa" },
  "Dentist": { code: "2214", minSalary: 41500, goingRate: 55000, title: "Dental practitioners", route: "Health & Care Worker Visa" },
  "Paramedic": { code: "3213", minSalary: 29000, goingRate: 35000, title: "Paramedics", route: "Health & Care Worker Visa" },
  "Civil Engineer": { code: "2121", minSalary: 31900, goingRate: 38000, title: "Civil engineers" },
  "Mechanical Engineer": { code: "2122", minSalary: 30200, goingRate: 36000, title: "Mechanical engineers" },
  "Electrical Engineer": { code: "2123", minSalary: 30200, goingRate: 36000, title: "Electrical engineers" },
  "Structural Engineer": { code: "2121", minSalary: 31900, goingRate: 40000, title: "Structural engineers" },
  "Chemical Engineer": { code: "2125", minSalary: 30200, goingRate: 38000, title: "Chemical engineers" },
  "Accountant": { code: "2421", minSalary: 28500, goingRate: 38000, title: "Accountants" },
  "Financial Analyst": { code: "2422", minSalary: 28500, goingRate: 42000, title: "Financial analysts" },
  "Architect": { code: "2431", minSalary: 31900, goingRate: 40000, title: "Architects" },
  "Quantity Surveyor": { code: "2432", minSalary: 31900, goingRate: 40000, title: "Quantity surveyors" },
  "Teacher": { code: "2314", minSalary: 30000, goingRate: 36000, title: "Secondary education teachers" },
  "University Lecturer": { code: "2311", minSalary: 34200, goingRate: 45000, title: "Higher education teachers" },
  "Social Worker": { code: "2442", minSalary: 28000, goingRate: 34000, title: "Social workers" },
  "Solicitor": { code: "2411", minSalary: 34200, goingRate: 50000, title: "Solicitors" },
  "Research Scientist": { code: "2111", minSalary: 34200, goingRate: 42000, title: "Research scientists" },
}

const DEFAULT_SOC = { code: "varies", minSalary: 26200, goingRate: 34000, title: "Skilled Worker" }

const VISA_ROUTES = [
  { name: "Skilled Worker Visa", icon: "💼", color: "#0057FF", minSalary: 26200, desc: "Main route for professionals with a job offer from a licensed UK sponsor.", processingTime: "3–8 weeks", duration: "Up to 5 years", points: ["Job offer from licensed sponsor", "Minimum salary threshold", "English language B1 level", "Certificate of Sponsorship"] },
  { name: "Health & Care Worker Visa", icon: "🏥", color: "#00D68F", minSalary: 29000, desc: "Faster and cheaper route for NHS and social care workers.", processingTime: "2–3 weeks", duration: "Up to 5 years", points: ["NHS or eligible care employer", "Eligible health or care role", "Reduced visa fees", "No NHS surcharge"] },
  { name: "Global Talent Visa", icon: "🌟", color: "#7C3AED", minSalary: 0, desc: "For exceptional talent in tech, research, arts and academia.", processingTime: "3–8 weeks", duration: "Up to 5 years", points: ["No job offer needed", "No salary threshold", "Endorsed by approved body", "Tech Nation, Royal Society etc"] },
  { name: "Graduate Visa", icon: "🎓", color: "#FF6B35", minSalary: 0, desc: "For international students who completed a UK degree.", processingTime: "8 weeks", duration: "2 years (3 for PhD)", points: ["Completed UK degree", "Currently on Student visa", "No job offer required", "Can switch to Skilled Worker"] },
  { name: "Scale-up Visa", icon: "🚀", color: "#FF3B7A", minSalary: 36300, desc: "For high-growth UK companies needing senior talent fast.", processingTime: "3–8 weeks", duration: "2 years", points: ["Endorsed scale-up employer", "Minimum £36,300 salary", "Senior or specialist role", "More flexibility than Skilled Worker"] },
]

const NATIONALITY_GROUPS = {
  "EU/EEA": ["French", "German", "Spanish", "Italian", "Dutch", "Portuguese", "Polish", "Romanian", "Belgian", "Greek", "Swedish", "Danish", "Finnish", "Austrian", "Czech", "Hungarian", "Bulgarian", "Croatian", "Slovak", "Slovenian", "Estonian", "Latvian", "Lithuanian", "Luxembourgish", "Maltese", "Cypriot", "Irish"],
  "Commonwealth": ["Indian", "Pakistani", "Bangladeshi", "Nigerian", "Ghanaian", "Kenyan", "South African", "Australian", "Canadian", "New Zealander", "Jamaican", "Sri Lankan", "Zimbabwean", "Zambian", "Ugandan", "Tanzanian", "Malawian"],
}

function getNationalityNote(nationality) {
  if (nationality === "British") return { type: "success", msg: "As a British citizen you have the right to work in the UK without any visa." }
  if (NATIONALITY_GROUPS["EU/EEA"].includes(nationality)) return { type: "info", msg: "As an EU/EEA national you need a visa to work in the UK post-Brexit unless you have settled/pre-settled status." }
  if (NATIONALITY_GROUPS["Commonwealth"].includes(nationality)) return { type: "info", msg: "Commonwealth nationals need a UK work visa. The Skilled Worker visa is the main route." }
  return { type: "info", msg: "You will need a UK work visa. The Skilled Worker visa is the most common route for international professionals." }
}

export default function VisaCheckerPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nationality: "", occupation: "", salary: "", english: "", experience: "", education: "", hasJobOffer: "" })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const pill = (active, color = "#0057FF") => ({ padding: "10px 18px", borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? color : "#E8EEFF"}`, background: active ? `${color}0D` : "#F8FAFF", color: active ? color : "#4B5675", transition: "all 0.18s", fontFamily: "inherit" })
  const inp = { width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 12, padding: "14px 16px", fontSize: 15, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" }

  const checkEligibility = () => {
    if (!form.nationality || !form.occupation || !form.salary) return
    setLoading(true)
    setTimeout(() => {
      const sal = parseInt(form.salary)
      const socInfo = SOC_DATA[form.occupation] || DEFAULT_SOC
      const meetsMin = sal >= socInfo.minSalary
      const meetsGoingRate = sal >= socInfo.goingRate
      const isHealthRole = socInfo.route === "Health & Care Worker Visa"
      const isGlobalTalent = ["AI Engineer", "Machine Learning Engineer", "Data Scientist", "Research Scientist", "Neuroscientist"].includes(form.occupation)
      const hasUKDegree = form.education === "UK Degree"

      const paths = []

      // Skilled Worker
      if (meetsMin) {
        paths.push({ ...VISA_ROUTES[0], match: "eligible", note: meetsGoingRate ? "✓ Meets going rate — strong application" : `⚠️ Meets minimum but below going rate (£${socInfo.goingRate.toLocaleString()}) — may need justification` })
      } else {
        const gap = socInfo.minSalary - sal
        paths.push({ ...VISA_ROUTES[0], match: "gap", note: `Need £${gap.toLocaleString()} more per year. Minimum for ${form.occupation}: £${socInfo.minSalary.toLocaleString()}` })
      }

      // Health & Care
      if (isHealthRole && sal >= 29000) paths.push({ ...VISA_ROUTES[1], match: "eligible", note: "✓ Your role qualifies for the faster Health & Care Worker route" })

      // Graduate
      if (hasUKDegree) paths.push({ ...VISA_ROUTES[3], match: "eligible", note: "✓ Your UK degree qualifies you — can later switch to Skilled Worker visa" })

      // Global Talent
      if (isGlobalTalent) paths.push({ ...VISA_ROUTES[2], match: "possible", note: "Your role may qualify — requires endorsement from Tech Nation or equivalent body" })

      // Scale-up
      if (sal >= 36300) paths.push({ ...VISA_ROUTES[4], match: "possible", note: "Your salary meets the threshold — employer must be a recognised scale-up" })

      // Calculate score
      let score = 0
      if (meetsMin) score += 40
      if (meetsGoingRate) score += 20
      if (form.english === "Fluent") score += 15
      else if (form.english === "Intermediate") score += 8
      if (["3-5", "5-10", "10+"].includes(form.experience)) score += 15
      if (form.hasJobOffer === "Yes") score += 10
      if (hasUKDegree) score += 10
      score = Math.min(99, score)

      setResult({ score, paths, sal, socInfo, occupation: form.occupation, nationality: form.nationality, eligible: meetsMin })
      setLoading(false)
    }, 1400)
  }

  const natNote = form.nationality ? getNationalityNote(form.nationality) : null

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "110px 6% 80px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-block", background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 100, padding: "8px 20px", color: "#0057FF", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>🛂 UK Visa Eligibility Engine</div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 18px", letterSpacing: -2, lineHeight: 1.1 }}>Know your UK visa chances<br /><span style={{ color: "#0057FF" }}>before you apply</span></h1>
          <p style={{ color: "#4B5675", fontSize: 17, maxWidth: 520, margin: "0 auto", lineHeight: 1.8 }}>Based on official UK Home Office SOC code salary thresholds and 2024 immigration rules.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1.1fr" : "1fr", gap: 28, alignItems: "start", maxWidth: result ? "100%" : 620, margin: "0 auto" }}>

          {/* Form */}
          <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 24, padding: "36px 32px", boxShadow: "0 8px 40px rgba(0,57,255,0.06)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0A0F1E", margin: "0 0 6px" }}>Check Your Eligibility</h2>
            <p style={{ color: "#9CA3B8", fontSize: 14, margin: "0 0 28px" }}>Takes under 2 minutes · Based on 2024 UK immigration rules</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Nationality *</label>
                <select value={form.nationality} onChange={e => set("nationality", e.target.value)} style={{ ...inp, cursor: "pointer" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"}>
                  <option value="">Select your nationality...</option>
                  {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                {natNote && <div style={{ marginTop: 8, background: natNote.type === "success" ? "#F0FDF4" : "#EFF6FF", border: `1px solid ${natNote.type === "success" ? "#BBF7D0" : "#BFDBFE"}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: natNote.type === "success" ? "#16A34A" : "#1D4ED8" }}>{natNote.msg}</div>}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Job / Occupation *</label>
                <select value={form.occupation} onChange={e => set("occupation", e.target.value)} style={{ ...inp, cursor: "pointer" }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"}>
                  <option value="">Select your occupation...</option>
                  {ALL_JOBS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
                {form.occupation && SOC_DATA[form.occupation] && (
                  <div style={{ marginTop: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#1D4ED8" }}>
                    <strong>SOC Code {SOC_DATA[form.occupation].code}</strong> · Min salary: £{SOC_DATA[form.occupation].minSalary.toLocaleString()} · Going rate: £{SOC_DATA[form.occupation].goingRate.toLocaleString()}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Expected Salary (£/year) *</label>
                <input value={form.salary} onChange={e => set("salary", e.target.value)} placeholder="e.g. 35000" type="number" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Do you have a UK job offer?</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Yes", "No", "Not yet"].map(v => <button key={v} onClick={() => set("hasJobOffer", v)} style={{ ...pill(form.hasJobOffer === v), flex: 1 }}>{v}</button>)}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>English Language Level</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Basic", "Intermediate", "Fluent"].map(l => <button key={l} onClick={() => set("english", l)} style={{ ...pill(form.english === l), flex: 1 }}>{l}</button>)}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Years of Experience</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["0-1", "1-3", "3-5", "5-10", "10+"].map(y => <button key={y} onClick={() => set("experience", y)} style={pill(form.experience === y)}>{y} yrs</button>)}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Highest Education</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["High School", "Bachelor's", "Master's", "PhD", "UK Degree"].map(e => <button key={e} onClick={() => set("education", e)} style={pill(form.education === e)}>{e}</button>)}
                </div>
              </div>

              <button onClick={checkEligibility} disabled={loading || !form.nationality || !form.occupation || !form.salary} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 24px #0057FF35", opacity: loading || !form.nationality || !form.occupation || !form.salary ? 0.7 : 1 }}>
                {loading ? "⏳ Checking eligibility..." : "Check My Eligibility →"}
              </button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Score */}
              <div style={{ background: result.eligible ? "linear-gradient(135deg, #0038CC, #0057FF)" : "linear-gradient(135deg, #DC2626, #FF6B35)", borderRadius: 22, padding: "32px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,57,255,0.25)" }}>
                <div style={{ fontSize: 80, fontWeight: 900, color: "#fff", letterSpacing: -4, lineHeight: 1 }}>{result.score}%</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "10px 0 6px" }}>
                  {result.score >= 75 ? "Strong Eligibility ✓" : result.score >= 50 ? "Moderate — Action Needed" : "Significant Barriers"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 14 }}>
                  {result.eligible ? "You meet the core requirements for at least one UK visa route" : "You currently don't meet the minimum salary threshold"}
                </div>
              </div>

              {/* SOC info */}
              <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 16, padding: "18px 22px" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0A0F1E", marginBottom: 12 }}>📊 Official Salary Data for {result.occupation}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Minimum Threshold", val: `£${result.socInfo.minSalary.toLocaleString()}`, color: result.sal >= result.socInfo.minSalary ? "#00D68F" : "#DC2626" },
                    { label: "Going Rate", val: `£${result.socInfo.goingRate.toLocaleString()}`, color: result.sal >= result.socInfo.goingRate ? "#00D68F" : "#FF6B35" },
                    { label: "Your Salary", val: `£${result.sal.toLocaleString()}`, color: "#0057FF" },
                    { label: "SOC Code", val: result.socInfo.code, color: "#7C3AED" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#F8FAFF", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: "#9CA3B8", marginTop: 2, fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visa pathways */}
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0A0F1E" }}>Your Visa Pathways</div>
              {result.paths.map((path, i) => (
                <div key={i} style={{ background: "#fff", border: `1.5px solid ${path.match === "eligible" ? `${path.color}35` : path.match === "gap" ? "#FCA5A535" : "#E8EEFF"}`, borderRadius: 18, padding: "20px 22px" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 13, background: `${path.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{path.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#0A0F1E" }}>{path.name}</div>
                        <span style={{ background: path.match === "eligible" ? `${path.color}15` : path.match === "gap" ? "#FCA5A520" : "#F8FAFF", color: path.match === "eligible" ? path.color : path.match === "gap" ? "#DC2626" : "#9CA3B8", borderRadius: 100, padding: "3px 10px", fontSize: 11, fontWeight: 700, marginLeft: 8, whiteSpace: "nowrap" }}>
                          {path.match === "eligible" ? "✓ Eligible" : path.match === "gap" ? "✗ Gap" : "◎ Possible"}
                        </span>
                      </div>
                      <div style={{ color: "#4B5675", fontSize: 13, marginBottom: 8 }}>{path.desc}</div>
                      <div style={{ background: path.match === "gap" ? "#FFF7ED" : `${path.color}08`, border: `1px solid ${path.match === "gap" ? "#FED7AA" : `${path.color}20`}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: path.match === "gap" ? "#C2410C" : path.color, marginBottom: 10, fontWeight: 500 }}>
                        {path.note}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {path.points.map((p, j) => <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#4B5675" }}><span style={{ color: path.color, fontWeight: 800, fontSize: 10 }}>✓</span>{p}</div>)}
                      </div>
                      <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#9CA3B8", marginTop: 10 }}>
                        <span>⏱ {path.processingTime}</span><span>📅 {path.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* CTA */}
              <div style={{ background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 16, padding: "22px", textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0A0F1E", marginBottom: 6 }}>Find jobs matching your eligibility</div>
                <div style={{ color: "#4B5675", fontSize: 13, marginBottom: 14 }}>Search verified sponsored roles for {result.occupation}</div>
                <button onClick={() => navigate(`/jobs?q=${encodeURIComponent(result.occupation)}`)} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Find {result.occupation} Jobs →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* All visa routes */}
        {!result && (
          <div style={{ marginTop: 72 }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 8px", letterSpacing: -1 }}>UK Work Visa Routes</h2>
            <p style={{ color: "#4B5675", fontSize: 16, margin: "0 0 28px" }}>The main pathways for international professionals coming to work in the UK</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
              {VISA_ROUTES.map(v => (
                <div key={v.name} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: "26px", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${v.color}40`; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${v.color}10` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8EEFF"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" }}
                >
                  <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `${v.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{v.icon}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#0A0F1E" }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: "#9CA3B8", marginTop: 2 }}>⏱ {v.processingTime} · 📅 {v.duration}</div>
                    </div>
                  </div>
                  <p style={{ color: "#4B5675", fontSize: 14, lineHeight: 1.7, margin: "0 0 14px" }}>{v.desc}</p>
                  {v.minSalary > 0 && <div style={{ background: `${v.color}08`, border: `1px solid ${v.color}20`, borderRadius: 8, padding: "6px 12px", fontSize: 12, color: v.color, fontWeight: 600, display: "inline-block", marginBottom: 12 }}>Min salary: £{v.minSalary.toLocaleString()}/year</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {v.points.map(p => <div key={p} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4B5675" }}><span style={{ color: v.color, fontWeight: 800, fontSize: 10 }}>✓</span>{p}</div>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
