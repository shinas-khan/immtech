import { BrowserRouter, Routes, Route } from "react-router-dom"
import LandingPage from "./pages/LandingPage"
import JobsPage from "./pages/JobsPage"
import AuthPage from "./pages/AuthPage"
import OnboardingPage from "./pages/OnboardingPage"
import ProfilePage from "./pages/ProfilePage"
import NotificationsPage from "./pages/NotificationsPage"
import VisaCheckerPage from "./pages/VisaCheckerPage"
import EmployersPage from "./pages/EmployersPage"
import EmployerProfilePage from "./pages/EmployerProfilePage"

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { scroll-behavior: smooth; }
          body { overflow-x: hidden; -webkit-font-smoothing: antialiased; background: #fff; }
          button, input, select, textarea { font-family: inherit; }
          ::-webkit-scrollbar { width: 5px; }
          ::-webkit-scrollbar-track { background: #F8FAFF; }
          ::-webkit-scrollbar-thumb { background: #0057FF45; border-radius: 3px; }
          input::placeholder { color: #9CA3B8; }

          @media (max-width: 768px) {
            .grid-3 { grid-template-columns: 1fr !important; }
            .grid-2 { grid-template-columns: 1fr !important; }
            .grid-4 { grid-template-columns: 1fr 1fr !important; }
            .hide-mobile { display: none !important; }
            .nav-links { display: none !important; }
            .hero-section { padding: 120px 5% 80px !important; }
            .section-pad { padding: 80px 5% !important; }
            .search-bar { flex-wrap: wrap !important; }
            .pricing-grid { grid-template-columns: 1fr !important; }
            .footer-grid { grid-template-columns: 1fr 1fr !important; }
            .card-pad { padding: 24px 20px !important; }
            .profile-grid { grid-template-columns: 1fr !important; }
          }
          @media (max-width: 480px) {
            .grid-4 { grid-template-columns: 1fr !important; }
            .footer-grid { grid-template-columns: 1fr !important; }
            .stats-grid { grid-template-columns: 1fr 1fr !important; }
          }
        `}</style>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/visa-checker" element={<VisaCheckerPage />} />
          <Route path="/employers" element={<EmployersPage />} />
          <Route path="/employer/:name" element={<EmployerProfilePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}