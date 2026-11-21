import type { SupabaseClient } from '@supabase/supabase-js'
import { one } from '@/core/lib/rows'
import type { MeetingTask } from '../types'

export interface Viewer { id: string; role: string; leadCircles: string[] }

const SELECT = 'meeting_id, item_text, person_name, meeting_transcripts(title, meeting_date, created_at, circle), ' +
  'deliverables!inner(id, title, status, needs_review, due_date, due_time, project_id, circle, team_id, assignee_id, assignee_name, priority, created_by, ' +
  'projects(title, circle, created_by, lead_user_id), user_profiles!deliverables_assignee_id_fkey(first_name, username))'

/**
 * A meeting's action items as tasks, for one meeting's page, or every draft still waiting to be confirmed, for the
 * project manager panel on the board (v4.107.0: both show the same rows). Who may confirm or change one: the same people
 * who may move its project on the board (core/lib/ops-permissions.ts); the database checks it again on every change.
 */
export async function loadActionItems(supabase: SupabaseClient, me: Viewer, which: { meetingId: string } | { drafts: true }): Promise<MeetingTask[]> {
  let q = supabase.from('meeting_action_links').select(SELECT).not('deliverable_id', 'is', null)
  q = 'meetingId' in which ? q.eq('meeting_id', which.meetingId) : q.eq('deliverables.needs_review', true).limit(500)
  const { data } = await q.order('created_at')
  const mayDecide = (p: { circle: string | null; created_by: string | null; lead_user_id: string | null }) =>
    me.role === 'admin'
    || (me.role === 'project_lead' && (p.created_by === me.id || p.lead_user_id === me.id))
    || (me.role === 'circle_lead' && !!p.circle && me.leadCircles.includes(p.circle))
  return (data ?? []).map((l: any) => {
    const d = one<any>(l.deliverables)
    if (!d) return null
    const who = one<{ first_name: string | null; username: string | null }>(d.user_profiles)
    const project = one<{ title: string; circle: string | null; created_by: string | null; lead_user_id: string | null }>(d.projects)
    const m = one<{ title: string; meeting_date: string | null; created_at: string; circle: string | null }>(l.meeting_transcripts)
    // A task with no project goes by its own circle (v4.34.0)
    const may = mayDecide(project ?? { circle: d.circle ?? null, created_by: d.created_by ?? null, lead_user_id: null })
    return {
      deliverable_id: d.id, project_id: d.project_id, project_title: project?.title ?? null,
      title: d.title, status: d.status, needs_review: !!d.needs_review, due_date: d.due_date, due_time: d.due_time,
      person_name: l.person_name, assignee: who?.first_name ?? who?.username ?? null, item_text: l.item_text,
      can_decide: !!d.needs_review && may, can_edit: may,
      circle: d.circle ?? null, team_id: d.team_id ?? null, assignee_id: d.assignee_id ?? null, assignee_name: d.assignee_name ?? null, priority: d.priority ?? null,
      meeting: { id: l.meeting_id as string, title: m?.title ?? null, date: m ? (m.meeting_date ?? m.created_at) : null, circle: m?.circle ?? null },
    } satisfies MeetingTask
  }).filter((t): t is NonNullable<typeof t> => !!t)
}
