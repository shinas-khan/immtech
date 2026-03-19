import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Nav from "../components/Nav"

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

function Reveal({ children, delay = 0, y = 24 }) {
  const [ref, v] = useInView()
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "none" : `translateY(${y}px)`, transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s` }}>
      {children}
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [statsRef, statsV] = useInView(0.2)

  const features = [
    { icon: "🤖", title: "AI Sponsorship Scoring", desc: "Every job scored 0–100% for visa sponsorship likelihood using NLP and 15+ visa signal keywords.", color: "#0057FF", points: ["40–100% confidence scores", "15+ visa keyword detection", "Auto-removes ineligible jobs"] },
    { icon: "🎓", title: "Fresher Friendly", desc: "Detects graduate schemes, trainee roles, apprenticeships and junior positions — badged clearly on every card.", color: "#00D68F", points: ["Graduate scheme detection", "Entry level flagging", "Fresher employer database"] },
    { icon: "🏛️", title: "Sponsor Register Check", desc: "Every employer cross-referenced against the official UK Home Office sponsor licence register in real time.", color: "#7C3AED", points: ["Official UK gov data", "Real-time checking", "Verified sponsor badge"] },
    { icon: "🔍", title: "Smart Search & Filters", desc: "Autocomplete search across 75+ roles and 38 UK cities. Filter by salary, type, date posted and source.", color: "#FF6B35", points: ["A-Z autocomplete dropdown", "Salary & type filters", "Sort by score, date or salary"] },
    { icon: "📄", title: "AI CV Optimisation", desc: "Upload your CV and our AI rewrites it for UK employer standards, tailored to visa sponsorship roles.", color: "#0099FF", points: ["UK employer formatting", "Keyword optimisation", "Sponsor company matching"] },
    { icon: "📩", title: "Smart Job Alerts", desc: "Get notified the moment a new sponsored job matching your profile goes live. Daily or weekly digests.", color: "#FF3B7A", points: ["Real-time notifications", "Daily & weekly digests", "Save and track applications"] },
  ]

  const testimonials = [
    { name: "Priya Sharma", role: "Software Engineer", country: "🇮🇳 India → 🇬🇧 UK", text: "IMMTECH found me 3 sponsored roles in London within a week. The AI scoring saved me from wasting time on jobs that didn't actually sponsor. Got my Skilled Worker visa in 6 weeks.", avatar: "PS", color: "#0057FF" },
    { name: "Emmanuel Okafor", role: "Registered Nurse", country: "🇳🇬 Nigeria → 🇬🇧 UK", text: "The visa checker told me exactly which NHS trusts sponsor international nurses. I applied to the top 5 and got 3 interviews. Now working at Manchester Royal Infirmary.", avatar: "EO", color: "#00D68F" },
    { name: "Mei Lin Zhang", role: "Data Analyst", country: "🇨🇳 China → 🇬🇧 UK", text: "As a fresher I was worried no one would sponsor me. IMMTECH's fresher filter showed me graduate schemes at Deloitte and Capgemini. Got my first UK job at 22!", avatar: "MZ", color: "#7C3AED" },
    { name: "Arjun Patel", role: "Civil Engineer", country: "🇵🇰 Pakistan → 🇬🇧 UK", text: "The sponsor register intelligence is brilliant — I only applied to verified employers. The AI CV rewrite made my application stand out. Hired by Arup in just 3 weeks.", avatar: "AP", color: "#FF6B35" },
    { name: "Sofia Mendes", role: "Pharmacist", country: "🇧🇷 Brazil → 🇬🇧 UK", text: "IMMTECH's visa checker confirmed I qualified for the Health & Care Worker visa. The salary threshold tool was spot on. Completely changed my approach to job hunting.", avatar: "SM", color: "#FF3B7A" },
    { name: "Kwame Asante", role: "Product Manager", country: "🇬🇭 Ghana → 🇬🇧 UK", text: "Used IMMTECH for 2 weeks and had 4 sponsored interviews lined up. Every job I applied to was genuinely sponsoring. Complete game changer for international candidates.", avatar: "KA", color: "#0099FF" },
  ]

  const plans = [
    { name: "Talent Free", price: "£0", period: "forever", color: "#0057FF", popular: false, features: ["Unlimited job searches", "AI sponsorship scoring", "Basic visa checker", "Save up to 10 jobs", "Email job alerts"] },
    { name: "Talent Premium", price: "£19", period: "per month", color: "#00D68F", popular: true, features: ["Everything in Free", "AI CV rewrite & optimisation", "Unlimited saves & alerts", "Full visa pathway report", "Application tracker", "SOC code checker", "Priority support"] },
    { name: "Employer Starter", price: "£99", period: "per month", color: "#FF6B35", popular: false, features: ["International candidate pool", "5 sponsored job postings", "Compliance tracker", "Candidate messaging", "Visa pipeline tools", "Analytics dashboard"] },
    { name: "Employer Pro", price: "£399", period: "per month", color: "#7C3AED", popular: false, features: ["Everything in Starter", "Unlimited job postings", "Immigration automation", "API access", "Dedicated account manager", "Custom integrations"] },
  ]

  return (
    <div style={{ minHeight: "100vh", fontFamily: "inherit", background: "#fff" }}>
      <Nav />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "160px 6% 130px", textAlign: "center" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 100, padding: "8px 20px", marginBottom: 36, animation: "fadeDown 0.6s ease both" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D68F", display: "inline-block", boxShadow: "0 0 8px #00D68F" }} />
            <span style={{ color: "#0057FF", fontSize: 14, fontWeight: 600 }}>AI-Powered Immigration Career Intelligence</span>
          </div>

          <h1 style={{ fontSize: "clamp(48px, 7vw, 86px)", fontWeight: 900, color: "#0A0F1E", lineHeight: 1.06, letterSpacing: -3, margin: "0 0 28px", animation: "fadeDown 0.75s ease both" }}>
            Your Gateway to<br />
            <span style={{ color: "#0057FF" }}>Global Career</span><br />Opportunities
          </h1>

          <p style={{ fontSize: 20, color: "#4B5675", lineHeight: 1.8, maxWidth: 540, margin: "0 auto 56px", fontWeight: 400, animation: "fadeDown 0.9s ease both" }}>
            Find visa-sponsored jobs, check your UK eligibility and optimise your CV — all powered by AI built for international talent.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", animation: "fadeDown 1s ease both" }}>
            <button onClick={() => navigate("/jobs")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 14, padding: "18px 40px", fontSize: 17, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 32px #0057FF35", transition: "transform 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >Find Sponsored Jobs →</button>
            <button onClick={() => navigate("/onboarding")} style={{ background: "#fff", color: "#0057FF", border: "2px solid #E8EEFF", borderRadius: 14, padding: "18px 40px", fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#0057FF"; e.currentTarget.style.background = "#F0F5FF" }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8EEFF"; e.currentTarget.style.background = "#fff" }}
            >Get Started Free</button>
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, marginTop: 56, flexWrap: "wrap", animation: "fadeDown 1.1s ease both" }}>
            {["✅ Free to use", "🔒 No spam", "🇬🇧 UK focused", "🤖 AI powered"].map(b => (
              <span key={b} style={{ color: "#9CA3B8", fontSize: 14, fontWeight: 500 }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────── */}
      <section ref={statsRef} style={{ background: "linear-gradient(135deg, #0038CC 0%, #0057FF 50%, #00C2FF 100%)", padding: "90px 6%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 40 }}>
          {[
            { value: "50,000+", label: "Sponsored Jobs Listed", icon: "💼" },
            { value: "15,000+", label: "Candidates Placed", icon: "🌍" },
            { value: "3,500+", label: "Verified UK Sponsors", icon: "🏛️" },
            { value: "47", label: "Countries Supported", icon: "🌐" },
            { value: "98%", label: "Satisfaction Rate", icon: "⭐" },
          ].map((s, i) => (
            <div key={s.label} style={{ textAlign: "center", opacity: statsV ? 1 : 0, transform: statsV ? "none" : "translateY(24px)", transition: `all 0.6s ease ${i * 0.1}s` }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: "clamp(36px, 4vw, 54px)", fontWeight: 900, color: "#fff", letterSpacing: -2, lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, marginTop: 8, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section style={{ background: "#F8FAFF", padding: "130px 6%" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 80 }}>
            <Reveal>
              <div style={{ display: "inline-block", background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 100, padding: "8px 20px", color: "#0057FF", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>Platform Features</div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 20px", letterSpacing: -2, lineHeight: 1.08 }}>
                Everything you need to<br /><span style={{ color: "#0057FF" }}>land a sponsored role</span>
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p style={{ color: "#4B5675", fontSize: 19, maxWidth: 520, margin: "0 auto", lineHeight: 1.8, fontWeight: 400 }}>
                Built specifically for international talent navigating UK immigration — not a generic job board.
              </p>
            </Reveal>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 24, padding: "40px 34px", height: "100%", transition: "all 0.3s ease", cursor: "default" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-10px)"; e.currentTarget.style.boxShadow = `0 28px 60px ${f.color}12`; e.currentTarget.style.borderColor = `${f.color}35` }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#E8EEFF" }}
                >
                  <div style={{ width: 58, height: 58, borderRadius: 18, background: `${f.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 24 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 19, fontWeight: 800, color: "#0A0F1E", margin: "0 0 14px", letterSpacing: -0.4 }}>{f.title}</h3>
                  <p style={{ color: "#4B5675", fontSize: 15, lineHeight: 1.8, margin: "0 0 22px", fontWeight: 400 }}>{f.desc}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {f.points.map(p => (
                      <div key={p} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${f.color}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ color: f.color, fontSize: 10, fontWeight: 900 }}>✓</span>
                        </div>
                        <span style={{ fontSize: 14, color: "#4B5675", fontWeight: 500 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "130px 6%" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 80 }}>
            <Reveal>
              <div style={{ display: "inline-block", background: "#00D68F0D", border: "1px solid #00D68F30", borderRadius: 100, padding: "8px 20px", color: "#00D68F", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>Success Stories</div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 20px", letterSpacing: -2, lineHeight: 1.08 }}>
                Real people.<br /><span style={{ color: "#0057FF" }}>Real sponsored jobs.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p style={{ color: "#4B5675", fontSize: 19, maxWidth: 480, margin: "0 auto", lineHeight: 1.8, fontWeight: 400 }}>
                Thousands of international professionals have found their sponsored UK role through IMMTECH.
              </p>
            </Reveal>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <div style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 24, padding: "36px 30px", height: "100%" }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                    {[...Array(5)].map((_, i) => <span key={i} style={{ color: "#F59E0B", fontSize: 16 }}>★</span>)}
                  </div>
                  <p style={{ color: "#4B5675", fontSize: 15, lineHeight: 1.85, margin: "0 0 28px", fontStyle: "italic" }}>"{t.text}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${t.color}18`, border: `2px solid ${t.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: t.color, fontWeight: 800, fontSize: 14 }}>{t.avatar}</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#0A0F1E" }}>{t.name}</div>
                      <div style={{ fontSize: 13, color: "#9CA3B8", marginTop: 2 }}>{t.role} · {t.country}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────── */}
      <section style={{ background: "#F8FAFF", padding: "130px 6%" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 80 }}>
            <Reveal>
              <div style={{ display: "inline-block", background: "#FF6B350D", border: "1px solid #FF6B3525", borderRadius: 100, padding: "8px 20px", color: "#FF6B35", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>Pricing</div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 16px", letterSpacing: -2 }}>Simple, honest pricing</h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p style={{ color: "#4B5675", fontSize: 19, fontWeight: 400 }}>Start free. Upgrade when you're ready.</p>
            </Reveal>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {plans.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.1}>
                <div style={{ background: p.popular ? "linear-gradient(155deg, #0057FF, #0090FF)" : "#fff", border: p.popular ? "none" : "1px solid #E8EEFF", borderRadius: 24, padding: "32px 26px", transform: p.popular ? "scale(1.05)" : "scale(1)", boxShadow: p.popular ? "0 24px 64px #0057FF28" : "none", position: "relative", height: "100%" }}>
                  {p.popular && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#00D68F", color: "#fff", borderRadius: 100, padding: "5px 18px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>⭐ Most Popular</div>}
                  <div style={{ fontSize: 12, fontWeight: 700, color: p.popular ? "rgba(255,255,255,0.55)" : "#9CA3B8", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>{p.name}</div>
                  <div style={{ marginBottom: 24 }}>
                    <span style={{ fontSize: 46, fontWeight: 900, letterSpacing: -2, color: p.popular ? "#fff" : "#0A0F1E" }}>{p.price}</span>
                    <span style={{ fontSize: 14, color: p.popular ? "rgba(255,255,255,0.5)" : "#9CA3B8", marginLeft: 4 }}>/ {p.period}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: p.popular ? "#00D68F" : p.color, fontSize: 13, fontWeight: 800, flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 14, color: p.popular ? "rgba(255,255,255,0.82)" : "#4B5675", fontWeight: 400 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => navigate("/auth")} style={{ width: "100%", background: p.popular ? "#fff" : `${p.color}10`, color: p.popular ? "#0057FF" : p.color, border: p.popular ? "none" : `1.5px solid ${p.color}28`, borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.18s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  >{p.popular ? "Start Free Trial" : p.name.includes("Employer") ? "Start Hiring" : "Get Started"}</button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "120px 6%" }}>
        <Reveal>
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", background: "linear-gradient(145deg, #0038CC, #0057FF 50%, #0090FF)", borderRadius: 36, padding: "100px 70px", boxShadow: "0 40px 100px #0057FF30", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -100, right: -100, width: 350, height: 350, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -80, left: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(0,214,143,0.07)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <h2 style={{ fontSize: "clamp(36px, 5vw, 62px)", fontWeight: 900, color: "#fff", margin: "0 0 20px", letterSpacing: -2, lineHeight: 1.08 }}>
                Ready to find your<br />sponsored role?
              </h2>
              <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 19, lineHeight: 1.8, margin: "0 0 48px", fontWeight: 400 }}>
                Join thousands of international professionals who found their UK sponsored job through IMMTECH.
              </p>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => navigate("/onboarding")} style={{ background: "#fff", color: "#0057FF", border: "none", borderRadius: 14, padding: "18px 40px", fontSize: 17, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", transition: "transform 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >Get Started Free →</button>
                <button onClick={() => navigate("/jobs")} style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 14, padding: "18px 40px", fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                >Browse Jobs</button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{ background: "#0A0F1E", padding: "90px 6% 48px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr", gap: 60, marginBottom: 72 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 14 }}>IT</span>
                </div>
                <span style={{ fontWeight: 900, fontSize: 22, color: "#fff", letterSpacing: -0.5 }}>IMMTECH</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 15, lineHeight: 1.85, maxWidth: 300, fontWeight: 400 }}>
                Your Gateway to Global Career Opportunities. AI-powered immigration career intelligence for the modern world.
              </p>
            </div>
            {[
              { title: "Platform", links: ["Find Jobs", "Visa Checker", "AI CV Tool", "For Employers"] },
              { title: "Company", links: ["About Us", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"] },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ color: "#fff", fontWeight: 700, marginBottom: 24, fontSize: 15 }}>{col.title}</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ color: "rgba(255,255,255,0.38)", textDecoration: "none", fontSize: 15, fontWeight: 400, transition: "color 0.2s" }}
                      onMouseEnter={e => e.target.style.color = "#fff"}
                      onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.38)"}
                    >{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 32, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 14 }}>© 2025 IMMTECH. All rights reserved.</span>
            <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 14 }}>🌍 Built for Global Talent</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
