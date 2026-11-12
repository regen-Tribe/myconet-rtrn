/**
 * Who can post and edit events. Mirrors the `events` RLS policies:
 *   - community events: joining members and above
 *   - daily and core events, tasks: full members, leads, advisors, admins
 *   - edit/delete: the creator, an admin, or a circle lead for the event's circle
 */

import { isFullMember, isJoiningOrAbove } from '@/core/lib/roles'
import type { CalendarEvent, EventKind } from '../types'

export const EVENT_KINDS: EventKind[] = ['daily', 'core', 'community', 'task']

export function canCreateKind(kind: EventKind, role: string): boolean {
  return kind === 'community' ? isJoiningOrAbove(role) : isFullMember(role)
}

export function canEditEvent(
  e: Pick<CalendarEvent, 'created_by' | 'circle'>, userId: string | null, role: string, leadCircles: string[],
): boolean {
  if (!userId) return false
  if (e.created_by === userId || role === 'admin') return true
  return role === 'circle_lead' && !!e.circle && leadCircles.includes(e.circle)
}

/** Wording for each calendar; tasks use sign-up language instead of RSVP. */
export const KIND_META: Record<EventKind, {
  label: string; short: string; blurb: string
  /** Colour of this calendar's events everywhere (chips, checkboxes, legend) */
  color: string
  rsvpHeading: string; goingLabel: string; goingCount: string; youGoing: string; noneYet: string
}> = {
  daily: {
    label: 'Daily events',
    short: 'Daily',
    color: '#059669',
    blurb: 'The community’s daily rhythm: meals, movement, focus hours.',
    rsvpHeading: 'Who’s coming', goingLabel: 'Going', goingCount: 'going', youGoing: '✓ You’re going', noneYet: 'No one has RSVP’d yet.',
  },
  core: {
    label: 'Core events',
    short: 'Core',
    color: '#4f46e5',
    blurb: 'Official community events posted by members, circle leads and project leads.',
    rsvpHeading: 'Who’s coming', goingLabel: 'Going', goingCount: 'going', youGoing: '✓ You’re going', noneYet: 'No one has RSVP’d yet.',
  },
  community: {
    label: 'Community hosted',
    short: 'Community',
    color: '#db2777',
    blurb: 'Events hosted by anyone in the community, including joining members.',
    rsvpHeading: 'Who’s coming', goingLabel: 'Going', goingCount: 'going', youGoing: '✓ You’re going', noneYet: 'No one has RSVP’d yet.',
  },
  task: {
    label: 'Tasks',
    short: 'Task',
    color: '#ea580c',
    blurb: 'Things the community needs done, posted by members and leads. Sign up to help.',
    rsvpHeading: 'Who’s helping', goingLabel: 'I’ll help', goingCount: 'helping', youGoing: '✓ You’re helping', noneYet: 'No one has signed up yet.',
  },
}

export function isEventKind(v: string | undefined): v is EventKind {
  return v === 'daily' || v === 'core' || v === 'community' || v === 'task'
}
