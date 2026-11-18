import { createClient } from '@/core/lib/supabase/server'
import type { Me } from './do-actions'

/** The signed-in person for Ask / Do: id, role, the circles they lead, and their name */
export async function doMe(): Promise<(Me & { name: string }) | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('user_profiles').select('role, lead_circles, first_name, last_name, username').eq('id', user.id).maybeSingle()
  return {
    id: user.id, role: p?.role ?? 'explorer', leadCircles: (p?.lead_circles ?? []) as string[],
    name: [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.username || 'A member',
  }
}
