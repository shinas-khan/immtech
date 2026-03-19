import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { ALL_JOBS, NATIONALITIES, INDUSTRIES } from "../lib/constants"
import Nav from "../components/Nav"

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({
    full_name: "", nationality: "", current_location: "",
    job_role: "", industry: "", experience_years: "",
    visa_status: "", salary_expectation: "", bio: "",
    linkedin_url: "", phone: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cvName, setCvName] = useState("")
  const [activeTab, setActiveTab] = useState("profile")
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate("/auth"); return }
      setUser(user)
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (data) setProfile(p => ({ ...p, ...data }))
      setLoading(false)
    }
    load()
  }, [navigate])

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from("profiles").upsert({
        id: user.id, email: user.email,
        ...profile, updated_at: new Date().toISOString(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleCvUpload = async (file) => {
    if (!file) return
    setCvName(file.name)
    try {
      const path = `${user.id}/cv-${Date.now()}.${file.name.split(".").pop()}`
      await supabase.storage.from("cvs").upload(path, file)
      await supabase.from("profiles").upsert({ id: user.id, cv_path: path, cv_name: file.name })
    } catch (err) { console.error(err) }
  }

  const inp = {
    width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 11,
    padding: "12px 15px", fontSize: 14, color: "#0A0F1E",
    background: "#F8FAFF", fontFamily: "inherit", outline: "none",
    transition: "border-color 0.2s",
  }

  const lbl = {
    display: "block", fontSize: 11, fontWeight: 700,
    color: "#4B5675", marginBottom: 6,
    textTransform: "uppercase", letterSpacing: 0.7,
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFF" }}>
      <div style={{ color: "#4B5675", fontSize: 15 }}>Loading your profile...</div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "100px 6% 60px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 36 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
            {profile.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 4px", letterSpacing: -0.8 }}>
              {profile.full_name || "Your Profile"}
            </h1>
            <div style={{ color: "#4B5675", fontSize: 15 }}>{user?.email}</div>
            {profile.job_role && (
              <div style={{ color: "#0057FF", fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                {profile.job_role}{profile.nationality ? ` · ${profile.nationality}` : ""}
              </div>
            )}
          </div>
          {saved && (
            <div style={{ marginLeft: "auto", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "8px 14px", color: "#16A34A", fontSize: 13, fontWeight: 600 }}>
              ✅ Saved!
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #E8EEFF", borderRadius: 14, padding: 6, marginBottom: 28, width: "fit-content" }}>
          {["profile", "cv", "preferences"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "9px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: activeTab === t ? "linear-gradient(135deg, #0057FF, #00C2FF)" : "transparent", color: activeTab === t ? "#fff" : "#4B5675", textTransform: "capitalize" }}>
              {t === "cv" ? "CV & Documents" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 22, padding: "36px" }}>

          {/* Profile tab */}
          {activeTab === "profile" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
                  {["No UK Visa", "Student Visa", "Graduate Visa", "Skilled Worker Visa", "ILR / Settled", "British Citizen"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Years of Experience</label>
                <div style={{ display: "flex", gap: 7 }}>
                  {["0-1", "1-3", "3-5", "5-10", "10+"].map(y => (
                    <button key={y} onClick={() => setProfile(p => ({ ...p, experience_years: y }))} style={{ flex: 1, padding: "11px 4px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${profile.experience_years === y ? "#0057FF" : "#E8EEFF"}`, background: profile.experience_years === y ? "#0057FF0D" : "#F8FAFF", color: profile.experience_years === y ? "#0057FF" : "#4B5675", fontFamily: "inherit" }}>{y}</button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Bio</label>
                <textarea value={profile.bio || ""} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Brief summary of your background and what you're looking for..." rows={4} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = "#0057FF"}
                  onBlur={e => e.target.style.borderColor = "#E8EEFF"}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Industry</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {INDUSTRIES.map(ind => (
                    <button key={ind} onClick={() => setProfile(p => ({ ...p, industry: ind }))} style={{ padding: "7px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${profile.industry === ind ? "#0057FF" : "#E8EEFF"}`, background: profile.industry === ind ? "#0057FF0D" : "#F8FAFF", color: profile.industry === ind ? "#0057FF" : "#4B5675", fontFamily: "inherit", transition: "all 0.18s" }}>{ind}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CV tab */}
          {activeTab === "cv" && (
            <div>
              <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleCvUpload(e.dataTransfer.files[0]) }} onClick={() => document.getElementById("cv-input").click()} style={{ border: `2px dashed ${cvName ? "#00D68F" : "#E8EEFF"}`, borderRadius: 18, padding: "48px 24px", textAlign: "center", background: cvName ? "#00D68F05" : "#F8FAFF", cursor: "pointer", marginBottom: 28, transition: "all 0.25s" }}>
                <input id="cv-input" type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={e => handleCvUpload(e.target.files[0])} />
                <div style={{ fontSize: 44, marginBottom: 14 }}>{cvName ? "✅" : "📄"}</div>
                {cvName ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#0A0F1E", marginBottom: 4 }}>{cvName}</div>
                    <div style={{ color: "#00D68F", fontSize: 14, fontWeight: 600 }}>Uploaded · Click to replace</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 17, color: "#0A0F1E", marginBottom: 6 }}>Drop your CV here or click to browse</div>
                    <div style={{ color: "#4B5675", fontSize: 14 }}>PDF, DOC or DOCX · Max 5MB</div>
                  </>
                )}
              </div>

              {/* Blurred score */}
              <div style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 18, padding: 28, position: "relative", overflow: "hidden" }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0A0F1E", margin: "0 0 20px" }}>Your CV Score</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, filter: "blur(5px)", userSelect: "none" }}>
                  {[
                    { label: "UK Format Compliance", val: 85, color: "#00D68F" },
                    { label: "Visa Sponsorship Keywords", val: 62, color: "#FF6B35" },
                    { label: "ATS Compatibility", val: 90, color: "#0057FF" },
                    { label: "Sponsor Company Match", val: 71, color: "#7C3AED" },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 14, color: "#4B5675", fontWeight: 500 }}>{item.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.val}%</span>
                      </div>
                      <div style={{ height: 6, background: "#E8EEFF", borderRadius: 3 }}>
                        <div style={{ width: `${item.val}%`, height: "100%", background: item.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(248,250,255,0.98) 50%, transparent)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 28px 28px" }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>🔒</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#0A0F1E", marginBottom: 6, textAlign: "center" }}>Unlock your full CV score</div>
                  <div style={{ color: "#4B5675", fontSize: 13, marginBottom: 16, textAlign: "center" }}>Upgrade to Premium to see your breakdown and AI rewrite</div>
                  <button style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 26px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Upgrade to Premium →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preferences tab */}
          {activeTab === "preferences" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ background: "#F8FAFF", borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0A0F1E", marginBottom: 4 }}>Job Alerts</div>
                <div style={{ color: "#4B5675", fontSize: 14, marginBottom: 14 }}>Get notified when new sponsored jobs match your profile</div>
                <button onClick={() => navigate("/notifications")} style={{ background: "#0057FF0D", border: "1.5px solid #0057FF25", color: "#0057FF", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Manage Alerts →
                </button>
              </div>
              <div style={{ background: "#F8FAFF", borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0A0F1E", marginBottom: 4 }}>Account</div>
                <div style={{ color: "#4B5675", fontSize: 14 }}>Email: {user?.email}</div>
              </div>
            </div>
          )}

          {/* Save button */}
          {activeTab !== "preferences" && (
            <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #E8EEFF" }}>
              <button onClick={handleSave} disabled={saving} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 11, padding: "13px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 18px #0057FF30", opacity: saving ? 0.75 : 1 }}>
                {saving ? "Saving..." : "Save Changes →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}