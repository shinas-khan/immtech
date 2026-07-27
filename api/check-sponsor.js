// api/check-sponsor.js
//
// Public, read-only endpoint that answers one question: "can this employer
// legally sponsor a Skilled Worker / Health & Care Worker visa?"
//
// This is the real backend for the IMMTECH Verify browser extension (see
// /extension). The extension calls this from LinkedIn/Indeed job pages so a
// candidate sees a verified/not-verified badge without ever leaving the site
// they're already on. It reuses the exact same Supabase `sponsors` table and
// lookup pattern already used by checkSponsor() in src/pages/JobsPage.jsx -
// no new data pipeline, no new secrets, just a thin public-facing wrapper.
//
// Env vars required (same ones cache-jobs.js already uses):
//   VITE_SUPABASE_URL        - your Supabase project URL
//   SUPABASE_SERVICE_KEY     - service-role key (server-side only, never
//                               shipped to the browser/extension)
//
// IMPORTANT: rotate any keys that were previously committed to source before
// wiring this up for real. This file introduces no new hardcoded secrets.

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

function cleanName(name) {
  return name
    .replace(/\s+(ltd|limited|plc|llp|inc|group|uk|co|corp|corporation|holdings|services|solutions|international|technologies|technology|systems|consulting|consultancy|recruitment|staffing|agency)\.?$/gi, "")
    .replace(/[^\w\s]/g, " ")
    .trim()
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  // Cache verified lookups at the edge for a day - the register only
  // refreshes daily, no need to hit Supabase on every LinkedIn page load.
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" })

  const employer = (req.query.employer || "").toString().trim()
  if (!employer || employer.length < 2) {
    return res.status(400).json({ error: "Provide ?employer=Company Name" })
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      error: "Server not configured. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in your Vercel project.",
    })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const clean = cleanName(employer)

    let { data } = await supabase
      .from("sponsors")
      .select("organisation_name, town, route, rating")
      .ilike("organisation_name", employer)
      .limit(1)

    // Word-boundary match, not raw substring - see the comment in
    // src/pages/JobsPage.jsx's checkSponsor() for why `ilike '%x%'` produces
    // false "verified" badges for short queries at 125k-row scale.
    if (!data?.[0] && clean.length >= 3) {
      const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const res2 = await supabase
        .from("sponsors")
        .select("organisation_name, town, route, rating")
        .filter("organisation_name", "~*", `\\y${escaped}\\y`)
        .limit(1)
      data = res2.data
    }

    const match = data?.[0]
    if (!match) {
      return res.status(200).json({
        verified: false,
        query: employer,
        message: "Not found on the UK Home Office register of licensed sponsors.",
      })
    }

    return res.status(200).json({
      verified: true,
      query: employer,
      organisation_name: match.organisation_name,
      town: match.town,
      route: match.route,
      rating: match.rating,
    })
  } catch (err) {
    return res.status(502).json({ error: "Lookup failed", detail: String(err?.message || err) })
  }
}
