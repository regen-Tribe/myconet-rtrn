import { notFound } from 'next/navigation'
import MeetingDetail from '@/modules/m18-meetings/MeetingDetail'
import { MeetingsLocked, requireMeetingsAccess } from '@/modules/m18-meetings/lib/access'
import { isOpsAdmin } from '@/core/lib/roles'
import { notesEmailOn } from '@/modules/m18-meetings/lib/notes-email'
import { readNote, secondBrainOn } from '@/modules/m18-meetings/lib/second-brain'
import type { Meeting } from '@/modules/m18-meetings/types'
import { loadDecisions } from '@/modules/m07-ops/lib/decisions'
import { loadTaskOptions } from '@/modules/m07-ops/lib/task-options'

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await requireMeetingsAccess()
  if (access.locked) return <MeetingsLocked signedIn={access.signedIn} />
  const { supabase, user } = access
  const [{ data }, { data: profile }] = await Promise.all([
    supabase.from('meeting_transcripts')
      .select('id, title, original_title, meeting_date, attendees, status, summary, action_items, transcript, error, source, needs_review, circle, visibility, created_by, created_at, processed_at, circle_source, agent_note, processing_started_at, processing_error, tasks_drafted, notes_path, notes_url, fireflies_notes, notes_emailed_at, notes_email_count, notes_email_error')
      .eq('id', id).maybeSingle(),
    supabase.from('user_profiles').select('role, lead_circles').eq('id', user.id).maybeSingle(),
  ])
  if (!data) notFound()
  // Its subcircle (v4.108.0), read on its own: a community that hasn't applied 20261216000000_meeting_teams keeps the page
  const teamRead = await supabase.from('meeting_transcripts').select('team_id').eq('id', id).maybeSingle()
  const hasTeams = !teamRead.error
  const meeting = { ...(data as Meeting), team_id: hasTeams ? ((teamRead.data?.team_id as string | null) ?? null) : null }
  // The second-brain note for its tab, read from the repo (only after the page's own access check)
  const brainNote = data.notes_path ? await readNote(data.notes_path) : null

  const role = profile?.role ?? ''
  const leadCircles: string[] = profile?.lead_circles ?? []
  // The meeting's action items as the To decide list (v4.114.0): each task with its fields, its Draft pill and the
  // project manager's suggestions about it, the same rows as on the board
  const { rows: tasks } = await loadDecisions(supabase, { id: user.id, role, leadCircles }, { meetingId: id })

  // What the action items can be changed to, right here (v4.105.0), for those who may change one
  const taskOptions = tasks.some(t => t.can_edit) ? await loadTaskOptions(supabase) : null

  return (
    <MeetingDetail
      meeting={meeting}
      teams={hasTeams && isOpsAdmin(profile?.role ?? '') ? (taskOptions?.teams ?? (((await supabase.from('org_units').select('id, name, circle').eq('kind', 'team').order('sort_order')).data ?? []) as { id: string; name: string; circle: string }[])) : null}
      tasks={tasks}
      taskOptions={taskOptions}
      decider={{ role, leadCircles }}
      canManage={isOpsAdmin(profile?.role ?? '')}
      emailOn={notesEmailOn()}
      secondBrainOn={secondBrainOn()}
      brainNote={brainNote}
    />
  )
}
