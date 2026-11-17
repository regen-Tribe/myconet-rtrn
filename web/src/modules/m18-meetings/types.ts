export type MeetingStatus = 'processing' | 'done' | 'error'

export interface MeetingListItem {
  id: string
  title: string
  meeting_date: string | null
  attendees: string[]
  status: MeetingStatus
  source: string
  needs_review: boolean
  created_at: string
}

export interface Meeting extends MeetingListItem {
  summary: string | null
  action_items: { text: string; speaker: string | null }[]
  transcript: string | null
  error: string | null
  circle: string | null
  created_by: string | null
}
