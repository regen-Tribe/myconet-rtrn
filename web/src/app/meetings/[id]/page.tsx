import { notFound } from 'next/navigation'
import MeetingDetail from '@/modules/m18-meetings/MeetingDetail'
import { requireMeetingsAccess } from '@/modules/m18-meetings/lib/access'
import { isOpsAdmin } from '@/core/lib/roles'
import { one } from '@/core/lib/rows'
import { notesEmailOn } from '@/modules/m18-meetings/lib/notes-email'
import { readNote, secondBrainOn } from '@/modules/m18-meetings/lib/second-brain'
import type { Meeting, MeetingTask } from '@/modules/m18-meetings/types'
import { loadTaskOptions } from '@/modules/m07-ops/lib/task-options'

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user } = await requireMeetingsAccess()
  const [{ data }, { data: profile }, { data: links }] = await Promise.all([
    supabase.from('meeting_transcripts')
      .select('id, title, original_title, meeting_date, attendees, status, summary, action_items, transcript, error, source, needs_review, circle, visibility, created_by, created_at, processed_at, circle_source, agent_note, processing_started_at, processing_error, tasks_drafted, notes_path, notes_url, fireflies_notes, notes_emailed_at, notes_email_count, notes_email_error')
      .eq('id', id).maybeSingle(),
    supabase.from('user_profiles').select('role, lead_circles').eq('id', user.id).maybeSingle(),
    supabase.from('meeting_action_links')
      .select('item_text, person_name, deliverables(id, title, status, needs_review, due_date, due_time, project_id, circle, team_id, assignee_id, assignee_name, priority, created_by, projects(title, circle, created_by, lead_user_id), user_profiles!deliverables_assignee_id_fkey(first_name, username))')
      .eq('meeting_id', id).not('deliverable_id', 'is', null).order('created_at'),
  ])
  if (!data) notFound()
  // The second-brain note for its tab, read from the repo (only after the page's own access check)
  const brainNote = data.notes_path ? await readNote(data.notes_path) : null

  // Who may confirm or decline a draft here: the same people who may move its project on the board
  // (core/lib/ops-permissions.ts); the database checks it again on every change
  const role = profile?.role ?? ''
  const leadCircles: string[] = profile?.lead_circles ?? []
  const mayDecide = (p: { circle: string | null; created_by: string | null; lead_user_id: string | null } | null) =>
    !!p && (role === 'admin'
      || (role === 'project_lead' && (p.created_by === user.id || p.lead_user_id === user.id))
      || (role === 'circle_lead' && !!p.circle && leadCircles.includes(p.circle)))

  const tasks: MeetingTask[] = (links ?? []).map((l: any) => {
    const d = one(l.deliverables)
    if (!d) return null
    const who = one(d.user_profiles)
    const project = one<{ title: string; circle: string | null; created_by: string | null; lead_user_id: string | null }>(d.projects)
    return {
      deliverable_id: d.id, project_id: d.project_id, project_title: project?.title ?? null,
      title: d.title, status: d.status, needs_review: !!d.needs_review, due_date: d.due_date, due_time: d.due_time,
      person_name: l.person_name, assignee: who?.first_name ?? who?.username ?? null, item_text: l.item_text,
      // A task with no project goes by its own circle (v4.34.0)
      can_decide: !!d.needs_review && mayDecide(project ?? { circle: d.circle ?? null, created_by: d.created_by ?? null, lead_user_id: null }),
      can_edit: mayDecide(project ?? { circle: d.circle ?? null, created_by: d.created_by ?? null, lead_user_id: null }),
      circle: d.circle ?? null, team_id: d.team_id ?? null, assignee_id: d.assignee_id ?? null, assignee_name: d.assignee_name ?? null, priority: d.priority ?? null,
    }
  }).filter((t): t is MeetingTask => !!t)

  // What the action items can be changed to, right here (v4.105.0), for those who may change one
  const taskOptions = tasks.some(t => t.can_edit) ? await loadTaskOptions(supabase) : null

  return (
    <MeetingDetail
      meeting={data as Meeting}
      tasks={tasks}
      taskOptions={taskOptions}
      canManage={isOpsAdmin(profile?.role ?? '')}
      emailOn={notesEmailOn()}
      secondBrainOn={secondBrainOn()}
      brainNote={brainNote}
    />
  )
}
