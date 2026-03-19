import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Nav from "../components/Nav"

const PLANS = [
  {
    name: "Starter", price: "£99", period: "per month",
    color: "#0057FF", popular: false,
    features: ["Access to candidate database", "5 sponsored job postings", "Basic compliance tracker", "Candidate messaging", "Email support"],
    cta: "Start Free Trial",
  },
  {
    name: "Growth", price: "£199", period: "per month",
    color: "#00D68F", popular: true,
    features: ["Everything in Starter", "20 sponsored job postings", "Advanced compliance dashboard", "Priority candidate matching", "Visa pipeline management", "Dedicated account manager"],
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise", price: "£399", period: "per month",
    color: "#7C3AED", popular: false,
    features: ["Everything in Growth", "Unlimited job postings", "Immigration paperwork automation", "API access & integrations", "Custom onboarding", "SLA guarantee"],
    cta: "Contact Sales",
  },
]

const FEATURES = [
  { icon: "🌍", title: "Global Talent Database", desc: "Access thousands of verified international candidates actively seeking UK visa sponsorship. Filter by role, experience, nationality and salary expectations.", color: "#0057FF" },
  { icon: "📋", title: "Sponsor Licence Compliance", desc: "Track your sponsor licence obligations, renewal dates and reporting requirements. Never miss a compliance deadline again.", color: "#00D68F" },
  { icon: "🤖", title: "AI Candidate Matching", desc: "Our AI matches your job requirements with the most suitable international candidates based on skills, visa eligibility and salary expectations.", color: "#7C3AED" },
  { icon: "📄", title: "Immigration Paperwork Automation", desc: "Generate Certificate of Sponsorship documents, right to work checks and visa application support automatically.", color: "#FF6B35" },
  { icon: "📊", title: "Hiring Pipeline Dashboard", desc: "Track every international hire from application to visa approval in one visual pipeline. Know exactly where each candidate stands.", color: "#0099FF" },
  { icon: "💬", title: "Direct Candidate Messaging", desc: "Message candidates directly through the platform. Schedule interviews, send updates and manage communication in one place.", color: "#FF3B7A" },
]

const STATS = [
  { value: "15,000+", label: "Verified Candidates", icon: "👥" },
  { value: "47", label: "Countries Represented", icon: "🌍" },
  { value: "3,500+", label: "Employers Trust Us", icon: "🏢" },
  { value: "94%", label: "Visa Success Rate", icon: "✅" },
]

const TESTIMONIALS = [
  { company: "TechScale Ltd", role: "Head of Talent", name: "Sarah Mitchell", text: "IMMTECH helped us hire 12 international engineers in 6 months. The compliance tracker alone saved us countless hours.", logo: "TS", color: "#0057FF" },
  { company: "CareFirst NHS Trust", role: "HR Director", name: "James Okonkwo", text: "We recruited 40 international nurses through IMMTECH. The candidate quality is exceptional and the visa process was seamless.", logo: "CF", color: "#00D68F" },
  { company: "BuildRight Group", role: "Recruitment Manager", name: "Priya Kapoor", text: "The AI matching found us civil engineers we couldn't find anywhere else. IMMTECH is now our primary international recruitment tool.", logo: "BR", color: "#7C3AED" },
]

const HOW_IT_WORKS = [
  { step: "01", title: "Create your employer profile", desc: "Set up your company profile, add your sponsor licence number and tell us what roles you're hiring for.", icon: "🏢" },
  { step: "02", title: "Post your sponsored roles", desc: "List your visa-sponsored positions and our AI immediately starts matching them to eligible international candidates.", icon: "📝" },
  { step: "03", title: "Review matched candidates", desc: "Browse AI-matched candidates filtered by skills, experience, nationality and visa eligibility. Message them directly.", icon: "👀" },
  { step: "04", title: "Hire and sponsor with confidence", desc: "Our compliance tools guide you through the Certificate of Sponsorship process and track every obligation.", icon: "✅" },
]

export default function EmployersPage() {
  const navigate = useNavigate()
  const [contactForm, setContactForm] = useState({ company: "", name: "", email: "", size: "", message: "" })
  const [submitted, setSubmitted] = useState(false)

  const inp = {
    width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 12,
    padding: "14px 16px", fontSize: 15, color: "#0A0F1E",
    background: "#F8FAFF", fontFamily: "inherit", outline: "none",
    transition: "border-color 0.2s",
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "inherit" }}>
      <Nav />

      {/* HERO */}
      <section style={{ background: "linear-gradient(160deg, #0038CC 0%, #0057FF 50%, #0090FF 100%)", padding: "140px 6% 120px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(0,214,143,0.08)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 100, padding: "8px 20px", marginBottom: 32 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D68F", display: "inline-block" }} />
            <span style={{ color: "rgba(255,255,255,0.92)", fontSize: 14, fontWeight: 600 }}>For UK Employers & Recruiters</span>
          </div>
          <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 900, color: "#fff", lineHeight: 1.08, letterSpacing: -2.5, margin: "0 0 24px" }}>
            Access the World's Best<br />
            <span style={{ background: "linear-gradient(90deg, #00D68F, #00C2FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>International Talent</span>
          </h1>
          <p style={{ fontSize: 19, color: "rgba(255,255,255,0.78)", lineHeight: 1.8, maxWidth: 580, margin: "0 auto 48px", fontWeight: 400 }}>
            Connect with thousands of visa-ready international candidates. Manage your sponsor licence compliance and streamline your international hiring — all in one platform.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => document.getElementById("contact").scrollIntoView({ behavior: "smooth" })} style={{ background: "#fff", color: "#0057FF", border: "none", borderRadius: 14, padding: "18px 40px", fontSize: 17, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", transition: "transform 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >Start Hiring Globally →</button>
            <button onClick={() => document.getElementById("plans").scrollIntoView({ behavior: "smooth" })} style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 14, padding: "18px 40px", fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: "#F8FAFF", padding: "80px 6%" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 32 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 900, color: "#0057FF", letterSpacing: -2, lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: "#4B5675", fontSize: 15, marginTop: 8, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: "#fff", padding: "120px 6%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{ display: "inline-block", background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 100, padding: "8px 20px", color: "#0057FF", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>How It Works</div>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 16px", letterSpacing: -2 }}>
              Start hiring internationally<br /><span style={{ color: "#0057FF" }}>in 4 simple steps</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {HOW_IT_WORKS.map((h, i) => (
              <div key={h.step} style={{ textAlign: "center", padding: "32px 24px", background: "#F8FAFF", borderRadius: 22, border: "1px solid #E8EEFF", position: "relative" }}>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{ position: "absolute", top: "50%", right: -12, width: 24, height: 2, background: "#E8EEFF", zIndex: 1 }} />
                )}
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 4px 20px #0057FF30" }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>{h.step}</span>
                </div>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{h.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A0F1E", margin: "0 0 10px" }}>{h.title}</h3>
                <p style={{ color: "#4B5675", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ background: "#F8FAFF", padding: "120px 6%" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{ display: "inline-block", background: "#00D68F0D", border: "1px solid #00D68F30", borderRadius: 100, padding: "8px 20px", color: "#00D68F", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>Platform Features</div>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 16px", letterSpacing: -2 }}>
              Everything you need to<br /><span style={{ color: "#0057FF" }}>hire internationally</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 22, padding: "36px 30px", transition: "all 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = `0 24px 56px ${f.color}12`; e.currentTarget.style.borderColor = `${f.color}30` }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#E8EEFF" }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${f.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 22 }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", margin: "0 0 12px" }}>{f.title}</h3>
                <p style={{ color: "#4B5675", fontSize: 14, lineHeight: 1.8, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ background: "#fff", padding: "120px 6%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 16px", letterSpacing: -2 }}>
              Trusted by UK employers
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.company} style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 22, padding: "32px 28px" }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                  {[...Array(5)].map((_, i) => <span key={i} style={{ color: "#F59E0B", fontSize: 16 }}>★</span>)}
                </div>
                <p style={{ color: "#4B5675", fontSize: 15, lineHeight: 1.8, margin: "0 0 24px", fontStyle: "italic" }}>"{t.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: `${t.color}18`, border: `2px solid ${t.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: t.color, fontWeight: 800, fontSize: 13 }}>{t.logo}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0A0F1E" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#9CA3B8", marginTop: 2 }}>{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="plans" style={{ background: "#F8FAFF", padding: "120px 6%" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", background: "#FF6B350D", border: "1px solid #FF6B3525", borderRadius: 100, padding: "8px 20px", color: "#FF6B35", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>Employer Pricing</div>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 16px", letterSpacing: -2 }}>Simple, transparent pricing</h2>
            <p style={{ color: "#4B5675", fontSize: 18 }}>Start with a free 14-day trial. No credit card required.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {PLANS.map(p => (
              <div key={p.name} style={{ background: p.popular ? "linear-gradient(155deg, #0057FF, #0090FF)" : "#fff", border: p.popular ? "none" : "1px solid #E8EEFF", borderRadius: 24, padding: "36px 30px", transform: p.popular ? "scale(1.05)" : "scale(1)", boxShadow: p.popular ? "0 24px 64px #0057FF28" : "none", position: "relative" }}>
                {p.popular && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#00D68F", color: "#fff", borderRadius: 100, padding: "5px 18px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>⭐ Most Popular</div>}
                <div style={{ fontSize: 12, fontWeight: 700, color: p.popular ? "rgba(255,255,255,0.55)" : "#9CA3B8", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>{p.name}</div>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 46, fontWeight: 900, letterSpacing: -2, color: p.popular ? "#fff" : "#0A0F1E" }}>{p.price}</span>
                  <span style={{ fontSize: 14, color: p.popular ? "rgba(255,255,255,0.5)" : "#9CA3B8", marginLeft: 4 }}>/ {p.period}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: p.popular ? "#00D68F" : p.color, fontSize: 13, fontWeight: 800 }}>✓</span>
                      <span style={{ fontSize: 14, color: p.popular ? "rgba(255,255,255,0.82)" : "#4B5675" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => document.getElementById("contact").scrollIntoView({ behavior: "smooth" })} style={{ width: "100%", background: p.popular ? "#fff" : `${p.color}10`, color: p.popular ? "#0057FF" : p.color, border: p.popular ? "none" : `1.5px solid ${p.color}28`, borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section id="contact" style={{ background: "#fff", padding: "120px 6%" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ display: "inline-block", background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 100, padding: "8px 20px", color: "#0057FF", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>Get Started</div>
            <h2 style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 16px", letterSpacing: -2 }}>
              Ready to hire globally?
            </h2>
            <p style={{ color: "#4B5675", fontSize: 17, lineHeight: 1.7 }}>
              Fill in your details and our team will set up your employer account and guide you through the platform.
            </p>
          </div>

          {submitted ? (
            <div style={{ textAlign: "center", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 20, padding: "60px 40px" }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: "#0A0F1E", marginBottom: 12 }}>We'll be in touch soon!</h3>
              <p style={{ color: "#4B5675", fontSize: 16 }}>Our team will contact you within 24 hours to set up your employer account.</p>
            </div>
          ) : (
            <div style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 24, padding: "44px 44px", boxShadow: "0 8px 40px rgba(0,57,255,0.06)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
                {[
                  { key: "company", label: "Company Name", placeholder: "e.g. Acme Ltd" },
                  { key: "name", label: "Your Name", placeholder: "e.g. Sarah Mitchell" },
                  { key: "email", label: "Work Email", placeholder: "sarah@company.com" },
                  { key: "size", label: "Company Size", placeholder: "e.g. 50-200 employees" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.7 }}>{f.label}</label>
                    <input value={contactForm[f.key]} onChange={e => setContactForm(c => ({ ...c, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inp}
                      onFocus={e => e.target.style.borderColor = "#0057FF"}
                      onBlur={e => e.target.style.borderColor = "#E8EEFF"}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4B5675", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.7 }}>What roles are you hiring for?</label>
                <textarea value={contactForm.message} onChange={e => setContactForm(c => ({ ...c, message: e.target.value }))} placeholder="e.g. We're looking to hire 5 Software Engineers and 3 Data Analysts with visa sponsorship..." rows={4} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = "#0057FF"}
                  onBlur={e => e.target.style.borderColor = "#E8EEFF"}
                />
              </div>
              <button onClick={() => setSubmitted(true)} style={{ width: "100%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 24px #0057FF35" }}>
                Get Started →
              </button>
              <p style={{ textAlign: "center", color: "#9CA3B8", fontSize: 13, marginTop: 16 }}>
                Free 14-day trial · No credit card required · Setup in under 10 minutes
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#0A0F1E", padding: "60px 6% 36px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IT</span>
            </div>
            <span style={{ fontWeight: 900, fontSize: 20, color: "#fff", letterSpacing: -0.5 }}>IMMTECH</span>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {["Find Jobs", "Visa Checker", "For Employers", "Sign In"].map(l => (
              <span key={l} onClick={() => navigate(l === "Find Jobs" ? "/jobs" : l === "Visa Checker" ? "/visa-checker" : l === "Sign In" ? "/auth" : "/employers")} style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}
              >{l}</span>
            ))}
          </div>
          <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 13 }}>© 2025 IMMTECH</span>
        </div>
      </footer>
    </div>
  )
}
