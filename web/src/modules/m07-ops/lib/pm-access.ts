import { createClient } from '@/core/lib/supabase/server'

/** The person signed in, and whether they may decide for a circle: admins, and that circle's leads */
export async function circleDecider() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('user_profiles').select('role, lead_circles').eq('id', user.id).maybeSingle()
  const role = profile?.role ?? 'explorer'
  const leads = (profile?.lead_circles ?? []) as string[]
  return { user, canDecide: (circle: string | null) => role === 'admin' || (!!circle && role === 'circle_lead' && leads.includes(circle)) }
}
