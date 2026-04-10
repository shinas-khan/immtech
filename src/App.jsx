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
import EmployerPostJobPage from "./pages/EmployerPostJobPage"
import EmployerDashboardPage from "./pages/EmployerDashboardPage"
import COSCheckerPage from "./pages/COSCheckerPage"
import AboutPage from "./pages/AboutPage"
import ContactPage from "./pages/ContactPage"
import CareersPage from "./pages/CareersPage"
import ProfileCheckPage from "./pages/ProfileCheckPage"
import AuthCallbackPage from "./pages/AuthCallbackPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import { PrivacyPage, TermsPage, CookiePage, GDPRPage, MissionPage } from "./pages/LegalPages"

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { scroll-behavior: smooth; }
          body { overflow-x: hidden; -webkit-font-smoothing: antialiased; background: #fff; max-width: 100vw; }
          button, input, select, textarea { font-family: inherit; }
          ::-webkit-scrollbar { width: 5px; }
          ::-webkit-scrollbar-track { background: #F8FAFF; }
          ::-webkit-scrollbar-thumb { background: #0057FF45; border-radius: 3px; }
          input::placeholder { color: #9CA3B8; }
          * { -webkit-tap-highlight-color: transparent; }
          @media (max-width: 768px) { html, body { overflow-x: hidden; } }
        `}</style>
        <Routes>
          {/* Main */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/jobs" element={<JobsPage />} />

          {/* Auth */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* Candidate */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile-check" element={<ProfileCheckPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/visa-checker" element={<VisaCheckerPage />} />
          <Route path="/cos-checker" element={<COSCheckerPage />} />

          {/* Employers */}
          <Route path="/employers" element={<EmployersPage />} />
          <Route path="/employer/:name" element={<EmployerProfilePage />} />
          <Route path="/employer/post" element={<EmployerPostJobPage />} />
          <Route path="/employer/dashboard" element={<EmployerDashboardPage />} />

          {/* Company */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/mission" element={<MissionPage />} />

          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Legal */}
          <Route path="/privacy-policy" element={<PrivacyPage />} />
          <Route path="/terms-of-service" element={<TermsPage />} />
          <Route path="/cookie-policy" element={<CookiePage />} />
          <Route path="/gdpr" element={<GDPRPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
