import type { SupabaseClient } from '@supabase/supabase-js'
import { one } from '@/core/lib/rows'
import type { MeetingTask } from '@/modules/m18-meetings/types'
import type { AgentSuggestion, PmAction } from '../types'
import { loadProjectManager } from './pm-data'

export interface Viewer { id: string; role: string; leadCircles: string[] }

/** One task to decide (v4.114.0): its fields, where it came from, and the project manager's open suggestions about it */
/** said_by: who said its line in the meeting (Fireflies' speaker on that action item), v4.130.0 */
export type DecisionRow = MeetingTask & { suggestions: AgentSuggestion[]; said_by?: string | null }

const DELIVERABLE = 'id, title, status, needs_review, due_date, due_time, project_id, circle, team_id, assignee_id, assignee_name, priority, notes, created_by, source_meeting_id, source_item, ' +
  'projects(title, circle, created_by, lead_user_id), user_profiles!deliverables_assignee_id_fkey(first_name, username)'

/** The tasks a suggestion is about */
export const suggestionTasks = (s: AgentSuggestion): string[] => {
  const p = s.payload as { keep?: unknown; drop?: unknown; task?: unknown; tasks?: unknown }
  return [p.keep, p.drop, p.task, ...(Array.isArray(p.tasks) ? p.tasks : [])].filter((x): x is string => typeof x === 'string')
}

/**
 * Everything waiting on a decision, as one list (v4.114.0: Oscar, "all the things that need to be decided should show up
 * on one list"): the drafts still to confirm and the tasks the project manager has open suggestions about, each once,
 * with its suggestions. `{ all: true }` for the board (only what the viewer may decide), `{ meetingId }` for a meeting's
 * page (all its action items, decided or not). Who may decide: admins, the task's circle lead, its project's lead; the
 * database checks again on every change.
 */
export async function loadDecisions(supabase: SupabaseClient, me: Viewer, scope: { all: true } | { meetingId: string }): Promise<{ rows: DecisionRow[]; suggestions: AgentSuggestion[]; actions: PmAction[] }> {
  const pm = await loadProjectManager(supabase)

  let ids: string[]
  if ('meetingId' in scope) {
    const { data } = await supabase.from('meeting_action_links').select('deliverable_id').eq('meeting_id', scope.meetingId).not('deliverable_id', 'is', null).order('created_at')
    ids = (data ?? []).map(r => r.deliverable_id as string)
  } else {
    const { data } = await supabase.from('deliverables').select('id').eq('needs_review', true).order('created_at').limit(500)
    ids = [...new Set([...(data ?? []).map(r => r.id as string), ...pm.suggestions.flatMap(suggestionTasks)])]
  }
  if (!ids.length) return { rows: [], suggestions: pm.suggestions, actions: pm.actions }

  const chunks = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))
  const [tasks, links] = await Promise.all([
    Promise.all(chunks(ids, 150).map(c => supabase.from('deliverables').select(DELIVERABLE).in('id', c))).then(r => r.flatMap(x => (x.data ?? []) as any[])),
    Promise.all(chunks(ids, 150).map(c => supabase.from('meeting_action_links').select('deliverable_id, meeting_id, item_index, item_text, person_name').in('deliverable_id', c))).then(r => r.flatMap(x => (x.data ?? []) as any[])),
  ])
  const link = new Map(links.map(l => [l.deliverable_id as string, l]))
  const meetingIds = [...new Set(tasks.map(d => link.get(d.id)?.meeting_id ?? d.source_meeting_id).filter(Boolean))] as string[]
  const { data: meetings } = meetingIds.length ? await supabase.from('meeting_transcripts').select('id, title, meeting_date, created_at, circle, action_items').in('id', meetingIds) : { data: [] as any[] }
  const meeting = new Map((meetings ?? []).map((m: any) => [m.id as string, m]))
  const mayDecide = (p: { circle: string | null; created_by: string | null; lead_user_id: string | null }) =>
    me.role === 'admin'
    || (me.role === 'project_lead' && (p.created_by === me.id || p.lead_user_id === me.id))
    || (me.role === 'circle_lead' && !!p.circle && me.leadCircles.includes(p.circle))
  const byId = new Map(tasks.map(d => [d.id as string, d]))

  const rows: DecisionRow[] = ids.map(id => byId.get(id)).filter(Boolean).map((d: any) => {
    const who = one<{ first_name: string | null; username: string | null }>(d.user_profiles)
    const project = one<{ title: string; circle: string | null; created_by: string | null; lead_user_id: string | null }>(d.projects)
    const l = link.get(d.id)
    const mid = (l?.meeting_id ?? d.source_meeting_id ?? null) as string | null
    const m = mid ? meeting.get(mid) : null
    const may = mayDecide(project ?? { circle: d.circle ?? null, created_by: d.created_by ?? null, lead_user_id: null })
    return {
      deliverable_id: d.id, project_id: d.project_id, project_title: project?.title ?? null,
      title: d.title, status: d.status, needs_review: !!d.needs_review, due_date: d.due_date, due_time: d.due_time,
      person_name: l?.person_name ?? null, assignee: who?.first_name ?? who?.username ?? null, item_text: (l?.item_text ?? d.source_item ?? '') as string,
      can_decide: !!d.needs_review && may, can_edit: may,
      circle: d.circle ?? null, team_id: d.team_id ?? null, assignee_id: d.assignee_id ?? null, assignee_name: d.assignee_name ?? null, priority: d.priority ?? null, notes: d.notes ?? null,
      said_by: (m && l?.item_index != null && Array.isArray(m.action_items) ? (m.action_items[l.item_index]?.speaker as string | undefined)?.trim() : null) || l?.person_name || null,
      meeting: mid ? { id: mid, title: m?.title ?? null, date: m ? (m.meeting_date ?? m.created_at) : null, circle: m?.circle ?? null } : undefined,
      suggestions: pm.suggestions.filter(s => suggestionTasks(s).includes(d.id)),
    } satisfies DecisionRow
  })
  // The board lists only what this person may decide; a meeting's page shows all its action items
  return { rows: 'all' in scope ? rows.filter(r => r.can_edit) : rows, suggestions: pm.suggestions, actions: pm.actions }
}
