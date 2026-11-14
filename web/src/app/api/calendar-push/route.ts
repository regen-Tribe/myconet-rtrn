import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'
import { EVENT_SELECT, toEvent } from '@/modules/m14-events/lib/queries'
import { canEditEvent } from '@/modules/m14-events/lib/permissions'
import { deleteEvent, googleCalendarId, googlePushOn, moveFeedEvent, upsertEvent } from '@/modules/m14-events/lib/google-calendar'

// Event changes that also go to the linked Google calendar (see lib/google-calendar.ts):
//   { action: 'times', eventId, startsAt, endsAt }  anyone signed in: change the time here and in Google
//   { action: 'saved', eventId }                     after the host creates or edits an event: add/update it in Google
//   { action: 'delete', eventId }                    the host deletes it here and in Google
// The change in MyCoNet happens as the signed-in person (so the usual rules apply); the
// Google side never blocks it, it only reports `google` and maybe `googleError`.
type Body = { action?: string; eventId?: string; startsAt?: string; endsAt?: string | null }
type Google = 'updated' | 'added' | 'removed' | 'off' | 'none'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const { action, eventId } = body
  if (!eventId || !['times', 'saved', 'delete'].includes(action ?? '')) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

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
  const link = `${req.nextUrl.origin}/events?event=${eventId}`
  const done = (google: Google, googleError?: string) => NextResponse.json({ ok: true, google, ...(googleError ? { googleError } : {}) })

  if (action === 'delete') {
    const { data: row } = await supabase.from('events').select('google_event_id').eq('id', eventId).maybeSingle()
    const { data: gone, error } = await supabase.from('events').delete().eq('id', eventId).select('id')
    if (error || !gone?.length) return NextResponse.json({ error: 'That event couldn’t be deleted.' }, { status: 403 })
    if (!row?.google_event_id || !googlePushOn()) return done(googlePushOn() ? 'none' : 'off')
    try {
      const calId = await pushCalendar()
      if (!calId) return done('none')
      await deleteEvent(calId, row.google_event_id)
      return done('removed')
    } catch (e) { return done('none', (e as Error).message) }
  }

  if (action === 'times') {
    const { error } = await supabase.rpc('event_set_times', { p_event_id: eventId, p_starts_at: body.startsAt, p_ends_at: body.endsAt ?? null })
    if (error) return NextResponse.json({ error: error.code === '42501' ? 'Sign in to change event times.' : error.message }, { status: 400 })
  }

  const { data } = await supabase.from('events').select(`${EVENT_SELECT}, external_uid, google_event_id`).eq('id', eventId).maybeSingle()
  if (!data) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
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
      const { data: me } = await supabase.from('user_profiles').select('role, lead_circles').eq('id', user.id).maybeSingle()
      if (!canEditEvent(event, user.id, me?.role ?? '', me?.lead_circles ?? [])) return NextResponse.json({ error: 'Not your event' }, { status: 403 })
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
