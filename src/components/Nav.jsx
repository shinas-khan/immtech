import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { C } from "../lib/constants"

export default function Nav() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(255,255,255,0.97)",
      backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${C.border}`,
      padding: "0 6%",
    }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", height: 76, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 14px ${C.blue}30` }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IT</span>
          </div>
          <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: -1, color: C.blue }}>IMMTECH</span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
          {[
            { label: "Find Jobs", path: "/jobs" },
            { label: "Visa Checker", path: "/visa-checker" },
            { label: "For Employers", path: "/employers" },
          ].map(l => (
            <span key={l.path} onClick={() => navigate(l.path)} style={{
              color: isActive(l.path) ? C.blue : C.textMid,
              fontWeight: isActive(l.path) ? 700 : 500,
              fontSize: 15, cursor: "pointer", transition: "color 0.2s",
              borderBottom: isActive(l.path) ? `2px solid ${C.blue}` : "2px solid transparent",
              paddingBottom: 2,
            }}
              onMouseEnter={e => e.currentTarget.style.color = C.blue}
              onMouseLeave={e => e.currentTarget.style.color = isActive(l.path) ? C.blue : C.textMid}
            >{l.label}</span>
          ))}
        </div>

        {/* Auth buttons */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {user ? (
            <>
              <span onClick={() => navigate("/notifications")} style={{ fontSize: 20, cursor: "pointer" }} title="Alerts">🔔</span>
              <div onClick={() => navigate("/profile")} style={{
                width: 38, height: 38, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer",
              }}>
                {user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <button onClick={handleSignOut} style={{ background: "none", border: `1.5px solid ${C.border}`, color: C.textMid, borderRadius: 9, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate("/auth")} style={{ background: "none", border: `1.5px solid ${C.border}`, color: C.text, borderRadius: 9, padding: "9px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text }}
              >Sign in</button>
              <button onClick={() => navigate("/onboarding")} style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`, border: "none", color: "#fff", borderRadius: 9, padding: "9px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 18px ${C.blue}35`, transition: "transform 0.18s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >Get Started Free</button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}