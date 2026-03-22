import { useNavigate } from "react-router-dom"
import Nav from "../components/Nav"

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn) }, [])
  return w
}

import { useState, useEffect } from "react"

export default function AboutPage() {
  const navigate = useNavigate()
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn) }, [])
  const mob = w < 768

  const stats = [
    { value: "125,284", label: "Verified UK Sponsors", icon: "🏛️" },
    { value: "50,000+", label: "Sponsored Jobs Listed", icon: "💼" },
    { value: "47", label: "Countries Supported", icon: "🌍" },
    { value: "2024", label: "Founded", icon: "🚀" },
  ]

  const values = [
    { icon: "🎯", title: "Accuracy First", desc: "Every employer we show is verified against the official UK Home Office register of licensed sponsors. We never guess." },
    { icon: "🌍", title: "Built for International Talent", desc: "We were built by international professionals who experienced the problem firsthand. This platform exists because we needed it." },
    { icon: "🤖", title: "AI for Good", desc: "We use cutting-edge AI not to replace human judgement but to give every international candidate the same quality of guidance that was previously only available to those who could afford an immigration lawyer." },
    { icon: "🔒", title: "Trust & Transparency", desc: "We only show jobs from verified sponsors. We tell you exactly why a job scores the way it does. No black boxes, no hidden algorithms." },
    { icon: "💡", title: "Simplicity", desc: "UK immigration is complex enough. Our job is to make the job search part as simple as possible. One search, verified results, instant eligibility check." },
    { icon: "🤝", title: "Community", desc: "We are building a global community of international professionals helping each other navigate the UK immigration system." },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "inherit" }}>
      <Nav />

      {/* Hero */}
      <section style={{ background: "linear-gradient(160deg, #F0F5FF 0%, #fff 100%)", padding: mob ? "110px 5% 70px" : "160px 6% 100px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 100, padding: "7px 18px", marginBottom: 24, color: "#0057FF", fontSize: 13, fontWeight: 700 }}>
            🌍 About IMMTECH
          </div>
          <h1 style={{ fontSize: mob ? 32 : 60, fontWeight: 900, color: "#0A0F1E", margin: "0 0 20px", letterSpacing: -2, lineHeight: 1.1 }}>
            We built the platform<br /><span style={{ color: "#0057FF" }}>we wished existed</span>
          </h1>
          <p style={{ fontSize: mob ? 15 : 18, color: "#4B5675", lineHeight: 1.8, maxWidth: 580, margin: "0 auto 36px" }}>
            IMMTECH was born from a simple frustration — finding a genuine visa-sponsored job in the UK was unnecessarily hard, confusing and full of false promises. We decided to fix that.
          </p>
          <button onClick={() => navigate("/jobs")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 13, padding: "15px 36px", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 32px #0057FF35" }}>
            Find Sponsored Jobs →
          </button>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: "linear-gradient(135deg, #0038CC, #0057FF)", padding: mob ? "56px 5%" : "72px 6%" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4,1fr)", gap: 24 }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: mob ? 28 : 38, fontWeight: 900, color: "#fff", letterSpacing: -1.5 }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section style={{ padding: mob ? "70px 5%" : "110px 6%", background: "#fff" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 100, padding: "7px 18px", color: "#0057FF", fontSize: 13, fontWeight: 700, marginBottom: 24 }}>Our Story</div>
          <h2 style={{ fontSize: mob ? 28 : 48, fontWeight: 900, color: "#0A0F1E", margin: "0 0 28px", letterSpacing: -1.5, lineHeight: 1.1 }}>
            Why we built<br /><span style={{ color: "#0057FF" }}>IMMTECH</span>
          </h2>
          {[
            "Every member of the IMMTECH founding team is an international professional who came to the UK. We all experienced the same frustrating process — spending weeks applying to jobs that claimed to offer visa sponsorship but didn't, wasting time on applications to employers who weren't even licensed to sponsor, and having no reliable way to check if an employer was genuine.",
            "We discovered that the UK Home Office publishes a complete register of every licensed sponsor in the country — 125,000+ companies. But nobody had connected this data to actual job listings. Job boards like Indeed and LinkedIn were showing jobs that mentioned 'visa sponsorship' but had no way to verify if the employer actually held a sponsor licence.",
            "So we built IMMTECH. We loaded the entire UK Home Office sponsor register into our database, connected it to live job APIs from Reed and Adzuna, and built an AI engine that verifies every employer in real time. We added a visa eligibility checker with real SOC code salary thresholds, AI CV scoring, and a complete profile system.",
            "Our mission is simple: to make the UK accessible to the world's best international talent by removing the friction, misinformation and wasted effort from the visa sponsorship job search process.",
          ].map((para, i) => (
            <p key={i} style={{ fontSize: mob ? 14 : 16, color: "#4B5675", lineHeight: 1.85, marginBottom: 20 }}>{para}</p>
          ))}
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: mob ? "70px 5%" : "110px 6%", background: "#F8FAFF" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 40 : 64 }}>
            <div style={{ display: "inline-block", background: "#00D68F0D", border: "1px solid #00D68F30", borderRadius: 100, padding: "7px 18px", color: "#00D68F", fontSize: 13, fontWeight: 700, marginBottom: 20 }}>Our Values</div>
            <h2 style={{ fontSize: mob ? 28 : 48, fontWeight: 900, color: "#0A0F1E", margin: "0 0 16px", letterSpacing: -1.5 }}>What we stand for</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(3,1fr)", gap: 20 }}>
            {values.map(v => (
              <div key={v.title} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: "28px 24px" }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{v.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0A0F1E", margin: "0 0 10px" }}>{v.title}</h3>
                <p style={{ fontSize: 14, color: "#4B5675", lineHeight: 1.75, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: mob ? "60px 5%" : "100px 6%", background: "#fff" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", background: "linear-gradient(145deg, #0038CC, #0057FF)", borderRadius: 28, padding: mob ? "48px 24px" : "72px 60px", boxShadow: "0 32px 80px #0057FF25" }}>
          <h2 style={{ fontSize: mob ? 26 : 44, fontWeight: 900, color: "#fff", margin: "0 0 16px", letterSpacing: -1.5 }}>Join us in fixing<br />international hiring</h2>
          <p style={{ color: "rgba(255,255,255,0.72)", fontSize: mob ? 14 : 17, lineHeight: 1.8, margin: "0 0 32px" }}>Start your search today. Find a genuine sponsored role in minutes.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexDirection: mob ? "column" : "row", maxWidth: mob ? 260 : "none", margin: "0 auto" }}>
            <button onClick={() => navigate("/onboarding")} style={{ background: "#fff", color: "#0057FF", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Get Started Free →</button>
            <button onClick={() => navigate("/jobs")} style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 12, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Browse Jobs</button>
          </div>
        </div>
      </section>

      <footer style={{ background: "#0A0F1E", padding: "40px 6%", textAlign: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 13 }}>© 2025 IMMTECH Ltd. All rights reserved.</span>
      </footer>
    </div>
  )
}
