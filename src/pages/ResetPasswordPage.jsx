import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleReset = async () => {
    if (!password || !confirm) { setError("Please fill in both fields"); return }
    if (password !== confirm) { setError("Passwords do not match"); return }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    setLoading(true); setError("")
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => navigate("/jobs"), 3000)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const inp = {
    width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 11,
    padding: "12px 14px", fontSize: 14, color: "#0A0F1E", background: "#F8FAFF",
    fontFamily: "inherit", outline: "none", boxSizing: "border-box"
  }

  if (success) return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 24, padding: "48px 44px", width: "100%", maxWidth: 460, textAlign: "center", boxShadow: "0 20px 60px rgba(0,57,255,0.07)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #00D68F, #00A67E)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>&#10003;</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: "#0A0F1E", marginBottom: 8 }}>Password updated!</h2>
        <p style={{ color: "#4B5675", fontSize: 14 }}>Redirecting you to the app in a moment...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 24, padding: "48px 44px", width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,57,255,0.07)" }}>
        <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IT</span>
          </div>
          <span style={{ fontWeight: 900, fontSize: 20, color: "#0057FF", letterSpacing: -1 }}>IMMTECH</span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0A0F1E", margin: "0 0 8px" }}>Set new password</h1>
        <p style={{ color: "#4B5675", fontSize: 14, margin: "0 0 24px" }}>Choose a strong password for your account.</p>

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#DC2626", fontSize: 13 }}>{error}</div>}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>New password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="At least 8 characters" style={inp}
            onFocus={e => e.target.style.borderColor = "#0057FF"}
            onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Confirm password</label>
          <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" placeholder="Repeat your password" style={inp}
            onFocus={e => e.target.style.borderColor = "#0057FF"}
            onBlur={e => e.target.style.borderColor = "#E8EEFF"}
            onKeyDown={e => { if (e.key === "Enter") handleReset() }} />
        </div>

        <button onClick={handleReset} disabled={loading}
          style={{ width: "100%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 11, padding: "14px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.8 : 1 }}>
          {loading ? "Updating..." : "Update password"}
        </button>
      </div>
    </div>
  )
}
