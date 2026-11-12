import type { CalendarEvent, EventComment, EventRsvp } from '../types'

export const EVENT_SELECT = `
  id, title, description, location, online_url, starts_at, ends_at, all_day, kind, is_public,
  circle, category, project_id, proposal_id, created_by, feed_id, notes, notes_at,
  creator:user_profiles!events_created_by_fkey(first_name, username),
  notes_author:user_profiles!events_notes_by_fkey(first_name, username),
  project:projects(id, title),
  proposal:proposals(id, title)
`

export const FEED_SELECT = 'id, name, url, kind, is_public, match_circles, rules, enabled, last_synced_at, last_count, last_error'

export const COMMENT_SELECT = 'id, event_id, user_id, body, created_at, author:user_profiles!event_comments_user_id_fkey(first_name, username)'

export const RSVP_SELECT = 'event_id, user_id, status, person:user_profiles!event_rsvps_user_id_fkey(first_name, username)'

// PostgREST types to-one embeds loosely; flatten any array forms.
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

export function toEvent(row: any): CalendarEvent {
  return { ...row, creator: one(row.creator), notes_author: one(row.notes_author), project: one(row.project), proposal: one(row.proposal) }
}

export function toRsvp(row: any): EventRsvp {
  return { event_id: row.event_id, user_id: row.user_id, status: row.status, person: one(row.person) }
}

export function toComment(row: any): EventComment {
  return { id: row.id, event_id: row.event_id, user_id: row.user_id, body: row.body, created_at: row.created_at, author: one(row.author) }
}
