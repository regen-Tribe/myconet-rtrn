import type { SupabaseClient } from '@supabase/supabase-js'

/** The Blueprint's join questions, one per line. */
export async function loadJoinQuestions(supabase: SupabaseClient): Promise<string[]> {
  const { data: blueprints } = await supabase
    .from('blueprints')
    .select('answers, updated_at')
    .order('updated_at', { ascending: false })
  const withQuestions = blueprints?.find(b => (b.answers as Record<string, unknown> | null)?.join_application_questions)
  const raw = (withQuestions?.answers as Record<string, unknown> | undefined)?.join_application_questions
  return (typeof raw === 'string' ? raw : '').split('\n').map(q => q.trim()).filter(q => q.length > 0)
}

export interface ApplicationRow {
  id: string; user_id: string; status: string; answers: Record<string, string>
  admin_notes: string | null; created_at: string; first_name: string | null; username: string | null
}

/** Every join application with the applicant's name. RLS: admins and circle leads can read them. */
export async function loadApplications(supabase: SupabaseClient): Promise<ApplicationRow[]> {
  const { data: apps } = await supabase
    .from('applications')
    .select('id, user_id, status, answers, admin_notes, created_at')
    .order('created_at', { ascending: false })

  const userIds = (apps ?? []).map(a => a.user_id as string)
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('user_profiles').select('id, first_name, username').in('id', userIds)
    : { data: [] }
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  return (apps ?? []).map(a => ({
    ...a,
    answers: (a.answers as Record<string, string>) ?? {},
    admin_notes: a.admin_notes ?? null,
    first_name: profileMap[a.user_id]?.first_name ?? null,
    username: profileMap[a.user_id]?.username ?? null,
  })) as ApplicationRow[]
}
