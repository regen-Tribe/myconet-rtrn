import { createClient } from '@/core/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/core/lib/roles'
import QuestionsAdminClient, { type QuestionRow } from '@/modules/admin/QuestionsAdminClient'

export default async function AdminQuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (!isAdmin(profile?.role ?? '')) redirect('/dashboard')

  const { data: rows } = await supabase
    .from('assistant_questions')
    .select('id, created_at, user_id, question, answer, answered, status, admin_note')
    .order('created_at', { ascending: false })
    .limit(1000)

  // Names of the members who asked (visitors have no user_id)
  const ids = [...new Set((rows ?? []).map(r => r.user_id).filter(Boolean))] as string[]
  const { data: people } = ids.length
    ? await supabase.from('user_profiles').select('id, username, first_name').in('id', ids)
    : { data: [] }
  const names = Object.fromEntries((people ?? []).map(p => [p.id, { name: p.first_name || p.username, username: p.username }]))

  const questions: QuestionRow[] = (rows ?? []).map(r => ({ ...r, asker: r.user_id ? names[r.user_id] ?? null : null }))
  return <QuestionsAdminClient initial={questions} />
}
