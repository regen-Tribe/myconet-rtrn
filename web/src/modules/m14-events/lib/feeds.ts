/**
 * Calendar feeds: read an iCal (.ics) feed, such as a Google Calendar, into event
 * occurrences for the community calendar. Repeating events are expanded within a date
 * window, using the feed's own time zones, with Google's one-off changes and
 * cancellations applied. Pure functions; the sync itself is in ./feed-sync.ts.
 */
import ICAL from 'ical.js'

export { FEED_DAYS_AHEAD, normalizeFeedUrl } from './feed-url'

export interface FeedOccurrence {
  /** Stable per occurrence: the event's UID, plus the occurrence's original start for repeats */
  uid: string
  title: string
  description: string | null
  location: string | null
  online_url: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
  circle: string | null
}

/** Safety cap per repeating event (a daily event over 90 days is 90) */
const MAX_PER_EVENT = 400

/** "Farming Circle" → the circle named "Farming"; "Vision / Strategy Circle" → "Vision circle" */
export function matchCircle(title: string, circles: { slug: string; name: string }[]): string | null {
  const t = title.toLowerCase()
  if (!/\bcircle\b/.test(t)) return null
  const firstWord = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/)[0] ?? ''
  const word = firstWord(title)
  if (word.length < 3) return null
  // "Clean Circle" finds the "Cleaning" circle: one first word may start the other
  return circles.find(c => firstWord(c.name) === word)?.slug
    ?? circles.find(c => { const w = firstWord(c.name); return w.length >= 4 && word.length >= 4 && (w.startsWith(word) || word.startsWith(w)) })?.slug
    ?? null
}

/** Google sends descriptions as light HTML */
function plainText(s: string | null): string | null {
  if (!s) return null
  const text = s
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<li>/gi, '• ')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, (_, href, label) => (label && label !== href ? `${label} (${href})` : href))
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text || null
}

const firstUrl = (s: string | null) => s?.match(/https?:\/\/[^\s<>"')]+/)?.[0] ?? null

/** An all-day date is stored at noon UTC, so it shows on the same day in every time zone */
const dateAtNoon = (t: ICAL.Time) => new Date(Date.UTC(t.year, t.month - 1, t.day, 12)).toISOString()

function occurrence(
  ev: ICAL.Event, start: ICAL.Time, end: ICAL.Time | null, uid: string, circles: { slug: string; name: string }[] | null,
): FeedOccurrence {
  const allDay = start.isDate
  const location = ev.location?.trim() || null
  const description = plainText(ev.description ?? null)
  const conference = (ev.component.getFirstPropertyValue('x-google-conference') as string | null) ?? null
  const online = conference ?? (location && /^https?:\/\//.test(location) ? location : null) ?? firstUrl(description)
  let endsAt: string | null = null
  if (end) {
    if (allDay) {
      // DTEND of an all-day event is the day after it ends
      const last = end.clone()
      last.adjust(-1, 0, 0, 0)
      endsAt = last.compare(start) > 0 ? dateAtNoon(last) : null
    } else {
      endsAt = end.toJSDate().toISOString()
    }
  }
  const title = ev.summary?.trim() || '(untitled)'
  return {
    uid,
    title,
    description,
    location: location && location !== online ? location : null,
    online_url: online,
    starts_at: allDay ? dateAtNoon(start) : start.toJSDate().toISOString(),
    ends_at: endsAt,
    all_day: allDay,
    circle: circles ? matchCircle(title, circles) : null,
  }
}

/**
 * Every occurrence that starts in [from, to). Cancelled events and occurrences are left
 * out, so the sync removes them. `circles` (or null to skip matching) assigns circles by title.
 */
export function parseFeed(ics: string, from: Date, to: Date, circles: { slug: string; name: string }[] | null): FeedOccurrence[] {
  const cal = new ICAL.Component(ICAL.parse(ics))
  for (const tz of cal.getAllSubcomponents('vtimezone')) {
    ICAL.TimezoneService.register(new ICAL.Timezone(tz))
  }

  // Google lists one-off changes ("this occurrence only") as separate VEVENTs with a
  // RECURRENCE-ID; attach them to their repeating event
  const masters = new Map<string, ICAL.Event>()
  const exceptions: ICAL.Event[] = []
  for (const comp of cal.getAllSubcomponents('vevent')) {
    const ev = new ICAL.Event(comp)
    if (!ev.uid) continue
    if (ev.isRecurrenceException()) exceptions.push(ev)
    else masters.set(ev.uid, ev)
  }
  const orphans: ICAL.Event[] = []
  for (const ex of exceptions) {
    const master = masters.get(ex.uid)
    if (master?.isRecurring()) master.relateException(ex)
    else orphans.push(ex)
  }

  const out: FeedOccurrence[] = []
  const cancelled = (ev: ICAL.Event) => String(ev.component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED'
  const inWindow = (d: Date) => d >= from && d < to

  for (const ev of [...masters.values(), ...orphans]) {
    if (!ev.isRecurring()) {
      if (cancelled(ev) || !ev.startDate) continue
      const start = ev.startDate.isDate ? new Date(dateAtNoon(ev.startDate)) : ev.startDate.toJSDate()
      // keep events already under way when the window starts
      const end = ev.endDate ? ev.endDate.toJSDate() : start
      if (!(inWindow(start) || (start < from && end > from))) continue
      out.push(occurrence(ev, ev.startDate, ev.endDate ?? null, ev.uid, circles))
      continue
    }
    const it = ev.iterator()
    let kept = 0
    // the step cap covers repeats that began long ago (iteration starts at their first date)
    for (let step = 0, next = it.next(); next && step < 20000 && kept < MAX_PER_EVENT; step++, next = it.next()) {
      const startJs = next.toJSDate()
      if (startJs >= to) break
      if (startJs < new Date(from.getTime() - 2 * 86400000)) continue
      const d = ev.getOccurrenceDetails(next)
      if (cancelled(d.item)) continue
      const s = d.startDate.isDate ? new Date(dateAtNoon(d.startDate)) : d.startDate.toJSDate()
      if (!inWindow(s)) continue
      out.push(occurrence(d.item, d.startDate, d.endDate ?? null, `${ev.uid}#${d.recurrenceId.toJSDate().toISOString()}`, circles))
      kept++
    }
  }
  return out.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}
