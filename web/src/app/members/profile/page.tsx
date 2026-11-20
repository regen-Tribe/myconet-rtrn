import { redirect } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/server'
import { DESIGN } from '@/core/lib/instance'
import NetworkProfilePage from '@/modules/m01-network/ProfilePage'

/**
 * "My profile". With the v4 look your profile is the same page everyone sees (/u/<you>, already in v4,
 * with Edit profile on it), so this tab goes there instead of showing a second, older copy.
 */
export default async function MyProfilePage() {
  if (DESIGN === 'v4') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    const { data } = await supabase.from('user_profiles').select('username').eq('id', user.id).maybeSingle()
    if (data?.username) redirect(`/u/${data.username}`)
  }
  return <NetworkProfilePage />
}
