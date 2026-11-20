import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'
import { deleteEvent, googleCalendarId, googlePushOn } from '@/modules/m14-events/lib/google-calendar'
import { pushEventToGoogle, type Google } from '@/modules/m14-events/lib/google-push'

// Event changes that also go to the linked Google calendar (see lib/google-calendar.ts, lib/google-push.ts):
//   { action: 'times', eventId, startsAt, endsAt }  anyone signed in: change the time here and in Google
//   { action: 'saved', eventId }                     after the host creates or edits an event: add/update it in Google
//   { action: 'delete', eventId }                    the host deletes it here and in Google
// The change in MyCoNet happens as the signed-in person (so the usual rules apply); the
// Google side never blocks it, it only reports `google` and maybe `googleError`.
type Body = { action?: string; eventId?: string; startsAt?: string; endsAt?: string | null }

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

  const r = await pushEventToGoogle(supabase, user.id, eventId, action as 'times' | 'saved', req.nextUrl.origin)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ ok: true, google: r.google, ...(r.googleError ? { googleError: r.googleError } : {}) })
}
