import { notFound } from 'next/navigation'
import MeetingDetail from '@/modules/m18-meetings/MeetingDetail'
import { requireMeetingsAccess } from '@/modules/m18-meetings/lib/access'
import type { Meeting } from '@/modules/m18-meetings/types'

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireMeetingsAccess()
  const { data } = await supabase.from('meeting_transcripts')
    .select('id, title, meeting_date, attendees, status, summary, action_items, transcript, error, source, needs_review, circle, created_by, created_at')
    .eq('id', id).maybeSingle()
  if (!data) notFound()
  return <MeetingDetail meeting={data as Meeting} />
}
