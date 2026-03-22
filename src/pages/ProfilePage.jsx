import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { ALL_JOBS, NATIONALITIES, INDUSTRIES } from "../lib/constants"
import Nav from "../components/Nav"

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener("resize", fn)
    return () => window.removeEventListener("resize", fn)
  }, [])
  return w
}

async function scoreCV(cvText, jobRole) {
  const response = await fetch("/api/score-cv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cvText, jobRole })
  })
  if (!response.ok) throw new Error("API error")
  return await response.json()
}

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({
    full_name: "", nationality: "", current_location: "",
    phone: "", linkedin_url: "", job_role: "", industry: "",
    experience_years: "", visa_status: "", salary_expectation: "",
    bio: "", open_to_work: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [cvName, setCvName] = useState("")
  const [cvText, setCvText] = useState("")
  const [cvScore, setCvScore] = useState(null)
  const [scoring, setScoring] = useState(false)
  const [scoreError, setScoreError] = useState("")
  const [savedJobs, setSavedJobs] = useState([])
  const [alerts, setAlerts] = useState([])
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [newAlert, setNewAlert] = useState({ keyword: "", location: "", frequency: "daily" })
  const navigate = useNavigate()
  const w = useWindowWidth()
  const mob = w < 768

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate("/auth"); return }
      setUser(user)
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (p) setProfile(prev => ({ ...prev, ...p }))
      if (p?.cv_name) setCvName(p.cv_name)
      if (p?.cv_score) { try { setCvScore(JSON.parse(p.cv_score)) } catch {} }
      const { data: jobs } = await supabase.from("saved_jobs").select("*").eq("user_id", user.id).order("saved_at", { ascending: false })
      setSavedJobs(jobs || [])
      const { data: alts } = await supabase.from("job_alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      setAlerts(alts || [])
      setLoading(false)
    }
    load()
  }, [navigate])

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from("profiles").upsert({ id: user.id, email: user.email, ...profile, updated_at: new Date().toISOString() })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleCvUpload = async (file) => {
    if (!file) return
    setCvName(file.name); setCvScore(null); setScoreError("")
    try {
      let text = ""
      try { text = await file.text() } catch {}
      if (!text || text.length < 50 || text.includes("\x00")) {
        const buffer = await file.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        text = Array.from(bytes).map(b => (b > 31 && b < 127) ? String.fromCharCode(b) : " ").join("").replace(/\s+/g, " ").trim()
      }
      setCvText(text)
      try {
        const path = `${user.id}/cv-${Date.now()}.${file.name.split(".").pop()}`
        await supabase.storage.from("cvs").upload(path, file)
        await supabase.from("profiles").upsert({ id: user.id, cv_path: path, cv_name: file.name })
      } catch (storageErr) { console.warn("Storage:", storageErr) }
    } catch (err) { console.error(err) }
  }

  const handleScoreCV = async () => {
    if (!cvText && !cvName) { setScoreError("Please upload your CV first"); return }
    setScoring(true); setScoreError("")
    try {
      const score = await scoreCV(cvText || "CV uploaded as binary", profile.job_role)
      setCvScore(score)
      await supabase.from("profiles").upsert({ id: user.id, cv_score: JSON.stringify(score) })
    } catch (err) { setScoreError("Could not score CV. Please try again.") }
    finally { setScoring(false) }
  }

  const removeJob = async (id) => {
    await supabase.from("saved_jobs").delete().eq("id", id)
    setSavedJobs(j => j.filter(s => s.id !== id))
  }

  const createAlert = async () => {
    if (!newAlert.keyword) return
    const { data } = await supabase.from("job_alerts").insert({ user_id: user.id, ...newAlert, active: true, created_at: new Date().toISOString() }).select().single()
    if (data) setAlerts(a => [data, ...a])
    setNewAlert({ keyword: "", location: "", frequency: "daily" })
    setShowAlertForm(false)
  }

  const toggleAlert = async (id, active) => {
    await supabase.from("job_alerts").update({ active: !active }).eq("id", id)
    setAlerts(a => a.map(al => al.id === id ? { ...al, active: !active } : al))
  }

  const deleteAlert = async (id) => {
    await supabase.from("job_alerts").delete().eq("id", id)
    setAlerts(a => a.filter(al => al.id !== id))
  }

  // Profile completion score
  const fields = ["full_name", "nationality", "current_location", "phone", "job_role", "visa_status", "bio", "salary_expectation"]
  const completed = fields.filter(f => profile[f]).length
  const completionPct = Math.round((completed / fields.length) * 100)

  const inp = { width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 11, padding: "12px 15px", fontSize: 14, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" }
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }

  const TABS = [
    { id: "overview", label: "Overview", icon: "👤" },
    { id: "profile", label: "Edit Profile", icon: "✏️" },
    { id: "cv", label: "CV & Score", icon: "📄" },
    { id: "saved", label: `Saved Jobs${savedJobs.length > 0 ? ` (${savedJobs.length})` : ""}`, icon: "🔖" },
    { id: "alerts", label: `Alerts${alerts.length > 0 ? ` (${alerts.length})` : ""}`, icon: "🔔" },
  ]

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFF" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
        <div style={{ color: "#4B5675", fontSize: 15 }}>Loading your profile...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: mob ? "86px 4% 40px" : "100px 6% 60px" }}>

        {/* Profile Header Card */}
        <div style={{ background: "linear-gradient(135deg, #0038CC, #0057FF 60%, #0090FF)", borderRadius: 24, padding: mob ? "28px 20px" : "36px 40px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "absolute", bottom: -40, left: -40, width: 150, height: 150, borderRadius: "50%", background: "rgba(0,214,143,0.08)" }} />
          <div style={{ position: "relative", display: "flex", alignItems: mob ? "flex-start" : "center", gap: mob ? 16 : 24, flexDirection: mob ? "column" : "row" }}>
            {/* Avatar */}
            <div style={{ width: mob ? 72 : 88, height: mob ? 72 : 88, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "3px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: mob ? 28 : 36, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
              {profile.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <h1 style={{ fontSize: mob ? 20 : 26, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: -0.8 }}>
                  {profile.full_name || "Your Profile"}
                </h1>
                {profile.open_to_work && (
                  <span style={{ background: "#00D68F", color: "#fff", borderRadius: 100, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                    #OpenToWork
                  </span>
                )}
              </div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: mob ? 13 : 15, marginBottom: 4 }}>
                {profile.job_role || "Add your job role"} {profile.nationality ? `· ${profile.nationality}` : ""}
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                {user?.email} {profile.current_location ? `· 📍 ${profile.current_location}` : ""}
              </div>
            </div>
            {/* Profile completion */}
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 16, padding: "16px 20px", textAlign: "center", minWidth: mob ? "100%" : 120 }}>
              <div style={{ fontSize: mob ? 28 : 32, fontWeight: 900, color: "#fff" }}>{completionPct}%</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginBottom: 8 }}>Profile Complete</div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
                <div style={{ width: `${completionPct}%`, height: "100%", background: completionPct >= 80 ? "#00D68F" : "#FFD700", borderRadius: 2, transition: "width 1s ease" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: mob ? 4 : 6, marginBottom: 24, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: mob ? "10px 14px" : "11px 20px", borderRadius: 12, fontSize: mob ? 12 : 14,
              fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit",
              background: activeTab === t.id ? "linear-gradient(135deg, #0057FF, #00C2FF)" : "#fff",
              color: activeTab === t.id ? "#fff" : "#4B5675",
              boxShadow: activeTab === t.id ? "0 4px 16px #0057FF30" : "0 1px 4px rgba(0,0,0,0.06)",
              whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 20 }}>
            {/* Info card */}
            <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: mob ? "20px" : "28px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 }}>
                👤 Personal Information
              </h3>
              {[
                { icon: "💼", label: "Role", value: profile.job_role },
                { icon: "🌍", label: "Nationality", value: profile.nationality },
                { icon: "📍", label: "Location", value: profile.current_location },
                { icon: "📞", label: "Phone", value: profile.phone },
                { icon: "🔗", label: "LinkedIn", value: profile.linkedin_url },
                { icon: "🛂", label: "Visa Status", value: profile.visa_status },
                { icon: "💷", label: "Salary Expectation", value: profile.salary_expectation ? `£${parseInt(profile.salary_expectation).toLocaleString()}/year` : "" },
                { icon: "⏱", label: "Experience", value: profile.experience_years ? `${profile.experience_years} years` : "" },
              ].map(item => item.value ? (
                <div key={item.label} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #F8FAFF" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
                    <div style={{ fontSize: 14, color: "#0A0F1E", fontWeight: 500, marginTop: 2 }}>{item.value}</div>
                  </div>
                </div>
              ) : null)}
              {!profile.job_role && !profile.nationality && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ color: "#9CA3B8", fontSize: 14, marginBottom: 12 }}>Complete your profile to get better job matches</div>
                  <button onClick={() => setActiveTab("profile")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Complete Profile →
                  </button>
                </div>
              )}
            </div>

            {/* Stats + bio */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Quick stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { icon: "🔖", value: savedJobs.length, label: "Saved Jobs", color: "#0057FF", tab: "saved" },
                  { icon: "🔔", value: alerts.length, label: "Active Alerts", color: "#00D68F", tab: "alerts" },
                  { icon: "📄", value: cvScore ? `${cvScore.overallScore}%` : "—", label: "CV Score", color: "#7C3AED", tab: "cv" },
                  { icon: "✅", value: `${completionPct}%`, label: "Profile", color: "#FF6B35", tab: "profile" },
                ].map(s => (
                  <div key={s.label} onClick={() => setActiveTab(s.tab)} style={{ background: "#fff", border: `1px solid ${s.color}20`, borderRadius: 16, padding: "16px", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${s.color}50`; e.currentTarget.style.transform = "translateY(-2px)" }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = `${s.color}20`; e.currentTarget.style.transform = "none" }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color, letterSpacing: -0.5 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "#9CA3B8", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Bio */}
              {profile.bio && (
                <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 16, padding: "20px" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0A0F1E", margin: "0 0 10px" }}>About Me</h3>
                  <p style={{ fontSize: 14, color: "#4B5675", lineHeight: 1.7, margin: 0 }}>{profile.bio}</p>
                </div>
              )}

              {/* Visa status */}
              {profile.visa_status && (
                <div style={{ background: profile.visa_status === "No UK Visa" ? "#FFF7ED" : "#F0FDF4", border: `1px solid ${profile.visa_status === "No UK Visa" ? "#FED7AA" : "#BBF7D0"}`, borderRadius: 16, padding: "16px 20px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0A0F1E", marginBottom: 4 }}>🛂 Visa Status: {profile.visa_status}</div>
                  <div style={{ fontSize: 13, color: "#4B5675" }}>
                    {profile.visa_status === "No UK Visa" ? "You need a visa sponsor — use our verified job search to find eligible employers" :
                     profile.visa_status === "Graduate Visa" ? "You can switch to Skilled Worker Visa with a sponsored job offer" :
                     profile.visa_status === "Skilled Worker Visa" ? "You already have a Skilled Worker Visa — you can switch employers" :
                     "Check the visa checker for your options"}
                  </div>
                  <button onClick={() => navigate("/visa-checker")} style={{ marginTop: 10, background: "none", border: "none", color: "#0057FF", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                    Check Visa Options →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EDIT PROFILE TAB */}
        {activeTab === "profile" && (
          <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 22, padding: mob ? "20px" : "36px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0A0F1E", margin: 0 }}>Edit Profile</h2>
              {saved && <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "6px 14px", color: "#16A34A", fontSize: 13, fontWeight: 600 }}>✅ Saved!</div>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 18 }}>
              {[
                { key: "full_name", label: "Full Name", placeholder: "Your full name" },
                { key: "phone", label: "Phone Number", placeholder: "+44 7xxx xxxxxx" },
                { key: "current_location", label: "Current Location", placeholder: "e.g. London, UK" },
                { key: "linkedin_url", label: "LinkedIn URL", placeholder: "linkedin.com/in/yourname" },
                { key: "salary_expectation", label: "Salary Expectation (£/year)", placeholder: "e.g. 45000", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label style={lbl}>{f.label}</label>
                  <input value={profile[f.key] || ""} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} type={f.type || "text"} style={inp}
                    onFocus={e => e.target.style.borderColor = "#0057FF"}
                    onBlur={e => e.target.style.borderColor = "#E8EEFF"}
                  />
                </div>
              ))}

              <div>
                <label style={lbl}>Nationality</label>
                <select value={profile.nationality || ""} onChange={e => setProfile(p => ({ ...p, nationality: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                  <option value="">Select nationality...</option>
                  {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>Job Role</label>
                <select value={profile.job_role || ""} onChange={e => setProfile(p => ({ ...p, job_role: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                  <option value="">Select your role...</option>
                  {ALL_JOBS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>Visa Status</label>
                <select value={profile.visa_status || ""} onChange={e => setProfile(p => ({ ...p, visa_status: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                  <option value="">Select status...</option>
                  {["No UK Visa","Student Visa","Graduate Visa","Skilled Worker Visa","Health & Care Worker Visa","Global Talent Visa","ILR / Settled Status","British Citizen"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>Years of Experience</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["0-1","1-3","3-5","5-10","10+"].map(y => (
                    <button key={y} onClick={() => setProfile(p => ({ ...p, experience_years: y }))} style={{ flex: 1, padding: "11px 4px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${profile.experience_years === y ? "#0057FF" : "#E8EEFF"}`, background: profile.experience_years === y ? "#0057FF0D" : "#F8FAFF", color: profile.experience_years === y ? "#0057FF" : "#4B5675", fontFamily: "inherit" }}>{y}</button>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                <label style={lbl}>Bio / About You</label>
                <textarea value={profile.bio || ""} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Brief summary of your background, skills and what you're looking for..." rows={4} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = "#0057FF"}
                  onBlur={e => e.target.style.borderColor = "#E8EEFF"}
                />
              </div>

              <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                <label style={lbl}>Industry</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {INDUSTRIES.map(ind => (
                    <button key={ind} onClick={() => setProfile(p => ({ ...p, industry: ind }))} style={{ padding: "7px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${profile.industry === ind ? "#0057FF" : "#E8EEFF"}`, background: profile.industry === ind ? "#0057FF0D" : "#F8FAFF", color: profile.industry === ind ? "#0057FF" : "#4B5675", fontFamily: "inherit" }}>{ind}</button>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                <label style={lbl}>Open to Work</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div onClick={() => setProfile(p => ({ ...p, open_to_work: !p.open_to_work }))} style={{ width: 44, height: 24, borderRadius: 12, background: profile.open_to_work ? "#00D68F" : "#E8EEFF", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: 2, left: profile.open_to_work ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
                  </div>
                  <span style={{ fontSize: 14, color: profile.open_to_work ? "#00D68F" : "#4B5675", fontWeight: 600 }}>
                    {profile.open_to_work ? "✅ Showing as Open to Work" : "Not showing as Open to Work"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #E8EEFF", display: "flex", gap: 12 }}>
              <button onClick={handleSave} disabled={saving} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 11, padding: "13px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 18px #0057FF30", opacity: saving ? 0.75 : 1 }}>
                {saving ? "Saving..." : "Save Changes →"}
              </button>
              <button onClick={() => navigate("/visa-checker")} style={{ background: "#F8FAFF", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 11, padding: "13px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Check Visa Eligibility
              </button>
            </div>
          </div>
        )}

        {/* CV & SCORE TAB */}
        {activeTab === "cv" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Upload */}
            <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: mob ? "20px" : "32px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", margin: "0 0 6px" }}>Upload Your CV</h3>
              <p style={{ color: "#9CA3B8", fontSize: 13, margin: "0 0 20px" }}>For best results upload as .txt — PDF and .docx also supported</p>

              <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleCvUpload(e.dataTransfer.files[0]) }} onClick={() => document.getElementById("cv-input").click()} style={{ border: `2px dashed ${cvName ? "#00D68F" : "#E8EEFF"}`, borderRadius: 16, padding: mob ? "32px 16px" : "40px 24px", textAlign: "center", background: cvName ? "#00D68F05" : "#F8FAFF", cursor: "pointer", marginBottom: 20, transition: "all 0.25s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = cvName ? "#00D68F" : "#0057FF"}
                onMouseLeave={e => e.currentTarget.style.borderColor = cvName ? "#00D68F" : "#E8EEFF"}
              >
                <input id="cv-input" type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={e => handleCvUpload(e.target.files[0])} />
                <div style={{ fontSize: 40, marginBottom: 12 }}>{cvName ? "✅" : "📄"}</div>
                {cvName ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0A0F1E", marginBottom: 4 }}>{cvName}</div>
                    <div style={{ color: "#00D68F", fontSize: 13, fontWeight: 600 }}>Uploaded successfully · Click to replace</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#0A0F1E", marginBottom: 6 }}>Drop your CV here or click to browse</div>
                    <div style={{ color: "#4B5675", fontSize: 13 }}>PDF, DOC, DOCX or TXT · Max 5MB</div>
                  </>
                )}
              </div>

              {(cvName && !cvScore) && (
                <button onClick={handleScoreCV} disabled={scoring} style={{ width: "100%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontSize: 16, fontWeight: 700, cursor: scoring ? "wait" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 20px #0057FF30", opacity: scoring ? 0.8 : 1 }}>
                  {scoring ? "🤖 AI is analysing your CV..." : "🤖 Score My CV with AI →"}
                </button>
              )}

              {scoreError && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", color: "#DC2626", fontSize: 13, marginTop: 12 }}>
                  ❌ {scoreError}
                </div>
              )}
            </div>

            {/* Score results */}
            {cvScore && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Overall */}
                <div style={{ background: `linear-gradient(135deg, ${cvScore.overallScore >= 70 ? "#0038CC, #0057FF" : cvScore.overallScore >= 50 ? "#FF6B35, #FF9A3C" : "#DC2626, #FF6B35"})`, borderRadius: 20, padding: mob ? "24px 20px" : "32px", display: "flex", gap: mob ? 16 : 24, alignItems: "center", flexDirection: mob ? "column" : "row", textAlign: mob ? "center" : "left" }}>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: mob ? 64 : 80, fontWeight: 900, color: "#fff", letterSpacing: -4, lineHeight: 1 }}>{cvScore.overallScore}</div>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>/ 100</div>
                  </div>
                  <div>
                    <div style={{ fontSize: mob ? 18 : 22, fontWeight: 900, color: "#fff", marginBottom: 8 }}>
                      {cvScore.overallScore >= 80 ? "🎉 Excellent CV!" : cvScore.overallScore >= 60 ? "👍 Good — Some improvements needed" : "⚠️ Needs significant work"}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.6 }}>
                      AI analysis based on UK employer standards and 2024 visa sponsorship requirements
                    </div>
                    <button onClick={() => { setCvScore(null); setCvText(""); setCvName("") }} style={{ marginTop: 12, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      Upload new CV
                    </button>
                  </div>
                </div>

                {/* Breakdown */}
                <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 14 }}>
                  {[
                    { label: "UK Format Compliance", val: cvScore.ukFormat, feedback: cvScore.ukFormatFeedback, color: "#00D68F", icon: "🇬🇧" },
                    { label: "Visa Sponsorship Keywords", val: cvScore.visaKeywords, feedback: cvScore.visaKeywordsFeedback, color: "#0057FF", icon: "🛂" },
                    { label: "ATS Compatibility", val: cvScore.atsScore, feedback: cvScore.atsFeedback, color: "#7C3AED", icon: "🤖" },
                    { label: "Sponsor Company Match", val: cvScore.sponsorMatch, feedback: cvScore.sponsorMatchFeedback, color: "#FF6B35", icon: "🏛️" },
                  ].map(item => (
                    <div key={item.label} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 16, padding: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 14, color: "#0A0F1E", fontWeight: 700 }}>{item.icon} {item.label}</span>
                        <span style={{ fontSize: 22, fontWeight: 900, color: item.color }}>{item.val}%</span>
                      </div>
                      <div style={{ height: 6, background: "#E8EEFF", borderRadius: 3, marginBottom: 12 }}>
                        <div style={{ width: `${item.val}%`, height: "100%", background: item.color, borderRadius: 3, transition: "width 1s ease" }} />
                      </div>
                      <div style={{ fontSize: 12, color: "#4B5675", lineHeight: 1.6 }}>💡 {item.feedback}</div>
                    </div>
                  ))}
                </div>

                {/* Improvements */}
                {cvScore.topImprovements?.length > 0 && (
                  <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 16, padding: "20px" }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#C2410C", marginBottom: 14 }}>🚀 Top Improvements to Boost Your Score</div>
                    {cvScore.topImprovements.map((imp, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
                        <span style={{ background: "#FF6B35", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: 13, color: "#4B5675", lineHeight: 1.6 }}>{imp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SAVED JOBS TAB */}
        {activeTab === "saved" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", margin: 0 }}>Saved Jobs ({savedJobs.length})</h3>
              <button onClick={() => navigate("/jobs")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Find More Jobs →
              </button>
            </div>
            {savedJobs.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: "56px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔖</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#0A0F1E", marginBottom: 8 }}>No saved jobs yet</div>
                <div style={{ color: "#4B5675", fontSize: 14, marginBottom: 24 }}>Save jobs from the search page to track them here</div>
                <button onClick={() => navigate("/jobs")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Find Sponsored Jobs →
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {savedJobs.map(job => (
                  <div key={job.id} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 16, padding: mob ? "16px" : "20px 24px", display: "flex", gap: 14, alignItems: mob ? "flex-start" : "center", flexDirection: mob ? "column" : "row" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#0A0F1E", marginBottom: 4 }}>{job.job_title}</div>
                      <div style={{ color: "#4B5675", fontSize: 13, marginBottom: 6 }}>{job.employer} · 📍 {job.location}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {job.salary_min && <span style={{ background: "#0057FF10", color: "#0057FF", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>💷 £{job.salary_min?.toLocaleString()}{job.salary_max ? `–£${job.salary_max?.toLocaleString()}` : "+"}</span>}
                        <span style={{ background: "#00D68F10", color: "#00D68F", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>Score: {job.sponsorship_score}%</span>
                        <span style={{ background: "#E8EEFF", color: "#4B5675", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{job.source}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <a href={job.job_url} target="_blank" rel="noopener noreferrer" style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center" }}>
                        Apply →
                      </a>
                      <button onClick={() => removeJob(job.id)} style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", borderRadius: 9, padding: "9px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === "alerts" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", margin: 0 }}>Job Alerts ({alerts.length})</h3>
              <button onClick={() => setShowAlertForm(f => !f)} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                + New Alert
              </button>
            </div>

            {showAlertForm && (
              <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 18, padding: "24px", marginBottom: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: "#0A0F1E", margin: "0 0 16px" }}>Create Job Alert</h4>
                <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Job Title *</label>
                    <select value={newAlert.keyword} onChange={e => setNewAlert(a => ({ ...a, keyword: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                      <option value="">Select a role...</option>
                      {ALL_JOBS.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Location (optional)</label>
                    <input value={newAlert.location} onChange={e => setNewAlert(a => ({ ...a, location: e.target.value }))} placeholder="e.g. London, Manchester" style={inp}
                      onFocus={e => e.target.style.borderColor = "#0057FF"}
                      onBlur={e => e.target.style.borderColor = "#E8EEFF"}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>Frequency</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["instant","daily","weekly"].map(f => (
                      <button key={f} onClick={() => setNewAlert(a => ({ ...a, frequency: f }))} style={{ flex: 1, padding: "10px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${newAlert.frequency === f ? "#0057FF" : "#E8EEFF"}`, background: newAlert.frequency === f ? "#0057FF0D" : "#F8FAFF", color: newAlert.frequency === f ? "#0057FF" : "#4B5675", fontFamily: "inherit", textTransform: "capitalize" }}>{f}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={createAlert} disabled={!newAlert.keyword} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: !newAlert.keyword ? 0.7 : 1 }}>
                    Create Alert
                  </button>
                  <button onClick={() => setShowAlertForm(false)} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 10, padding: "11px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {alerts.length === 0 && !showAlertForm ? (
              <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: "56px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#0A0F1E", marginBottom: 8 }}>No alerts yet</div>
                <div style={{ color: "#4B5675", fontSize: 14, marginBottom: 24 }}>Create an alert to be notified when new sponsored jobs appear</div>
                <button onClick={() => setShowAlertForm(true)} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Create First Alert →
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {alerts.map(alert => (
                  <div key={alert.id} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 16, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#0A0F1E", marginBottom: 4 }}>{alert.keyword}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {alert.location && <span style={{ fontSize: 12, color: "#4B5675" }}>📍 {alert.location}</span>}
                        {alert.salary_min && <span style={{ fontSize: 12, color: "#4B5675" }}>💷 Min £{parseInt(alert.salary_min).toLocaleString()}</span>}
                        <span style={{ fontSize: 12, color: "#4B5675", textTransform: "capitalize" }}>⏰ {alert.frequency}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div onClick={() => toggleAlert(alert.id, alert.active)} style={{ width: 40, height: 22, borderRadius: 11, background: alert.active ? "#00D68F" : "#E8EEFF", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
                        <div style={{ position: "absolute", top: 2, left: alert.active ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                      </div>
                      <button onClick={() => deleteAlert(alert.id)} style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
