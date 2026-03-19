import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { ALL_JOBS, NATIONALITIES, INDUSTRIES } from "../lib/constants"
import Nav from "../components/Nav"

const CLAUDE_MODEL = "claude-sonnet-4-20250514"

async function scoreCV(cvText, jobRole) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a UK immigration and recruitment expert. Analyse this CV for someone applying for "${jobRole || 'a skilled worker'}" role in the UK with visa sponsorship.

Score these 4 areas from 0-100 and give specific feedback:
1. UK Format Compliance - Does it follow UK CV standards (no photo, no DOB, reverse chronological, 2 pages max)?
2. Visa Sponsorship Keywords - Does it contain keywords that UK visa sponsors look for?
3. ATS Compatibility - Is it ATS-friendly (clear headings, standard fonts, no tables/graphics)?
4. Sponsor Company Match - Does the experience match what UK sponsor employers typically want?

CV TEXT:
${cvText.slice(0, 3000)}

Respond ONLY with this exact JSON, no other text:
{
  "ukFormat": 75,
  "visaKeywords": 60,
  "atsScore": 85,
  "sponsorMatch": 70,
  "overallScore": 72,
  "ukFormatFeedback": "Your CV follows most UK standards but...",
  "visaKeywordsFeedback": "Add these keywords: Certificate of Sponsorship, Skilled Worker...",
  "atsFeedback": "Good structure but remove the table in skills section...",
  "sponsorMatchFeedback": "Your experience aligns well with NHS and tech sponsors...",
  "topImprovements": ["Add a professional summary", "Remove date of birth", "Add relevant UK certifications"]
}`
      }]
    })
  })
  const data = await response.json()
  const text = data.content?.[0]?.text || ""
  return JSON.parse(text.replace(/```json|```/g, "").trim())
}

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
  const [cvText, setCvText] = useState("")
  const [cvScore, setCvScore] = useState(null)
  const [scoring, setScoring] = useState(false)
  const [scoreError, setScoreError] = useState("")
  const [activeTab, setActiveTab] = useState("profile")
  const [savedJobs, setSavedJobs] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate("/auth"); return }
      setUser(user)
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (data) setProfile(p => ({ ...p, ...data }))
      if (data?.cv_name) setCvName(data.cv_name)
      if (data?.cv_score) setCvScore(JSON.parse(data.cv_score))
      const { data: jobs } = await supabase.from("saved_jobs").select("*").eq("user_id", user.id).order("saved_at", { ascending: false })
      setSavedJobs(jobs || [])
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
    const text = await file.text()
    setCvText(text)
    try {
      const path = `${user.id}/cv-${Date.now()}.${file.name.split(".").pop()}`
      await supabase.storage.from("cvs").upload(path, file)
      await supabase.from("profiles").upsert({ id: user.id, cv_path: path, cv_name: file.name })
    } catch (err) { console.error(err) }
  }

  const handleScoreCV = async () => {
    if (!cvText) { setScoreError("Please upload your CV first"); return }
    setScoring(true); setScoreError("")
    try {
      const score = await scoreCV(cvText, profile.job_role)
      setCvScore(score)
      await supabase.from("profiles").upsert({ id: user.id, cv_score: JSON.stringify(score) })
    } catch (err) {
      setScoreError("Could not score CV. Please try again.")
      console.error(err)
    }
    finally { setScoring(false) }
  }

  const removeJob = async (id) => {
    await supabase.from("saved_jobs").delete().eq("id", id)
    setSavedJobs(j => j.filter(s => s.id !== id))
  }

  const inp = { width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 11, padding: "12px 15px", fontSize: 14, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" }
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFF" }}>
      <div style={{ color: "#4B5675", fontSize: 15 }}>Loading your profile...</div>
    </div>
  )

  const tabs = ["profile", "cv", "saved", "preferences"]

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "100px 6% 60px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 36, flexWrap: "wrap" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
            {profile.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 4px", letterSpacing: -0.8 }}>{profile.full_name || "Your Profile"}</h1>
            <div style={{ color: "#4B5675", fontSize: 15 }}>{user?.email}</div>
            {profile.job_role && <div style={{ color: "#0057FF", fontSize: 14, fontWeight: 600, marginTop: 2 }}>{profile.job_role}{profile.nationality ? ` · ${profile.nationality}` : ""}</div>}
          </div>
          {saved && <div style={{ marginLeft: "auto", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "8px 14px", color: "#16A34A", fontSize: 13, fontWeight: 600 }}>✅ Saved!</div>}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #E8EEFF", borderRadius: 14, padding: 6, marginBottom: 28, width: "fit-content", flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "9px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: activeTab === t ? "linear-gradient(135deg, #0057FF, #00C2FF)" : "transparent", color: activeTab === t ? "#fff" : "#4B5675", textTransform: "capitalize", position: "relative" }}>
              {t === "cv" ? "CV & Score" : t === "saved" ? `Saved Jobs ${savedJobs.length > 0 ? `(${savedJobs.length})` : ""}` : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 22, padding: "36px" }}>

          {/* PROFILE TAB */}
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
                  <input value={profile[f.key] || ""} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} type={f.type || "text"} style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
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
                <textarea value={profile.bio || ""} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Brief summary of your background and what you're looking for..." rows={4} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Industry</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {INDUSTRIES.map(ind => (
                    <button key={ind} onClick={() => setProfile(p => ({ ...p, industry: ind }))} style={{ padding: "7px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${profile.industry === ind ? "#0057FF" : "#E8EEFF"}`, background: profile.industry === ind ? "#0057FF0D" : "#F8FAFF", color: profile.industry === ind ? "#0057FF" : "#4B5675", fontFamily: "inherit" }}>{ind}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CV TAB */}
          {activeTab === "cv" && (
            <div>
              {/* Upload area */}
              <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleCvUpload(e.dataTransfer.files[0]) }} onClick={() => document.getElementById("cv-input").click()} style={{ border: `2px dashed ${cvName ? "#00D68F" : "#E8EEFF"}`, borderRadius: 18, padding: "40px 24px", textAlign: "center", background: cvName ? "#00D68F05" : "#F8FAFF", cursor: "pointer", marginBottom: 24 }}>
                <input id="cv-input" type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={e => handleCvUpload(e.target.files[0])} />
                <div style={{ fontSize: 40, marginBottom: 12 }}>{cvName ? "✅" : "📄"}</div>
                {cvName ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#0A0F1E", marginBottom: 4 }}>{cvName}</div>
                    <div style={{ color: "#00D68F", fontSize: 14, fontWeight: 600 }}>Uploaded · Click to replace</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 17, color: "#0A0F1E", marginBottom: 6 }}>Drop your CV here or click to browse</div>
                    <div style={{ color: "#4B5675", fontSize: 14 }}>PDF, DOC, DOCX or TXT · Max 5MB</div>
                  </>
                )}
              </div>

              {/* Score button */}
              {cvName && !cvScore && (
                <button onClick={handleScoreCV} disabled={scoring} style={{ width: "100%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 24, opacity: scoring ? 0.75 : 1 }}>
                  {scoring ? "🤖 AI is analysing your CV..." : "🤖 Score My CV with AI →"}
                </button>
              )}

              {scoreError && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", color: "#DC2626", fontSize: 13, marginBottom: 16 }}>❌ {scoreError}</div>}

              {/* Real AI Score Results */}
              {cvScore && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Overall score */}
                  <div style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", borderRadius: 18, padding: "28px 32px", display: "flex", alignItems: "center", gap: 24 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 64, fontWeight: 900, color: "#fff", letterSpacing: -3, lineHeight: 1 }}>{cvScore.overallScore}</div>
                      <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>Overall Score</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
                        {cvScore.overallScore >= 80 ? "🎉 Excellent CV!" : cvScore.overallScore >= 60 ? "👍 Good — Room to improve" : "⚠️ Needs significant work"}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.6 }}>
                        AI analysis based on UK employer standards and visa sponsorship requirements
                      </div>
                    </div>
                  </div>

                  {/* Score breakdown */}
                  {[
                    { label: "UK Format Compliance", val: cvScore.ukFormat, feedback: cvScore.ukFormatFeedback, color: "#00D68F" },
                    { label: "Visa Sponsorship Keywords", val: cvScore.visaKeywords, feedback: cvScore.visaKeywordsFeedback, color: "#0057FF" },
                    { label: "ATS Compatibility", val: cvScore.atsScore, feedback: cvScore.atsFeedback, color: "#7C3AED" },
                    { label: "Sponsor Company Match", val: cvScore.sponsorMatch, feedback: cvScore.sponsorMatchFeedback, color: "#FF6B35" },
                  ].map(item => (
                    <div key={item.label} style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 14, padding: "20px 22px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 15, color: "#0A0F1E", fontWeight: 700 }}>{item.label}</span>
                        <span style={{ fontSize: 20, fontWeight: 900, color: item.color }}>{item.val}%</span>
                      </div>
                      <div style={{ height: 8, background: "#E8EEFF", borderRadius: 4, marginBottom: 12 }}>
                        <div style={{ width: `${item.val}%`, height: "100%", background: item.color, borderRadius: 4, transition: "width 1s ease" }} />
                      </div>
                      <div style={{ fontSize: 13, color: "#4B5675", lineHeight: 1.6 }}>💡 {item.feedback}</div>
                    </div>
                  ))}

                  {/* Top improvements */}
                  {cvScore.topImprovements?.length > 0 && (
                    <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 14, padding: "20px 22px" }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#C2410C", marginBottom: 14 }}>🚀 Top Improvements</div>
                      {cvScore.topImprovements.map((imp, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                          <span style={{ background: "#FF6B35", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                          <span style={{ fontSize: 14, color: "#4B5675", lineHeight: 1.5 }}>{imp}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={() => { setCvScore(null); setCvText("") }} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Upload new CV & rescore
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SAVED JOBS TAB */}
          {activeTab === "saved" && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", margin: "0 0 20px" }}>Saved Jobs ({savedJobs.length})</h3>
              {savedJobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 24px" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔖</div>
                  <div style={{ fontWeight: 700, color: "#0A0F1E", marginBottom: 8, fontSize: 16 }}>No saved jobs yet</div>
                  <div style={{ color: "#4B5675", fontSize: 14, marginBottom: 20 }}>Save jobs from the search page to track them here</div>
                  <button onClick={() => navigate("/jobs")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Find Sponsored Jobs →</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {savedJobs.map(job => (
                    <div key={job.id} style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 14, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#0A0F1E", marginBottom: 4 }}>{job.job_title}</div>
                        <div style={{ color: "#4B5675", fontSize: 13 }}>{job.employer} · {job.location}</div>
                        {job.salary_min && <div style={{ color: "#9CA3B8", fontSize: 12, marginTop: 4 }}>💷 £{job.salary_min?.toLocaleString()}{job.salary_max ? ` – £${job.salary_max?.toLocaleString()}` : "+"}</div>}
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <span style={{ background: "#0057FF15", border: "1px solid #0057FF30", color: "#0057FF", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{job.source}</span>
                          <span style={{ background: "#00D68F15", border: "1px solid #00D68F30", color: "#00D68F", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>Score: {job.sponsorship_score}%</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <a href={job.job_url} target="_blank" rel="noopener noreferrer" style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Apply →</a>
                        <button onClick={() => removeJob(job.id)} style={{ background: "none", border: "1px solid #E8EEFF", color: "#9CA3B8", borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === "preferences" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#F8FAFF", borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0A0F1E", marginBottom: 4 }}>Job Alerts</div>
                <div style={{ color: "#4B5675", fontSize: 14, marginBottom: 14 }}>Get notified when new sponsored jobs match your profile</div>
                <button onClick={() => navigate("/notifications")} style={{ background: "#0057FF0D", border: "1.5px solid #0057FF25", color: "#0057FF", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Manage Alerts →</button>
              </div>
              <div style={{ background: "#F8FAFF", borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0A0F1E", marginBottom: 4 }}>Account</div>
                <div style={{ color: "#4B5675", fontSize: 14 }}>Email: {user?.email}</div>
              </div>
            </div>
          )}

          {/* Save button */}
          {activeTab === "profile" && (
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
