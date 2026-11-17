import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { moduleOn } from '@/core/lib/modules'
import { uploadAudio } from '@/modules/m18-meetings/lib/fireflies'

// After the browser puts a recording in meeting-audio/<user id>/…: records the meeting and
// sends Fireflies a signed link (2 h). Fireflies calls /api/fireflies-webhook when it's transcribed.
export async function POST(req: NextRequest) {
  if (!moduleOn('meetings')) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (!isJoiningOrAbove(profile?.role ?? 'explorer')) return NextResponse.json({ error: 'Joining members and above can upload recordings.' }, { status: 403 })

  let body: { audio_path?: unknown; title?: unknown; attendees?: unknown; meeting_date?: unknown; circle?: unknown; visibility?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }
  const audioPath = typeof body.audio_path === 'string' ? body.audio_path : ''
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 300) : 'Untitled meeting'
  const attendees = Array.isArray(body.attendees) ? body.attendees.filter((a): a is string => typeof a === 'string').slice(0, 50) : []
  const meetingDate = typeof body.meeting_date === 'string' && body.meeting_date ? body.meeting_date : null
  // Optional: without one, the agent chooses the circle from what was said
  const circleAsked = typeof body.circle === 'string' && body.circle ? body.circle : null
  const { data: circleRow } = circleAsked
    ? await supabase.from('circles').select('slug').eq('slug', circleAsked).is('archived_at', null).maybeSingle()
    : { data: null }
  const circle = circleRow?.slug ?? null
  const visibility = body.visibility === 'circle' && circle ? 'circle' : 'community'
  if (!audioPath || !audioPath.startsWith(`${user.id}/`)) return NextResponse.json({ error: 'Invalid audio path' }, { status: 400 })

  const admin = createServiceClient()
  const { data: row, error } = await admin.from('meeting_transcripts')
    .insert({ title, attendees, audio_path: audioPath, meeting_date: meetingDate, created_by: user.id, status: 'processing', circle, circle_source: circle ? 'person' : null, visibility })
    .select('id').single()
  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 })

  const { data: signed, error: signErr } = await admin.storage.from('meeting-audio').createSignedUrl(audioPath, 7200)
  if (signErr || !signed?.signedUrl) {
    await admin.from('meeting_transcripts').update({ status: 'error', error: 'Could not sign audio URL' }).eq('id', row.id)
    return NextResponse.json({ error: 'Could not sign audio URL' }, { status: 500 })
  }

  const secret = process.env.FIREFLIES_WEBHOOK_SECRET || ''
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const webhook = `${origin}/api/fireflies-webhook${secret ? `?key=${encodeURIComponent(secret)}` : ''}`
  try {
    const r = await uploadAudio({ url: signed.signedUrl, title, clientReferenceId: row.id, webhook, attendees: attendees.map(a => ({ displayName: a })), meetingDate })
    if (!r.success) throw new Error(r.message || 'uploadAudio returned success=false')
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Fireflies upload failed'
    await admin.from('meeting_transcripts').update({ status: 'error', error: message }).eq('id', row.id)
    return NextResponse.json({ error: message }, { status: 502 })
  }
  return NextResponse.json({ id: row.id })
}
