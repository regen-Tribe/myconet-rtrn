export type EventKind = 'daily' | 'core' | 'community' | 'task'
export type RsvpStatus = 'going' | 'maybe'

export interface PersonLite {
  first_name: string | null
  username: string | null
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  location: string | null
  online_url: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
  kind: EventKind
  is_public: boolean
  circle: string | null
  /** e.g. "Food", "Movement": groups events within a calendar */
  category: string | null
  project_id: string | null
  proposal_id: string | null
  created_by: string
  /** Set when the event comes from a linked calendar (edit it there, not here) */
  feed_id: string | null
  /** Members' own description of a linked event (calendar syncs leave it alone) */
  notes: string | null
  notes_at: string | null
  notes_author: PersonLite | null
  /** Set when someone changed the time with "Change time" (anyone signed in can) */
  times_set_at: string | null
  times_author: PersonLite | null
  creator: PersonLite | null
  project: { id: string; title: string } | null
  proposal: { id: string; title: string } | null
  /** Set when this is a task from the task board shown on the calendar (opens the board, not a pop-up) */
  board?: { taskId: string; projectId: string | null; status: string; assignee: string | null }
}

/** A dated task from the task board, as the calendar loads it */
export interface BoardTask {
  id: string
  title: string
  due_date: string
  due_time: string | null
  status: string
  circle: string | null
  project_id: string | null
  project_title: string | null
  assignee: string | null
}

/** A linked calendar's sorting rule: titles containing any of `words` go to `kind`, in `category` */
export interface FeedRule {
  words: string
  kind: EventKind
  category: string | null
}

/** A linked iCal calendar (admins only) */
export interface CalendarFeed {
  id: string
  name: string
  url: string
  kind: EventKind
  is_public: boolean
  match_circles: boolean
  /** Sort events by title; see FeedRule */
  rules: FeedRule[]
  enabled: boolean
  /** Public events made in MyCoNet are added to this (Google) calendar */
  push_new_events: boolean
  last_synced_at: string | null
  last_count: number | null
  last_error: string | null
}

export interface EventRsvp {
  event_id: string
  user_id: string
  status: RsvpStatus
  person: PersonLite | null
}

/** Options for the link pickers in the event form. */
export interface LinkOption {
  id: string
  title: string
  circle?: string | null
}

/** 'agenda': phones in the design review (Today, Tomorrow, This week) */
export type EventsView = 'day' | 'week' | 'month' | 'list' | 'agenda'

/** A comment under an event */
export interface EventComment {
  id: string
  event_id: string
  user_id: string
  body: string
  created_at: string
  author: PersonLite | null
}
