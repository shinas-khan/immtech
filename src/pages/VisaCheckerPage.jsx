import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Nav from "../components/Nav"
import { NATIONALITIES, ALL_JOBS } from "../lib/constants"

const VISA_ROUTES = [
  {
    name: "Skilled Worker Visa",
    icon: "💼",
    color: "#0057FF",
    minSalary: 26200,
    desc: "For people with a job offer from a UK employer with a valid sponsor licence.",
    requirements: ["Job offer from licensed UK sponsor", "Minimum salary of £26,200/year", "English language requirement", "Certificate of Sponsorship"],
    processingTime: "3–8 weeks",
    duration: "Up to 5 years",
    link: "https://www.gov.uk/skilled-worker-visa",
  },
  {
    name: "Health & Care Worker Visa",
    icon: "🏥",
    color: "#00D68F",
    minSalary: 29000,
    desc: "For doctors, nurses, health professionals and adult social care workers.",
    requirements: ["Job in eligible health or care role", "Offer from NHS, social care or eligible employer", "Minimum salary threshold", "English language requirement"],
    processingTime: "2–3 weeks",
    duration: "Up to 5 years",
    link: "https://www.gov.uk/health-care-worker-visa",
  },
  {
    name: "Global Talent Visa",
    icon: "🌟",
    color: "#7C3AED",
    minSalary: 0,
    desc: "For leaders and potential leaders in academia, research, arts, culture and digital technology.",
    requirements: ["Endorsement from approved body", "Exceptional talent or promise", "No job offer required", "No salary threshold"],
    processingTime: "3–8 weeks",
    duration: "Up to 5 years",
    link: "https://www.gov.uk/global-talent",
  },
  {
    name: "Graduate Visa",
    icon: "🎓",
    color: "#FF6B35",
    minSalary: 0,
    desc: "For international students who have completed a UK degree at an eligible institution.",
    requirements: ["Completed eligible UK degree", "Currently on Student visa", "No job offer required", "No salary threshold"],
    processingTime: "8 weeks",
    duration: "2–3 years",
    link: "https://www.gov.uk/graduate-visa",
  },
]

const SOC_SALARIES = {
  "Software Engineer": 34200,
  "Registered Nurse": 29000,
  "Data Analyst": 30700,
  "Civil Engineer": 31900,
  "Accountant": 28500,
  "Product Manager": 35000,
  "DevOps Engineer": 36000,
  "Pharmacist": 29000,
  "Mechanical Engineer": 30200,
  "Web Developer": 30700,
  "Physiotherapist": 29000,
  "Radiographer": 29000,
  "General Practitioner": 43000,
  "Surgeon": 53000,
  "Data Scientist": 35000,
  "Machine Learning Engineer": 38000,
  "Dentist": 41500,
  "Anaesthetist": 55000,
  "Social Worker": 28000,
  "Teacher": 28000,
}

export default function VisaCheckerPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nationality: "", occupation: "", salary: "",
    english: "", experience: "", education: "",
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const pill = (active, color = "#0057FF") => ({
    padding: "10px 20px", borderRadius: 100, fontSize: 14, fontWeight: 600,
    cursor: "pointer", border: `1.5px solid ${active ? color : "#E8EEFF"}`,
    background: active ? `${color}0D` : "#F8FAFF",
    color: active ? color : "#4B5675",
    transition: "all 0.18s", fontFamily: "inherit",
  })

  const inp = {
    width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 12,
    padding: "14px 16px", fontSize: 15, color: "#0A0F1E",
    background: "#F8FAFF", fontFamily: "inherit", outline: "none",
    transition: "border-color 0.2s",
  }

  const checkEligibility = () => {
    if (!form.nationality || !form.occupation || !form.salary) return
    setLoading(true)
    setTimeout(() => {
      const sal = parseInt(form.salary)
      const socMin = SOC_SALARIES[form.occupation] || 26200
      const eligibleSkilled = sal >= Math.max(26200, socMin)
      const eligibleHealth = ["Registered Nurse", "Pharmacist", "Physiotherapist", "Radiographer", "General Practitioner", "Surgeon", "Dentist", "Anaesthetist", "Midwife", "Paramedic", "Occupational Therapist", "Dietitian", "Speech Therapist"].includes(form.occupation) && sal >= 29000
      const eligibleGraduate = form.education === "UK Degree"
      const eligibleGlobal = ["AI Engineer", "Machine Learning Engineer", "Data Scientist", "Research Scientist"].includes(form.occupation)

      const paths = []
      if (eligibleSkilled) paths.push({ ...VISA_ROUTES[0], match: "strong" })
      if (eligibleHealth) paths.push({ ...VISA_ROUTES[1], match: "strong" })
      if (eligibleGlobal) paths.push({ ...VISA_ROUTES[2], match: "possible" })
      if (eligibleGraduate) paths.push({ ...VISA_ROUTES[3], match: "strong" })
      if (!eligibleSkilled) {
        const gap = Math.max(26200, socMin) - sal
        paths.push({ ...VISA_ROUTES[0], match: "gap", gap, gapMsg: `You need £${gap.toLocaleString()} more per year to meet the minimum salary threshold for this role.` })
      }

      const overallScore = eligibleSkilled ? Math.min(98, 65 + Math.floor((sal - socMin) / 800) + (form.english === "Fluent" ? 10 : form.english === "Intermediate" ? 5 : 0) + (form.experience === "3-5" || form.experience === "5-10" || form.experience === "10+" ? 8 : 0)) : Math.max(15, 45 - Math.floor((socMin - sal) / 600))

      setResult({ score: Math.floor(overallScore), paths, salary: sal, socMin, occupation: form.occupation, eligible: eligibleSkilled || eligibleHealth || eligibleGraduate })
      setLoading(false)
    }, 1600)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "110px 6% 80px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ display: "inline-block", background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 100, padding: "8px 20px", color: "#0057FF", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
            🛂 Visa Eligibility Engine
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 18px", letterSpacing: -2, lineHeight: 1.1 }}>
            Know your chances<br /><span style={{ color: "#0057FF" }}>before you apply</span>
          </h1>
          <p style={{ color: "#4B5675", fontSize: 18, maxWidth: 540, margin: "0 auto", lineHeight: 1.8, fontWeight: 400 }}>
            Our AI rule engine analyses your profile against UK immigration requirements and tells you exactly which visa pathways you qualify for.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr", gap: 32, alignItems: "start" }}>

          {/* Form */}
          <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 24, padding: "40px 36px", boxShadow: "0 8px 40px rgba(0,57,255,0.06)" }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#0A0F1E", margin: "0 0 8px" }}>Check Your Eligibility</h2>
            <p style={{ color: "#9CA3B8", fontSize: 14, margin: "0 0 32px" }}>Fill in your details below — takes under 2 minutes</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {/* Nationality */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Nationality *</label>
                <select value={form.nationality} onChange={e => set("nationality", e.target.value)} style={{ ...inp, cursor: "pointer" }}
                  onFocus={e => e.target.style.borderColor = "#0057FF"}
                  onBlur={e => e.target.style.borderColor = "#E8EEFF"}
                >
                  <option value="">Select your nationality...</option>
                  {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Occupation */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Job / Occupation *</label>
                <select value={form.occupation} onChange={e => set("occupation", e.target.value)} style={{ ...inp, cursor: "pointer" }}
                  onFocus={e => e.target.style.borderColor = "#0057FF"}
                  onBlur={e => e.target.style.borderColor = "#E8EEFF"}
                >
                  <option value="">Select your occupation...</option>
                  {ALL_JOBS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
                {form.occupation && SOC_SALARIES[form.occupation] && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#0057FF", fontWeight: 600 }}>
                    ℹ️ Minimum salary for this role: £{SOC_SALARIES[form.occupation].toLocaleString()}/year
                  </div>
                )}
              </div>

              {/* Salary */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Expected Salary (£/year) *</label>
                <input value={form.salary} onChange={e => set("salary", e.target.value)} placeholder="e.g. 35000" type="number" style={inp}
                  onFocus={e => e.target.style.borderColor = "#0057FF"}
                  onBlur={e => e.target.style.borderColor = "#E8EEFF"}
                />
              </div>

              {/* English */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>English Language Level</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Basic", "Intermediate", "Fluent"].map(l => (
                    <button key={l} onClick={() => set("english", l)} style={{ ...pill(form.english === l), flex: 1 }}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Years of Experience</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["0-1", "1-3", "3-5", "5-10", "10+"].map(y => (
                    <button key={y} onClick={() => set("experience", y)} style={pill(form.experience === y)}>{y} yrs</button>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Highest Education</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["High School", "Bachelor's", "Master's", "PhD", "UK Degree"].map(e => (
                    <button key={e} onClick={() => set("education", e)} style={pill(form.education === e)}>{e}</button>
                  ))}
                </div>
              </div>

              <button
                onClick={checkEligibility}
                disabled={loading || !form.nationality || !form.occupation || !form.salary}
                style={{
                  background: "linear-gradient(135deg, #0057FF, #00C2FF)",
                  color: "#fff", border: "none", borderRadius: 14,
                  padding: "16px", fontSize: 16, fontWeight: 700,
                  cursor: loading || !form.nationality || !form.occupation || !form.salary ? "not-allowed" : "pointer",
                  fontFamily: "inherit", boxShadow: "0 6px 24px #0057FF35",
                  opacity: loading || !form.nationality || !form.occupation || !form.salary ? 0.7 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                {loading ? "⏳ Analysing your profile..." : "Check My Eligibility →"}
              </button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Score card */}
              <div style={{ background: result.eligible ? "linear-gradient(135deg, #0057FF, #00C2FF)" : "linear-gradient(135deg, #FF6B35, #FF9A3C)", borderRadius: 24, padding: "36px 32px", textAlign: "center", boxShadow: result.eligible ? "0 20px 60px #0057FF30" : "0 20px 60px #FF6B3530" }}>
                <div style={{ fontSize: 80, fontWeight: 900, color: "#fff", letterSpacing: -4, lineHeight: 1 }}>{result.score}%</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "12px 0 8px" }}>
                  {result.score >= 75 ? "Strong Eligibility ✓" : result.score >= 50 ? "Possible — Needs Review" : "Further Action Needed"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 15 }}>
                  {result.eligible ? "You likely qualify for at least one UK visa pathway" : "You may need to adjust your salary expectations or role"}
                </div>
              </div>

              {/* Salary check */}
              {result.socMin && (
                <div style={{ background: "#fff", border: `1px solid ${result.salary >= result.socMin ? "#00D68F40" : "#FF6B3540"}`, borderRadius: 18, padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#0A0F1E", marginBottom: 4 }}>Salary Threshold Check</div>
                      <div style={{ fontSize: 13, color: "#9CA3B8" }}>Minimum for {result.occupation}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 18, color: result.salary >= result.socMin ? "#00D68F" : "#FF6B35" }}>
                        {result.salary >= result.socMin ? "✓ Meets threshold" : "✗ Below threshold"}
                      </div>
                      <div style={{ fontSize: 13, color: "#9CA3B8" }}>Min: £{result.socMin.toLocaleString()} · Your offer: £{result.salary.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Visa pathways */}
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0A0F1E", marginTop: 4 }}>Your Visa Pathways</div>
              {result.paths.slice(0, 3).map((path, i) => (
                <div key={i} style={{ background: "#fff", border: `1.5px solid ${path.match === "strong" ? `${path.color}30` : path.match === "gap" ? "#FF6B3530" : "#E8EEFF"}`, borderRadius: 18, padding: "22px 24px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `${path.match === "gap" ? "#FF6B35" : path.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{path.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#0A0F1E" }}>{path.name}</div>
                        <span style={{ background: path.match === "strong" ? `${path.color}15` : path.match === "gap" ? "#FF6B3515" : "#F8FAFF", color: path.match === "strong" ? path.color : path.match === "gap" ? "#FF6B35" : "#9CA3B8", borderRadius: 100, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8 }}>
                          {path.match === "strong" ? "✓ Eligible" : path.match === "gap" ? "✗ Salary Gap" : "◎ Possible"}
                        </span>
                      </div>
                      <div style={{ color: "#4B5675", fontSize: 13, lineHeight: 1.6, marginBottom: path.gapMsg ? 10 : 0 }}>{path.desc}</div>
                      {path.gapMsg && <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#C2410C", marginBottom: 8 }}>⚠️ {path.gapMsg}</div>}
                      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#9CA3B8", marginTop: 8 }}>
                        <span>⏱ {path.processingTime}</span>
                        <span>📅 {path.duration}</span>
                      </div>
                    </div>
                  </div>
                  <a href={path.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 14, color: "#0057FF", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    View official UK gov guidance →
                  </a>
                </div>
              ))}

              {/* CTA */}
              <div style={{ background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 18, padding: "24px", textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#0A0F1E", marginBottom: 8 }}>Find jobs that match your visa eligibility</div>
                <div style={{ color: "#4B5675", fontSize: 14, marginBottom: 16 }}>Search visa-sponsored roles filtered to your profile</div>
                <button onClick={() => navigate("/jobs")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Find Sponsored Jobs →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* All visa routes info */}
        {!result && (
          <div style={{ marginTop: 64 }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 8px", letterSpacing: -1 }}>UK Visa Pathways for Workers</h2>
            <p style={{ color: "#4B5675", fontSize: 16, margin: "0 0 32px" }}>The most common routes for international professionals coming to the UK</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
              {VISA_ROUTES.map(v => (
                <div key={v.name} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: "28px 28px", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${v.color}40`; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${v.color}10` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8EEFF"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 50, height: 50, borderRadius: 14, background: `${v.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{v.icon}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#0A0F1E" }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: "#9CA3B8", marginTop: 2 }}>Processing: {v.processingTime} · Duration: {v.duration}</div>
                    </div>
                  </div>
                  <p style={{ color: "#4B5675", fontSize: 14, lineHeight: 1.7, margin: "0 0 14px" }}>{v.desc}</p>
                  {v.minSalary > 0 && <div style={{ background: `${v.color}08`, border: `1px solid ${v.color}20`, borderRadius: 8, padding: "6px 12px", fontSize: 12, color: v.color, fontWeight: 600, display: "inline-block", marginBottom: 12 }}>Min salary: £{v.minSalary.toLocaleString()}/year</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {v.requirements.map(r => (
                      <div key={r} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4B5675" }}>
                        <span style={{ color: v.color, fontWeight: 800 }}>✓</span>{r}
                      </div>
                    ))}
                  </div>
                  <a href={v.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 16, color: "#0057FF", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    Official UK gov guidance →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
