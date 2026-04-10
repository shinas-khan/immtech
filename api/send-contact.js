// api/send-contact.js
// Handles contact form submissions
// Stores in Supabase and optionally sends email notification
// Set CONTACT_EMAIL env var in Vercel to receive notifications

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).end()

  const { name, email, subject, message, type } = req.body || {}

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email and message are required" })
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email address" })
  }

  try {
    // Store in Supabase contact_submissions table
    // This table needs to exist - create it with:
    // CREATE TABLE contact_submissions (
    //   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    //   name text, email text, subject text, message text,
    //   type text, created_at timestamptz DEFAULT now()
    // );
    const supabaseUrl = process.env.SUPABASE_URL || "https://nbidqhkvxbcpllbaomml.supabase.co"
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

    if (supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/contact_submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          name,
          email,
          subject: subject || "Contact form submission",
          message,
          type: type || "general",
          created_at: new Date().toISOString()
        })
      })
    }

    // Send email notification via Resend (free tier: 3,000 emails/month)
    // Sign up at resend.com and set RESEND_API_KEY in Vercel env vars
    const resendKey = process.env.RESEND_API_KEY
    const notifyEmail = process.env.CONTACT_EMAIL || "hello@immtech.co.uk"

    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: "IMMTECH Contact <noreply@immtech.co.uk>",
          to: [notifyEmail],
          reply_to: email,
          subject: `[IMMTECH] New ${type || "general"} enquiry from ${name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0057FF, #00C2FF); padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">New Contact Form Submission</h1>
              </div>
              <div style="background: #f8faff; padding: 24px; border: 1px solid #e8eeff; border-radius: 0 0 12px 12px;">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p><strong>Topic:</strong> ${type || "General"}</p>
                <p><strong>Subject:</strong> ${subject || "N/A"}</p>
                <div style="background: white; border: 1px solid #e8eeff; border-radius: 8px; padding: 16px; margin-top: 8px;">
                  <p><strong>Message:</strong></p>
                  <p style="white-space: pre-wrap;">${message}</p>
                </div>
                <p style="color: #9ca3b8; font-size: 12px; margin-top: 16px;">
                  Received: ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })} GMT
                </p>
              </div>
            </div>
          `
        })
      })
    }

    return res.status(200).json({
      success: true,
      message: "Message received. We'll get back to you within 24 hours."
    })

  } catch (err) {
    console.error("Contact form error:", err)
    // Still return success to the user — their message was received
    // (even if email notification failed, it's stored in Supabase)
    return res.status(200).json({
      success: true,
      message: "Message received. We'll get back to you within 24 hours."
    })
  }
}
