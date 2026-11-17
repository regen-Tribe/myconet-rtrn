import { createClient } from '@supabase/supabase-js'

/**
 * Server-only client with the service-role key: bypasses RLS. Only for routes with no signed-in
 * person (webhooks) or writes the person may not make themselves; check access before using it.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service client not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
