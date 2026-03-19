import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { ALL_JOBS, NATIONALITIES, INDUSTRIES } from "../lib/constants"

const STEPS = [
  { id: 1, title: "Welcome to IMMTECH", subtitle: "Let's personalise your experience" },
  { id: 2, title: "About You", subtitle: "Tell us a bit about yourself" },
  { id: 3, title: "Your Career", subtitle: "What kind of work are you looking for?" },
  { id: 4, title: "Visa Preferences", subtitle: "Help us find the right opportunities" },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    fullName: "", nationality: "", currentLocation: "",
    jobRole: "", industry: "", experienceYears: "",
    visaStatus: "", salaryExpectation: "", openToRelocation: true,
  })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const set = (k, v) => setData(d => ({ ...d, [k]: v }))

  const pill = (active) => ({
    padding: "9px 18px", borderRadius: 100, fontSize: 14, fontWeight: 600,
    cursor: "pointer", border: `1.5px solid ${active ? "#0057FF" : "#E8EEFF"}`,
    background: active ? "#0057FF0D" : "#F8FAFF",
    color: active ? "#0057FF" : "#4B5675",
    transition: "all 0.18s", fontFamily: "inherit",
  })

  const inp = {
    width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 11,
    padding: "13px 15px", fontSize: 15, color: "#0A0F1E",
    background: "#F8FAFF", fontFamily: "inherit", outline: "none",
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id, email: user.email,
          full_name: data.fullName, nationality: data.nationality,
          current_location: data.currentLocation, job_role: data.jobRole,
          industry: data.industry, experience_years: data.experienceYears,
          visa_status: data.visaStatus, salary_expectation: data.salaryExpectation,
          open_to_relocation: data.openToRelocation, onboarded: true,
          updated_at: new Date().toISOString(),
        })
      }
    } catch (err) { console.warn(err) }
    finally { setSaving(false); navigate("/jobs") }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #F8FAFF 0%, #fff 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "inherit" }}>

      <div style={{ position: "fixed", top: 24, right: 32 }}>
        <button onClick={() => navigate("/jobs")} style={{ background: "none", border: "none", color: "#9CA3B8", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
          Skip for now →
        </button>
      </div>

      <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, cursor: "pointer" }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IT</span>
        </div>
        <span style={{ fontWeight: 900, fontSize: 21, color: "#0057FF", letterSpacing: -1 }}>IMMTECH</span>
      </div>

      {/* Progress */}
      <div style={{ width: "100%", maxWidth: 560, marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          {STEPS.map(s => (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: step >= s.id ? "linear-gradient(135deg, #0057FF, #00C2FF)" : "#E8EEFF", display: "flex", alignItems: "center", justifyContent: "center", color: step >= s.id ? "#fff" : "#9CA3B8", fontWeight: 700, fontSize: 13, transition: "all 0.3s" }}>
                {step > s.id ? "✓" : s.id}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 4, background: "#E8EEFF", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${((step - 1) / (STEPS.length - 1)) * 100}%`, background: "linear-gradient(90deg, #0057FF, #00C2FF)", borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Card */}
      <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 24, padding: "40px 44px", width: "100%", maxWidth: 560, boxShadow: "0 16px 56px rgba(0,57,255,0.07)" }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#0A0F1E", margin: "0 0 6px", letterSpacing: -0.8 }}>{STEPS[step - 1].title}</h2>
          <p style={{ color: "#4B5675", fontSize: 15 }}>{STEPS[step - 1].subtitle}</p>
        </div>

        {step === 1 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🌍</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0A0F1E", marginBottom: 12 }}>Find your sponsored role in the UK</h3>
            <p style={{ color: "#4B5675", fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>Answer a few quick questions and we'll personalise your job feed, visa checker and CV tips based on your background.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["🤖 AI job scoring tailored to your profile", "🛂 Visa eligibility pre-checked for you", "🎯 Jobs matched to your role and industry", "📩 Alerts for new sponsored roles"].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8FAFF", borderRadius: 10, padding: "12px 16px" }}>
                  <span style={{ fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.7 }}>Full Name</label>
              <input value={data.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Your full name" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.7 }}>Nationality</label>
              <select value={data.nationality} onChange={e => set("nationality", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                <option value="">Select nationality...</option>
                {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.7 }}>Current Location</label>
              <input value={data.currentLocation} onChange={e => set("currentLocation", e.target.value)} placeholder="e.g. London, UK or Mumbai, India" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.7 }}>Job Role</label>
              <select value={data.jobRole} onChange={e => set("jobRole", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                <option value="">Select your role...</option>
                {ALL_JOBS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.7 }}>Industry</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {INDUSTRIES.map(ind => <button key={ind} onClick={() => set("industry", ind)} style={pill(data.industry === ind)}>{ind}</button>)}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.7 }}>Years of Experience</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["0-1", "1-3", "3-5", "5-10", "10+"].map(y => (
                  <button key={y} onClick={() => set("experienceYears", y)} style={{ ...pill(data.experienceYears === y), flex: 1 }}>{y}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.7 }}>Current Visa Status</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["No UK Visa", "Student Visa", "Graduate Visa", "Skilled Worker Visa", "ILR / Settled", "British Citizen"].map(v => (
                  <button key={v} onClick={() => set("visaStatus", v)} style={pill(data.visaStatus === v)}>{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.7 }}>Salary Expectation (£/year)</label>
              <input value={data.salaryExpectation} onChange={e => set("salaryExpectation", e.target.value)} placeholder="e.g. 40000" type="number" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.7 }}>Open to Relocation within UK?</label>
              <div style={{ display: "flex", gap: 10 }}>
                {[{ val: true, label: "Yes, anywhere" }, { val: false, label: "Preferred city only" }].map(opt => (
                  <button key={String(opt.val)} onClick={() => set("openToRelocation", opt.val)} style={{ ...pill(data.openToRelocation === opt.val), flex: 1 }}>{opt.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, background: "#F8FAFF", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              ← Back
            </button>
          )}
          <button onClick={step < STEPS.length ? () => setStep(s => s + 1) : handleFinish} disabled={saving} style={{ flex: 2, background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 18px #0057FF30", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : step < STEPS.length ? "Continue →" : "🎉 Find My Jobs →"}
          </button>
        </div>
      </div>
    </div>
  )
}