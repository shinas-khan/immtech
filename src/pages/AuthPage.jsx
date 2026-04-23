import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function AuthPage() {
  const [mode, setMode] = useState("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [mob, setMob] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state && location.state.from) || "/jobs"

  useEffect(() => {
    const check = () => setMob(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const dest = localStorage.getItem("immtech_redirect") || from
        localStorage.removeItem("immtech_redirect")
        navigate(dest, { replace: true })
      }
    })
  }, [])

  const handleEmailAuth = async () => {
    if (!email || !password) { setError("Please fill in all fields"); return }
    setLoading(true); setError("")
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: name } }
        })
        if (error) throw error
        setSuccess("Check your email to confirm your account, then sign in.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const dest = localStorage.getItem("immtech_redirect") || from
        localStorage.removeItem("immtech_redirect")
        navigate(dest, { replace: true })
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleForgotPassword = async () => {
    if (!email) { setError("Enter your email address above first, then click Forgot password"); return }
    setLoading(true); setError("")
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password"
      })
      if (error) throw error
      setSuccess("Password reset email sent! Check your inbox.")
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const inp = {
    width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 11,
    padding: mob ? "14px" : "12px 14px", fontSize: mob ? 16 : 14,
    color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit",
    outline: "none", transition: "border-color 0.2s", boxSizing: "border-box"
  }
  const lbl = {
    display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7
  }

  if (mode === "reset") return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
      <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 24, padding: mob ? "32px 24px" : "48px 44px", width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,57,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IT</span>
            </div>
            <span style={{ fontWeight: 900, fontSize: 20, color: "#0057FF", letterSpacing: -1 }}>IMMTECH</span>
          </div>
          <button onClick={() => setMode("signin")} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Back</button>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0A0F1E", margin: "0 0 8px" }}>Reset your password</h1>
        <p style={{ color: "#4B5675", fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>Enter your email and we will send you a reset link.</p>
        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#DC2626", fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: "#EAF3DE", border: "1px solid #00D68F40", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#3B6D11", fontSize: 13, lineHeight: 1.6 }}>{success}</div>}
        {!success && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Email address</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inp}
                onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"}
                onKeyDown={e => { if (e.key === "Enter") handleForgotPassword() }} />
            </div>
            <button onClick={handleForgotPassword} disabled={loading}
              style={{ width: "100%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 11, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {loading ? "Sending..." : "Send reset email"}
            </button>
          </>
        )}
        {success && (
          <button onClick={() => setMode("signin")} style={{ width: "100%", background: "#F8FAFF", border: "1.5px solid #E8EEFF", color: "#0A0F1E", borderRadius: 11, padding: "14px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Back to sign in
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", display: "flex", alignItems: "center", justifyContent: "center", padding: mob ? "20px 16px" : "40px 20px" }}>
      <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: mob ? 20 : 24, padding: mob ? "32px 24px" : "48px 44px", width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,57,255,0.07)" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IT</span>
            </div>
            <span style={{ fontWeight: 900, fontSize: 20, color: "#0057FF", letterSpacing: -1 }}>IMMTECH</span>
          </div>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Back to home
          </button>
        </div>

        <h1 style={{ fontSize: mob ? 24 : 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 6px", letterSpacing: -0.8 }}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p style={{ color: "#4B5675", fontSize: mob ? 14 : 15, margin: "0 0 28px" }}>
          {mode === "signin" ? "Sign in to your IMMTECH account" : "Join international professionals finding sponsored jobs"}
        </p>

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#DC2626", fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: "#EAF3DE", border: "1px solid #00D68F40", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#3B6D11", fontSize: 13 }}>{success}</div>}


        <button disabled style={{ width: "100%", background: "#F8FAFF", border: "1.5px solid #E8EEFF", borderRadius: 11, padding: "12px", fontSize: 14, cursor: "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8, color: "#9CA3B8", fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 18 18" style={{ opacity: 0.35 }}>
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
          </svg>
          Continue with Google (coming soon)
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#E8EEFF" }} />
          <span style={{ fontSize: 12, color: "#9CA3B8", fontWeight: 500 }}>or sign in with email</span>
          <div style={{ flex: 1, height: 1, background: "#E8EEFF" }} />
        </div>

        {mode === "signup" && (
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Full name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inp}
              onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Email address</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inp}
            onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={lbl}>Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="At least 8 characters" style={inp}
            onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"}
            onKeyDown={e => { if (e.key === "Enter") handleEmailAuth() }} />
        </div>

        {mode === "signin" && (
          <div style={{ textAlign: "right", marginBottom: 24 }}>
            <span onClick={() => { setMode("reset"); setError(""); setSuccess("") }}
              style={{ fontSize: 13, color: "#0057FF", cursor: "pointer", fontWeight: 600 }}>
              Forgot password?
            </span>
          </div>
        )}
        {mode === "signup" && <div style={{ marginBottom: 24 }} />}

        <button onClick={handleEmailAuth} disabled={loading}
          style={{ width: "100%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 11, padding: "14px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: 16, opacity: loading ? 0.8 : 1 }}>
          {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <div style={{ textAlign: "center", fontSize: 14, color: "#4B5675" }}>
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setSuccess("") }}
            style={{ color: "#0057FF", fontWeight: 700, cursor: "pointer" }}>
            {mode === "signin" ? "Sign up free" : "Sign in"}
          </span>
        </div>

      </div>
    </div>
  )
}
