import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { ALL_JOBS } from "../lib/constants"
import Nav from "../components/Nav"

const DEMO_NOTIFS = [
  { id: "d1", title: "New sponsored job matches your profile", desc: "Software Engineer at Google London — 95% sponsorship score", time: "2 hours ago", read: false, icon: "💼" },
  { id: "d2", title: "3 new NHS Nurse jobs in Manchester", desc: "Based on your saved alert: NHS Nurse · Manchester", time: "5 hours ago", read: false, icon: "🔔" },
  { id: "d3", title: "Visa threshold update — Nurses", desc: "Min salary for Health & Care Worker Visa updated to £29,000", time: "1 day ago", read: true, icon: "🛂" },
  { id: "d4", title: "Deloitte is hiring Data Analysts with sponsorship", desc: "Data Analyst at Deloitte Birmingham — 88% score", time: "2 days ago", read: true, icon: "💼" },
]

export default function NotificationsPage() {
  const [user, setUser] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newAlert, setNewAlert] = useState({
    keyword: "", location: "", salary_min: "", frequency: "daily", active: true
  })
  const navigate = useNavigate()

  const inp = {
    width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 10,
    padding: "11px 14px", fontSize: 14, color: "#0A0F1E",
    background: "#F8FAFF", fontFamily: "inherit", outline: "none",
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate("/auth"); return }
      setUser(user)
      const { data } = await supabase.from("job_alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      setAlerts(data || [])
    }
    load()
  }, [navigate])

  const createAlert = async () => {
    if (!newAlert.keyword) return
    setSaving(true)
    try {
      const { data } = await supabase.from("job_alerts").insert({
        user_id: user.id, ...newAlert,
        created_at: new Date().toISOString(),
      }).select().single()
      setAlerts(a => [data, ...a])
      setNewAlert({ keyword: "", location: "", salary_min: "", frequency: "daily", active: true })
      setShowForm(false)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const toggleAlert = async (id, active) => {
    await supabase.from("job_alerts").update({ active: !active }).eq("id", id)
    setAlerts(a => a.map(al => al.id === id ? { ...al, active: !active } : al))
  }

  const deleteAlert = async (id) => {
    await supabase.from("job_alerts").delete().eq("id", id)
    setAlerts(a => a.filter(al => al.id !== id))
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "100px 6% 60px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0A0F1E", margin: "0 0 6px", letterSpacing: -1 }}>Alerts & Notifications</h1>
            <p style={{ color: "#4B5675", fontSize: 15 }}>Stay updated on new sponsored jobs matching your profile</p>
          </div>
          <button onClick={() => setShowForm(f => !f)} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 11, padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px #0057FF30" }}>
            + New Alert
          </button>
        </div>

        {/* New alert form */}
        {showForm && (
          <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: 28, marginBottom: 24, boxShadow: "0 8px 32px rgba(0,57,255,0.06)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0A0F1E", margin: "0 0 20px" }}>Create Job Alert</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Job Title *</label>
                <select value={newAlert.keyword} onChange={e => setNewAlert(a => ({ ...a, keyword: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                  <option value="">Select a role...</option>
                  {ALL_JOBS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Location (optional)</label>
                <input value={newAlert.location} onChange={e => setNewAlert(a => ({ ...a, location: e.target.value }))} placeholder="e.g. London, Manchester" style={inp}
                  onFocus={e => e.target.style.borderColor = "#0057FF"}
                  onBlur={e => e.target.style.borderColor = "#E8EEFF"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Min Salary (£)</label>
                <input value={newAlert.salary_min} onChange={e => setNewAlert(a => ({ ...a, salary_min: e.target.value }))} placeholder="e.g. 30000" type="number" style={inp}
                  onFocus={e => e.target.style.borderColor = "#0057FF"}
                  onBlur={e => e.target.style.borderColor = "#E8EEFF"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Frequency</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["instant", "daily", "weekly"].map(f => (
                    <button key={f} onClick={() => setNewAlert(a => ({ ...a, frequency: f }))} style={{ flex: 1, padding: "10px 4px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${newAlert.frequency === f ? "#0057FF" : "#E8EEFF"}`, background: newAlert.frequency === f ? "#0057FF0D" : "#F8FAFF", color: newAlert.frequency === f ? "#0057FF" : "#4B5675", fontFamily: "inherit", textTransform: "capitalize" }}>{f}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={createAlert} disabled={saving || !newAlert.keyword} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving || !newAlert.keyword ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Create Alert"}
              </button>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 10, padding: "11px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* Active alerts */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", margin: "0 0 14px" }}>Your Job Alerts ({alerts.length})</h3>
            {alerts.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 16, padding: "32px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔔</div>
                <div style={{ fontWeight: 700, color: "#0A0F1E", marginBottom: 6 }}>No alerts yet</div>
                <div style={{ color: "#4B5675", fontSize: 14 }}>Create an alert to get notified of new sponsored jobs</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {alerts.map(alert => (
                  <div key={alert.id} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 14, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0A0F1E" }}>{alert.keyword}</div>
                        {alert.location && <div style={{ color: "#4B5675", fontSize: 12, marginTop: 2 }}>📍 {alert.location}</div>}
                        {alert.salary_min && <div style={{ color: "#4B5675", fontSize: 12 }}>💷 Min £{parseInt(alert.salary_min).toLocaleString()}</div>}
                        <div style={{ color: "#9CA3B8", fontSize: 11, marginTop: 4, textTransform: "capitalize" }}>⏰ {alert.frequency}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div onClick={() => toggleAlert(alert.id, alert.active)} style={{ width: 36, height: 20, borderRadius: 10, background: alert.active ? "#0057FF" : "#E8EEFF", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                          <div style={{ position: "absolute", top: 2, left: alert.active ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                        </div>
                        <span onClick={() => deleteAlert(alert.id)} style={{ color: "#9CA3B8", cursor: "pointer", fontSize: 16 }}>✕</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", margin: "0 0 14px" }}>Recent Notifications</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {DEMO_NOTIFS.map(n => (
                <div key={n.id} style={{ background: n.read ? "#fff" : "#0057FF05", border: `1px solid ${n.read ? "#E8EEFF" : "#0057FF20"}`, borderRadius: 14, padding: "16px 18px", position: "relative" }}>
                  {!n.read && <div style={{ position: "absolute", top: 16, right: 16, width: 8, height: 8, borderRadius: "50%", background: "#0057FF" }} />}
                  <div style={{ display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{n.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0A0F1E", marginBottom: 3 }}>{n.title}</div>
                      <div style={{ color: "#4B5675", fontSize: 12, lineHeight: 1.5, marginBottom: 4 }}>{n.desc}</div>
                      <div style={{ color: "#9CA3B8", fontSize: 11 }}>{n.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}