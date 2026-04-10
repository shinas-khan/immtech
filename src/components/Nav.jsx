import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function Nav() {
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const isActive = p => location.pathname === p
  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/") }
  const handleLogoClick = () => {
    if (location.pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" })
    else { navigate("/"); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100) }
  }

  const navLinks = [
    { label: "Find Jobs",     path: "/jobs" },
    { label: "Visa Checker",  path: "/visa-checker" },
    { label: "COS Checker",   path: "/cos-checker" },
    { label: "For Employers", path: "/employers" },
  ]

  const menuSections = [
    {
      title: "For Candidates",
      links: [
        { label: "Find Jobs",    path: "/jobs" },
        { label: "Visa Checker", path: "/visa-checker" },
        { label: "COS Checker",  path: "/cos-checker" },
      ]
    },
    {
      title: "For Employers",
      links: [
        { label: "Browse Talent",  path: "/employers" },
        { label: "Post a Job",     path: "/employer/post" },
        { label: "My Dashboard",   path: "/employer/dashboard" },
      ]
    },
    {
      title: "Company",
      links: [
        { label: "About",   path: "/about" },
        { label: "Contact", path: "/contact" },
        { label: "Mission", path: "/mission" },
      ]
    },
  ]

  const menuItemStyle = active => ({
    padding: "11px 14px",
    borderRadius: 10,
    background: active ? "#0057FF0D" : "transparent",
    color: active ? "#0057FF" : "#0A0F1E",
    fontWeight: active ? 700 : 400,
    fontSize: 14,
    cursor: "pointer",
  })

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid #E8EEFF", boxShadow: scrolled ? "0 2px 20px rgba(0,57,255,0.08)" : "none" }}>

      <div style={{ maxWidth: 1140, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", gap: 16 }}>

        {/* Logo */}
        <div onClick={handleLogoClick} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IT</span>
          </div>
          <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: -0.8, color: "#0057FF" }}>IMMTECH</span>
        </div>

        {/* Desktop nav - hidden on mobile */}
        {!isMobile && (
          <div style={{ display: "flex", gap: 24, alignItems: "center", flex: 1, justifyContent: "center" }}>
            {navLinks.map(l => (
              <span key={l.path} onClick={() => navigate(l.path)}
                style={{ color: isActive(l.path) ? "#0057FF" : "#4B5675", fontWeight: isActive(l.path) ? 700 : 500, fontSize: 14, cursor: "pointer", borderBottom: isActive(l.path) ? "2px solid #0057FF" : "2px solid transparent", paddingBottom: 2, whiteSpace: "nowrap" }}
                onMouseEnter={e => e.currentTarget.style.color = "#0057FF"}
                onMouseLeave={e => e.currentTarget.style.color = isActive(l.path) ? "#0057FF" : "#4B5675"}
              >{l.label}</span>
            ))}
          </div>
        )}

        {/* Right side */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>

          {/* Auth buttons desktop only */}
          {!isMobile && (
            user ? (
              <>
                <span onClick={() => navigate("/notifications")} style={{ fontSize: 18, cursor: "pointer" }}>&#128276;</span>
                <div onClick={() => navigate("/profile")} style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                  {(user.email || "U")[0].toUpperCase()}
                </div>
                <button onClick={handleSignOut} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 9, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/auth")} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#0A0F1E", borderRadius: 9, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign in</button>
                <button onClick={() => navigate("/onboarding")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", border: "none", color: "#fff", borderRadius: 9, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Get Started</button>
              </>
            )
          )}

          {/* Hamburger - always visible */}
          <button onClick={() => setMenuOpen(o => !o)}
            style={{ background: menuOpen ? "#F0F5FF" : "none", border: "1.5px solid " + (menuOpen ? "#0057FF30" : "#E8EEFF"), borderRadius: 9, padding: "7px 10px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 20, height: 2, background: menuOpen ? "#0057FF" : "#4B5675", borderRadius: 2, transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translate(4px, 4px)" : "none" }} />
            <div style={{ width: 20, height: 2, background: menuOpen ? "#0057FF" : "#4B5675", borderRadius: 2, transition: "all 0.2s", opacity: menuOpen ? 0 : 1 }} />
            <div style={{ width: 20, height: 2, background: menuOpen ? "#0057FF" : "#4B5675", borderRadius: 2, transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translate(4px, -4px)" : "none" }} />
          </button>
        </div>
      </div>

      {/* Full dropdown menu */}
      {menuOpen && (
        <div style={{ background: "#fff", borderTop: "1px solid #E8EEFF", boxShadow: "0 8px 32px rgba(0,57,255,0.08)" }}>
          <div style={{ maxWidth: 1140, margin: "0 auto", padding: "20px 5% 24px" }}>

            {/* Sections grid */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: isMobile ? 0 : 24 }}>
              {menuSections.map(section => (
                <div key={section.title}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3B8", textTransform: "uppercase", letterSpacing: 0.8, padding: "0 14px", marginBottom: 4 }}>
                    {section.title}
                  </div>
                  {section.links.map(l => (
                    <div key={l.path} onClick={() => navigate(l.path)}
                      style={menuItemStyle(isActive(l.path))}
                      onMouseEnter={e => { if (!isActive(l.path)) e.currentTarget.style.background = "#F8FAFF" }}
                      onMouseLeave={e => { if (!isActive(l.path)) e.currentTarget.style.background = "transparent" }}
                    >{l.label}</div>
                  ))}
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "#E8EEFF", margin: "16px 0" }} />

            {/* Auth section */}
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div onClick={() => navigate("/profile")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 14px", borderRadius: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFF"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12 }}>
                    {(user.email || "U")[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14, color: "#0A0F1E", fontWeight: 500 }}>My Profile</span>
                </div>
                <div onClick={() => navigate("/notifications")} style={{ padding: "8px 14px", borderRadius: 10, fontSize: 14, color: "#0A0F1E", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFF"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  &#128276; Alerts
                </div>
                <button onClick={handleSignOut} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => navigate("/auth")} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#0A0F1E", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign in</button>
                <button onClick={() => navigate("/onboarding")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", border: "none", color: "#fff", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Get Started Free</button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
