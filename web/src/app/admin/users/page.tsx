import { createClient } from '@/core/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/core/lib/roles'
import UsersAdminClient from '@/modules/admin/UsersAdminClient'
import type { AdminUserRow } from '@/modules/admin/UsersAdminClient'

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

  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, username, first_name, last_name, role, lead_circles, created_at')
    .order('created_at', { ascending: false })

  // Questions the assistant couldn't answer, for the badge on the Questions tab
  const { count: openQuestions } = await supabase
    .from('assistant_questions')
    .select('id', { count: 'exact', head: true })
    .eq('answered', false).eq('status', 'open')

  return <UsersAdminClient initialUsers={(users ?? []) as AdminUserRow[]} openQuestions={openQuestions ?? 0} />
}
