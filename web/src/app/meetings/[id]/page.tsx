import { notFound } from 'next/navigation'
import MeetingDetail from '@/modules/m18-meetings/MeetingDetail'
import { requireMeetingsAccess } from '@/modules/m18-meetings/lib/access'
import { isOpsAdmin } from '@/core/lib/roles'
import { notesEmailOn } from '@/modules/m18-meetings/lib/notes-email'
import { readNote, secondBrainOn } from '@/modules/m18-meetings/lib/second-brain'
import type { Meeting } from '@/modules/m18-meetings/types'
import { loadActionItems } from '@/modules/m18-meetings/lib/action-items'
import { loadTaskOptions } from '@/modules/m07-ops/lib/task-options'
import { loadProjectManager } from '@/modules/m07-ops/lib/pm-data'

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user } = await requireMeetingsAccess()
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
  const tasks = await loadActionItems(supabase, { id: user.id, role, leadCircles }, { meetingId: id })

  // The project manager's open suggestions about this meeting's tasks (v4.107.0: Oscar, "the same functionality in the
  // meetings section"): the same ones as on the board, decided the same way
  const ids = new Set(tasks.map(t => t.deliverable_id))
  const touches = (pl: Record<string, unknown>) => [pl.keep, pl.drop, pl.task, ...(Array.isArray(pl.tasks) ? pl.tasks : [])].some(x => typeof x === 'string' && ids.has(x))
  const pmSuggestions = ids.size ? (await loadProjectManager(supabase)).suggestions.filter(sg => touches(sg.payload)) : []
  // What the action items can be changed to, right here (v4.105.0), for those who may change one
  const taskOptions = tasks.some(t => t.can_edit) || pmSuggestions.length ? await loadTaskOptions(supabase) : null

  return (
    <MeetingDetail
      meeting={meeting}
      teams={hasTeams && isOpsAdmin(profile?.role ?? '') ? (taskOptions?.teams ?? (((await supabase.from('org_units').select('id, name, circle').eq('kind', 'team').order('sort_order')).data ?? []) as { id: string; name: string; circle: string }[])) : null}
      tasks={tasks}
      taskOptions={taskOptions}
      pm={{ suggestions: pmSuggestions, role, leadCircles }}
      canManage={isOpsAdmin(profile?.role ?? '')}
      emailOn={notesEmailOn()}
      secondBrainOn={secondBrainOn()}
      brainNote={brainNote}
    />
  )
}
