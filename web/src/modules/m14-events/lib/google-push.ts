import type { SupabaseClient } from '@supabase/supabase-js'
import { EVENT_SELECT, toEvent } from './queries'
import { canEditEvent } from './permissions'
import { deleteEvent, googleCalendarId, googlePushOn, moveFeedEvent, upsertEvent } from './google-calendar'

export type Google = 'updated' | 'added' | 'removed' | 'off' | 'none'
export type PushResult = { ok: true; google: Google; googleError?: string } | { ok: false; error: string; status: number }

/**
 * Brings an event's Google copy in step after a change made in MyCoNet (v4.65.0: moved out of
 * /api/calendar-push so the assistant's Do uses the same code). `times`: its time changed (anyone may);
 * `saved`: its host created or edited it. `supabase` is the person's own session. The Google side never
 * blocks the change: it only reports `google` and maybe `googleError`.
 */
export async function pushEventToGoogle(supabase: SupabaseClient, userId: string, eventId: string, action: 'times' | 'saved', origin: string): Promise<PushResult> {
  const secret = process.env.CALENDAR_SYNC_SECRET ?? null
  const feeds = async () => {
    const { data } = await supabase.rpc('calendar_push_feeds', { p_secret: secret })
    return (data ?? []) as { id: string; url: string; push_new_events: boolean }[]
  }
  const pushCalendar = async () => {
    const f = (await feeds()).find(x => x.push_new_events && googleCalendarId(x.url))
    return f ? googleCalendarId(f.url) : null
  }
  const mark = (id: string | null, uid: string | null) =>
    supabase.rpc('calendar_push_mark', { p_secret: secret, p_event_id: eventId, p_google_event_id: id ?? '', p_google_ical_uid: uid ?? '' })
  const link = `${origin}/calendar?event=${eventId}`
  const done = (google: Google, googleError?: string): PushResult => ({ ok: true, google, ...(googleError ? { googleError } : {}) })

  const { data } = await supabase.from('events').select(`${EVENT_SELECT}, external_uid, google_event_id`).eq('id', eventId).maybeSingle()
  if (!data) return { ok: false, error: 'Event not found', status: 404 }
  const event = { ...toEvent(data), external_uid: data.external_uid as string | null, google_event_id: data.google_event_id as string | null }
  if (!googlePushOn()) return done('off')

  try {
    // An event from the Google calendar: only its time is ever changed from here
    if (event.feed_id) {
      if (action !== 'times' || !event.external_uid) return done('none')
      const feed = (await feeds()).find(f => f.id === event.feed_id)
      const calId = feed ? googleCalendarId(feed.url) : null
      if (!calId) return done('none')
      await moveFeedEvent(calId, event.external_uid, event.starts_at, event.ends_at, event.all_day)
      return done('updated')
    }

    // A MyCoNet event: the host's edits (and anyone's time change) keep its Google copy in step
    if (action === 'saved') {
      const { data: me } = await supabase.from('user_profiles').select('role, lead_circles').eq('id', userId).maybeSingle()
      if (!canEditEvent(event, userId, me?.role ?? '', me?.lead_circles ?? [])) return { ok: false, error: 'Not your event', status: 403 }
    }
    const calId = await pushCalendar()
    if (!calId) return done('none')
    // Members-only events stay off the Google calendar (it may be public)
    if (!event.is_public) {
      if (!event.google_event_id) return done('none')
      await deleteEvent(calId, event.google_event_id)
      await mark(null, null)
      return done('removed')
    }
    if (action === 'times' && !event.google_event_id) return done('none')
    const g = await upsertEvent(calId, event, link)
    if (g.id !== event.google_event_id) await mark(g.id, g.iCalUID)
    return done(event.google_event_id ? 'updated' : 'added')
  } catch (e) {
    return done('none', (e as Error).message)
  }
}
