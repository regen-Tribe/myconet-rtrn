import { createClient } from '@/core/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin, isCircleAdmin } from '@/core/lib/roles'
import UsersAdminClient from '@/modules/admin/UsersAdminClient'
import { loadUsersAdmin } from '@/modules/admin/users-server'

/** Admin › Permissions (v4 menu): everyone's role and circles. Circle leads can look; only admins change it. */
export default async function AdminPermissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  const role = profile?.role ?? 'explorer'
  if (!isCircleAdmin(role)) redirect('/dashboard')

  return <UsersAdminClient {...await loadUsersAdmin(supabase)} title="Permissions" readOnly={!isAdmin(role)} />
}
