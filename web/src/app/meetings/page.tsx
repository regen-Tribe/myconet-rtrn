import MeetingsList from '@/modules/m18-meetings/MeetingsList'
import { requireMeetingsAccess } from '@/modules/m18-meetings/lib/access'
import type { MeetingListItem } from '@/modules/m18-meetings/types'

export default async function MeetingsPage() {
  const { supabase } = await requireMeetingsAccess()
  const { data } = await supabase.from('meeting_transcripts')
    .select('id, title, meeting_date, attendees, status, source, needs_review, created_at')
    .order('created_at', { ascending: false })
  return <MeetingsList meetings={(data ?? []) as MeetingListItem[]} />
}
