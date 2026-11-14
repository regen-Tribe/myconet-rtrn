/**
 * Server-side Google Calendar writes (the MyCoNet → Google half of a linked calendar).
 * Signs in as the portal's service account (GOOGLE_SERVICE_ACCOUNT_JSON, a JSON key) and
 * edits the calendar that account was shared on ("Make changes to events").
 * Without the secret every call is a no-op that reports 'off'.
 */
import type { CalendarEvent } from '../types'

const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const API = 'https://www.googleapis.com/calendar/v3'

interface ServiceAccount { client_email: string; private_key: string }

export const googlePushOn = () => !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON

/** The calendar id inside a Google iCal link (…/calendar/ical/<id>/public|private-…/basic.ics), or null */
export function googleCalendarId(feedUrl: string): string | null {
  const m = feedUrl.match(/^https:\/\/calendar\.google\.com\/calendar\/ical\/([^/]+)\//)
  return m ? decodeURIComponent(m[1]) : null
}

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

let cached: { token: string; until: number } | null = null

async function accessToken(): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '{}') as ServiceAccount
  if (!sa.client_email || !sa.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not a service account key')
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: sa.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }))}`
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64url(sig)}` }),
  })
  const json = await res.json() as { access_token?: string; expires_in?: number; error_description?: string }
  if (!json.access_token) throw new Error(`Google sign-in failed: ${json.error_description ?? res.status}`)
  cached = { token: json.access_token, until: Date.now() + (json.expires_in ?? 3600) * 1000 }
  return json.access_token
}

async function google<T>(method: string, path: string, body?: object): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${await accessToken()}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 404 || res.status === 410) return null
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(res.status === 403
      ? 'Google refused: share the calendar with the portal’s service account (“Make changes to events”).'
      : `Google Calendar: ${err.error?.message ?? res.status}`)
  }
  return res.status === 204 ? ({} as T) : await res.json() as T
}

type GTime = { dateTime?: string; date?: string; timeZone?: string }

// All-day dates are stored at noon UTC; Google wants the date, with an exclusive end
function times(starts: string, ends: string | null, allDay: boolean): { start: GTime; end: GTime } {
  if (allDay) {
    const day = (iso: string) => iso.slice(0, 10)
    const last = new Date(ends ?? starts)
    last.setUTCDate(last.getUTCDate() + 1)
    return { start: { date: day(starts) }, end: { date: day(last.toISOString()) } }
  }
  const end = ends ?? new Date(new Date(starts).getTime() + 3600_000).toISOString()
  return { start: { dateTime: starts }, end: { dateTime: end } }
}

const cal = (id: string) => `/calendars/${encodeURIComponent(id)}`

/**
 * An event that came from the Google calendar: finds it by its iCal UID (for a repeat,
 * "<uid>#<original start>" names the one occurrence) and moves it to the new times.
 */
export async function moveFeedEvent(calendarId: string, externalUid: string, starts: string, ends: string | null, allDay: boolean): Promise<void> {
  const [uid, originalStart] = externalUid.split('#')
  const found = await google<{ items?: { id: string; recurrence?: string[] }[] }>('GET', `${cal(calendarId)}/events?iCalUID=${encodeURIComponent(uid)}&showDeleted=false`)
  const master = found?.items?.[0]
  if (!master) throw new Error('That event is no longer in the Google calendar.')
  let targetId = master.id
  if (originalStart) {
    const inst = await google<{ items?: { id: string }[] }>('GET', `${cal(calendarId)}/events/${encodeURIComponent(master.id)}/instances?originalStart=${encodeURIComponent(originalStart)}`)
    const one = inst?.items?.[0]
    if (!one) throw new Error('That date of the repeating event is no longer in the Google calendar.')
    targetId = one.id
  }
  await google('PATCH', `${cal(calendarId)}/events/${encodeURIComponent(targetId)}`, times(starts, ends, allDay))
}

const bodyFor = (e: CalendarEvent, link: string) => ({
  summary: e.title,
  description: [e.description, e.online_url, `On MyCoNet: ${link}`].filter(Boolean).join('\n\n'),
  location: e.location ?? undefined,
  ...times(e.starts_at, e.ends_at, e.all_day),
  extendedProperties: { private: { myconet_event_id: e.id } },
})

/** Adds a MyCoNet event to the calendar, or updates the copy already there. Returns the Google ids. */
export async function upsertEvent(calendarId: string, e: CalendarEvent & { google_event_id?: string | null }, link: string): Promise<{ id: string; iCalUID: string }> {
  if (e.google_event_id) {
    const updated = await google<{ id: string; iCalUID: string }>('PATCH', `${cal(calendarId)}/events/${encodeURIComponent(e.google_event_id)}`, bodyFor(e, link))
    if (updated) return updated
  }
  const created = await google<{ id: string; iCalUID: string }>('POST', `${cal(calendarId)}/events`, bodyFor(e, link))
  if (!created) throw new Error('Google didn’t create the event.')
  return created
}

export async function deleteEvent(calendarId: string, googleEventId: string): Promise<void> {
  await google('DELETE', `${cal(calendarId)}/events/${encodeURIComponent(googleEventId)}`)
}
