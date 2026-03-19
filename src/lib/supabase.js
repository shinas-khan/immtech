import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nbidqhkvxbcpllbaomml.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ICgPW7qY6UPpBT7OkfM0tQ_EodAUM0A'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
