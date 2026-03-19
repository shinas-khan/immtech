-- =====================================================
-- IMMTECH Supabase Database Setup
-- Run this in your Supabase SQL Editor
-- supabase.com → Your Project → SQL Editor → New Query
-- =====================================================

-- 1. Profiles table (stores user profile data)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  nationality TEXT,
  current_location TEXT,
  job_role TEXT,
  industry TEXT,
  experience_years TEXT,
  visa_status TEXT,
  salary_expectation TEXT,
  bio TEXT,
  linkedin_url TEXT,
  phone TEXT,
  cv_path TEXT,
  cv_name TEXT,
  onboarded BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Job alerts table
CREATE TABLE IF NOT EXISTS job_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  location TEXT,
  industry TEXT,
  salary_min TEXT,
  frequency TEXT DEFAULT 'daily', -- instant, daily, weekly
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Saved jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  job_title TEXT,
  employer TEXT,
  location TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  job_url TEXT,
  source TEXT,
  sponsorship_score INTEGER,
  applied BOOLEAN DEFAULT FALSE,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies — users can only see and edit their own data

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Job alerts
CREATE POLICY "Users can view own alerts" ON job_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON job_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON job_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON job_alerts FOR DELETE USING (auth.uid() = user_id);

-- Saved jobs
CREATE POLICY "Users can view own saved jobs" ON saved_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved jobs" ON saved_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved jobs" ON saved_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved jobs" ON saved_jobs FOR DELETE USING (auth.uid() = user_id);

-- 6. Storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false);

CREATE POLICY "Users can upload own CV" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can view own CV" ON storage.objects FOR SELECT USING (
  bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- Done! Your database is ready.
-- Next: Add your SUPABASE_URL and SUPABASE_ANON_KEY
-- to src/lib/supabase.js
-- =====================================================
