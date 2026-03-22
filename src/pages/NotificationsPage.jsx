import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { ALL_JOBS } from "../lib/constants"
import Nav from "../components/Nav"

function useW() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn) }, [])
  return w
}

const DEMO_NOTIFS = [
  { id: "d1", title: "New sponsored job matches your profile", desc: "Software Engineer at Google London — 95% sponsorship score", time: "2 hours ago", read: false, icon: "💼" },
  { id: "d2", title: "3 new NHS Nurse jobs in Manchester", desc: "Based on your saved alert: NHS Nurse · Manchester", time: "5 hours ago", read: false, icon: "🔔" },
  { id: "d3", title: "Visa threshold update — Nurses", desc: "Min salary for Health & Care Worker Visa updated to £29,000", time: "1 day ago", read: true, icon: "🛂" },
  { id: "d4", title: "Deloitte is hiring Data Analysts", desc: "Data Analyst at Deloitte Birmingham — 88% score", time: "2 days ago", read: true, icon: "💼" },
]

export default function NotificationsPage() {
  const [user, setUser] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("notifications")
  const [newAlert, setNewAlert] = useState({ keyword: "", location: "", salary_min: "", frequency: "daily", active: true })
  const navigate = useNavigate()
  const w = useW()
  const mob = w < 768
  const inp = { width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 10, padding: mob ? "13px" : "11px 14px", fontSize: mob ? 16 : 14, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none" }

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
      const { data } = await supabase.from("job_alerts").insert({ user_id: user.id, ...newAlert, created_at: new Date().toISOString() }).select().single()
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
      <div style={{ maxWidth: 860, margin: "0 auto", padding: mob ? "86px 4% 40px" : "100px 6% 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 900, color: "#0A0F1E", margin: "0 0 4px", letterSpacing: -1 }}>Alerts & Notifications</h1>
            <p style={{ color: "#4B5675", fontSize: mob ? 13 : 15, margin: 0 }}>Stay updated on new sponsored jobs</p>
          </div>
          <button onClick={() => setShowForm(f => !f)} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 11, padding: mob ? "11px 18px" : "11px 22px", fontSize: mob ? 13 : 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ New Alert</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #E8EEFF", borderRadius: 12, padding: 5, marginBottom: 20, width: "fit-content" }}>
          {[{ id: "notifications", label: "Notifications" }, { id: "alerts", label: `My Alerts (${alerts.length})` }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: mob ? "9px 16px" : "9px 20px", borderRadius: 9, fontSize: mob ? 13 : 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: activeTab === t.id ? "linear-gradient(135deg, #0057FF, #00C2FF)" : "transparent", color: activeTab === t.id ? "#fff" : "#4B5675", whiteSpace: "nowrap" }}>{t.label}</button>
          ))}
        </div>

        {/* New alert form */}
        {showForm && (
          <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 18, padding: mob ? "20px" : "28px", marginBottom: 20, boxShadow: "0 8px 32px rgba(0,57,255,0.06)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", margin: "0 0 18px" }}>Create Job Alert</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Job Title *</label>
                <select value={newAlert.keyword} onChange={e => setNewAlert(a => ({ ...a, keyword: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                  <option value="">Select a role...</option>
                  {ALL_JOBS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Location (optional)</label>
                <input value={newAlert.location} onChange={e => setNewAlert(a => ({ ...a, location: e.target.value }))} placeholder="e.g. London" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.7 }}>Frequency</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["instant","daily","weekly"].map(f => (
                    <button key={f} onClick={() => setNewAlert(a => ({ ...a, frequency: f }))} style={{ flex: 1, padding: "11px 4px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${newAlert.frequency === f ? "#0057FF" : "#E8EEFF"}`, background: newAlert.frequency === f ? "#0057FF0D" : "#F8FAFF", color: newAlert.frequency === f ? "#0057FF" : "#4B5675", fontFamily: "inherit", textTransform: "capitalize" }}>{f}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={createAlert} disabled={saving || !newAlert.keyword} style={{ flex: 2, background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: !newAlert.keyword ? 0.7 : 1 }}>{saving ? "Saving..." : "Create Alert"}</button>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Notifications tab */}
        {activeTab === "notifications" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DEMO_NOTIFS.map(n => (
              <div key={n.id} style={{ background: n.read ? "#fff" : "#0057FF05", border: `1px solid ${n.read ? "#E8EEFF" : "#0057FF20"}`, borderRadius: 14, padding: mob ? "14px" : "16px 18px", position: "relative" }}>
                {!n.read && <div style={{ position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: "50%", background: "#0057FF" }} />}
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ fontSize: mob ? 18 : 20, flexShrink: 0 }}>{n.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: mob ? 13 : 13, color: "#0A0F1E", marginBottom: 3 }}>{n.title}</div>
                    <div style={{ color: "#4B5675", fontSize: mob ? 12 : 12, lineHeight: 1.5, marginBottom: 4 }}>{n.desc}</div>
                    <div style={{ color: "#9CA3B8", fontSize: 11 }}>{n.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alerts tab */}
        {activeTab === "alerts" && (
          <div>
            {alerts.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 16, padding: "40px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔔</div>
                <div style={{ fontWeight: 700, color: "#0A0F1E", marginBottom: 6, fontSize: 16 }}>No alerts yet</div>
                <div style={{ color: "#4B5675", fontSize: 14, marginBottom: 16 }}>Create an alert to get notified of new sponsored jobs</div>
                <button onClick={() => setShowForm(true)} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Create Alert →</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {alerts.map(alert => (
                  <div key={alert.id} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 14, padding: mob ? "14px" : "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0A0F1E", marginBottom: 4 }}>{alert.keyword}</div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {alert.location && <span style={{ color: "#4B5675", fontSize: 12 }}>📍 {alert.location}</span>}
                          <span style={{ color: "#9CA3B8", fontSize: 11, textTransform: "capitalize" }}>⏰ {alert.frequency}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                        <div onClick={() => toggleAlert(alert.id, alert.active)} style={{ width: 38, height: 20, borderRadius: 10, background: alert.active ? "#00D68F" : "#E8EEFF", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                          <div style={{ position: "absolute", top: 2, left: alert.active ? 19 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                        </div>
                        <button onClick={() => deleteAlert(alert.id)} style={{ background: "#FEF2F2", border: "none", color: "#DC2626", borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                      </div>
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
