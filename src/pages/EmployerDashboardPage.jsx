import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import Nav from "../components/Nav"

export default function EmployerDashboardPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/auth"); return }
      supabase.from("employer_profiles").select("*").eq("user_id", user.id).single()
        .then(({ data }) => setProfile(data))
      supabase.from("direct_jobs").select("*").eq("employer_id", user.id).order("created_at", { ascending: false })
        .then(({ data }) => { setJobs(data || []); setLoading(false) })
    })
  }, [])

  const toggleStatus = async (job) => {
    const newStatus = job.status === "active" ? "paused" : "active"
    await supabase.from("direct_jobs").update({ status: newStatus }).eq("id", job.id)
    setJobs(jobs.map(j => j.id === job.id ? { ...j, status: newStatus } : j))
  }

  const deleteJob = async (id) => {
    if (!window.confirm("Delete this job listing?")) return
    await supabase.from("direct_jobs").delete().eq("id", id)
    setJobs(jobs.filter(j => j.id !== id))
  }

  const statusColor = { active: "#00D68F", paused: "#FF6B35", closed: "#9CA3B8" }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "96px 5% 60px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0A0F1E", margin: "0 0 4px" }}>Employer dashboard</h1>
            <p style={{ color: "#4B5675", fontSize: 14, margin: 0 }}>
              {profile && profile.sponsor_verified
                ? "Your company is verified on the UK Home Office sponsor register"
                : "Manage your job listings"}
            </p>
          </div>
          <button onClick={() => navigate("/employer/post")}
            style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            + Post new job
          </button>
        </div>

        {profile && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #E8EEFF", padding: "20px 24px", marginBottom: 24, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #0057FF, #00C2FF)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18, flexShrink: 0 }}>
              {(profile.company_name || "E")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "#0A0F1E", fontSize: 16 }}>{profile.company_name}</div>
              <div style={{ fontSize: 12, color: "#4B5675", marginTop: 2 }}>{profile.sponsor_route || "Skilled Worker"}</div>
            </div>
            {profile.sponsor_verified && (
              <div style={{ background: "#EAF3DE", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#3B6D11" }}>
                UK GOV VERIFIED {profile.sponsor_rating && "| " + profile.sponsor_rating + "-Rated"}
              </div>
            )}
            <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 900, color: "#0057FF", fontSize: 20 }}>{jobs.filter(j => j.status === "active").length}</div>
                <div style={{ color: "#9CA3B8", fontSize: 11 }}>Active</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 900, color: "#FF6B35", fontSize: 20 }}>{jobs.reduce((a, j) => a + (j.views_count || 0), 0)}</div>
                <div style={{ color: "#9CA3B8", fontSize: 11 }}>Views</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 900, color: "#00D68F", fontSize: 20 }}>{jobs.reduce((a, j) => a + (j.applications_count || 0), 0)}</div>
                <div style={{ color: "#9CA3B8", fontSize: 11 }}>Applied</div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #E8EEFF" }}>
                <div style={{ height: 14, background: "#F0F0F0", borderRadius: 4, width: "40%", marginBottom: 8 }} />
                <div style={{ height: 11, background: "#F0F0F0", borderRadius: 4, width: "25%" }} />
              </div>
            ))}
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: "1px solid #E8EEFF" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>&#128188;</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", marginBottom: 8 }}>No jobs posted yet</div>
            <div style={{ fontSize: 14, color: "#4B5675", marginBottom: 24 }}>Post your first sponsored job and reach thousands of visa-eligible candidates</div>
            <button onClick={() => navigate("/employer/post")}
              style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Post your first job
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {jobs.map(job => (
            <div key={job.id} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid " + (job.status === "active" ? "#00D68F30" : "#E8EEFF"), padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ background: (statusColor[job.status] || "#9CA3B8") + "20", color: statusColor[job.status] || "#9CA3B8", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                      {job.status.toUpperCase()}
                    </span>
                    {job.sponsor_verified && <span style={{ background: "#EAF3DE", color: "#3B6D11", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>GOV VERIFIED</span>}
                    {job.is_new_entrant && <span style={{ background: "#0057FF12", color: "#0057FF", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>New Entrant</span>}
                    <span style={{ background: "#F8FAFF", border: "1px solid #E8EEFF", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#4B5675" }}>SOC {job.soc_code}</span>
                  </div>
                  <div style={{ fontWeight: 800, color: "#0A0F1E", fontSize: 16, marginBottom: 4 }}>{job.title}</div>
                  <div style={{ fontSize: 13, color: "#4B5675" }}>
                    {job.location} | {job.job_type}
                    {job.salary_min && job.salary_max && " | GBP " + job.salary_min.toLocaleString() + " - " + job.salary_max.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3B8", marginTop: 6 }}>
                    Posted {new Date(job.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    &nbsp;|&nbsp;{job.views_count || 0} views &nbsp;|&nbsp; {job.applications_count || 0} applications
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                  <button onClick={() => toggleStatus(job)}
                    style={{ background: "none", border: "1.5px solid #E8EEFF", color: "#4B5675", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {job.status === "active" ? "Pause" : "Activate"}
                  </button>
                  <button onClick={() => deleteJob(job.id)}
                    style={{ background: "none", border: "1.5px solid #FECACA", color: "#DC2626", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
