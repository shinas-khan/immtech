import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"

function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(ease * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])
  return count
}

function useInView(threshold = 0.2) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, inView]
}

const ROLES = [
  { label: "Software Engineer", icon: "01" },
  { label: "Registered Nurse", icon: "02" },
  { label: "Data Scientist", icon: "03" },
  { label: "Civil Engineer", icon: "04" },
  { label: "Cyber Security", icon: "05" },
  { label: "Social Worker", icon: "06" },
  { label: "Pharmacist", icon: "07" },
  { label: "Accountant", icon: "08" },
]

const HOW = [
  { num: "01", title: "Search your role", body: "Type any job title. We search across Reed, Adzuna, Jooble and our own employer partners simultaneously." },
  { num: "02", title: "We verify every employer", body: "Every result is cross-checked against 125,284 UK Home Office licensed sponsors in real time. No exceptions." },
  { num: "03", title: "Check your eligibility", body: "See exactly which visa route applies, whether the salary meets UKVI thresholds, and if you qualify as a new entrant." },
  { num: "04", title: "Apply with confidence", body: "Only apply to roles that can actually sponsor you. Stop wasting time on jobs that never could." },
]

const STATS = [
  { value: 125284, label: "verified sponsors", suffix: "" },
  { value: 88, label: "new jobs cached today", suffix: "+" },
  { value: 41700, label: "standard salary threshold", prefix: "GBP " },
  { value: 33400, label: "new entrant threshold", prefix: "GBP " },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [heroVisible, setHeroVisible] = useState(false)
  const [activeRole, setActiveRole] = useState(0)
  const [statsRef, statsInView] = useInView()
  const [howRef, howInView] = useInView()

  const stat0 = useCountUp(125284, 2500, statsInView)
  const stat1 = useCountUp(88, 1500, statsInView)
  const stat2 = useCountUp(41700, 2000, statsInView)
  const stat3 = useCountUp(33400, 2000, statsInView)
  const statValues = [stat0, stat1, stat2, stat3]

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 100)
    const interval = setInterval(() => setActiveRole(r => (r + 1) % ROLES.length), 2000)
    return () => clearInterval(interval)
  }, [])

  const S = {
    page: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", overflowX: "hidden", background: "#fff" },
    nav: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid #F0F0F0", padding: "0 5%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" },
    logo: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
    logoBox: { width: 36, height: 36, borderRadius: 10, background: "#0057FF", display: "flex", alignItems: "center", justifyContent: "center" },
    logoText: { fontWeight: 900, fontSize: 19, letterSpacing: -0.8, color: "#0057FF" },
    navLinks: { display: "flex", gap: 32, alignItems: "center" },
    navLink: { fontSize: 14, fontWeight: 500, color: "#555", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit" },
    signIn: { fontSize: 14, fontWeight: 600, color: "#0A0F1E", cursor: "pointer", background: "none", border: "1.5px solid #E0E0E0", borderRadius: 10, padding: "8px 20px", fontFamily: "inherit" },
    cta: { fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", background: "#0057FF", border: "none", borderRadius: 10, padding: "9px 22px", fontFamily: "inherit" },
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; -webkit-font-smoothing: antialiased; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideRight { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-up { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.25s; }
        .fade-up-3 { animation-delay: 0.4s; }
        .fade-up-4 { animation-delay: 0.55s; }
        .role-pill { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .role-pill:hover { transform: translateY(-3px) scale(1.04); }
        .btn-main { transition: all 0.2s; }
        .btn-main:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,87,255,0.3); }
        .btn-sec:hover { background: #F5F7FF !important; }
        .how-card { transition: all 0.3s; }
        .how-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.08); }
        .stat-card { transition: all 0.3s; }
        .stat-card:hover { transform: translateY(-3px); }
        .floating { animation: float 4s ease-in-out infinite; }
        .floating-2 { animation: float 4s ease-in-out infinite 1s; }
        .floating-3 { animation: float 4s ease-in-out infinite 2s; }
      `}</style>

      {/* Nav */}
      <nav style={S.nav}>
        <div style={S.logo} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <div style={S.logoBox}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 12, letterSpacing: -0.5 }}>IT</span>
          </div>
          <span style={S.logoText}>IMMTECH</span>
        </div>
        <div style={S.navLinks}>
          <button style={S.navLink} onClick={() => navigate("/jobs")}>Find Jobs</button>
          <button style={S.navLink} onClick={() => navigate("/visa-checker")}>Visa Checker</button>
          <button style={S.navLink} onClick={() => navigate("/cos-checker")}>COS Checker</button>
          <button style={S.navLink} onClick={() => navigate("/employers")}>For Employers</button>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={S.signIn} className="btn-sec" onClick={() => navigate("/auth")}>Sign in</button>
          <button style={S.cta} className="btn-main" onClick={() => navigate("/onboarding")}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "100px 5% 80px", background: "#fff", position: "relative", overflow: "hidden" }}>

        {/* Background accent circles */}
        <div style={{ position: "absolute", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "#0057FF08", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "#0057FF05", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1140, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>

          {/* Left - copy */}
          <div>
            <div className={heroVisible ? "fade-up fade-up-1" : ""} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0057FF10", borderRadius: 20, padding: "5px 14px", marginBottom: 24 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0057FF", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0057FF", letterSpacing: 0.5 }}>UK Visa Sponsorship Platform</span>
            </div>

            <h1 className={heroVisible ? "fade-up fade-up-2" : ""} style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 900, color: "#0A0F1E", lineHeight: 1.05, letterSpacing: -2, marginBottom: 24 }}>
              Find your<br />
              <span style={{ color: "#0057FF" }}>sponsored job</span><br />
              in the UK
            </h1>

            <p className={heroVisible ? "fade-up fade-up-3" : ""} style={{ fontSize: 18, color: "#555", lineHeight: 1.7, marginBottom: 36, maxWidth: 460 }}>
              Every job verified against 125,284 Home Office licensed sponsors. Real salary checks. Built specifically for international graduates.
            </p>

            <div className={heroVisible ? "fade-up fade-up-4" : ""} style={{ display: "flex", gap: 12, marginBottom: 40, flexWrap: "wrap" }}>
              <button className="btn-main" onClick={() => navigate("/jobs")}
                style={{ background: "#0057FF", color: "#fff", border: "none", borderRadius: 12, padding: "16px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Find Sponsored Jobs
              </button>
              <button className="btn-sec" onClick={() => navigate("/visa-checker")}
                style={{ background: "#fff", color: "#0057FF", border: "2px solid #0057FF", borderRadius: 12, padding: "16px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Check Visa Eligibility
              </button>
            </div>

            <div className={heroVisible ? "fade-up fade-up-4" : ""} style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[["125,284", "verified sponsors"], ["Free", "to use"], ["Real-time", "Home Office data"]].map(([val, label]) => (
                <div key={label}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#0A0F1E" }}>{val}</div>
                  <div style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - animated job cards */}
          <div style={{ position: "relative", height: 480 }}>

            {/* Main card */}
            <div className="floating" style={{ position: "absolute", top: 40, left: 20, right: 20, background: "#fff", borderRadius: 20, border: "1px solid #E8EEFF", padding: "24px", boxShadow: "0 20px 60px rgba(0,57,255,0.12)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#00B86B", background: "#E8F8F0", borderRadius: 6, padding: "3px 8px", display: "inline-block", marginBottom: 8 }}>UK GOV VERIFIED</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E" }}>Senior Software Engineer</div>
                  <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>Amazon UK Services Ltd - London</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0057FF" }}>Confirmed 94%</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <span style={{ background: "#E6F1FB", color: "#185FA5", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>GBP 65k - 85k</span>
                <span style={{ background: "#EAF3DE", color: "#3B6D11", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>A-Rated Sponsor</span>
                <span style={{ background: "#F0F0FF", color: "#534AB7", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>Skilled Worker</span>
              </div>
              <div style={{ height: 1, background: "#F0F0F0", marginBottom: 16 }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#aaa" }}>Posted 2 days ago</div>
                <button style={{ background: "#0057FF", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Apply Now</button>
              </div>
            </div>

            {/* Secondary card */}
            <div className="floating-2" style={{ position: "absolute", bottom: 20, left: 0, right: 60, background: "#fff", borderRadius: 16, border: "1px solid #E8EEFF", padding: "18px 20px", boxShadow: "0 12px 40px rgba(0,57,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0A0F1E" }}>Registered Nurse - ICU</div>
                  <div style={{ fontSize: 12, color: "#888" }}>NHS Foundation Trust - Manchester</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <span style={{ background: "#E8F8F0", color: "#00B86B", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>Health Route</span>
                    <span style={{ background: "#FFF3E0", color: "#E65100", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>GBP 32k+</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0057FF" }}>Very Likely 78%</div>
              </div>
            </div>

            {/* Floating role pill */}
            <div className="floating-3" style={{ position: "absolute", top: 0, right: 0, background: "#0057FF", borderRadius: 12, padding: "10px 18px", color: "#fff" }}>
              <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>Searching for</div>
              <div style={{ fontSize: 13, fontWeight: 700, transition: "all 0.3s" }}>{ROLES[activeRole].label}</div>
            </div>

            {/* Sponsor count badge */}
            <div style={{ position: "absolute", top: "45%", right: -10, background: "#fff", borderRadius: 12, border: "1px solid #E8EEFF", padding: "12px 16px", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#0057FF" }}>125k</div>
              <div style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>Verified<br />Sponsors</div>
            </div>

          </div>
        </div>
      </section>

      {/* Role pills */}
      <section style={{ background: "#F8FAFF", padding: "60px 5%" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: "#0A0F1E", letterSpacing: -1, marginBottom: 12 }}>Roles we specialise in</h2>
            <p style={{ fontSize: 16, color: "#888", maxWidth: 500, margin: "0 auto" }}>All verified against the Home Office sponsor register and current salary thresholds</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            {ROLES.map((role, i) => (
              <button key={role.label} className="role-pill btn-sec"
                onClick={() => navigate("/jobs?q=" + encodeURIComponent(role.label))}
                style={{ background: activeRole === i ? "#0057FF" : "#fff", color: activeRole === i ? "#fff" : "#0A0F1E", border: "1.5px solid " + (activeRole === i ? "#0057FF" : "#E8EEFF"), borderRadius: 40, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, opacity: 0.5, fontWeight: 700 }}>{role.icon}</span>
                {role.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsRef} style={{ background: "#0A0F1E", padding: "80px 5%" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: -1.5, marginBottom: 12 }}>The numbers that matter</h2>
            <p style={{ fontSize: 16, color: "#888" }}>Real data, real verification, real results</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {STATS.map((s, i) => (
              <div key={s.label} className="stat-card" style={{ background: "#161B2E", borderRadius: 16, padding: "32px 28px", border: "1px solid #1E2640" }}>
                <div style={{ fontSize: 40, fontWeight: 900, color: "#0057FF", letterSpacing: -2, marginBottom: 8, fontVariantNumeric: "tabular-nums" }}>
                  {s.prefix || ""}{statValues[i].toLocaleString()}{s.suffix || ""}
                </div>
                <div style={{ fontSize: 14, color: "#888", fontWeight: 500, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section ref={howRef} style={{ background: "#fff", padding: "100px 5%" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 70 }}>
            <div style={{ display: "inline-block", background: "#0057FF10", borderRadius: 20, padding: "5px 16px", marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0057FF", letterSpacing: 1 }}>HOW IT WORKS</span>
            </div>
            <h2 style={{ fontSize: 42, fontWeight: 900, color: "#0A0F1E", letterSpacing: -1.5, marginBottom: 16 }}>Four steps to your<br />sponsored role</h2>
            <p style={{ fontSize: 17, color: "#888", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>No guesswork. No wasted applications. Just roles that can actually sponsor you.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
            {HOW.map((h, i) => (
              <div key={h.num} className="how-card" style={{ background: "#F8FAFF", borderRadius: 20, padding: "36px 28px", border: "1px solid #EEF2FF", opacity: howInView ? 1 : 0, transform: howInView ? "translateY(0)" : "translateY(24px)", transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) " + (i * 0.1) + "s" }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#0057FF", letterSpacing: 1, marginBottom: 20, opacity: 0.5 }}>{h.num}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0A0F1E", marginBottom: 14, letterSpacing: -0.5 }}>{h.title}</h3>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7 }}>{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For graduates section */}
      <section style={{ background: "#F8FAFF", padding: "100px 5%" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-block", background: "#FF6B3510", borderRadius: 20, padding: "5px 16px", marginBottom: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#FF6B35", letterSpacing: 1 }}>FOR RECENT GRADUATES</span>
            </div>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: "#0A0F1E", letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 24 }}>The experience<br />paradox is real.<br /><span style={{ color: "#0057FF" }}>We fix it.</span></h2>
            <p style={{ fontSize: 16, color: "#666", lineHeight: 1.8, marginBottom: 32 }}>
              You studied for years. You have skills. But employers want experience you can only get from a job. And most job boards don't filter for the new entrant salary rate of GBP 33,400  so you waste time applying to roles that don't apply to you.
            </p>
            <p style={{ fontSize: 16, color: "#666", lineHeight: 1.8, marginBottom: 36 }}>
              IMMTECH is the only UK platform with a new entrant filter built in. Toggle it on and see only the roles you can actually get sponsored for as a recent graduate.
            </p>
            <button className="btn-main" onClick={() => navigate("/jobs")}
              style={{ background: "#FF6B35", color: "#fff", border: "none", borderRadius: 12, padding: "16px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Find Graduate Roles
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { label: "Standard threshold", val: "GBP 41,700", color: "#E8EEFF", textColor: "#0057FF", sub: "Most Skilled Worker roles" },
              { label: "New entrant rate", val: "GBP 33,400", color: "#FFF0EB", textColor: "#FF6B35", sub: "Recent graduates only" },
              { label: "Health & Care route", val: "GBP 29,000", color: "#E8F8F0", textColor: "#00B86B", sub: "Nurses, doctors, pharmacists" },
              { label: "Shortage occupations", val: "GBP 33,400", color: "#F0F0FF", textColor: "#534AB7", sub: "Teachers, engineers, chefs" },
            ].map(c => (
              <div key={c.label} style={{ background: c.color, borderRadius: 16, padding: "24px 20px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.textColor, opacity: 0.7, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: c.textColor, letterSpacing: -0.5, marginBottom: 6 }}>{c.val}</div>
                <div style={{ fontSize: 12, color: c.textColor, opacity: 0.7 }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dual CTA */}
      <section style={{ background: "#0A0F1E", padding: "80px 5%" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ background: "#0057FF", borderRadius: 24, padding: "48px 40px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 1, marginBottom: 16 }}>FOR CANDIDATES</div>
            <h3 style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: -1, lineHeight: 1.15, marginBottom: 20 }}>Find your<br />sponsored role</h3>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: 32 }}>Search verified jobs, check your visa eligibility, and track your applications in one place.</p>
            <button className="btn-main" onClick={() => navigate("/onboarding")}
              style={{ background: "#fff", color: "#0057FF", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Get started free
            </button>
          </div>
          <div style={{ background: "#161B2E", borderRadius: 24, padding: "48px 40px", border: "1px solid #1E2640" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 16 }}>FOR EMPLOYERS</div>
            <h3 style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: -1, lineHeight: 1.15, marginBottom: 20 }}>Hire verified<br />international talent</h3>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 32 }}>Post your sponsored roles directly. Reach thousands of visa-ready candidates instantly.</p>
            <button className="btn-main" onClick={() => navigate("/employer/post")}
              style={{ background: "#0057FF", color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Post a job
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#0A0F1E", borderTop: "1px solid #1E2640", padding: "40px 5%" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#0057FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 10 }}>IT</span>
            </div>
            <span style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>IMMTECH</span>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[["About", "/about"], ["Contact", "/contact"], ["Privacy", "/privacy-policy"], ["Terms", "/terms-of-service"], ["GDPR", "/gdpr"]].map(([label, path]) => (
              <span key={label} onClick={() => navigate(path)} style={{ fontSize: 13, color: "#555", cursor: "pointer", fontWeight: 500 }}>{label}</span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#444" }}>2026 IMMTECH. Built for international talent.</div>
        </div>
      </footer>

    </div>
  )
}
