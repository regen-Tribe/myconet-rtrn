import MeetingsList from '@/modules/m18-meetings/MeetingsList'
import { MeetingsLocked, requireMeetingsAccess } from '@/modules/m18-meetings/lib/access'
import { isOpsAdmin } from '@/core/lib/roles'
import type { MeetingListItem } from '@/modules/m18-meetings/types'

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<{ circle?: string; q?: string }> }) {
  const sp = await searchParams
  const access = await requireMeetingsAccess()
  if (access.locked) return <MeetingsLocked signedIn={access.signedIn} />
  const { supabase, user } = access
  // RLS: joining members and above; Circle-only meetings only for that circle, its leads and admins
  const [{ data }, { data: profile }, { data: teams }] = await Promise.all([
    supabase.from('meeting_transcripts')
      .select('id, title, meeting_date, attendees, status, source, needs_review, created_at, circle, visibility, summary, action_items, processed_at, circle_source, agent_note')
      .order('created_at', { ascending: false }),
    supabase.from('user_profiles').select('role, lead_circles').eq('id', user.id).maybeSingle(),
    supabase.from('org_unit_members').select('org_units(circle)').eq('user_id', user.id),
  ])
  const meetings = ((data ?? []) as MeetingListItem[])
    .sort((a, b) => (b.meeting_date ?? b.created_at).localeCompare(a.meeting_date ?? a.created_at))

  // My circles: the ones I lead, and the ones I'm on a team of
  const teamCircles = (teams ?? []).map((t: any) => (Array.isArray(t.org_units) ? t.org_units[0] : t.org_units)?.circle).filter(Boolean) as string[]
  const myCircles = [...new Set([...(profile?.lead_circles ?? []), ...teamCircles])]

  // Tasks each meeting put on the board, and how many are still drafts
  const ids = meetings.map(m => m.id)
  const { data: tasks } = ids.length
    ? await supabase.from('deliverables').select('source_meeting_id, needs_review').in('source_meeting_id', ids)
    : { data: [] }
  const taskCounts: Record<string, { total: number; drafts: number }> = {}
  for (const t of tasks ?? []) {
    const c = (taskCounts[t.source_meeting_id as string] ??= { total: 0, drafts: 0 })
    c.total++
    if (t.needs_review) c.drafts++
  }

  return (
    <MeetingsList
      meetings={meetings}
      taskCounts={taskCounts}
      myCircles={myCircles}
      canManage={isOpsAdmin(profile?.role ?? '')}
      decider={{ role: profile?.role ?? '', leadCircles: profile?.lead_circles ?? [] }}
      initialCircle={sp.circle ?? null}
      initialQuery={sp.q ?? ''}
    />
  )
}
