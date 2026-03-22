import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

function useW() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn) }, [])
  return w
}

export default function AuthPage() {
  const [mode, setMode] = useState("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const navigate = useNavigate()
  const w = useW()
  const mob = w < 768

  const handleEmailAuth = async () => {
    if (!email || !password) { setError("Please fill in all fields"); return }
    setLoading(true); setError("")
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        if (error) throw error
        setSuccess("Check your email to confirm your account!")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate("/jobs")
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/jobs` } })
    if (error) setError(error.message)
  }

  const inp = { width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 11, padding: mob ? "14px" : "12px 14px", fontSize: mob ? 16 : 14, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" }
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", display: "flex", alignItems: "center", justifyContent: "center", padding: mob ? "20px 16px" : "40px 20px" }}>
      <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: mob ? 20 : 24, padding: mob ? "32px 24px" : "48px 44px", width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,57,255,0.07)" }}>
        <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, cursor: "pointer" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IT</span>
          </div>
          <span style={{ fontWeight: 900, fontSize: 20, color: "#0057FF", letterSpacing: -1 }}>IMMTECH</span>
        </div>
        <h1 style={{ fontSize: mob ? 24 : 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 6px", letterSpacing: -0.8 }}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p style={{ color: "#4B5675", fontSize: mob ? 14 : 15, margin: "0 0 24px" }}>
          {mode === "signin" ? "Sign in to continue your job search" : "Start finding visa-sponsored jobs today"}
        </p>
        <button onClick={handleGoogle} style={{ width: "100%", background: "#fff", border: "1.5px solid #E8EEFF", borderRadius: 12, padding: mob ? "14px" : "13px", fontSize: mob ? 15 : 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 18, color: "#0A0F1E", fontFamily: "inherit" }}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 1, background: "#E8EEFF" }} /><span style={{ color: "#9CA3B8", fontSize: 13 }}>or</span><div style={{ flex: 1, height: 1, background: "#E8EEFF" }} />
        </div>
        {mode === "signup" && (
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} onKeyDown={e => e.key === "Enter" && handleEmailAuth()} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" type="password" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} onKeyDown={e => e.key === "Enter" && handleEmailAuth()} />
        </div>
        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: "#DC2626", fontSize: 13, marginBottom: 14 }}>❌ {error}</div>}
        {success && <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", color: "#16A34A", fontSize: 13, marginBottom: 14 }}>✅ {success}</div>}
        <button onClick={handleEmailAuth} disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 12, padding: mob ? "16px" : "14px", fontSize: mob ? 16 : 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 18px #0057FF30", opacity: loading ? 0.75 : 1, marginBottom: 18 }}>
          {loading ? "Please wait..." : mode === "signin" ? "Sign In →" : "Create Account →"}
        </button>
        <p style={{ textAlign: "center", color: "#4B5675", fontSize: 14 }}>
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setSuccess("") }} style={{ color: "#0057FF", fontWeight: 700, cursor: "pointer" }}>
            {mode === "signin" ? "Sign up free" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  )
}
