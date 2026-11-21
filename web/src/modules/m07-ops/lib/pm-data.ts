import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/core/lib/supabase/service'
import type { AgentSuggestion, PmAction, SuggestionSource } from '../types'

/**
 * The project manager's open suggestions (the person's own session) and its own changes of the last two
 * weeks (agent_actions is admin-only to read, so these few fields come through the server).
 */
export async function loadProjectManager(supabase: SupabaseClient): Promise<{ suggestions: AgentSuggestion[]; actions: PmAction[] }> {
  const since = new Date(Date.now() - 14 * 86400_000).toISOString()
  const [{ data: sugs }, { data: acts }] = await Promise.all([
    supabase.from('agent_suggestions').select('id, circle, kind, payload, reason, created_at').eq('status', 'open').order('created_at'),
    loadRecentActions(since),
  ])
  const actions = (acts ?? []).map(a => {
    const d = a.detail as Record<string, any>
    const label = String(a.action).startsWith('do_') ? String(d.summary ?? '')
      : a.action === 'pm_merge' ? `${d.kept} ⟵ ${d.dropped?.title ?? ''}`
      : a.action === 'pm_move' ? `${d.title} → ${d.project ?? 'a project'}`
      : `${d.title} → ${d.person ?? ''}`
    return { id: a.id as string, action: a.action as string, circle: (d.circle ?? '') as string, label, reason: (d.reason ?? null) as string | null }
  })
  const suggestions = (sugs ?? []) as AgentSuggestion[]
  return { suggestions: await withSources(supabase, suggestions), actions }
}

/** The tasks a suggestion is about */
const taskIds = (s: AgentSuggestion) => {
  const p = s.payload as { keep?: string; drop?: string; task?: string; tasks?: string[] }
  return [p.keep, p.drop, p.task, ...(Array.isArray(p.tasks) ? p.tasks : [])].filter((x): x is string => typeof x === 'string')
}

/**
 * Where each suggestion's tasks came from (v4.77.0: Oscar wanted to see "where the project manager is pulling this
 * info from": the meeting, its date, who said it): the meeting and the line it was drafted from, who said it
 * (Fireflies' speaker on that action item), or who added it by hand. Read with the person's own session, so a
 * meeting they may not open shows without its title.
 */
async function withSources(supabase: SupabaseClient, suggestions: AgentSuggestion[]): Promise<AgentSuggestion[]> {
  const ids = [...new Set(suggestions.flatMap(taskIds))].slice(0, 300)
  if (!ids.length) return suggestions
  const [{ data: tasks }, { data: links }] = await Promise.all([
    supabase.from('deliverables')
      .select('id, title, status, needs_review, notes, due_date, due_time, priority, circle, team_id, project_id, assignee_id, assignee_name, source_meeting_id, source_item, created_by, created_at, projects(title, is_chores)')
      .in('id', ids),
    supabase.from('meeting_action_links').select('deliverable_id, meeting_id, item_index, item_text, person_name').in('deliverable_id', ids),
  ])
  const rows = (tasks ?? []) as unknown as {
    id: string; title: string; status: string; needs_review: boolean; notes: string | null; due_date: string | null; due_time: string | null; priority: string | null
    circle: string | null; team_id: string | null; project_id: string | null
    assignee_id: string | null; assignee_name: string | null; source_meeting_id: string | null; source_item: string | null
    created_by: string | null; created_at: string | null; projects: { title: string; is_chores: boolean } | null
  }[]
  // The meeting line a task came from: its link, else the meeting it names
  const link = new Map((links ?? []).map(l => [l.deliverable_id as string, l as { meeting_id: string; item_index: number | null; item_text: string; person_name: string | null }]))
  const meetingOf = (t: (typeof rows)[number]) => link.get(t.id)?.meeting_id ?? t.source_meeting_id
  const meetingIds = [...new Set(rows.map(meetingOf).filter((x): x is string => !!x))]
  const peopleIds = [...new Set(rows.flatMap(t => [t.assignee_id, t.created_by]).filter((x): x is string => !!x))]
  const [{ data: meetings }, { data: people }] = await Promise.all([
    meetingIds.length ? supabase.from('meeting_transcripts').select('id, title, meeting_date, created_at, circle, attendees, action_items').in('id', meetingIds) : Promise.resolve({ data: [] }),
    peopleIds.length ? supabase.from('user_profiles').select('id, first_name, last_name, username').in('id', peopleIds) : Promise.resolve({ data: [] }),
  ])
  const meeting = new Map((meetings ?? []).map(m => [m.id as string, m as { title: string; meeting_date: string | null; created_at: string; circle: string | null; attendees: string[] | null; action_items: { text?: string; speaker?: string | null }[] | null }]))
  const person = new Map((people ?? []).map(p => [p.id as string, [p.first_name, p.last_name].filter(Boolean).join(' ') || (p.username as string | null)]))
  const source = new Map(rows.map(t => {
    const mid = meetingOf(t)
    const m = mid ? meeting.get(mid) : undefined
    const l = link.get(t.id)
    const item = m && l?.item_index != null && Array.isArray(m.action_items) ? m.action_items[l.item_index] : undefined
    const said = (t.source_item ?? l?.item_text ?? item?.text ?? '').trim()
    const out: SuggestionSource = {
      task_id: t.id, title: t.title, status: t.status, draft: t.needs_review,
      project: t.projects && !t.projects.is_chores ? t.projects.title : null,
      person: (t.assignee_id ? person.get(t.assignee_id) : null) ?? t.assignee_name ?? null,
      due_date: t.due_date, priority: t.priority && t.priority !== 'none' ? t.priority : null,
      notes: t.notes?.trim() ? t.notes.trim().slice(0, 400) : null,
      meeting: mid ? { id: mid, title: m?.title ?? null, date: m ? (m.meeting_date ?? m.created_at) : null, circle: m?.circle ?? null, attendees: (m?.attendees ?? []).slice(0, 20) } : null,
      said: mid && said ? said.slice(0, 400) : null,
      said_by: item?.speaker?.trim() || l?.person_name?.trim() || null,
      added_by: t.created_by ? person.get(t.created_by) ?? null : null,
      added_at: t.created_at,
      edit: { circle: t.circle, team_id: t.team_id, project_id: t.project_id, assignee_id: t.assignee_id, assignee_name: t.assignee_name, priority: t.priority, due_date: t.due_date, due_time: t.due_time },
    }
    return [t.id, out]
  }))
  return suggestions.map(s => ({ ...s, sources: [...new Set(taskIds(s))].map(id => source.get(id)).filter((x): x is SuggestionSource => !!x) }))
}

/** Open suggestions per circle, for the circles' "Project manager" buttons */
export async function suggestionCountsByCircle(supabase: SupabaseClient): Promise<Record<string, number>> {
  const { data } = await supabase.from('agent_suggestions').select('circle').eq('status', 'open')
  const out: Record<string, number> = {}
  for (const s of data ?? []) out[s.circle as string] = (out[s.circle as string] ?? 0) + 1
  return out
}

/** The agent's own recent changes. Without the service key (a community that hasn't set it) the panel is just empty. */
async function loadRecentActions(since: string): Promise<{ data: { id: string; action: string; detail: unknown }[] | null }> {
  try {
    return await createServiceClient().from('agent_actions').select('id, action, detail').or('action.like.pm_%,action.like.do_%').is('undone_at', null).gte('created_at', since).order('created_at', { ascending: false }).limit(40)
  } catch (e) {
    console.error('[pm-data] recent agent actions skipped:', (e as Error).message)
    return { data: null }
  }
}
