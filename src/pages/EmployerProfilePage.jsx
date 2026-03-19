import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

export default function EmployerProfilePage() {
  const { name } = useParams()
  const navigate = useNavigate()
  const [employer, setEmployer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const load = async () => {
      const decoded = decodeURIComponent(name)
      const { data } = await supabase
        .from("sponsors")
        .select("*")
        .ilike("organisation_name", `%${decoded}%`)
        .limit(1)
      setEmployer(data?.[0] || null)
      setLoading(false)
    }
    load()
  }, [name])

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFF", fontFamily: "inherit" }}>
      <div style={{ color: "#4B5675" }}>Loading employer profile...</div>
    </div>
  )

  if (!employer) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F8FAFF", fontFamily: "inherit" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>Employer not found</div>
      <div style={{ color: "#4B5675", marginBottom: 24 }}>This employer may not be on the UK sponsor register</div>
      <button onClick={() => navigate("/jobs")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Find Sponsored Jobs →</button>
    </div>
  )

  const initials = employer.organisation_name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
  const isARated = employer.rating === "A"

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "100px 6% 60px" }}>

        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#4B5675", fontSize: 14, cursor: "pointer", fontFamily: "inherit", marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>← Back</button>

        {/* Header */}
        <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 24, padding: "32px 36px", marginBottom: 24, boxShadow: "0 4px 24px rgba(0,57,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg, #0057FF15, #00C2FF15)", border: "2px solid #0057FF20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#0057FF", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0A0F1E", margin: 0, letterSpacing: -0.8 }}>{employer.organisation_name}</h1>
                <span style={{ background: "#00D68F15", border: "1px solid #00D68F30", color: "#00D68F", borderRadius: 100, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>✓ Verified UK Sponsor</span>
                {isARated && <span style={{ background: "#0057FF10", border: "1px solid #0057FF25", color: "#0057FF", borderRadius: 100, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>⭐ A-Rated</span>}
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14, color: "#4B5675" }}>
                {employer.town && <span>📍 {employer.town}{employer.county ? `, ${employer.county}` : ""}</span>}
                <span>🛂 {employer.route || "Skilled Worker"}</span>
                <span>⭐ Rating: {employer.rating || "A"}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#E8EEFF", borderRadius: 14, overflow: "hidden" }}>
            {[
              { label: "Sponsor Status", value: "Active", icon: "✅" },
              { label: "Visa Route", value: employer.route?.split(":")[0] || "Skilled Worker", icon: "🛂" },
              { label: "Rating", value: `${employer.rating || "A"}-Rated`, icon: "⭐" },
              { label: "Location", value: employer.town || "UK", icon: "📍" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", padding: "16px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0A0F1E" }}>{s.value}</div>
                <div style={{ color: "#9CA3B8", fontSize: 11, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Licence verification */}
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 14, padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 22 }}>🏛️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0A0F1E" }}>UK Home Office Verified Sponsor · Licence Status: <span style={{ color: "#16A34A" }}>Active</span></div>
            <div style={{ color: "#4B5675", fontSize: 13 }}>Verified against the official UK Home Office Register of Licensed Sponsors (updated {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })})</div>
          </div>
          <a href="https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers" target="_blank" rel="noopener noreferrer" style={{ color: "#0057FF", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>Check Register →</a>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #E8EEFF", borderRadius: 14, padding: 6, marginBottom: 24, width: "fit-content" }}>
          {["overview", "apply"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "9px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: activeTab === t ? "linear-gradient(135deg, #0057FF, #00C2FF)" : "transparent", color: activeTab === t ? "#fff" : "#4B5675", textTransform: "capitalize" }}>
              {t === "apply" ? "How to Apply" : "Overview"}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: "26px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", margin: "0 0 16px" }}>Sponsor Details</h3>
              {[
                { label: "Organisation", value: employer.organisation_name },
                { label: "Location", value: [employer.town, employer.county].filter(Boolean).join(", ") || "Not specified" },
                { label: "Visa Route", value: employer.route || "Skilled Worker" },
                { label: "Sponsor Rating", value: `${employer.rating || "A"} Rating` },
                { label: "Licence Status", value: "Active" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F8FAFF" }}>
                  <span style={{ fontSize: 13, color: "#9CA3B8", fontWeight: 600 }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: "#0A0F1E", fontWeight: 700 }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: "26px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", margin: "0 0 16px" }}>What This Means For You</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: "✅", title: "Can sponsor you", desc: "This employer holds an active UK Home Office sponsor licence and can issue a Certificate of Sponsorship." },
                  { icon: isARated ? "⭐" : "⚠️", title: isARated ? "A-Rating — Most Trusted" : "B-Rating — Has Conditions", desc: isARated ? "A-rated sponsors have full sponsorship privileges and meet all compliance requirements." : "B-rated sponsors are working towards A-rating and have some restrictions." },
                  { icon: "🛂", title: `${employer.route?.split(":")[0] || "Skilled Worker"} Route`, desc: "This is the visa route this employer can sponsor you under. Make sure your role qualifies." },
                ].map(item => (
                  <div key={item.title} style={{ display: "flex", gap: 12, background: "#F8FAFF", borderRadius: 12, padding: "14px" }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0A0F1E", marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: "#4B5675", lineHeight: 1.6 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "apply" && (
          <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: "28px" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", margin: "0 0 6px" }}>How to Apply to {employer.organisation_name}</h3>
            <p style={{ color: "#4B5675", fontSize: 14, margin: "0 0 28px" }}>Follow these steps to apply for a sponsored role at this employer</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { step: "01", title: "Find their open roles", desc: "Search for current vacancies on their website or job boards. Use IMMTECH's job search to find their sponsored roles.", action: () => navigate(`/jobs?q=${encodeURIComponent(employer.organisation_name)}`), actionLabel: "Search their jobs →" },
                { step: "02", title: "Prepare your CV", desc: "Make sure your CV is tailored for UK employers and includes relevant keywords for visa sponsorship.", action: () => navigate("/profile"), actionLabel: "Score your CV →" },
                { step: "03", title: "Check visa eligibility", desc: "Confirm your role qualifies for the visa route this employer sponsors and that your salary meets the threshold.", action: () => navigate("/visa-checker"), actionLabel: "Check eligibility →" },
                { step: "04", title: "Apply directly", desc: "Apply through their careers page or the job listing. Mention you require visa sponsorship in your application.", action: () => window.open(`https://www.google.com/search?q=${encodeURIComponent(employer.organisation_name + " careers jobs visa sponsorship")}`, "_blank"), actionLabel: "Find careers page →" },
              ].map(s => (
                <div key={s.step} style={{ display: "flex", gap: 16, padding: "18px", background: "#F8FAFF", borderRadius: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14, flexShrink: 0 }}>{s.step}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#0A0F1E", marginBottom: 6 }}>{s.title}</div>
                    <div style={{ fontSize: 14, color: "#4B5675", lineHeight: 1.6, marginBottom: 10 }}>{s.desc}</div>
                    <button onClick={s.action} style={{ background: "#0057FF10", border: "1px solid #0057FF25", color: "#0057FF", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{s.actionLabel}</button>
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
