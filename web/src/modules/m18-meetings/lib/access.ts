import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/server'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { moduleOn } from '@/core/lib/modules'

/** Meetings pages: the module must be on, and the person a joining member or above */
export async function requireMeetingsAccess() {
  if (!moduleOn('meetings')) notFound()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (!isJoiningOrAbove(profile?.role ?? 'explorer')) redirect('/dashboard')
  return { supabase, user }
}
