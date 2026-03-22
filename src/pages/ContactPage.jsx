import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Nav from "../components/Nav"

export default function ContactPage() {
  const navigate = useNavigate()
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn) }, [])
  const mob = w < 768
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", type: "general" })
  const [submitted, setSubmitted] = useState(false)
  const inp = { width: "100%", border: "1.5px solid #E8EEFF", borderRadius: 11, padding: "13px 15px", fontSize: 14, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: mob ? "110px 5% 60px" : "140px 6% 80px" }}>
        <div style={{ textAlign: "center", marginBottom: mob ? 40 : 64 }}>
          <div style={{ display: "inline-block", background: "#0057FF0D", border: "1px solid #0057FF22", borderRadius: 100, padding: "7px 18px", color: "#0057FF", fontSize: 13, fontWeight: 700, marginBottom: 20 }}>Contact Us</div>
          <h1 style={{ fontSize: mob ? 30 : 52, fontWeight: 900, color: "#0A0F1E", margin: "0 0 16px", letterSpacing: -1.5 }}>We'd love to<br /><span style={{ color: "#0057FF" }}>hear from you</span></h1>
          <p style={{ color: "#4B5675", fontSize: mob ? 14 : 17, maxWidth: 480, margin: "0 auto" }}>Whether you have a question, feedback or want to partner with us — we typically respond within 24 hours.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1.6fr", gap: 28 }}>
          {/* Contact info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "📧", title: "Email Us", value: "hello@immtech.co.uk", sub: "We reply within 24 hours" },
              { icon: "💬", title: "Live Chat", value: "Available on the platform", sub: "For signed-in users" },
              { icon: "🏢", title: "Company", value: "IMMTECH Ltd", sub: "Registered in England & Wales" },
              { icon: "🌐", title: "Platform", value: "immtech.vercel.app", sub: "Live and available 24/7" },
            ].map(item => (
              <div key={item.title} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 16, padding: "20px" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0A0F1E", marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 14, color: "#0057FF", fontWeight: 600 }}>{item.value}</div>
                    <div style={{ fontSize: 12, color: "#9CA3B8", marginTop: 2 }}>{item.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact form */}
          <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 20, padding: mob ? "24px" : "36px" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "48px 20px" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: "#0A0F1E", marginBottom: 10 }}>Message sent!</h3>
                <p style={{ color: "#4B5675", fontSize: 15, marginBottom: 24 }}>We'll get back to you within 24 hours.</p>
                <button onClick={() => setSubmitted(false)} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Send Another</button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", margin: "0 0 6px" }}>Send us a message</h3>
                <p style={{ color: "#9CA3B8", fontSize: 13, margin: "0 0 24px" }}>Fill in the form and we'll get back to you shortly</p>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Topic</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[
                      { val: "general", label: "General" },
                      { val: "employer", label: "Employer Partnership" },
                      { val: "technical", label: "Technical Issue" },
                      { val: "press", label: "Press / Media" },
                    ].map(t => (
                      <button key={t.val} onClick={() => setForm(f => ({ ...f, type: t.val }))} style={{ padding: "8px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${form.type === t.val ? "#0057FF" : "#E8EEFF"}`, background: form.type === t.val ? "#0057FF0D" : "#F8FAFF", color: form.type === t.val ? "#0057FF" : "#4B5675", fontFamily: "inherit" }}>{t.label}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Your Name</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Email</label>
                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" type="email" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Subject</label>
                  <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="How can we help?" style={inp} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4B5675", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Message</label>
                  <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us more..." rows={5} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
                </div>

                <button onClick={() => form.name && form.email && form.message && setSubmitted(true)} style={{ width: "100%", background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 18px #0057FF30" }}>
                  Send Message →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <footer style={{ background: "#0A0F1E", padding: "40px 6%", textAlign: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 13 }}>© 2025 IMMTECH Ltd. All rights reserved.</span>
      </footer>
    </div>
  )
}
