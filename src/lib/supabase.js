// The one Supabase client. Supabase Auth's defaults: the session is kept in
// localStorage and its token refreshed, so readers stay signed in across
// refreshes and deep links, and every request carries their JWT for RLS.
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

// Google Books list calls are unreliable from us-east-1 (the default), so every Edge Function call is pinned to us-east-2.
// A plain string: supabase-js's main entry does not export FunctionRegion, so importing it gives undefined.
export const FUNCTION_REGION = 'us-east-2'
