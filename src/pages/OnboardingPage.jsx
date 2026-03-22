import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { ALL_JOBS, NATIONALITIES, INDUSTRIES } from "../lib/constants"

function useW() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn) }, [])
  return w
}

const STEPS = [
  { id: 1, title: "Welcome to IMMTECH", subtitle: "Let's personalise your experience" },
  { id: 2, title: "About You", subtitle: "Tell us a bit about yourself" },
  { id: 3, title: "Your Career", subtitle: "What kind of work are you looking for?" },
  { id: 4, title: "Visa Preferences", subtitle: "Help us find the right opportunities" },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState({ fullName: "", nationality: "", currentLocation: "", jobRole: "", industry: "", experienceYears: "", visaStatus: "", salaryExpectation: "", openToRelocation: true })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const w = useW()
  const mob = w < 768
  const set = (k, v) => setData(d => ({ ...d, [k]: v }))

  const pill = (active) => ({ padding: mob ? "10px 14px" : "9px 18px", borderRadius: 100, fontSize: mob ? 14 : 14, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? "#0057FF" : "#E8EEFF"}`, background: active ? "#0057FF0D" : "#F8FAFF", color: active ? "#0057FF" : "#4B5675", transition: "all 0.18s", fontFamily: "inherit" })
  const inp = { width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 11, padding: mob ? "14px" : "13px 15px", fontSize: mob ? 16 : 15, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }
  const lbl = { display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.7 }

  const handleFinish = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from("profiles").upsert({ id: user.id, email: user.email, full_name: data.fullName, nationality: data.nationality, current_location: data.currentLocation, job_role: data.jobRole, industry: data.industry, experience_years: data.experienceYears, visa_status: data.visaStatus, salary_expectation: data.salaryExpectation, open_to_relocation: data.openToRelocation, onboarded: true, updated_at: new Date().toISOString() })
    } catch (err) { console.warn(err) }
    finally { setSaving(false); navigate("/jobs") }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #F8FAFF 0%, #fff 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: mob ? "20px 16px" : "40px 20px", fontFamily: "inherit" }}>
      <div style={{ position: "fixed", top: 16, right: 16 }}>
        <button onClick={() => navigate("/jobs")} style={{ background: "none", border: "none", color: "#9CA3B8", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Skip →</button>
      </div>
      <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: mob ? 24 : 36, cursor: "pointer" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IT</span>
        </div>
        <span style={{ fontWeight: 900, fontSize: 20, color: "#0057FF", letterSpacing: -1 }}>IMMTECH</span>
      </div>

      {/* Progress */}
      <div style={{ width: "100%", maxWidth: 560, marginBottom: mob ? 20 : 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          {STEPS.map(s => (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: mob ? 28 : 32, height: mob ? 28 : 32, borderRadius: "50%", background: step >= s.id ? "linear-gradient(135deg, #0057FF, #00C2FF)" : "#E8EEFF", display: "flex", alignItems: "center", justifyContent: "center", color: step >= s.id ? "#fff" : "#9CA3B8", fontWeight: 700, fontSize: mob ? 11 : 13, transition: "all 0.3s" }}>
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
      <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: mob ? 20 : 24, padding: mob ? "28px 20px" : "40px 44px", width: "100%", maxWidth: 560, boxShadow: "0 16px 56px rgba(0,57,255,0.07)" }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: mob ? 20 : 24, fontWeight: 900, color: "#0A0F1E", margin: "0 0 6px", letterSpacing: -0.8 }}>{STEPS[step - 1].title}</h2>
          <p style={{ color: "#4B5675", fontSize: mob ? 13 : 15 }}>{STEPS[step - 1].subtitle}</p>
        </div>

        {step === 1 && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: mob ? 52 : 64, marginBottom: 16 }}>🌍</div>
            <h3 style={{ fontSize: mob ? 17 : 20, fontWeight: 800, color: "#0A0F1E", marginBottom: 10 }}>Find your sponsored role in the UK</h3>
            <p style={{ color: "#4B5675", fontSize: mob ? 13 : 15, lineHeight: 1.7, marginBottom: 24 }}>Answer a few quick questions and we'll personalise your job feed, visa checker and CV tips.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["🤖 AI job scoring tailored to your profile", "🛂 Visa eligibility pre-checked for you", "🎯 Jobs matched to your role", "📩 Alerts for new sponsored roles"].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8FAFF", borderRadius: 10, padding: "11px 14px", textAlign: "left" }}>
                  <span style={{ fontSize: mob ? 13 : 14 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label style={lbl}>Full Name</label><input value={data.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Your full name" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} /></div>
            <div><label style={lbl}>Nationality</label><select value={data.nationality} onChange={e => set("nationality", e.target.value)} style={{ ...inp, cursor: "pointer" }}><option value="">Select nationality...</option>{NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
            <div><label style={lbl}>Current Location</label><input value={data.currentLocation} onChange={e => set("currentLocation", e.target.value)} placeholder="e.g. London, UK" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} /></div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label style={lbl}>Job Role</label><select value={data.jobRole} onChange={e => set("jobRole", e.target.value)} style={{ ...inp, cursor: "pointer" }}><option value="">Select your role...</option>{ALL_JOBS.map(j => <option key={j} value={j}>{j}</option>)}</select></div>
            <div>
              <label style={lbl}>Industry</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{INDUSTRIES.map(ind => <button key={ind} onClick={() => set("industry", ind)} style={pill(data.industry === ind)}>{ind}</button>)}</div>
            </div>
            <div>
              <label style={lbl}>Years of Experience</label>
              <div style={{ display: "flex", gap: 8 }}>{["0-1","1-3","3-5","5-10","10+"].map(y => <button key={y} onClick={() => set("experienceYears", y)} style={{ ...pill(data.experienceYears === y), flex: 1 }}>{y}</button>)}</div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={lbl}>Current Visa Status</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{["No UK Visa","Student Visa","Graduate Visa","Skilled Worker Visa","ILR / Settled","British Citizen"].map(v => <button key={v} onClick={() => set("visaStatus", v)} style={pill(data.visaStatus === v)}>{v}</button>)}</div>
            </div>
            <div><label style={lbl}>Salary Expectation (£/year)</label><input value={data.salaryExpectation} onChange={e => set("salaryExpectation", e.target.value)} placeholder="e.g. 40000" type="number" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} /></div>
            <div>
              <label style={lbl}>Open to Relocation?</label>
              <div style={{ display: "flex", gap: 10 }}>{[{ val: true, label: "Yes, anywhere" },{ val: false, label: "Preferred city only" }].map(opt => <button key={String(opt.val)} onClick={() => set("openToRelocation", opt.val)} style={{ ...pill(data.openToRelocation === opt.val), flex: 1 }}>{opt.label}</button>)}</div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          {step > 1 && <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, background: "#F8FAFF", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 12, padding: mob ? "14px" : "13px", fontSize: mob ? 15 : 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>}
          <button onClick={step < STEPS.length ? () => setStep(s => s + 1) : handleFinish} disabled={saving} style={{ flex: 2, background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 12, padding: mob ? "14px" : "13px", fontSize: mob ? 15 : 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 18px #0057FF30", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : step < STEPS.length ? "Continue →" : "🎉 Find My Jobs →"}
          </button>
        </div>
      </div>
    </div>
  )
}
