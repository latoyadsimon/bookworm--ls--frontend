// The one Supabase client. The app does not use Supabase Auth (the login is a
// mock for now), so nothing is persisted or refreshed by the client.
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Google Books list calls are unreliable from us-east-1 (the default), so every Edge Function call is pinned to us-east-2.
// A plain string: supabase-js's main entry does not export FunctionRegion, so importing it gives undefined.
export const FUNCTION_REGION = 'us-east-2'
