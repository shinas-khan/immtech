import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

const SOC_OPTIONS = [
  { code: "2136", title: "Software developer / engineer",          route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2137", title: "IT business analyst / data analyst",     route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2139", title: "Cyber security / network / cloud",       route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2121", title: "Civil / structural engineer",            route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2122", title: "Mechanical / aerospace engineer",        route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2123", title: "Electrical / electronics engineer",      route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2421", title: "Accountant / auditor",                   route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2424", title: "Project / product manager",              route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2422", title: "Management / business consultant",       route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2425", title: "Data scientist / statistician",          route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2431", title: "Architect / urban planner",              route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2411", title: "Solicitor / barrister / lawyer",         route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2442", title: "Social worker",                          route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2311", title: "University lecturer / researcher",       route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
  { code: "2314", title: "Secondary school teacher",               route: "Shortage List",   minSalary: 33400, newEntrant: 25800 },
  { code: "2312", title: "Primary school teacher",                 route: "Shortage List",   minSalary: 33400, newEntrant: 25800 },
  { code: "2231", title: "Registered nurse",                       route: "Health & Care",   minSalary: 29000, newEntrant: 23200 },
  { code: "2232", title: "Midwife",                                route: "Health & Care",   minSalary: 29000, newEntrant: 23200 },
  { code: "2211", title: "Doctor / physician / surgeon",           route: "Health & Care",   minSalary: 49923, newEntrant: 49923 },
  { code: "2213", title: "Pharmacist",                             route: "Health & Care",   minSalary: 29000, newEntrant: 23200 },
  { code: "2214", title: "Dentist",                                route: "Health & Care",   minSalary: 29000, newEntrant: 23200 },
  { code: "2217", title: "Physiotherapist / occupational therapist",route: "Health & Care",  minSalary: 29000, newEntrant: 23200 },
  { code: "2125", title: "Chemical / process engineer",            route: "Skilled Worker",  minSalary: 41700, newEntrant: 33400 },
]

export default function EmployerPostJobPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [companyName, setCompanyName] = useState("")
  const [sponsorMatch, setSponsorMatch] = useState(null)
  const [sponsorChecked, setSponsorChecked] = useState(false)

  const [form, setForm] = useState({
    title: "",
    soc_code: "",
    location: "",
    salary_min: "",
    salary_max: "",
    is_new_entrant: false,
    job_type: "Full-time",
    description: "",
    requirements: "",
    benefits: "",
    url: "",
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/auth"); return }
      setUser(user)
      supabase.from("employer_profiles").select("*").eq("user_id", user.id).single()
        .then(({ data }) => {
          if (data) {
            setProfile(data)
            setCompanyName(data.company_name || "")
            if (data.sponsor_verified) setSponsorChecked(true)
          }
        })
    })
  }, [])

  const verifySponsor = async () => {
    if (!companyName.trim()) return
    setVerifying(true)
    setSponsorMatch(null)
    try {
      const clean = companyName.replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co|corp)\\.?$/gi, "").trim()
      const { data: exact } = await supabase.from("sponsors")
        .select("organisation_name, town, route, rating")
        .ilike("organisation_name", companyName).limit(1)
      if (exact && exact[0]) { setSponsorMatch(exact[0]); setSponsorChecked(true); setVerifying(false); return }
      const { data: fuzzy } = await supabase.from("sponsors")
        .select("organisation_name, town, route, rating")
        .ilike("organisation_name", "%" + clean + "%").limit(1)
      if (fuzzy && fuzzy[0]) { setSponsorMatch(fuzzy[0]); setSponsorChecked(true); setVerifying(false); return }
      setSponsorMatch(null); setSponsorChecked(true)
    } catch { setSponsorChecked(true) }
    setVerifying(false)
  }

  const selectedSOC = SOC_OPTIONS.find(s => s.code === form.soc_code)
  const minRequired = selectedSOC
    ? (form.is_new_entrant ? selectedSOC.newEntrant : selectedSOC.minSalary)
    : 0
  const salaryOk = !form.salary_max || !minRequired || parseInt(form.salary_max) >= minRequired
  const salaryWarning = form.salary_min && minRequired && parseInt(form.salary_min) < minRequired

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title || !form.soc_code || !form.location || !form.description) {
      setError("Please fill in all required fields.")
      return
    }
    if (!salaryOk) {
      setError("Salary does not meet the Home Office minimum threshold for this role.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate("/auth"); return }

      const jobData = {
        employer_id: user.id,
        employer_name: companyName,
        organisation_name: sponsorMatch ? sponsorMatch.organisation_name : companyName,
        sponsor_verified: !!sponsorMatch,
        sponsor_rating: sponsorMatch ? sponsorMatch.rating : null,
        sponsor_route: sponsorMatch ? sponsorMatch.route : null,
        title: form.title,
        soc_code: form.soc_code,
        soc_title: selectedSOC ? selectedSOC.title : null,
        location: form.location,
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        is_new_entrant: form.is_new_entrant,
        visa_route: selectedSOC ? selectedSOC.route : "Skilled Worker",
        description: form.description,
        requirements: form.requirements,
        benefits: form.benefits,
        url: form.url,
        job_type: form.job_type,
        status: "active",
      }

      const { error: err } = await supabase.from("direct_jobs").insert(jobData)
      if (err) throw err

      await supabase.from("employer_profiles").upsert({
        user_id: user.id,
        company_name: companyName,
        organisation_name: sponsorMatch ? sponsorMatch.organisation_name : companyName,
        sponsor_verified: !!sponsorMatch,
        sponsor_rating: sponsorMatch ? sponsorMatch.rating : null,
        sponsor_route: sponsorMatch ? sponsorMatch.route : null,
      }, { onConflict: "user_id" })

      setSuccess(true)
    } catch (e) {
      setError("Failed to post job. Please try again.")
      console.error(e)
    }
    setLoading(false)
  }

  const inp = { border: "1.5px solid #E8EEFF", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#0A0F1E", background: "#F8FAFF", fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }
  const lab = { fontSize: 12, fontWeight: 700, color: "#4B5675", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, display: "block" }

  if (success) return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "120px 5% 60px", textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #00D68F, #00A67E)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>&#10003;</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0A0F1E", marginBottom: 12 }}>Job posted successfully</h1>
        <p style={{ color: "#4B5675", fontSize: 16, marginBottom: 32, lineHeight: 1.7 }}>
          Your job listing is now live on IMMTECH and will be shown to verified visa-eligible candidates.
          {sponsorMatch && " Your company has been verified against the UK Home Office sponsor register."}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => { setSuccess(false); setForm({ title:"",soc_code:"",location:"",salary_min:"",salary_max:"",is_new_entrant:false,job_type:"Full-time",description:"",requirements:"",benefits:"",url:"" }); setStep(1) }}
            style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Post another job
          </button>
          <button onClick={() => navigate("/employer/dashboard")}
            style={{ background: "#fff", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            View my jobs
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "96px 5% 60px" }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0057FF12", borderRadius: 20, padding: "4px 14px", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0057FF", textTransform: "uppercase", letterSpacing: 0.8 }}>For Employers</span>
          </div>
          <h1 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, color: "#0A0F1E", margin: "0 0 8px" }}>Post a sponsored job</h1>
          <p style={{ color: "#4B5675", fontSize: 15, margin: 0, lineHeight: 1.7 }}>
            Reach thousands of visa-eligible candidates. Every listing is verified against the UK Home Office sponsor register.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {[["1","Company verify"],["2","Job details"],["3","Description"]].map(([n, l]) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: parseInt(n) <= step ? "#0057FF" : "#E8EEFF", color: parseInt(n) <= step ? "#fff" : "#9CA3B8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{parseInt(n) < step ? "" : n}</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: parseInt(n) <= step ? "#0057FF" : "#9CA3B8" }}>{l}</span>
              {n !== "3" && <div style={{ width: 32, height: 1, background: "#E8EEFF" }} />}
            </div>
          ))}
        </div>

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#DC2626", fontSize: 13 }}>{error}</div>}

        {step === 1 && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #E8EEFF", padding: "28px", boxShadow: "0 4px 24px rgba(0,57,255,0.06)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", marginBottom: 6 }}>Verify your company</h2>
            <p style={{ color: "#4B5675", fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
              We check your company against the UK Home Office register of licensed sponsors. Only verified sponsors can post jobs on IMMTECH.
            </p>
            <label style={lab}>Company name *</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input value={companyName} onChange={e => { setCompanyName(e.target.value); setSponsorChecked(false); setSponsorMatch(null) }}
                placeholder="e.g. Barclays Bank PLC, NHS Trust, Accenture UK"
                style={{ ...inp, flex: 1 }}
                onFocus={e => e.target.style.borderColor = "#0057FF"}
                onBlur={e => e.target.style.borderColor = "#E8EEFF"}
              />
              <button onClick={verifySponsor} disabled={verifying || !companyName.trim()}
                style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: !companyName.trim() ? 0.6 : 1 }}>
                {verifying ? "Checking..." : "Verify"}
              </button>
            </div>

            {sponsorChecked && (
              <div style={{ borderRadius: 12, padding: "16px", marginBottom: 20, background: sponsorMatch ? "#EAF3DE" : "#FEF9EC", border: "1px solid " + (sponsorMatch ? "#00D68F40" : "#F59E0B40") }}>
                {sponsorMatch ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3B6D11", marginBottom: 6 }}>Verified on UK Home Office register</div>
                    <div style={{ fontSize: 13, color: "#3B6D11" }}>{sponsorMatch.organisation_name}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      {sponsorMatch.town && <span style={{ background: "#fff", border: "1px solid #00D68F40", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#3B6D11" }}>{sponsorMatch.town}</span>}
                      {sponsorMatch.route && <span style={{ background: "#fff", border: "1px solid #00D68F40", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#3B6D11" }}>{sponsorMatch.route}</span>}
                      {sponsorMatch.rating && <span style={{ background: "#fff", border: "1px solid #00D68F40", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#3B6D11", fontWeight: 700 }}>{sponsorMatch.rating}-Rated</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#B45309", marginBottom: 4 }}>Company not found on sponsor register</div>
                    <div style={{ fontSize: 13, color: "#B45309", lineHeight: 1.6 }}>
                      Your company was not found on the UK Home Office licensed sponsor register. You can still post a job, but it will not show the verified badge. Please ensure you have a valid Skilled Worker sponsor licence before posting.
                    </div>
                  </>
                )}
              </div>
            )}

            {sponsorChecked && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => { setStep(2); setError("") }}
                  style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #E8EEFF", padding: "28px", boxShadow: "0 4px 24px rgba(0,57,255,0.06)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", marginBottom: 20 }}>Job details</h2>

            <div style={{ marginBottom: 20 }}>
              <label style={lab}>Job title *</label>
              <input value={form.title} onChange={e => setF("title", e.target.value)} placeholder="e.g. Senior Software Engineer" style={inp}
                onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lab}>SOC code and role type *</label>
              <p style={{ fontSize: 12, color: "#9CA3B8", marginBottom: 8, marginTop: 0 }}>This determines the visa route and minimum salary threshold</p>
              <select value={form.soc_code} onChange={e => setF("soc_code", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                <option value="">Select role category...</option>
                {SOC_OPTIONS.map(s => (
                  <option key={s.code} value={s.code}>{s.code}  {s.title} ({s.route})</option>
                ))}
              </select>
            </div>

            {selectedSOC && (
              <div style={{ background: "#E6F1FB", borderRadius: 10, padding: "12px 16px", marginBottom: 20, border: "1px solid #0057FF20" }}>
                <div style={{ fontSize: 12, color: "#185FA5", lineHeight: 1.7 }}>
                  <strong>Visa route:</strong> {selectedSOC.route} &nbsp;|&nbsp;
                  <strong>Standard min salary:</strong> GBP {selectedSOC.minSalary.toLocaleString()} &nbsp;|&nbsp;
                  <strong>New entrant min:</strong> GBP {selectedSOC.newEntrant.toLocaleString()}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={lab}>Location *</label>
              <input value={form.location} onChange={e => setF("location", e.target.value)} placeholder="e.g. London, Manchester, Remote" style={inp}
                onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={lab}>Min salary (GBP/year)</label>
                <input value={form.salary_min} onChange={e => setF("salary_min", e.target.value)} type="number" placeholder="e.g. 45000" style={inp}
                  onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              </div>
              <div>
                <label style={lab}>Max salary (GBP/year)</label>
                <input value={form.salary_max} onChange={e => setF("salary_max", e.target.value)} type="number" placeholder="e.g. 65000" style={inp}
                  onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
              </div>
            </div>

            {salaryWarning && selectedSOC && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#DC2626", fontSize: 13 }}>
                Warning: GBP {parseInt(form.salary_min).toLocaleString()} is below the Home Office minimum of GBP {minRequired.toLocaleString()} for this role. You must offer at least GBP {minRequired.toLocaleString()} to legally sponsor this position.
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div onClick={() => setF("is_new_entrant", !form.is_new_entrant)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <div style={{ width: 36, height: 20, borderRadius: 10, background: form.is_new_entrant ? "#0057FF" : "#E8EEFF", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: form.is_new_entrant ? 17 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0A0F1E" }}>This is a new entrant role</div>
                  <div style={{ fontSize: 11, color: "#9CA3B8" }}>Recent graduates may be sponsored at a lower salary threshold (GBP {selectedSOC ? selectedSOC.newEntrant.toLocaleString() : "33,400"})</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={lab}>Contract type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["Full-time","Part-time","Contract"].map(t => (
                  <button key={t} onClick={() => setF("job_type", t)}
                    style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (form.job_type === t ? "#0057FF" : "#E8EEFF"), background: form.job_type === t ? "#0057FF0D" : "#fff", color: form.job_type === t ? "#0057FF" : "#4B5675", fontFamily: "inherit" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(1)} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Back</button>
              <button onClick={() => { if (!form.title || !form.soc_code || !form.location) { setError("Please fill in all required fields."); return } setError(""); setStep(3) }}
                style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #E8EEFF", padding: "28px", boxShadow: "0 4px 24px rgba(0,57,255,0.06)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>Job description</h2>
            <p style={{ color: "#4B5675", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>Write the full job description. This is stored in full and checked against our sponsorship compliance engine.</p>

            <div style={{ marginBottom: 20 }}>
              <label style={lab}>Full job description *</label>
              <textarea value={form.description} onChange={e => setF("description", e.target.value)}
                placeholder="Describe the role, responsibilities, team, and what makes this a great opportunity. Include that you will provide visa sponsorship."
                rows={8} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lab}>Requirements</label>
              <textarea value={form.requirements} onChange={e => setF("requirements", e.target.value)}
                placeholder="Qualifications, skills, and experience required..."
                rows={4} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lab}>Benefits</label>
              <textarea value={form.benefits} onChange={e => setF("benefits", e.target.value)}
                placeholder="Salary, pension, holiday, remote working, visa sponsorship details..."
                rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={lab}>External application URL (optional)</label>
              <input value={form.url} onChange={e => setF("url", e.target.value)}
                placeholder="https://careers.yourcompany.com/job/123"
                style={inp}
                onFocus={e => e.target.style.borderColor = "#0057FF"} onBlur={e => e.target.style.borderColor = "#E8EEFF"} />
            </div>

            <div style={{ background: "#F8FAFF", borderRadius: 12, padding: "16px", marginBottom: 24, border: "1px solid #E8EEFF" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0A0F1E", marginBottom: 8 }}>Preview before posting</div>
              <div style={{ fontSize: 13, color: "#4B5675", lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700 }}>{form.title || "Job title"}</span> at <span style={{ fontWeight: 700 }}>{companyName || "Company"}</span><br />
                {form.location} | {form.job_type} | {selectedSOC ? selectedSOC.route : ""}
                {form.salary_min && form.salary_max && <span> | GBP {parseInt(form.salary_min).toLocaleString()} - {parseInt(form.salary_max).toLocaleString()}</span>}
                {form.is_new_entrant && <span style={{ color: "#0057FF" }}> | New Entrant eligible</span>}
                {sponsorMatch && <span style={{ color: "#00D68F", fontWeight: 700 }}> | UK GOV VERIFIED</span>}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(2)} style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Back</button>
              <button onClick={handleSubmit} disabled={loading}
                style={{ background: "linear-gradient(135deg, #00D68F, #00A67E)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {loading ? "Posting..." : "Post job now"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
