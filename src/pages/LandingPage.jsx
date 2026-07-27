import { useState, useEffect, useRef, Suspense, lazy } from "react"
import { useNavigate } from "react-router-dom"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

// Three.js is ~600kB - code-split it so it never blocks first paint/LCP
// of the hero copy and CTA buttons, which matter far more for conversion.
import RevealText from "../components/RevealText"

const Hero3D = lazy(() => import("../components/Hero3D"))

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [statsRef, statsInView] = useInView()
  const [howRef, howInView] = useInView()
  const pageRef = useRef(null)
  const progressRef = useRef(null)
  const heroSectionRef = useRef(null)

  const go = (path) => { setMobileMenuOpen(false); navigate(path) }

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

  // Cinematic scroll effects - added on top of the existing fade-up entrance
  // and IntersectionObserver-driven stat/how-card reveals (left untouched
  // since they already work). This layer covers everywhere that previously
  // had zero scroll motion: the top progress bar, hero background parallax,
  // and staggered reveals for role pills, graduate cards, dual CTA panels
  // and the footer columns.
  //
  // Wrapped in gsap.context() so every tween/ScrollTrigger created here gets
  // torn down via ctx.revert() on unmount - without this, navigating away
  // from the landing page in this SPA would leave orphaned ScrollTriggers
  // listening on a scroll container that no longer exists.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) return // respect the OS setting - no scroll-driven motion at all

    const ctx = gsap.context(() => {
      // Top scroll-progress bar - classic "how far through the page" signal
      if (progressRef.current) {
        gsap.set(progressRef.current, { scaleX: 0, transformOrigin: "0% 50%" })
        ScrollTrigger.create({
          start: 0,
          end: () => document.documentElement.scrollHeight - window.innerHeight,
          scrub: 0.3,
          onUpdate: (self) => gsap.set(progressRef.current, { scaleX: self.progress }),
        })
      }

      // Hero background circles drift at different speeds while scrolling
      // past the hero - subtle parallax depth, not a full pin/scrub set piece
      // (those are expensive and this page already has a heavy Three.js hero).
      gsap.utils.toArray(".hero-parallax-slow").forEach((el) => {
        gsap.to(el, { y: 120, ease: "none", scrollTrigger: { trigger: heroSectionRef.current, start: "top top", end: "bottom top", scrub: true } })
      })
      gsap.utils.toArray(".hero-parallax-fast").forEach((el) => {
        gsap.to(el, { y: -160, ease: "none", scrollTrigger: { trigger: heroSectionRef.current, start: "top top", end: "bottom top", scrub: true } })
      })

      // Batched reveal-on-scroll for every repeated card/pill group that
      // previously had no scroll animation at all.
      const batches = [
        { sel: ".role-pill", y: 24, stagger: 0.05 },
        { sel: ".grad-card", y: 30, stagger: 0.08 },
        { sel: ".cta-card", y: 40, stagger: 0.15 },
        { sel: ".footer-col", y: 24, stagger: 0.08 },
        { sel: ".reveal-heading", y: 20, stagger: 0 },
      ]
      batches.forEach(({ sel, y, stagger }) => {
        ScrollTrigger.batch(sel, {
          start: "top 88%",
          once: true,
          onEnter: (batch) => gsap.from(batch, { opacity: 0, y, stagger, duration: 0.7, ease: "power3.out" }),
        })
      })
    }, pageRef)

    return () => ctx.revert()
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
    <div ref={pageRef} style={S.page}>
      <div ref={progressRef} style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #0057FF, #00B86B)", zIndex: 200, transform: "scaleX(0)" }} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        /* scroll-behavior:smooth removed - it fights Lenis's interpolation
             and causes a double-easing stutter on anchor jumps. */
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
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { animation: marquee 38s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .marquee-track { animation: none; } }
        .route-chip { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s, box-shadow 0.2s; }
        .route-chip:hover { transform: translateY(-2px); border-color: #D8E2F8 !important; box-shadow: 0 6px 18px rgba(10,15,30,0.07); }
        .floating { animation: float 4s ease-in-out infinite; }
        .floating-2 { animation: float 4s ease-in-out infinite 1s; }
        .floating-3 { animation: float 4s ease-in-out infinite 2s; }

        /* --- Mobile layout fixes ---
           LandingPage has its own nav (separate from the shared Nav.jsx used
           on inner pages), and it never had a mobile breakpoint - this is
           what caused the cramped/overlapping header and squished hero. */
        .lp-nav-hamburger { display: none; }
        @media (max-width: 860px) {
          .lp-desktop-only { display: none !important; }
          .lp-nav-hamburger { display: flex !important; }
          .lp-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          /* The 3D globe used to be display:none on mobile. It now stays,
             but as a full-bleed background layer at reduced opacity instead
             of a right-hand column - so phones still get the animation
             without it colliding with the headline. Node/arc/star counts are
             already scaled down inside Hero3D for narrow viewports. */
          /* Opacity is deliberately low here. At 0.5 the nodes sat directly
             on top of the hero paragraph and dropped the text contrast below
             the 4.5:1 WCAG AA floor - readable-looking on a big monitor,
             genuinely hard to read on a phone. Pushed down and faded so the
             animation still reads as depth behind the copy, never over it. */
          .lp-hero-3d {
            width: 145% !important;
            right: -22% !important;
            opacity: 0.25 !important;
            top: 22% !important;
          }
          .lp-hero-right { height: 420px !important; margin-top: 8px; }
          .lp-2col { grid-template-columns: 1fr !important; gap: 32px !important; }
          .lp-footer-top { grid-template-columns: 1fr !important; gap: 36px !important; }
          .lp-footer-routes { grid-template-columns: repeat(2, 1fr) !important; }
          section { padding-left: 6% !important; padding-right: 6% !important; }
        }
        @media (max-width: 480px) {
          .lp-hero-right { height: 360px !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={S.nav}>
        <div style={S.logo} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <div style={S.logoBox}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 12, letterSpacing: -0.5 }}>IT</span>
          </div>
          <span style={S.logoText}>IMMTECH</span>
        </div>
        <div className="lp-desktop-only" style={S.navLinks}>
          <button style={S.navLink} onClick={() => navigate("/jobs")}>Find Jobs</button>
          <button style={S.navLink} onClick={() => navigate("/visa-checker")}>Visa Checker</button>
          <button style={S.navLink} onClick={() => navigate("/cos-checker")}>COS Checker</button>
          <button style={S.navLink} onClick={() => navigate("/employers")}>For Employers</button>
        </div>
        <div className="lp-desktop-only" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={S.signIn} className="btn-sec" onClick={() => navigate("/auth")}>Sign in</button>
          <button style={S.cta} className="btn-main" onClick={() => navigate("/onboarding")}>Get Started</button>
        </div>
        <button
          className="lp-nav-hamburger"
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(o => !o)}
          style={{ background: "none", border: "1.5px solid #E8EEFF", borderRadius: 9, padding: "9px 11px", cursor: "pointer", flexDirection: "column", gap: 4, alignItems: "center", justifyContent: "center" }}>
          <span style={{ width: 18, height: 2, background: "#0A0F1E", borderRadius: 2 }} />
          <span style={{ width: 18, height: 2, background: "#0A0F1E", borderRadius: 2 }} />
        </button>
      </nav>

      {mobileMenuOpen && (
        <div style={{ position: "fixed", top: 68, left: 0, right: 0, zIndex: 99, background: "#fff", borderBottom: "1px solid #F0F0F0", boxShadow: "0 16px 32px rgba(10,15,30,0.1)", padding: "12px 6% 20px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[["Find Jobs", "/jobs"], ["Visa Checker", "/visa-checker"], ["COS Checker", "/cos-checker"], ["For Employers", "/employers"]].map(([label, path]) => (
            <button key={path} onClick={() => go(path)}
              style={{ textAlign: "left", background: "none", border: "none", padding: "14px 6px", fontSize: 16, fontWeight: 600, color: "#0A0F1E", fontFamily: "inherit", cursor: "pointer", borderBottom: "1px solid #F5F5F5" }}>
              {label}
            </button>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => go("/auth")} style={{ ...S.signIn, flex: 1, padding: "12px", textAlign: "center" }}>Sign in</button>
            <button onClick={() => go("/onboarding")} style={{ ...S.cta, flex: 1, padding: "12px", textAlign: "center" }}>Get Started</button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section ref={heroSectionRef} style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "100px 5% 80px", background: "#fff", position: "relative", overflow: "hidden" }}>

        {/* Background accent circles - drift at different speeds on scroll for parallax depth */}
        <div className="hero-parallax-slow" style={{ position: "absolute", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "#0057FF08", pointerEvents: "none" }} />
        <div className="hero-parallax-fast" style={{ position: "absolute", bottom: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "#0057FF05", pointerEvents: "none" }} />

        {/* 3D animated sponsor network - the "125,284 verified sponsors" claim,
            rendered as a living network instead of a static number */}
        <div className="lp-hero-3d" style={{ position: "absolute", top: 0, right: "-8%", width: "62%", height: "100%", pointerEvents: "none" }}>
          <Suspense fallback={null}>
            <Hero3D nodeCount={110} />
          </Suspense>
        </div>

        <div className="lp-hero-grid" style={{ maxWidth: 1140, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", position: "relative", zIndex: 1 }}>

          {/* Left - copy */}
          <div>
            <div className={heroVisible ? "fade-up fade-up-1" : ""} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0057FF10", borderRadius: 20, padding: "5px 14px", marginBottom: 24 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0057FF", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0057FF", letterSpacing: 0.5 }}>UK Visa Sponsorship Platform</span>
            </div>

            <RevealText
              as="h1"
              delay={0.15}
              lines={["Find your", <span key="s" style={{ color: "#0057FF" }}>sponsored job</span>, "in the UK"]}
              style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 900, color: "#0A0F1E", lineHeight: 1.05, letterSpacing: -2, marginBottom: 24 }}
            />

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

            {/* Legend for the 3D network's colour coding. Without this the
                colours are just decoration; with it, the globe is readable -
                each dot is a sponsor, each colour a visa route. Clicking a
                route filters the jobs page to it. */}
            <div className={heroVisible ? "fade-up fade-up-4" : ""} style={{ marginTop: 28, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["Skilled Worker", "#0057FF", "/jobs"],
                ["Health & Care", "#00B86B", "/jobs?q=nurse"],
                ["Shortage", "#FF6B35", "/jobs?q=engineer"],
                ["New Entrant", "#7C5CFF", "/jobs?newEntrant=1"],
              ].map(([label, color, path]) => (
                <button key={label} className="route-chip" onClick={() => navigate(path)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", border: "1.5px solid #ECF0FA", borderRadius: 30, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "#0A0F1E" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 0 3px ${color}22` }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right - animated job cards */}
          <div className="lp-hero-right" style={{ position: "relative", height: 480 }}>

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

      {/* Infinite marquee - a continuously scrolling band of the visa routes
          and top sponsor sectors. Two identical tracks translate -50% in a
          seamless loop; CSS-only, so it costs nothing on the main thread and
          keeps running while GSAP is busy. Paused for reduced-motion. */}
      <div style={{ background: "#0A0F1E", padding: "20px 0", overflow: "hidden", borderTop: "1px solid #1E2640", borderBottom: "1px solid #1E2640" }}>
        <div className="marquee-track" style={{ display: "flex", width: "max-content" }}>
          {[0, 1].map(dup => (
            <div key={dup} aria-hidden={dup === 1} style={{ display: "flex", alignItems: "center", gap: 44, paddingRight: 44 }}>
              {["Skilled Worker", "Health & Care Worker", "Shortage Occupation", "New Entrant Rate", "Global Talent", "Scale-up Worker", "Graduate Route", "Senior or Specialist Worker"].map(t => (
                <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 14, whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: -0.3 }}>{t}</span>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#0057FF" }} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Role pills */}
      <section style={{ background: "#F8FAFF", padding: "60px 5%" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div className="reveal-heading" style={{ textAlign: "center", marginBottom: 40 }}>
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
        <div className="lp-2col" style={{ maxWidth: 1140, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div className="reveal-heading">
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
              <div key={c.label} className="grad-card" style={{ background: c.color, borderRadius: 16, padding: "24px 20px" }}>
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
        <div className="lp-2col" style={{ maxWidth: 1140, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div className="cta-card" style={{ background: "#0057FF", borderRadius: 24, padding: "48px 40px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 1, marginBottom: 16 }}>FOR CANDIDATES</div>
            <h3 style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: -1, lineHeight: 1.15, marginBottom: 20 }}>Find your<br />sponsored role</h3>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: 32 }}>Search verified jobs, check your visa eligibility, and track your applications in one place.</p>
            <button className="btn-main" onClick={() => navigate("/onboarding")}
              style={{ background: "#fff", color: "#0057FF", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Get started free
            </button>
          </div>
          <div className="cta-card" style={{ background: "#161B2E", borderRadius: 24, padding: "48px 40px", border: "1px solid #1E2640" }}>
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
      <footer style={{ background: "#0A0F1E", padding: "80px 5% 0" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>

          {/* Top grid */}
          <div className="lp-footer-top" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 60, paddingBottom: 60, borderBottom: "1px solid #1E2640" }}>

            {/* Brand column */}
            <div className="footer-col">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#0057FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 12 }}>IT</span>
                </div>
                <span style={{ fontWeight: 900, fontSize: 20, color: "#fff", letterSpacing: -0.8 }}>IMMTECH</span>
              </div>
              <p style={{ fontSize: 14, color: "#666", lineHeight: 1.8, marginBottom: 24, maxWidth: 280 }}>
                The UK's first AI-powered visa sponsorship job platform. Every job verified against the Home Office register of 125,284 licensed sponsors.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ width: 36, height: 36, borderRadius: 8, background: "#1E2640", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", textDecoration: "none", fontSize: 14 }}>in</a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" style={{ width: 36, height: 36, borderRadius: 8, background: "#1E2640", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", textDecoration: "none", fontSize: 14 }}>X</a>
                <a href="mailto:hello@immtech.co.uk" style={{ width: 36, height: 36, borderRadius: 8, background: "#1E2640", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", textDecoration: "none", fontSize: 14 }}>@</a>
              </div>
            </div>

            {/* For Candidates */}
            <div className="footer-col">
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0057FF", letterSpacing: 1, marginBottom: 20, textTransform: "uppercase" }}>For Candidates</div>
              {[
                ["Find Jobs", "/jobs"],
                ["Visa Checker", "/visa-checker"],
                ["COS Checker", "/cos-checker"],
                ["Create Profile", "/onboarding"],
                ["Job Alerts", "/notifications"],
              ].map(([label, path]) => (
                <div key={label} onClick={() => navigate(path)}
                  style={{ fontSize: 14, color: "#666", marginBottom: 12, cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                  onMouseLeave={e => e.currentTarget.style.color = "#666"}>
                  {label}
                </div>
              ))}
            </div>

            {/* For Employers */}
            <div className="footer-col">
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0057FF", letterSpacing: 1, marginBottom: 20, textTransform: "uppercase" }}>For Employers</div>
              {[
                ["Browse Talent", "/employers"],
                ["Post a Job", "/employer/post"],
                ["My Dashboard", "/employer/dashboard"],
                ["Sponsorship Guide", "/about"],
                ["Contact Sales", "/contact"],
              ].map(([label, path]) => (
                <div key={label} onClick={() => navigate(path)}
                  style={{ fontSize: 14, color: "#666", marginBottom: 12, cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                  onMouseLeave={e => e.currentTarget.style.color = "#666"}>
                  {label}
                </div>
              ))}
            </div>

            {/* Company */}
            <div className="footer-col">
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0057FF", letterSpacing: 1, marginBottom: 20, textTransform: "uppercase" }}>Company</div>
              {[
                ["About Us", "/about"],
                ["Our Mission", "/mission"],
                ["Careers", "/careers"],
                ["Contact", "/contact"],
                ["Blog", "/about"],
              ].map(([label, path]) => (
                <div key={label} onClick={() => navigate(path)}
                  style={{ fontSize: 14, color: "#666", marginBottom: 12, cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                  onMouseLeave={e => e.currentTarget.style.color = "#666"}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Visa route info bar */}
          <div className="lp-footer-routes" style={{ padding: "32px 0", borderBottom: "1px solid #1E2640", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {[
              { route: "Skilled Worker", min: "GBP 41,700", color: "#0057FF" },
              { route: "Health & Care", min: "GBP 29,000", color: "#00B86B" },
              { route: "Shortage Occupations", min: "GBP 33,400", color: "#FF6B35" },
              { route: "New Entrant Rate", min: "GBP 33,400", color: "#534AB7" },
            ].map(v => (
              <div key={v.route} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 3, height: 36, borderRadius: 2, background: v.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>{v.route}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{v.min} min.</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ padding: "28px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ fontSize: 12, color: "#444" }}>
              2026 IMMTECH. Salary thresholds based on Home Office rules effective April 2024.
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                ["Privacy Policy", "/privacy-policy"],
                ["Terms of Service", "/terms-of-service"],
                ["Cookie Policy", "/cookie-policy"],
                ["GDPR", "/gdpr"],
              ].map(([label, path]) => (
                <span key={label} onClick={() => navigate(path)}
                  style={{ fontSize: 12, color: "#444", cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#888"}
                  onMouseLeave={e => e.currentTarget.style.color = "#444"}>
                  {label}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00B86B", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 12, color: "#00B86B", fontWeight: 500 }}>All systems operational</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  )
}