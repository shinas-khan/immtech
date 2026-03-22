import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import Nav from "../components/Nav"

function LegalPage({ title, icon, children }) {
  const navigate = useNavigate()
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn) }, [])
  const mob = w < 768

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "inherit" }}>
      <Nav />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: mob ? "110px 5% 60px" : "140px 6% 80px" }}>
        <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 24, padding: mob ? "28px 20px" : "52px 56px", boxShadow: "0 4px 24px rgba(0,57,255,0.05)" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
            <h1 style={{ fontSize: mob ? 28 : 42, fontWeight: 900, color: "#0A0F1E", margin: "0 0 10px", letterSpacing: -1.5 }}>{title}</h1>
            <div style={{ color: "#9CA3B8", fontSize: 13 }}>Last updated: March 2025</div>
          </div>
          <div style={{ color: "#4B5675", fontSize: 14, lineHeight: 1.9 }}>
            {children}
          </div>
        </div>
      </div>
      <footer style={{ background: "#0A0F1E", padding: "40px 6%", textAlign: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 13 }}>© 2025 IMMTECH Ltd. All rights reserved.</span>
      </footer>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1E", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #E8EEFF" }}>{title}</h2>
      {children}
    </div>
  )
}

function P({ children }) {
  return <p style={{ marginBottom: 12, lineHeight: 1.85 }}>{children}</p>
}

function Li({ children }) {
  return <li style={{ marginBottom: 8, paddingLeft: 8 }}>{children}</li>
}

export function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" icon="🔒">
      <Section title="1. Introduction">
        <P>IMMTECH Ltd ("we", "our", "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store and protect your data when you use our platform at immtech.vercel.app.</P>
        <P>By using IMMTECH, you agree to the collection and use of information in accordance with this policy.</P>
      </Section>
      <Section title="2. Information We Collect">
        <P>We collect the following types of information:</P>
        <ul style={{ paddingLeft: 20 }}>
          <Li><strong>Account information:</strong> Email address, name, password (encrypted)</Li>
          <Li><strong>Profile information:</strong> Nationality, job role, visa status, salary expectations, work experience</Li>
          <Li><strong>CV data:</strong> When you upload your CV for AI scoring, we process the text content</Li>
          <Li><strong>Usage data:</strong> Pages visited, searches performed, jobs saved and applied to</Li>
          <Li><strong>Job alert preferences:</strong> Role keywords, locations, salary preferences</Li>
        </ul>
      </Section>
      <Section title="3. How We Use Your Data">
        <ul style={{ paddingLeft: 20 }}>
          <Li>To provide and improve our job matching and visa checking services</Li>
          <Li>To send job alerts based on your preferences</Li>
          <Li>To score and analyse your CV using AI</Li>
          <Li>To personalise your experience on the platform</Li>
          <Li>To communicate with you about your account</Li>
          <Li>To comply with legal obligations</Li>
        </ul>
      </Section>
      <Section title="4. Data Storage & Security">
        <P>Your data is stored securely using Supabase, which is hosted on AWS infrastructure with encryption at rest and in transit. We use industry-standard security measures including row-level security and encrypted authentication.</P>
        <P>CV files are stored in encrypted object storage. We do not share your CV with third parties without your explicit consent.</P>
      </Section>
      <Section title="5. Third-Party Services">
        <P>We use the following third-party services:</P>
        <ul style={{ paddingLeft: 20 }}>
          <Li><strong>Supabase:</strong> Database and authentication</Li>
          <Li><strong>Anthropic Claude:</strong> AI CV scoring (CV text is processed but not stored by Anthropic)</Li>
          <Li><strong>Reed & Adzuna:</strong> Job listing APIs</Li>
          <Li><strong>Vercel:</strong> Hosting and deployment</Li>
        </ul>
      </Section>
      <Section title="6. Your Rights (GDPR)">
        <P>Under GDPR, you have the right to:</P>
        <ul style={{ paddingLeft: 20 }}>
          <Li>Access your personal data</Li>
          <Li>Correct inaccurate data</Li>
          <Li>Request deletion of your data ("right to be forgotten")</Li>
          <Li>Object to processing of your data</Li>
          <Li>Data portability</Li>
        </ul>
        <P>To exercise any of these rights, contact us at hello@immtech.co.uk</P>
      </Section>
      <Section title="7. Data Retention">
        <P>We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal purposes.</P>
      </Section>
      <Section title="8. Contact">
        <P>For any privacy-related questions, contact our Data Protection Officer at: privacy@immtech.co.uk</P>
      </Section>
    </LegalPage>
  )
}

export function TermsPage() {
  return (
    <LegalPage title="Terms of Service" icon="📋">
      <Section title="1. Acceptance of Terms">
        <P>By accessing or using IMMTECH ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</P>
      </Section>
      <Section title="2. Description of Service">
        <P>IMMTECH is an AI-powered job platform that helps international professionals find visa-sponsored employment in the United Kingdom. Our services include:</P>
        <ul style={{ paddingLeft: 20 }}>
          <Li>Job search with employer verification against the UK Home Office sponsor register</Li>
          <Li>AI-powered visa eligibility checking</Li>
          <Li>CV scoring and optimisation</Li>
          <Li>Job alerts and application tracking</Li>
        </ul>
      </Section>
      <Section title="3. Accuracy of Information">
        <P>While we strive to provide accurate information, IMMTECH does not guarantee that all job listings, employer data or visa information is completely accurate or up to date. The UK Home Office sponsor register is updated periodically and we update our database accordingly.</P>
        <P>Our visa eligibility checker provides guidance based on published Home Office rules but should not be considered legal immigration advice. Always consult a qualified immigration lawyer for your specific situation.</P>
      </Section>
      <Section title="4. User Accounts">
        <P>You are responsible for maintaining the security of your account and password. You must notify us immediately of any unauthorised use of your account.</P>
        <P>You must be at least 18 years old to create an account.</P>
      </Section>
      <Section title="5. Acceptable Use">
        <P>You agree not to:</P>
        <ul style={{ paddingLeft: 20 }}>
          <Li>Use the service for any unlawful purpose</Li>
          <Li>Attempt to gain unauthorised access to our systems</Li>
          <Li>Scrape, copy or redistribute our job data without permission</Li>
          <Li>Create multiple accounts for the same person</Li>
          <Li>Provide false information in your profile</Li>
        </ul>
      </Section>
      <Section title="6. Subscription and Payments">
        <P>Free tier features are provided at no cost. Premium features require a paid subscription. Payments are processed securely. Subscriptions auto-renew unless cancelled. You may cancel at any time and will retain access until the end of your billing period.</P>
      </Section>
      <Section title="7. Limitation of Liability">
        <P>IMMTECH is not liable for any job applications, visa outcomes or employment decisions made based on information from our platform. We provide tools and data to assist your search — all final decisions remain yours.</P>
      </Section>
      <Section title="8. Changes to Terms">
        <P>We reserve the right to modify these terms at any time. We will notify users of significant changes via email or platform notification.</P>
      </Section>
      <Section title="9. Contact">
        <P>Questions about these Terms? Contact us at: legal@immtech.co.uk</P>
      </Section>
    </LegalPage>
  )
}

export function CookiePage() {
  return (
    <LegalPage title="Cookie Policy" icon="🍪">
      <Section title="What are cookies?">
        <P>Cookies are small text files stored on your device when you visit a website. They help us provide you with a better experience by remembering your preferences and understanding how you use our platform.</P>
      </Section>
      <Section title="Cookies we use">
        <P><strong>Essential Cookies</strong></P>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <Li><strong>Authentication:</strong> Keep you logged in to your account (Supabase session token)</Li>
          <Li><strong>Security:</strong> Protect against cross-site request forgery</Li>
        </ul>
        <P><strong>Functional Cookies</strong></P>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <Li><strong>Preferences:</strong> Remember your search filters and settings</Li>
          <Li><strong>Language:</strong> Store your language preference</Li>
        </ul>
        <P><strong>Analytics Cookies (if enabled)</strong></P>
        <ul style={{ paddingLeft: 20 }}>
          <Li><strong>Usage tracking:</strong> Understand which features are most used to improve the platform</Li>
          <Li>We use privacy-first analytics and do not share this data with advertisers</Li>
        </ul>
      </Section>
      <Section title="We do NOT use:">
        <ul style={{ paddingLeft: 20 }}>
          <Li>Advertising or tracking cookies</Li>
          <Li>Third-party marketing cookies</Li>
          <Li>Social media tracking pixels</Li>
        </ul>
        <P>IMMTECH is an ad-free platform. We do not sell your data to advertisers.</P>
      </Section>
      <Section title="Managing cookies">
        <P>You can control cookies through your browser settings. Note that disabling essential cookies may affect your ability to log in and use the platform.</P>
        <P>To manage cookies in Chrome: Settings → Privacy and Security → Cookies and other site data</P>
      </Section>
      <Section title="Contact">
        <P>Questions about cookies? Contact us at: hello@immtech.co.uk</P>
      </Section>
    </LegalPage>
  )
}

export function GDPRPage() {
  return (
    <LegalPage title="GDPR Compliance" icon="🇪🇺">
      <Section title="Our Commitment">
        <P>IMMTECH Ltd is committed to full compliance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. This page explains our approach to data protection and your rights as a data subject.</P>
      </Section>
      <Section title="Data Controller">
        <P>IMMTECH Ltd is the Data Controller for personal data processed through our platform. We are responsible for deciding how and why your personal data is processed.</P>
        <P><strong>Contact:</strong> privacy@immtech.co.uk</P>
      </Section>
      <Section title="Lawful Basis for Processing">
        <ul style={{ paddingLeft: 20 }}>
          <Li><strong>Contract:</strong> Processing necessary to provide our services to you</Li>
          <Li><strong>Legitimate interests:</strong> Improving our platform and preventing fraud</Li>
          <Li><strong>Consent:</strong> Optional features like job alerts and CV scoring</Li>
          <Li><strong>Legal obligation:</strong> Where required by law</Li>
        </ul>
      </Section>
      <Section title="Your Rights Under UK GDPR">
        <ul style={{ paddingLeft: 20 }}>
          <Li><strong>Right of Access (Article 15):</strong> Request a copy of all data we hold about you</Li>
          <Li><strong>Right to Rectification (Article 16):</strong> Correct inaccurate or incomplete data</Li>
          <Li><strong>Right to Erasure (Article 17):</strong> Request deletion of your personal data</Li>
          <Li><strong>Right to Restrict Processing (Article 18):</strong> Limit how we use your data</Li>
          <Li><strong>Right to Data Portability (Article 20):</strong> Receive your data in a machine-readable format</Li>
          <Li><strong>Right to Object (Article 21):</strong> Object to processing based on legitimate interests</Li>
        </ul>
      </Section>
      <Section title="How to Exercise Your Rights">
        <P>Email us at privacy@immtech.co.uk with the subject line "GDPR Request" and specify which right you wish to exercise. We will respond within 30 days.</P>
        <P>You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk if you believe we have not handled your data correctly.</P>
      </Section>
      <Section title="International Transfers">
        <P>Your data may be processed by our service providers (Supabase, Anthropic, Vercel) who may be located outside the UK. We ensure appropriate safeguards are in place for all international transfers in accordance with UK GDPR requirements.</P>
      </Section>
      <Section title="Data Breach Notification">
        <P>In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will notify the ICO within 72 hours and affected users without undue delay.</P>
      </Section>
    </LegalPage>
  )
}

export function MissionPage() {
  const navigate = useNavigate()
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn) }, [])
  const mob = w < 768

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "inherit" }}>
      <Nav />
      <section style={{ background: "linear-gradient(160deg, #0038CC, #0057FF 50%, #0090FF)", padding: mob ? "120px 5% 80px" : "160px 6% 110px", textAlign: "center" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ fontSize: mob ? 48 : 72, marginBottom: 24 }}>🌍</div>
          <h1 style={{ fontSize: mob ? 32 : 62, fontWeight: 900, color: "#fff", margin: "0 0 20px", letterSpacing: -2, lineHeight: 1.1 }}>Our Mission</h1>
          <p style={{ fontSize: mob ? 17 : 22, color: "rgba(255,255,255,0.85)", lineHeight: 1.8, fontStyle: "italic", fontWeight: 400 }}>
            "To make the United Kingdom accessible to the world's best international talent by removing the friction, misinformation and wasted effort from the visa sponsorship job search process."
          </p>
        </div>
      </section>

      <section style={{ padding: mob ? "70px 5%" : "110px 6%", background: "#fff" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {[
            { icon: "❌", title: "The Problem We're Solving", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", items: ["300,000+ skilled worker visas issued in the UK every year", "Millions of international professionals waste months applying to jobs that don't actually sponsor", "Generic job boards show 'visa sponsorship available' with no verification", "No easy way to check if an employer is actually licensed to sponsor", "Immigration lawyers charge £3,000–£8,000 for guidance that should be accessible to all"] },
            { icon: "✅", title: "Our Solution", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", items: ["125,000+ UK employer verified against the Home Office register in real time", "AI scoring that tells you exactly how likely a job is to be genuinely sponsored", "Free visa eligibility checker using official SOC code salary thresholds", "AI CV scoring tailored to UK employer standards and visa requirements", "A platform built specifically for international talent — not an afterthought"] },
            { icon: "🔭", title: "Our Vision", color: "#0057FF", bg: "#EFF6FF", border: "#BFDBFE", items: ["Become the default platform for international professionals seeking UK employment", "Expand to other countries — Canada, Australia, Germany, Netherlands", "Build the world's largest verified employer sponsorship database", "Create a community where international professionals support each other", "Make skilled immigration efficient, transparent and fair for everyone"] },
          ].map(section => (
            <div key={section.title} style={{ background: section.bg, border: `1px solid ${section.border}`, borderRadius: 20, padding: mob ? "24px 20px" : "36px 40px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 28 }}>{section.icon}</span>
                <h2 style={{ fontSize: mob ? 18 : 24, fontWeight: 900, color: "#0A0F1E", margin: 0 }}>{section.title}</h2>
              </div>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {section.items.map(item => (
                  <li key={item} style={{ marginBottom: 10, fontSize: mob ? 13 : 15, color: "#4B5675", lineHeight: 1.7 }}>
                    <span style={{ color: section.color, fontWeight: 700 }}>→ </span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: mob ? "60px 5%" : "80px 6%", background: "#F8FAFF", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: mob ? 26 : 40, fontWeight: 900, color: "#0A0F1E", margin: "0 0 16px", letterSpacing: -1.5 }}>Join our mission</h2>
          <p style={{ color: "#4B5675", fontSize: mob ? 14 : 17, lineHeight: 1.8, marginBottom: 32 }}>Whether you're looking for a sponsored job, hiring international talent or want to join our team — we'd love to have you.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/jobs")} style={{ background: "linear-gradient(135deg, #0057FF, #00C2FF)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Find Sponsored Jobs →</button>
            <button onClick={() => navigate("/careers")} style={{ background: "#fff", color: "#0057FF", border: "2px solid #E8EEFF", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Join Our Team</button>
          </div>
        </div>
      </section>

      <footer style={{ background: "#0A0F1E", padding: "40px 6%", textAlign: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 13 }}>© 2025 IMMTECH Ltd. All rights reserved.</span>
      </footer>
    </div>
  )
}
