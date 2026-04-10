import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function Nav() {
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    const close = () => { if (window.innerWidth > 768) setMenuOpen(false) }
    window.addEventListener("resize", close)
    return () => window.removeEventListener("resize", close)
  }, [])

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/") }
  const isActive = (path) => location.pathname === path

  // Logo click  go to home AND scroll to top
  const handleLogoClick = () => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      navigate("/")
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100)
    }
  }

  const links = [
    { label: "Find Jobs", path: "/jobs" },
    { label: "Visa Checker", path: "/visa-checker" },
    { label: "For Employers", path: "/employers" },
  ]

  return (
    <>
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid #E8EEFF", boxShadow: scrolled ? "0 2px 20px rgba(0,57,255,0.08)" : "none", transition: "box-shadow 0.3s" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%" }}>

          {/* Logo  scrolls to top on click */}
          <div onClick={handleLogoClick} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px #0057FF30" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IT</span>
            </div>
            <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: -0.8, color: "#0057FF" }}>IMMTECH</span>
          </div>

          {/* Desktop links */}
          <div style={{ display: "flex", gap: 32, alignItems: "center" }} className="nav-desktop">
            {links.map(l => (
              <span key={l.path} onClick={() => navigate(l.path)} style={{ color: isActive(l.path) ? "#0057FF" : "#4B5675", fontWeight: isActive(l.path) ? 700 : 500, fontSize: 15, cursor: "pointer", transition: "color 0.2s", borderBottom: isActive(l.path) ? "2px solid #0057FF" : "2px solid transparent", paddingBottom: 2 }}
                onMouseEnter={e => e.currentTarget.style.color = "#0057FF"}
                onMouseLeave={e => e.currentTarget.style.color = isActive(l.path) ? "#0057FF" : "#4B5675"}
              >{l.label}</span>
            ))}
          </div>

          {/* Desktop auth */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }} className="nav-desktop">
            {user ? (
              <>
                <span onClick={() => navigate("/notifications")} style={{ fontSize: 20, cursor: "pointer" }} title="Alerts"></span>
                <div onClick={() => navigate("/profile")} style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                  {user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <button onClick={handleSignOut} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 9, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/auth")} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#0A0F1E", borderRadius: 9, padding: "8px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#0057FF"; e.currentTarget.style.color = "#0057FF" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8EEFF"; e.currentTarget.style.color = "#0A0F1E" }}
                >Sign in</button>
                <button onClick={() => navigate("/onboarding")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", border: "none", color: "#fff", borderRadius: 9, padding: "8px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 18px #0057FF35" }}>
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(o => !o)} className="nav-mobile" style={{ background: menuOpen ? "#F0F5FF" : "none", border: "1.5px solid " + (menuOpen ? "#0057FF30" : "#E8EEFF"), borderRadius: 9, padding: "7px 10px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 20, height: 2, background: menuOpen ? "#0057FF" : "#4B5675", borderRadius: 2, transition: "all 0.25s", transform: menuOpen ? "rotate(45deg) translate(4px, 4px)" : "none" }} />
            <div style={{ width: 20, height: 2, background: menuOpen ? "#0057FF" : "#4B5675", borderRadius: 2, transition: "all 0.25s", opacity: menuOpen ? 0 : 1 }} />
            <div style={{ width: 20, height: 2, background: menuOpen ? "#0057FF" : "#4B5675", borderRadius: 2, transition: "all 0.25s", transform: menuOpen ? "rotate(-45deg) translate(4px, -4px)" : "none" }} />
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div style={{ background: "#fff", borderTop: "1px solid #E8EEFF", padding: "12px 5% 20px" }} className="nav-mobile">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {links.map(l => (
                <div key={l.path} onClick={() => navigate(l.path)} style={{ padding: "14px 16px", borderRadius: 12, background: isActive(l.path) ? "#0057FF0D" : "transparent", color: isActive(l.path) ? "#0057FF" : "#0A0F1E", fontWeight: isActive(l.path) ? 700 : 500, fontSize: 16, cursor: "pointer" }}>
                  {l.label}
                </div>
              ))}
              <div style={{ height: 1, background: "#E8EEFF", margin: "8px 0" }} />
              {user ? (
                <>
                  <div onClick={() => navigate("/profile")} style={{ padding: "14px 16px", borderRadius: 12, color: "#0A0F1E", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12 }}>{user.email?.[0]?.toUpperCase()}</div>
                    My Profile
                  </div>
                  <div onClick={() => navigate("/notifications")} style={{ padding: "14px 16px", borderRadius: 12, color: "#0A0F1E", fontSize: 16, cursor: "pointer" }}> Alerts</div>
                  <button onClick={handleSignOut} style={{ margin: "8px 16px 0", background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0 0" }}>
                  <button onClick={() => navigate("/auth")} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#0A0F1E", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign in</button>
                  <button onClick={() => navigate("/onboarding")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", border: "none", color: "#fff", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 18px #0057FF35" }}>Get Started Free </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
      <style>{`
        .nav-desktop { display: flex; }
        .nav-mobile { display: none; }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: flex !important; }
        }
      `}</style>
    </>
  )
}
