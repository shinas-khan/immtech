import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Nav from "../components/Nav"

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth)
    window.addEventListener("resize", fn)
    return () => window.removeEventListener("resize", fn)
  }, [])
  return width
}

function useInView(t = 0.1) {
  const ref = useRef(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true) }, { threshold: t })
    if (ref.current) o.observe(ref.current)
    return () => o.disconnect()
  }, [])
  return [ref, v]
}

function Reveal({ children, delay = 0 }) {
  const [ref, v] = useInView()
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "none" : "translateY(24px)", transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s` }}>
      {children}
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const w = useWindowWidth()
  const mob = w < 768
  const [statsRef, statsV] = useInView(0.2)

  const features = [
    { icon: "🤖", title: "AI Sponsorship Scoring", desc: "Every job scored 0–100% for visa sponsorship likelihood using 15+ visa signal keywords.", color: "#0057FF" },
    { icon: "🎓", title: "Fresher Friendly", desc: "Detects graduate schemes, trainee roles and apprenticeships — badged clearly on every job.", color: "#00D68F" },
    { icon: "🏛️", title: "Sponsor Register Check", desc: "125,000+ employers verified against the official UK Home Office sponsor licence register.", color: "#7C3AED" },
    { icon: "🔍", title: "Smart Search", desc: "Type 'cyber security' and see all related roles instantly. Results appear as you type.", color: "#FF6B35" },
    { icon: "📄", title: "AI CV Scoring", desc: "Upload your CV and get real AI scores for UK Format, ATS compatibility and visa keywords.", color: "#0099FF" },
    { icon: "📩", title: "Job Alerts", desc: "Get notified the moment a new sponsored job matching your profile goes live.", color: "#FF3B7A" },
  ]

  const testimonials = [
    { name: "Priya Sharma", role: "Software Engineer", country: "🇮🇳 India → 🇬🇧 UK", text: "IMMTECH found me 3 sponsored roles in London within a week. Got my Skilled Worker visa in 6 weeks.", avatar: "PS", color: "#0057FF" },
    { name: "Emmanuel Okafor", role: "Registered Nurse", country: "🇳🇬 Nigeria → 🇬🇧 UK", text: "The visa checker told me exactly which NHS trusts sponsor. Got 3 interviews and now work at Manchester Royal.", avatar: "EO", color: "#00D68F" },
    { name: "Mei Lin Zhang", role: "Data Analyst", country: "🇨🇳 China → 🇬🇧 UK", text: "IMMTECH's fresher filter showed me graduate schemes at Deloitte and Capgemini. Got my first UK job at 22!", avatar: "MZ", color: "#7C3AED" },
    { name: "Arjun Patel", role: "Civil Engineer", country: "🇵🇰 Pakistan → 🇬🇧 UK", text: "Only applied to verified employers. The AI CV rewrite made my application stand out. Hired by Arup.", avatar: "AP", color: "#FF6B35" },
    { name: "Sofia Mendes", role: "Pharmacist", country: "🇧🇷 Brazil → 🇬🇧 UK", text: "IMMTECH confirmed I qualified for Health & Care Worker visa. Completely changed my approach.", avatar: "SM", color: "#FF3B7A" },
    { name: "Kwame Asante", role: "Product Manager", country: "🇬🇭 Ghana → 🇬🇧 UK", text: "Used IMMTECH for 2 weeks and had 4 sponsored interviews. Every job was genuinely sponsoring.", avatar: "KA", color: "#0099FF" },
  ]

  const plans = [
    { name: "Talent Free", price: "£0", period: "forever", color: "#0057FF", popular: false, features: ["Unlimited job searches", "AI sponsorship scoring", "Basic visa checker", "Save up to 10 jobs"] },
    { name: "Talent Premium", price: "£19", period: "per month", color: "#00D68F", popular: true, features: ["Everything in Free", "AI CV rewrite", "Unlimited saves & alerts", "Full visa pathway report", "Application tracker"] },
    { name: "Employer Starter", price: "£99", period: "per month", color: "#FF6B35", popular: false, features: ["Candidate database", "5 job postings", "Compliance tracker", "Candidate messaging"] },
    { name: "Employer Pro", price: "£399", period: "per month", color: "#7C3AED", popular: false, features: ["Unlimited postings", "Immigration automation", "API access", "Dedicated manager"] },
  ]

  const s = {
    section: { padding: mob ? "70px 5%" : "120px 6%", background: "#fff" },
    sectionGrey: { padding: mob ? "70px 5%" : "120px 6%", background: "#F8FAFF" },
    h2: { fontSize: mob ? 28 : 52, fontWeight: 900, color: "#0A0F1E", margin: "0 0 16px", letterSpacing: -1.5, lineHeight: 1.1 },
    sub: { color: "#4B5675", fontSize: mob ? 15 : 18, lineHeight: 1.8, fontWeight: 400 },
    grid3: { display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(3,1fr)", gap: mob ? 14 : 24 },
    grid2: { display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(2,1fr)", gap: mob ? 14 : 24 },
    grid4: { display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(4,1fr)", gap: mob ? 14 : 20 },
    card: { background: "#fff", border: "1px solid #E8EEFF", borderRadius: mob ? 16 : 22, padding: mob ? "22px 18px" : "36px 30px" },
    tagline: { display: "inline-flex", alignItems: "center", gap: 8, background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 100, padding: mob ? "6px 14px" : "8px 20px", marginBottom: mob ? 20 : 32, color: "#0057FF", fontSize: mob ? 12 : 14, fontWeight: 600 },
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "inherit", overflowX: "hidden" }}>
      <Nav />

      {/* HERO */}
      <section style={{ background: "#fff", padding: mob ? "110px 5% 70px" : "160px 6% 130px", textAlign: "center" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={s.tagline}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00D68F", display: "inline-block" }} />
            AI-Powered Immigration Career Intelligence
          </div>
          <h1 style={{ fontSize: mob ? 36 : 80, fontWeight: 900, color: "#0A0F1E", lineHeight: 1.06, letterSpacing: mob ? -1.5 : -3, margin: "0 0 20px" }}>
            Your Gateway to<br />
            <span style={{ color: "#0057FF" }}>Global Career</span><br />
            Opportunities
          </h1>
          <p style={{ fontSize: mob ? 15 : 19, color: "#4B5675", lineHeight: 1.8, maxWidth: 520, margin: "0 auto 36px", fontWeight: 400 }}>
            Find visa-sponsored jobs, check your UK eligibility and optimise your CV — all powered by AI built for international talent.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexDirection: mob ? "column" : "row", maxWidth: mob ? 320 : "none", margin: "0 auto" }}>
            <button onClick={() => navigate("/jobs")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 13, padding: mob ? "15px 24px" : "18px 40px", fontSize: mob ? 15 : 17, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 32px #0057FF35" }}>
              Find Sponsored Jobs →
            </button>
            <button onClick={() => navigate("/onboarding")} style={{ background: "#fff", color: "#0057FF", border: "2px solid #E8EEFF", borderRadius: 13, padding: mob ? "15px 24px" : "18px 40px", fontSize: mob ? 15 : 17, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Get Started Free
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: mob ? 12 : 24, marginTop: 28, flexWrap: "wrap" }}>
            {["✅ Free to use", "🔒 No spam", "🇬🇧 UK focused", "🤖 AI powered"].map(b => (
              <span key={b} style={{ color: "#9CA3B8", fontSize: mob ? 12 : 13, fontWeight: 500 }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section ref={statsRef} style={{ background: "linear-gradient(135deg, #0038CC 0%, #0057FF 50%, #00C2FF 100%)", padding: mob ? "56px 5%" : "90px 6%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(5,1fr)", gap: mob ? 24 : 32 }}>
          {[
            { value: "50,000+", label: "Sponsored Jobs", icon: "💼" },
            { value: "15,000+", label: "Candidates Placed", icon: "🌍" },
            { value: "125,000+", label: "Verified Sponsors", icon: "🏛️" },
            { value: "47", label: "Countries", icon: "🌐" },
            { value: "98%", label: "Satisfaction", icon: "⭐" },
          ].map((stat, i) => (
            <div key={stat.label} style={{ textAlign: "center", opacity: statsV ? 1 : 0, transform: statsV ? "none" : "translateY(20px)", transition: `all 0.6s ease ${i * 0.1}s`, gridColumn: mob && i === 4 ? "1 / -1" : "auto" }}>
              <div style={{ fontSize: mob ? 22 : 28, marginBottom: 6 }}>{stat.icon}</div>
              <div style={{ fontSize: mob ? 28 : 46, fontWeight: 900, color: "#fff", letterSpacing: -1.5, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: mob ? 12 : 14, marginTop: 6, fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={s.sectionGrey}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 40 : 72 }}>
            <Reveal><div style={s.tagline}>Platform Features</div></Reveal>
            <Reveal delay={0.1}><h2 style={s.h2}>Everything you need to<br /><span style={{ color: "#0057FF" }}>land a sponsored role</span></h2></Reveal>
            <Reveal delay={0.2}><p style={{ ...s.sub, maxWidth: 480, margin: "0 auto" }}>Built for international talent navigating UK immigration.</p></Reveal>
          </div>
          <div style={s.grid3}>
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <div style={{ ...s.card, height: "100%", transition: "all 0.3s" }}
                  onMouseEnter={e => { if (!mob) { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = `0 24px 56px ${f.color}12` } }}
                  onMouseLeave={e => { if (!mob) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" } }}
                >
                  <div style={{ width: mob ? 46 : 54, height: mob ? 46 : 54, borderRadius: 14, background: `${f.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: mob ? 22 : 26, marginBottom: mob ? 14 : 20 }}>{f.icon}</div>
                  <h3 style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: "#0A0F1E", margin: "0 0 10px" }}>{f.title}</h3>
                  <p style={{ color: "#4B5675", fontSize: mob ? 13 : 14, lineHeight: 1.75, margin: 0 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={s.section}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 36 : 68 }}>
            <Reveal><div style={{ ...s.tagline, background: "#00D68F0D", border: "1px solid #00D68F30", color: "#00D68F" }}>Success Stories</div></Reveal>
            <Reveal delay={0.1}><h2 style={s.h2}>Real people.<br /><span style={{ color: "#0057FF" }}>Real sponsored jobs.</span></h2></Reveal>
          </div>
          <div style={s.grid3}>
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.06}>
                <div style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: mob ? 16 : 22, padding: mob ? "20px 16px" : "32px 28px", height: "100%" }}>
                  <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>{[...Array(5)].map((_, i) => <span key={i} style={{ color: "#F59E0B", fontSize: mob ? 13 : 15 }}>★</span>)}</div>
                  <p style={{ color: "#4B5675", fontSize: mob ? 13 : 14, lineHeight: 1.8, margin: "0 0 18px", fontStyle: "italic" }}>"{t.text}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${t.color}18`, border: `2px solid ${t.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: t.color, fontWeight: 800, fontSize: 12 }}>{t.avatar}</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0A0F1E" }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: "#9CA3B8", marginTop: 1 }}>{t.role} · {t.country}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={s.sectionGrey}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 36 : 68 }}>
            <Reveal><div style={{ ...s.tagline, background: "#FF6B350D", border: "1px solid #FF6B3525", color: "#FF6B35" }}>Pricing</div></Reveal>
            <Reveal delay={0.1}><h2 style={s.h2}>Simple, honest pricing</h2></Reveal>
            <Reveal delay={0.2}><p style={s.sub}>Start free. Upgrade when you're ready.</p></Reveal>
          </div>
          <div style={s.grid4}>
            {plans.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08}>
                <div style={{ background: p.popular ? "linear-gradient(155deg, #0057FF, #0090FF)" : "#fff", border: p.popular ? "none" : "1px solid #E8EEFF", borderRadius: mob ? 18 : 22, padding: mob ? "24px 20px" : "32px 26px", position: "relative", boxShadow: p.popular ? "0 20px 56px #0057FF28" : "none", height: "100%" }}>
                  {p.popular && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#00D68F", color: "#fff", borderRadius: 100, padding: "4px 16px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>⭐ Most Popular</div>}
                  <div style={{ fontSize: 11, fontWeight: 700, color: p.popular ? "rgba(255,255,255,0.55)" : "#9CA3B8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{p.name}</div>
                  <div style={{ marginBottom: 18 }}>
                    <span style={{ fontSize: mob ? 36 : 42, fontWeight: 900, letterSpacing: -2, color: p.popular ? "#fff" : "#0A0F1E" }}>{p.price}</span>
                    <span style={{ fontSize: 12, color: p.popular ? "rgba(255,255,255,0.5)" : "#9CA3B8", marginLeft: 4 }}>/{p.period}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: p.popular ? "#00D68F" : p.color, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 13, color: p.popular ? "rgba(255,255,255,0.82)" : "#4B5675" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => navigate("/auth")} style={{ width: "100%", background: p.popular ? "#fff" : `${p.color}10`, color: p.popular ? "#0057FF" : p.color, border: p.popular ? "none" : `1.5px solid ${p.color}28`, borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {p.popular ? "Start Free Trial" : p.name.includes("Employer") ? "Start Hiring" : "Get Started"}
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#fff", padding: mob ? "60px 5%" : "100px 6%" }}>
        <Reveal>
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", background: "linear-gradient(145deg, #0038CC, #0057FF 50%, #0090FF)", borderRadius: mob ? 24 : 36, padding: mob ? "52px 28px" : "100px 70px", boxShadow: "0 40px 100px #0057FF30", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <h2 style={{ fontSize: mob ? 28 : 56, fontWeight: 900, color: "#fff", margin: "0 0 16px", letterSpacing: -1.5, lineHeight: 1.1 }}>Ready to find your<br />sponsored role?</h2>
              <p style={{ color: "rgba(255,255,255,0.72)", fontSize: mob ? 14 : 18, lineHeight: 1.8, margin: "0 0 36px" }}>Join thousands of international professionals who found their UK sponsored job through IMMTECH.</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexDirection: mob ? "column" : "row", maxWidth: mob ? 280 : "none", margin: "0 auto" }}>
                <button onClick={() => navigate("/onboarding")} style={{ background: "#fff", color: "#0057FF", border: "none", borderRadius: 13, padding: mob ? "14px 24px" : "18px 40px", fontSize: mob ? 15 : 17, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Get Started Free →</button>
                <button onClick={() => navigate("/jobs")} style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 13, padding: mob ? "14px 24px" : "18px 40px", fontSize: mob ? 15 : 17, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Browse Jobs</button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#0A0F1E", padding: mob ? "48px 5% 32px" : "80px 6% 40px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          {/* Logo + tagline */}
          <div style={{ marginBottom: mob ? 32 : 52 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IT</span>
              </div>
              <span style={{ fontWeight: 900, fontSize: 20, color: "#fff", letterSpacing: -0.5 }}>IMMTECH</span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 14, lineHeight: 1.8, maxWidth: 280, margin: 0 }}>
              Your Gateway to Global Career Opportunities. AI-powered immigration career intelligence.
            </p>
          </div>

          {/* Links grid */}
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr", gap: mob ? 32 : 40, marginBottom: mob ? 36 : 56 }}>
            {[
              { title: "Platform", links: [{ label: "Find Jobs", path: "/jobs" }, { label: "Visa Checker", path: "/visa-checker" }, { label: "For Employers", path: "/employers" }, { label: "Sign In", path: "/auth" }] },
              { title: "Company", links: [{ label: "About Us", path: "/" }, { label: "Blog", path: "/" }, { label: "Careers", path: "/" }, { label: "Contact", path: "/" }] },
              { title: "Legal", links: [{ label: "Privacy Policy", path: "/" }, { label: "Terms of Service", path: "/" }, { label: "Cookie Policy", path: "/" }, { label: "GDPR", path: "/" }] },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ color: "#fff", fontWeight: 700, marginBottom: 16, fontSize: 14 }}>{col.title}</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(l => (
                    <span key={l.label} onClick={() => navigate(l.path)} style={{ color: "rgba(255,255,255,0.38)", textDecoration: "none", fontSize: 14, cursor: "pointer", transition: "color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.38)"}
                    >{l.label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 13 }}>© 2025 IMMTECH. All rights reserved.</span>
            <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 13 }}>🌍 Built for Global Talent</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
