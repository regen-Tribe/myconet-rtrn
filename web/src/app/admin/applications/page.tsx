import { redirect } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/server'
import { isAdmin, isCircleAdmin } from '@/core/lib/roles'
import JoinAdminClient from '@/modules/m05-join/JoinAdminClient'
import { loadApplications, loadJoinQuestions } from '@/modules/m05-join/applications-server'

/** Admin › Applications (v4 menu): join applications. Circle leads review them; only an admin decides. */
export default async function AdminApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  const role = profile?.role ?? 'explorer'
  if (!isCircleAdmin(role)) redirect('/dashboard')

  const [applications, questions] = await Promise.all([loadApplications(supabase), loadJoinQuestions(supabase)])
  return <JoinAdminClient applications={applications} questions={questions} canDecide={isAdmin(role)} standalone />
}
