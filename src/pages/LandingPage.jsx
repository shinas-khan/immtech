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

// Animated counter
function Counter({ end, suffix = "", prefix = "" }) {
  const [n, setN] = useState(0)
  const [ref, v] = useInView(0.4)
  useEffect(() => {
    if (!v) return
    let c = 0; const step = end / 60
    const t = setInterval(() => { c += step; if (c >= end) { setN(end); clearInterval(t) } else setN(Math.floor(c)) }, 20)
    return () => clearInterval(t)
  }, [v, end])
  return <span ref={ref}>{prefix}{n.toLocaleString()}{suffix}</span>
}

// Mock product screenshot component
function ProductScreen({ title, children, color = "#0057FF" }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,57,255,0.12)", border: "1px solid #E8EEFF" }}>
      {/* Browser bar */}
      <div style={{ background: "#F8FAFF", padding: "10px 16px", borderBottom: "1px solid #E8EEFF", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#FF5F57", "#FFBD2E", "#28CA41"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, background: "#E8EEFF", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "#9CA3B8", textAlign: "center" }}>immtech.vercel.app</div>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const w = useWindowWidth()
  const mob = w < 768
  const [statsRef, statsV] = useInView(0.2)
  const [activeFeature, setActiveFeature] = useState(0)

  const TEAM = [
    { name: "FOUNDER NAME", role: "CEO & Founder", bio: "Experienced the visa sponsorship problem firsthand as an international professional in the UK.", avatar: "F1", color: "#0057FF" },
    { name: "TEAM MEMBER 2", role: "CTO", bio: "Full-stack engineer building the AI matching engine and sponsor verification system.", avatar: "F2", color: "#00D68F" },
    { name: "TEAM MEMBER 3", role: "Head of Growth", bio: "Drives user acquisition and partnerships with UK employers and immigration lawyers.", avatar: "F3", color: "#7C3AED" },
    { name: "TEAM MEMBER 4", role: "Head of Operations", bio: "Manages employer relations, compliance tracking and candidate success journeys.", avatar: "F4", color: "#FF6B35" },
  ]

  const FEATURES = [
    {
      icon: "🏛️", title: "UK Gov Sponsor Register", tag: "UNIQUE TO IMMTECH",
      desc: "We are the ONLY platform that cross-references every job against the official Home Office register of 125,284 licensed sponsors in real time. If an employer isn't on the register, we don't show the job.",
      color: "#0057FF",
      screen: (
        <div>
          <div style={{ background: "#00D68F0D", border: "1px solid #00D68F30", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0A0F1E" }}>Amazon UK Ltd</div>
              <div style={{ fontSize: 11, color: "#00D68F", fontWeight: 600 }}>✓ Verified on UK Home Office Register · A-Rated · Skilled Worker</div>
            </div>
          </div>
          {["Google UK Ltd", "NHS England", "Deloitte LLP", "KPMG UK"].map((e, i) => (
            <div key={e} style={{ background: "#F8FAFF", borderRadius: 8, padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#0A0F1E", fontWeight: 600 }}>{e}</span>
              <span style={{ background: "#00D68F15", color: "#00D68F", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>✓ VERIFIED</span>
            </div>
          ))}
        </div>
      )
    },
    {
      icon: "🤖", title: "AI Sponsorship Scoring", tag: "PATENT PENDING",
      desc: "Our AI engine scores every job 0–100% for genuine visa sponsorship likelihood. It analyses job descriptions, employer history, salary data and SOC code thresholds — not just keywords.",
      color: "#7C3AED",
      screen: (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0A0F1E", marginBottom: 12 }}>Software Engineer — Google UK</div>
          {[
            { label: "Sponsor Register Match", val: 100, color: "#00D68F" },
            { label: "Salary Threshold", val: 92, color: "#0057FF" },
            { label: "SOC Code Match", val: 88, color: "#7C3AED" },
            { label: "Job Description Score", val: 85, color: "#FF6B35" },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#4B5675" }}>{item.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.val}%</span>
              </div>
              <div style={{ height: 5, background: "#E8EEFF", borderRadius: 3 }}>
                <div style={{ width: `${item.val}%`, height: "100%", background: item.color, borderRadius: 3 }} />
              </div>
            </div>
          ))}
          <div style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", borderRadius: 8, padding: "10px 14px", textAlign: "center", marginTop: 12 }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Overall: 91% — Very Likely Sponsored ✓</span>
          </div>
        </div>
      )
    },
    {
      icon: "🛂", title: "Visa Eligibility Engine", tag: "REAL SOC CODE DATA",
      desc: "Using official UK Home Office SOC code salary thresholds, we tell candidates exactly which visa route they qualify for, what salary they need and what the going rate is for their specific role.",
      color: "#00D68F",
      screen: (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Your Score", val: "87%", color: "#0057FF", big: true },
              { label: "Visa Route", val: "Skilled Worker", color: "#00D68F", big: false },
              { label: "Min Salary", val: "£34,200", color: "#7C3AED", big: false },
              { label: "Your Salary", val: "£45,000 ✓", color: "#00D68F", big: false },
            ].map(s => (
              <div key={s.label} style={{ background: "#F8FAFF", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: s.big ? 26 : 16, fontWeight: 900, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "#9CA3B8", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#00D68F0D", border: "1px solid #00D68F30", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#00D68F" }}>✓ Strong Eligibility — You qualify for Skilled Worker Visa</div>
            <div style={{ fontSize: 10, color: "#4B5675", marginTop: 4 }}>SOC Code 2136 · Processing: 3–8 weeks · Duration: 5 years</div>
          </div>
        </div>
      )
    },
    {
      icon: "📄", title: "AI CV Scoring", tag: "POWERED BY CLAUDE AI",
      desc: "International candidates upload their CV and our AI — powered by Anthropic's Claude — scores it against UK employer standards, ATS compatibility, visa keywords and sponsor company requirements.",
      color: "#FF6B35",
      screen: (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #FF6B35, #FF9A3C)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>78</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#0A0F1E" }}>Good CV — Room to Improve</div>
              <div style={{ fontSize: 11, color: "#4B5675" }}>3 improvements will boost your chances significantly</div>
            </div>
          </div>
          {[
            { label: "UK Format", val: 85, color: "#00D68F" },
            { label: "Visa Keywords", val: 62, color: "#FF6B35" },
            { label: "ATS Score", val: 90, color: "#0057FF" },
            { label: "Sponsor Match", val: 74, color: "#7C3AED" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: "#4B5675", width: 80, flexShrink: 0 }}>{item.label}</span>
              <div style={{ flex: 1, height: 5, background: "#E8EEFF", borderRadius: 3 }}>
                <div style={{ width: `${item.val}%`, height: "100%", background: item.color, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: item.color, width: 30 }}>{item.val}%</span>
            </div>
          ))}
        </div>
      )
    },
  ]

  const s = {
    section: { padding: mob ? "70px 5%" : "110px 6%", background: "#fff" },
    sectionGrey: { padding: mob ? "70px 5%" : "110px 6%", background: "#F8FAFF" },
    h2: { fontSize: mob ? 28 : 50, fontWeight: 900, color: "#0A0F1E", margin: "0 0 16px", letterSpacing: -1.5, lineHeight: 1.1 },
    sub: { color: "#4B5675", fontSize: mob ? 15 : 18, lineHeight: 1.8, fontWeight: 400 },
    tag: (color = "#0057FF", bg = "#0057FF0D", border = "#0057FF22") => ({ display: "inline-flex", alignItems: "center", gap: 7, background: bg, border: `1px solid ${border}`, borderRadius: 100, padding: mob ? "6px 14px" : "7px 18px", marginBottom: mob ? 18 : 26, color, fontSize: mob ? 12 : 13, fontWeight: 700, letterSpacing: 0.3 }),
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "inherit", overflowX: "hidden" }}>
      <Nav />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(175deg, #fff 0%, #F0F5FF 100%)", padding: mob ? "110px 5% 70px" : "160px 6% 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 40 : 80, alignItems: "center" }}>
          <div>
            <div style={s.tag()}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00D68F", display: "inline-block", boxShadow: "0 0 6px #00D68F" }} />
              UK's First AI Visa Sponsorship Job Platform
            </div>
            <h1 style={{ fontSize: mob ? 34 : 68, fontWeight: 900, color: "#0A0F1E", lineHeight: 1.06, letterSpacing: mob ? -1.5 : -3, margin: "0 0 22px" }}>
              Find UK Visa<br />
              <span style={{ color: "#0057FF" }}>Sponsored Jobs</span><br />
              Faster with AI
            </h1>
            <p style={{ fontSize: mob ? 15 : 18, color: "#4B5675", lineHeight: 1.8, margin: "0 0 32px", maxWidth: 500 }}>
              Every job verified against 125,000+ Home Office licensed sponsors. No more wasted applications. No more guessing. Only real sponsored roles for international talent.
            </p>
            <div style={{ display: "flex", gap: 12, flexDirection: mob ? "column" : "row", maxWidth: mob ? 320 : "none" }}>
              <button onClick={() => navigate("/jobs")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 13, padding: mob ? "15px 24px" : "17px 36px", fontSize: mob ? 15 : 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 32px #0057FF35", transition: "transform 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >Find Sponsored Jobs →</button>
              <button onClick={() => navigate("/visa-checker")} style={{ background: "#fff", color: "#0057FF", border: "2px solid #0057FF25", borderRadius: 13, padding: mob ? "15px 24px" : "17px 36px", fontSize: mob ? 15 : 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#0057FF"; e.currentTarget.style.background = "#F0F5FF" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#0057FF25"; e.currentTarget.style.background = "#fff" }}
              >Check Visa Eligibility</button>
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 28, flexWrap: "wrap" }}>
              {["✅ 125,000+ verified sponsors", "🤖 AI job matching", "🛂 Free visa checker"].map(b => (
                <span key={b} style={{ color: "#4B5675", fontSize: mob ? 12 : 13, fontWeight: 500 }}>{b}</span>
              ))}
            </div>
          </div>

          {/* Hero product mockup */}
          {!mob && (
            <div style={{ position: "relative" }}>
              <ProductScreen title="Job Search">
                <div style={{ marginBottom: 12 }}>
                  <div style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>🔍</span>
                    <span style={{ fontSize: 13, color: "#9CA3B8" }}>Software Engineer · London</span>
                    <div style={{ marginLeft: "auto", background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>Search</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#00D68F", fontWeight: 600, marginBottom: 10 }}>🔍 Verifying against UK Home Office register...</div>
                  {[
                    { title: "Senior Software Engineer", company: "Amazon UK", score: 98, verified: true, salary: "£70k–£90k" },
                    { title: "Backend Developer", company: "Google UK", score: 95, verified: true, salary: "£65k–£85k" },
                    { title: "Full Stack Engineer", company: "Deloitte LLP", score: 91, verified: true, salary: "£55k–£70k" },
                  ].map(job => (
                    <div key={job.title} style={{ background: "#fff", border: `1.5px solid ${job.verified ? "#00D68F40" : "#E8EEFF"}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, position: "relative" }}>
                      {job.verified && <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #00D68F, #00A67E)", color: "#fff", fontSize: 8, fontWeight: 800, padding: "3px 8px", borderRadius: "0 10px 0 6px" }}>✓ UK GOV VERIFIED</div>}
                      <div style={{ fontWeight: 700, fontSize: 12, color: "#0A0F1E", marginBottom: 2 }}>{job.title}</div>
                      <div style={{ fontSize: 11, color: "#4B5675", marginBottom: 4 }}>{job.company} · {job.salary}</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#00D68F15", border: "1px solid #00D68F40", borderRadius: 10, padding: "2px 8px", fontSize: 9, fontWeight: 700, color: "#00D68F" }}>
                        Verified {job.score}%
                      </div>
                    </div>
                  ))}
                </div>
              </ProductScreen>
              {/* Floating badge */}
              <div style={{ position: "absolute", bottom: -20, left: -20, background: "#fff", border: "1px solid #E8EEFF", borderRadius: 14, padding: "12px 16px", boxShadow: "0 8px 32px rgba(0,57,255,0.1)" }}>
                <div style={{ fontSize: 11, color: "#9CA3B8", fontWeight: 600, marginBottom: 4 }}>ONLY SHOWING</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#00D68F" }}>100% Verified</div>
                <div style={{ fontSize: 11, color: "#4B5675" }}>Sponsor employers</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────── */}
      <section ref={statsRef} style={{ background: "linear-gradient(135deg, #0038CC 0%, #0057FF 50%, #00C2FF 100%)", padding: mob ? "56px 5%" : "80px 6%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(5,1fr)", gap: mob ? 24 : 32 }}>
          {[
            { end: 125284, suffix: "+", label: "Verified Sponsors", icon: "🏛️" },
            { end: 50000, suffix: "+", label: "Sponsored Jobs", icon: "💼" },
            { end: 15000, suffix: "+", label: "Candidates Helped", icon: "🌍" },
            { end: 47, suffix: "", label: "Countries", icon: "🌐" },
            { end: 98, suffix: "%", label: "Satisfaction Rate", icon: "⭐" },
          ].map((stat, i) => (
            <div key={stat.label} style={{ textAlign: "center", opacity: statsV ? 1 : 0, transform: statsV ? "none" : "translateY(20px)", transition: `all 0.6s ease ${i * 0.1}s`, gridColumn: mob && i === 4 ? "1 / -1" : "auto" }}>
              <div style={{ fontSize: mob ? 22 : 28, marginBottom: 6 }}>{stat.icon}</div>
              <div style={{ fontSize: mob ? 28 : 44, fontWeight: 900, color: "#fff", letterSpacing: -1.5, lineHeight: 1 }}>
                <Counter end={stat.end} suffix={stat.suffix} />
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: mob ? 12 : 14, marginTop: 6, fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section style={s.section}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 40 : 70 }}>
            <Reveal><div style={s.tag()}>How It Works</div></Reveal>
            <Reveal delay={0.1}><h2 style={s.h2}>From search to<br /><span style={{ color: "#0057FF" }}>sponsored offer</span> in 4 steps</h2></Reveal>
            <Reveal delay={0.2}><p style={{ ...s.sub, maxWidth: 480, margin: "0 auto" }}>The simplest way to find a genuine UK visa sponsored job — no guessing, no wasted applications.</p></Reveal>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(4,1fr)", gap: mob ? 16 : 24, position: "relative" }}>
            {[
              { step: "01", icon: "🔍", title: "Search Verified Jobs", desc: "Type any role — results appear instantly, every employer verified against the Home Office sponsor register.", color: "#0057FF" },
              { step: "02", icon: "🛂", title: "Check Visa Eligibility", desc: "Enter your details and our AI tells you exactly which visa route you qualify for and what salary you need.", color: "#00D68F" },
              { step: "03", icon: "📄", title: "Score Your CV", desc: "Upload your CV and get real AI scores for UK format, ATS compatibility and visa sponsorship keywords.", color: "#7C3AED" },
              { step: "04", icon: "✅", title: "Apply with Confidence", desc: "Apply only to verified sponsors. Direct links to employer careers pages. Track your applications.", color: "#FF6B35" },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 0.1}>
                <div style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: mob ? 16 : 20, padding: mob ? "22px 18px" : "30px 24px", textAlign: "center", position: "relative" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${s.color}, ${s.color}90)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 4px 20px ${s.color}30` }}>
                    <span style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>{s.step}</span>
                  </div>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                  <h3 style={{ fontSize: mob ? 15 : 17, fontWeight: 800, color: "#0A0F1E", margin: "0 0 10px" }}>{s.title}</h3>
                  <p style={{ color: "#4B5675", fontSize: mob ? 13 : 14, lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT FEATURES WITH SCREENS ────────────────── */}
      <section style={s.sectionGrey}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 36 : 64 }}>
            <Reveal><div style={s.tag("#7C3AED", "#7C3AED0D", "#7C3AED22")}>Product Features</div></Reveal>
            <Reveal delay={0.1}><h2 style={s.h2}>Innovation that no other<br /><span style={{ color: "#0057FF" }}>job platform has</span></h2></Reveal>
            <Reveal delay={0.2}><p style={{ ...s.sub, maxWidth: 520, margin: "0 auto" }}>IMMTECH isn't a job board. It's an AI immigration intelligence platform built specifically for international professionals.</p></Reveal>
          </div>

          {/* Feature tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap", justifyContent: mob ? "center" : "flex-start" }}>
            {FEATURES.map((f, i) => (
              <button key={f.title} onClick={() => setActiveFeature(i)} style={{ padding: "10px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${activeFeature === i ? f.color : "#E8EEFF"}`, background: activeFeature === i ? `${f.color}0D` : "#fff", color: activeFeature === i ? f.color : "#4B5675", transition: "all 0.2s", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                {f.icon} {f.title}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 24 : 48, alignItems: "center" }}>
            <Reveal>
              <div>
                <div style={{ display: "inline-block", background: `${FEATURES[activeFeature].color}15`, border: `1px solid ${FEATURES[activeFeature].color}30`, borderRadius: 100, padding: "4px 12px", fontSize: 10, fontWeight: 800, color: FEATURES[activeFeature].color, marginBottom: 16, letterSpacing: 0.8 }}>
                  {FEATURES[activeFeature].tag}
                </div>
                <h3 style={{ fontSize: mob ? 22 : 34, fontWeight: 900, color: "#0A0F1E", margin: "0 0 16px", letterSpacing: -1, lineHeight: 1.1 }}>{FEATURES[activeFeature].title}</h3>
                <p style={{ color: "#4B5675", fontSize: mob ? 14 : 16, lineHeight: 1.8, margin: "0 0 24px" }}>{FEATURES[activeFeature].desc}</p>
                <button onClick={() => navigate("/jobs")} style={{ background: `linear-gradient(135deg, ${FEATURES[activeFeature].color}, ${FEATURES[activeFeature].color}90)`, color: "#fff", border: "none", borderRadius: 11, padding: "13px 26px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Try it now →
                </button>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <ProductScreen title={FEATURES[activeFeature].title} color={FEATURES[activeFeature].color}>
                {FEATURES[activeFeature].screen}
              </ProductScreen>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── WHY NOT INDEED/LINKEDIN ───────────────────────── */}
      <section style={s.section}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 36 : 64 }}>
            <Reveal><div style={s.tag("#FF6B35", "#FF6B350D", "#FF6B3525")}>Why IMMTECH</div></Reveal>
            <Reveal delay={0.1}><h2 style={s.h2}>Why not just use<br /><span style={{ color: "#0057FF" }}>Indeed or LinkedIn?</span></h2></Reveal>
            <Reveal delay={0.2}><p style={{ ...s.sub, maxWidth: 520, margin: "0 auto" }}>Generic job boards weren't built for international talent. IMMTECH was built for one purpose only — helping you find a genuine sponsored role in the UK.</p></Reveal>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(3,1fr)", gap: mob ? 14 : 20 }}>
            {/* Indeed */}
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: mob ? 16 : 20, padding: mob ? "22px 18px" : "30px 24px" }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>😤</div>
              <h3 style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: "#DC2626", margin: "0 0 16px" }}>Indeed / LinkedIn</h3>
              {[
                "Jobs say 'visa sponsorship' but employers don't actually sponsor",
                "No verification against Home Office register",
                "No visa eligibility checking",
                "No salary threshold guidance",
                "Hundreds of wasted applications",
                "Built for domestic candidates",
              ].map(p => (
                <div key={p} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#DC2626", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>✗</span>
                  <span style={{ fontSize: mob ? 12 : 13, color: "#4B5675", lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </div>

            {/* vs arrow */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ width: mob ? 48 : 64, height: mob ? 48 : 64, borderRadius: "50%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px #0057FF30" }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: mob ? 16 : 20 }}>VS</span>
              </div>
              {!mob && <div style={{ color: "#9CA3B8", fontSize: 13, textAlign: "center", maxWidth: 120 }}>Choose the platform built for you</div>}
            </div>

            {/* IMMTECH */}
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: mob ? 16 : 20, padding: mob ? "22px 18px" : "30px 24px" }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>🚀</div>
              <h3 style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: "#16A34A", margin: "0 0 16px" }}>IMMTECH</h3>
              {[
                "Every employer verified on UK Home Office register",
                "Real-time sponsor licence status checked",
                "AI visa eligibility checker with SOC codes",
                "Exact salary thresholds for your role",
                "Only genuine sponsored roles shown",
                "Built exclusively for international talent",
              ].map(p => (
                <div key={p} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#16A34A", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: mob ? 12 : 13, color: "#4B5675", lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TEAM / FOUNDERS ───────────────────────────────── */}
      <section style={s.sectionGrey}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 36 : 64 }}>
            <Reveal><div style={s.tag("#00D68F", "#00D68F0D", "#00D68F30")}>The Team</div></Reveal>
            <Reveal delay={0.1}><h2 style={s.h2}>Built by people who<br /><span style={{ color: "#0057FF" }}>lived the problem</span></h2></Reveal>
            <Reveal delay={0.2}><p style={{ ...s.sub, maxWidth: 560, margin: "0 auto" }}>Every member of the IMMTECH team is an international professional who experienced the pain of finding sponsored work in the UK firsthand. We built the platform we wished existed.</p></Reveal>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4,1fr)", gap: mob ? 14 : 20 }}>
            {TEAM.map((member, i) => (
              <Reveal key={member.name} delay={i * 0.08}>
                <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: mob ? 16 : 20, padding: mob ? "20px 14px" : "28px 22px", textAlign: "center" }}>
                  <div style={{ width: mob ? 56 : 68, height: mob ? 56 : 68, borderRadius: "50%", background: `linear-gradient(135deg, ${member.color}, ${member.color}80)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: mob ? 20 : 24, fontWeight: 900, color: "#fff" }}>
                    {member.avatar}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: mob ? 13 : 15, color: "#0A0F1E", marginBottom: 4 }}>{member.name}</div>
                  <div style={{ fontSize: mob ? 11 : 12, color: member.color, fontWeight: 700, marginBottom: 10 }}>{member.role}</div>
                  <p style={{ fontSize: mob ? 11 : 13, color: "#4B5675", lineHeight: 1.6, margin: 0 }}>{member.bio}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Mission statement */}
          <Reveal delay={0.3}>
            <div style={{ background: "linear-gradient(135deg, #0038CC, #0057FF)", borderRadius: mob ? 18 : 24, padding: mob ? "32px 24px" : "48px 56px", marginTop: mob ? 32 : 48, textAlign: "center" }}>
              <div style={{ fontSize: mob ? 32 : 44, marginBottom: 16 }}>🌍</div>
              <h3 style={{ fontSize: mob ? 20 : 32, fontWeight: 900, color: "#fff", margin: "0 0 14px", letterSpacing: -1 }}>Our Mission</h3>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: mob ? 14 : 18, lineHeight: 1.8, maxWidth: 620, margin: "0 auto" }}>
                "To make the UK accessible to the world's best international talent by removing the friction, misinformation and wasted effort from the visa sponsorship job search process."
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TRACTION ─────────────────────────────────────── */}
      <section style={s.section}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 36 : 64 }}>
            <Reveal><div style={s.tag()}>Traction & Validation</div></Reveal>
            <Reveal delay={0.1}><h2 style={s.h2}>Real product.<br /><span style={{ color: "#0057FF" }}>Real results.</span></h2></Reveal>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4,1fr)", gap: mob ? 12 : 20 }}>
            {[
              { icon: "✅", value: "Live", label: "Product at immtech.vercel.app", color: "#00D68F" },
              { icon: "🏛️", value: "125,284", label: "UK Gov Sponsors in Database", color: "#0057FF" },
              { icon: "🤖", value: "AI", label: "Claude-Powered CV Scoring", color: "#7C3AED" },
              { icon: "🔗", value: "2 APIs", label: "Reed + Adzuna Integration", color: "#FF6B35" },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.1}>
                <div style={{ background: `${item.color}08`, border: `1px solid ${item.color}25`, borderRadius: mob ? 14 : 18, padding: mob ? "20px 14px" : "28px 22px", textAlign: "center" }}>
                  <div style={{ fontSize: mob ? 24 : 32, marginBottom: 10 }}>{item.icon}</div>
                  <div style={{ fontSize: mob ? 22 : 30, fontWeight: 900, color: item.color, letterSpacing: -1, marginBottom: 6 }}>{item.value}</div>
                  <div style={{ fontSize: mob ? 11 : 13, color: "#4B5675", fontWeight: 500, lineHeight: 1.4 }}>{item.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────── */}
      <section style={s.sectionGrey}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 36 : 64 }}>
            <Reveal><div style={s.tag("#00D68F", "#00D68F0D", "#00D68F30")}>Success Stories</div></Reveal>
            <Reveal delay={0.1}><h2 style={s.h2}>International talent.<br /><span style={{ color: "#0057FF" }}>UK sponsored jobs.</span></h2></Reveal>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(3,1fr)", gap: mob ? 14 : 22 }}>
            {[
              { name: "Priya Sharma", role: "Software Engineer", country: "🇮🇳 India → 🇬🇧 UK", text: "IMMTECH found me 3 verified sponsored roles in London within a week. No more wasted applications to employers who didn't actually sponsor.", avatar: "PS", color: "#0057FF" },
              { name: "Emmanuel Okafor", role: "Registered Nurse", country: "🇳🇬 Nigeria → 🇬🇧 UK", text: "The visa checker told me exactly which NHS trusts sponsor. I only applied to verified employers. Got 3 interviews and now work in Manchester.", avatar: "EO", color: "#00D68F" },
              { name: "Arjun Patel", role: "Civil Engineer", country: "🇵🇰 Pakistan → 🇬🇧 UK", text: "The sponsor register check is what makes IMMTECH different. I knew every employer I applied to was verified. Hired by Arup in 3 weeks.", avatar: "AP", color: "#FF6B35" },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: mob ? 16 : 20, padding: mob ? "20px 16px" : "30px 26px" }}>
                  <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>{[...Array(5)].map((_, i) => <span key={i} style={{ color: "#F59E0B", fontSize: 15 }}>★</span>)}</div>
                  <p style={{ color: "#4B5675", fontSize: mob ? 13 : 14, lineHeight: 1.8, margin: "0 0 20px", fontStyle: "italic" }}>"{t.text}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${t.color}18`, border: `2px solid ${t.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: t.color, fontWeight: 800, fontSize: 13 }}>{t.avatar}</span>
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

      {/* ── PRICING ──────────────────────────────────────── */}
      <section style={s.section}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 36 : 64 }}>
            <Reveal><div style={s.tag("#FF6B35", "#FF6B350D", "#FF6B3525")}>Pricing</div></Reveal>
            <Reveal delay={0.1}><h2 style={s.h2}>Simple, honest pricing</h2></Reveal>
            <Reveal delay={0.2}><p style={s.sub}>Start free. Upgrade when you're ready. No hidden fees.</p></Reveal>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(4,1fr)", gap: mob ? 14 : 20 }}>
            {[
              { name: "Talent Free", price: "£0", period: "forever", color: "#0057FF", popular: false, features: ["Unlimited job searches", "Sponsor verification", "Basic visa checker", "Save up to 10 jobs"] },
              { name: "Talent Premium", price: "£19", period: "per month", color: "#00D68F", popular: true, features: ["Everything in Free", "AI CV scoring & rewrite", "Unlimited saves & alerts", "Full visa pathway report", "SOC code checker"] },
              { name: "Employer Starter", price: "£99", period: "per month", color: "#FF6B35", popular: false, features: ["Candidate database", "5 job postings", "Compliance tracker", "Candidate messaging"] },
              { name: "Employer Pro", price: "£399", period: "per month", color: "#7C3AED", popular: false, features: ["Unlimited postings", "Immigration automation", "API access", "Dedicated manager"] },
            ].map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08}>
                <div style={{ background: p.popular ? "linear-gradient(155deg, #0057FF, #0090FF)" : "#fff", border: p.popular ? "none" : "1px solid #E8EEFF", borderRadius: mob ? 18 : 22, padding: mob ? "24px 18px" : "32px 24px", position: "relative", boxShadow: p.popular ? "0 20px 56px #0057FF28" : "none", height: "100%" }}>
                  {p.popular && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#00D68F", color: "#fff", borderRadius: 100, padding: "4px 16px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>⭐ Most Popular</div>}
                  <div style={{ fontSize: 11, fontWeight: 700, color: p.popular ? "rgba(255,255,255,0.55)" : "#9CA3B8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{p.name}</div>
                  <div style={{ marginBottom: 18 }}>
                    <span style={{ fontSize: mob ? 34 : 40, fontWeight: 900, letterSpacing: -2, color: p.popular ? "#fff" : "#0A0F1E" }}>{p.price}</span>
                    <span style={{ fontSize: 12, color: p.popular ? "rgba(255,255,255,0.5)" : "#9CA3B8", marginLeft: 4 }}>/{p.period}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: p.popular ? "#00D68F" : p.color, fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
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

      {/* ── CTA ──────────────────────────────────────────── */}
      <section style={s.sectionGrey}>
        <Reveal>
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", background: "linear-gradient(145deg, #0038CC, #0057FF 50%, #0090FF)", borderRadius: mob ? 24 : 36, padding: mob ? "52px 28px" : "90px 70px", boxShadow: "0 40px 100px #0057FF30", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <h2 style={{ fontSize: mob ? 28 : 52, fontWeight: 900, color: "#fff", margin: "0 0 16px", letterSpacing: -1.5, lineHeight: 1.1 }}>Stop guessing.<br />Start applying.</h2>
              <p style={{ color: "rgba(255,255,255,0.72)", fontSize: mob ? 14 : 18, lineHeight: 1.8, margin: "0 0 36px" }}>
                Join thousands of international professionals who found their genuine UK sponsored job through IMMTECH.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexDirection: mob ? "column" : "row", maxWidth: mob ? 280 : "none", margin: "0 auto" }}>
                <button onClick={() => navigate("/onboarding")} style={{ background: "#fff", color: "#0057FF", border: "none", borderRadius: 13, padding: mob ? "14px 24px" : "17px 40px", fontSize: mob ? 15 : 17, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Get Started Free →</button>
                <button onClick={() => navigate("/jobs")} style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 13, padding: mob ? "14px 24px" : "17px 40px", fontSize: mob ? 15 : 17, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Find Sponsored Jobs</button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

     {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{ background: "#0A0F1E", padding: mob ? "52px 5% 32px" : "80px 6% 40px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>

          {/* Top row — logo + newsletter */}
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1.5fr 1fr", gap: mob ? 32 : 60, marginBottom: mob ? 40 : 56, paddingBottom: mob ? 32 : 48, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IT</span>
                </div>
                <span style={{ fontWeight: 900, fontSize: 21, color: "#fff", letterSpacing: -0.5 }}>IMMTECH</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 14, lineHeight: 1.85, maxWidth: 300, margin: "0 0 20px" }}>
                UK's first AI-powered visa sponsorship job platform. Built by international talent, for international talent.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "🇬🇧 UK Based" },
                  { label: "🔒 GDPR Compliant" },
                  { label: "🤖 AI Powered" },
                ].map(b => (
                  <span key={b.label} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "4px 10px", fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{b.label}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 8 }}>Get sponsored job alerts</div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 14 }}>Be the first to know when new verified sponsored roles go live.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="your@email.com" style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, padding: "11px 14px", fontSize: 13, color: "#fff", fontFamily: "inherit", outline: "none", minWidth: 0 }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"} />
                <button onClick={() => navigate("/auth")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 9, padding: "11px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  Get Alerts →
                </button>
              </div>
            </div>
          </div>

          {/* Links grid */}
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: mob ? 28 : 40, marginBottom: mob ? 36 : 52 }}>
            {[
              {
                title: "Platform",
                links: [
                  { label: "Find Sponsored Jobs", path: "/jobs" },
                  { label: "Visa Checker", path: "/visa-checker" },
                  { label: "For Employers", path: "/employers" },
                  { label: "AI CV Scoring", path: "/profile" },
                  { label: "Job Alerts", path: "/notifications" },
                ]
              },
              {
                title: "Company",
                links: [
                  { label: "About Us", path: "/about" },
                  { label: "Our Mission", path: "/mission" },
                  { label: "Careers", path: "/careers" },
                  { label: "Contact", path: "/contact" },
                  { label: "Blog", path: "/about" },
                ]
              },
              {
                title: "Resources",
                links: [
                  { label: "UK Visa Guide", path: "/visa-checker" },
                  { label: "Sponsor Register", path: "/jobs" },
                  { label: "SOC Code Checker", path: "/visa-checker" },
                  { label: "Salary Thresholds", path: "/visa-checker" },
                  { label: "Immigration FAQs", path: "/about" },
                ]
              },
              {
                title: "Legal",
                links: [
                  { label: "Privacy Policy", path: "/privacy-policy" },
                  { label: "Terms of Service", path: "/terms-of-service" },
                  { label: "Cookie Policy", path: "/cookie-policy" },
                  { label: "GDPR", path: "/gdpr" },
                ]
              },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ color: "#fff", fontWeight: 700, marginBottom: 16, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.8 }}>{col.title}</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
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

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4,1fr)", gap: 16, marginBottom: mob ? 32 : 48, padding: mob ? "20px" : "28px 32px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
            {[
              { value: "125,284", label: "Verified UK Sponsors", icon: "🏛️" },
              { value: "50,000+", label: "Sponsored Jobs", icon: "💼" },
              { value: "Free", label: "To Get Started", icon: "✅" },
              { value: "AI", label: "Powered Platform", icon: "🤖" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: mob ? 18 : 22, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: mob ? 16 : 20, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 13 }}>© 2025 IMMTECH Ltd. Registered in England & Wales. All rights reserved.</span>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                { label: "Privacy", path: "/privacy-policy" },
                { label: "Terms", path: "/terms-of-service" },
                { label: "Cookies", path: "/cookie-policy" },
              ].map(l => (
                <span key={l.label} onClick={() => navigate(l.path)} style={{ color: "rgba(255,255,255,0.28)", fontSize: 13, cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.28)"}
                >{l.label}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <style>{`@keyframes fadeDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}