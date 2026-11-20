import { createClient } from '@/core/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/core/lib/roles'
import UsersAdminClient from '@/modules/admin/UsersAdminClient'
import { loadUsersAdmin } from '@/modules/admin/users-server'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!isAdmin(profile?.role ?? '')) redirect('/dashboard')

  return <UsersAdminClient {...await loadUsersAdmin(supabase)} />
}
