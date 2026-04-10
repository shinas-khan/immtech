import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // After Google OAuth, Supabase lands here
    // Read where the user was trying to go from localStorage
    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const destination = localStorage.getItem("immtech_redirect") || "/jobs"
      localStorage.removeItem("immtech_redirect")
      if (session) {
        navigate(destination, { replace: true })
      } else {
        navigate("/auth", { replace: true })
      }
    }
    handleCallback()
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 48, height: 48, border: "3px solid #E8EEFF", borderTopColor: "#0057FF", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 15, color: "#4B5675", fontWeight: 500 }}>Signing you in...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
