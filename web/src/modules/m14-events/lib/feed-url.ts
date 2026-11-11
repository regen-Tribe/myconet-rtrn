/** Calendar feed helpers that are safe to use in the browser (no iCal parser). */

/** How far ahead repeating events are expanded */
export const FEED_DAYS_AHEAD = 90
/**
 * Accepts a Google Calendar embed/share link and returns its public iCal address;
 * any other https link is returned as is.
 */
export function normalizeFeedUrl(input: string): string {
  const raw = input.trim()
  try {
    const u = new URL(raw)
    if (u.hostname === 'calendar.google.com' && !u.pathname.startsWith('/calendar/ical/')) {
      const src = u.searchParams.get('src') ?? u.searchParams.get('cid')
      if (src) {
        // cid= links carry the calendar ID base64-encoded
        const id = src.includes('@') ? src : atob(src)
        return `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`
      }
    }
    if (u.protocol === 'webcal:') return raw.replace(/^webcal:/, 'https:')
  } catch { /* not a URL; the form says so */ }
  return raw
}

