import { notFound } from 'next/navigation'
import MeetingDetail from '@/modules/m18-meetings/MeetingDetail'
import { requireMeetingsAccess } from '@/modules/m18-meetings/lib/access'
import { isOpsAdmin } from '@/core/lib/roles'
import { one } from '@/core/lib/rows'
import { notesEmailOn } from '@/modules/m18-meetings/lib/notes-email'
import { secondBrainOn } from '@/modules/m18-meetings/lib/second-brain'
import type { Meeting, MeetingTask } from '@/modules/m18-meetings/types'

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user } = await requireMeetingsAccess()
  const [{ data }, { data: profile }, { data: links }] = await Promise.all([
    supabase.from('meeting_transcripts')
      .select('id, title, meeting_date, attendees, status, summary, action_items, transcript, error, source, needs_review, circle, visibility, created_by, created_at, processed_at, circle_source, agent_note, processing_started_at, processing_error, tasks_drafted, notes_url, notes_emailed_at, notes_email_count, notes_email_error')
      .eq('id', id).maybeSingle(),
    supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('meeting_action_links')
      .select('item_text, person_name, deliverables(id, title, status, needs_review, due_date, due_time, project_id, projects(title), user_profiles!deliverables_assignee_id_fkey(first_name, username))')
      .eq('meeting_id', id).not('deliverable_id', 'is', null).order('created_at'),
  ])
  if (!data) notFound()

  const tasks: MeetingTask[] = (links ?? []).map((l: any) => {
    const d = one(l.deliverables)
    if (!d) return null
    const who = one(d.user_profiles)
    return {
      deliverable_id: d.id, project_id: d.project_id, project_title: one(d.projects)?.title ?? null,
      title: d.title, status: d.status, needs_review: !!d.needs_review, due_date: d.due_date, due_time: d.due_time,
      person_name: l.person_name, assignee: who?.first_name ?? who?.username ?? null, item_text: l.item_text,
    }
  }).filter((t): t is MeetingTask => !!t)

  return (
    <MeetingDetail
      meeting={data as Meeting}
      tasks={tasks}
      canManage={isOpsAdmin(profile?.role ?? '')}
      emailOn={notesEmailOn()}
      secondBrainOn={secondBrainOn()}
    />
  )
}
