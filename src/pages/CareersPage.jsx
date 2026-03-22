import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Nav from "../components/Nav"

export default function CareersPage() {
  const navigate = useNavigate()
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn) }, [])
  const mob = w < 768

  const roles = [
    { title: "Full Stack Engineer", type: "Full-time · Remote", team: "Engineering", desc: "Help build and scale the IMMTECH platform. React, Node.js, Supabase. You'll own full features end to end.", tags: ["React", "Node.js", "PostgreSQL", "AI"] },
    { title: "Growth Marketing Manager", type: "Full-time · London / Remote", team: "Marketing", desc: "Drive user acquisition across SEO, paid and community channels. Targeting international professionals and UK employers.", tags: ["SEO", "Paid Social", "Content", "Analytics"] },
    { title: "Immigration Content Specialist", type: "Part-time · Remote", team: "Content", desc: "Create accurate, helpful content about UK immigration for international professionals. Must have immigration knowledge.", tags: ["UK Immigration", "Content Writing", "Research"] },
    { title: "Business Development Manager", type: "Full-time · London", team: "Sales", desc: "Build relationships with UK employers and recruitment agencies. Sell our employer subscription plans.", tags: ["B2B Sales", "SaaS", "HR Tech"] },
  ]

  const perks = [
    { icon: "🌍", title: "Remote First", desc: "Work from anywhere. We are a distributed team across the UK." },
    { icon: "🚀", title: "Early Stage Impact", desc: "Join at the ground floor. Your work directly shapes the product." },
    { icon: "💷", title: "Competitive Salary", desc: "Market rate salaries with equity options for early team members." },
    { icon: "🛂", title: "Visa Sponsorship", desc: "We sponsor Skilled Worker visas. We know the process better than anyone." },
    { icon: "📚", title: "Learning Budget", desc: "£1,000/year for courses, conferences and books." },
    { icon: "🏖️", title: "Flexible PTO", desc: "Minimum 25 days holiday. We trust you to manage your time." },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "inherit" }}>
      <Nav />

      <section style={{ background: "linear-gradient(160deg, #F0F5FF, #fff)", padding: mob ? "110px 5% 70px" : "160px 6% 100px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "#00D68F0D", border: "1px solid #00D68F30", borderRadius: 100, padding: "7px 18px", color: "#00D68F", fontSize: 13, fontWeight: 700, marginBottom: 24 }}>We're Hiring 🚀</div>
          <h1 style={{ fontSize: mob ? 32 : 60, fontWeight: 900, color: "#0A0F1E", margin: "0 0 20px", letterSpacing: -2, lineHeight: 1.1 }}>
            Help us connect<br /><span style={{ color: "#0057FF" }}>the world with the UK</span>
          </h1>
          <p style={{ fontSize: mob ? 14 : 18, color: "#4B5675", lineHeight: 1.8, marginBottom: 32 }}>
            We're a small, ambitious team building the UK's first AI-powered visa sponsorship job platform. If you care about solving real problems for international talent, we'd love to meet you.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {["🌍 Remote friendly", "🛂 Visa sponsorship available", "🚀 Early stage startup"].map(b => (
              <span key={b} style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 100, padding: "6px 14px", fontSize: 13, color: "#4B5675" }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section style={{ padding: mob ? "60px 5%" : "90px 6%", background: "#F8FAFF" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: mob ? 26 : 44, fontWeight: 900, color: "#0A0F1E", margin: "0 0 12px", letterSpacing: -1.5 }}>Why join IMMTECH?</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(3,1fr)", gap: 16 }}>
            {perks.map(p => (
              <div key={p.title} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 16, padding: "24px 20px" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{p.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0A0F1E", marginBottom: 6 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: "#4B5675", lineHeight: 1.6 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section style={{ padding: mob ? "60px 5%" : "90px 6%", background: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: mob ? 26 : 44, fontWeight: 900, color: "#0A0F1E", margin: "0 0 12px", letterSpacing: -1.5 }}>Open Roles</h2>
            <p style={{ color: "#4B5675", fontSize: 16 }}>All roles are open to international applicants — we sponsor visas</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {roles.map(role => (
              <div key={role.title} style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 18, padding: mob ? "20px" : "28px 32px", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#0057FF40"; e.currentTarget.style.background = "#fff" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8EEFF"; e.currentTarget.style.background = "#F8FAFF" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexDirection: mob ? "column" : "row" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ background: "#0057FF10", color: "#0057FF", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{role.team}</span>
                    </div>
                    <h3 style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: "#0A0F1E", margin: "0 0 6px" }}>{role.title}</h3>
                    <div style={{ fontSize: 13, color: "#4B5675", marginBottom: 10 }}>{role.type}</div>
                    <p style={{ fontSize: 14, color: "#4B5675", lineHeight: 1.7, margin: "0 0 12px" }}>{role.desc}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {role.tags.map(tag => <span key={tag} style={{ background: "#E8EEFF", color: "#4B5675", borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>{tag}</span>)}
                    </div>
                  </div>
                  <button onClick={() => navigate("/contact")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
                    Apply Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32, background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 16, padding: "28px" }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>💌</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0A0F1E", marginBottom: 6 }}>Don't see a role that fits?</div>
            <div style={{ color: "#4B5675", fontSize: 14, marginBottom: 16 }}>We're always looking for talented people. Send us your CV and tell us how you'd contribute.</div>
            <button onClick={() => navigate("/contact")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Get in Touch →
            </button>
          </div>
        </div>
      </section>

      <footer style={{ background: "#0A0F1E", padding: "40px 6%", textAlign: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 13 }}>© 2025 IMMTECH Ltd. All rights reserved.</span>
      </footer>
    </div>
  )
}
