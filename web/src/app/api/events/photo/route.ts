import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'

// Reads a photo of the community's schedule board and returns the events on it, for the
// review in PhotoImportModal (nothing is added here). Who: public.can_add_events_from_photo().
// Flash with low reasoning reads a board in about 2–3 minutes; M3 took longer and returned nothing.
const MODEL = 'MiniMax-M3.1-Flash'
const MAX_IMAGE_CHARS = 6_000_000
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export interface PhotoEvent {
  day: (typeof DAYS)[number]
  title: string
  start: string
  end: string | null
  location: string | null
  host: string | null
  unsure: boolean
}

function prompt(names: string[]): string {
  return `This is a photo of a community's weekly schedule board (Monday to Sunday). Read every event on it: sticky notes, and anything written in.
Return JSON only: {"events":[{"day":"Mon|Tue|Wed|Thu|Fri|Sat|Sun","title":"...","start":"HH:MM" (24h),"end":"HH:MM" or null,"location":string or null,"host":string or null,"unsure":true if any part is hard to read}]}
Use the time written on the note; if none, use the row's time on the left. "2pm" means 14:00; "7:30" in the evening rows means 19:30. A range like "3-5pm" gives start and end; a length like "1h" or "30-60 min" gives the end from the start (use the shorter).
Skip the shared daily slots written across several days (morning movement, breakfast, sync-up, lunch, dinner, brunch); only return the notes and one-off events.
A person's name on a note ("with Luis", "Dani") is the host; a place ("Honey House", "Yoga Shala") is the location. Keep titles short, without the time.${names.length ? `
Names already used in this community (use these spellings when a note matches one): ${names.join(', ')}.` : ''}`
}

const hhmm = (v: unknown): string | null => {
  const m = typeof v === 'string' ? v.trim().match(/^(\d{1,2}):(\d{2})$/) : null
  return m && +m[1] < 24 && +m[2] < 60 ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}
const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

function parse(content: string): PhotoEvent[] | null {
  const c = content.replace(/<think>[\s\S]*?<\/think>/g, '')
  const start = c.indexOf('{')
  const end = c.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let raw: { events?: unknown }
  try { raw = JSON.parse(c.slice(start, end + 1)) } catch { return null }
  if (!Array.isArray(raw.events)) return null
  const out: PhotoEvent[] = []
  for (const e of raw.events as Record<string, unknown>[]) {
    const day = DAYS.find(d => d === e?.day)
    const title = text(e?.title, 300)
    const start = hhmm(e?.start)
    if (!day || !title || !start) continue
    out.push({ day, title, start, end: hhmm(e.end), location: text(e.location, 200), host: text(e.host, 100), unsure: e.unsure === true })
  }
  return out
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { data: allowed } = await supabase.rpc('can_add_events_from_photo')
  if (!allowed) return NextResponse.json({ error: 'Only admins and the circle that hosts the calendar can add events from a photo.' }, { status: 403 })

  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'MINIMAX_API_KEY not configured.' }, { status: 500 })

  let body: { image?: unknown; names?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const image = body.image
  if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: 'Send one photo (JPEG, PNG or WebP, up to about 4 MB).' }, { status: 400 })
  }
  const names = Array.isArray(body.names)
    ? [...new Set(body.names.filter((n): n is string => typeof n === 'string').map(n => n.trim().slice(0, 80)).filter(Boolean))].slice(0, 150)
    : []

  const call = () => fetch('https://api.minimax.io/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: 'low',
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt(names) }, { type: 'image_url', image_url: { url: image } }] }],
      max_completion_tokens: 16_000,
      temperature: 0.2,
    }),
  })

  let res: Response
  try {
    res = await call()
    // MiniMax 524 = their gateway timed out — wait 3s and retry once
    if (res.status === 524) { await new Promise(r => setTimeout(r, 3000)); res = await call() }
  } catch (e) {
    return NextResponse.json({ error: `Network error: ${(e as Error).message}` }, { status: 502 })
  }
  if (res.status === 429) return NextResponse.json({ error: 'The AI is busy (rate limit). Try again in a while.' }, { status: 429 })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return NextResponse.json({ error: `The AI couldn’t read the photo (${res.status}). ${detail.slice(0, 200)}` }, { status: 502 })
  }
  const data = await res.json().catch(() => ({})) as { choices?: { message?: { content?: string } }[] }
  const events = parse(data.choices?.[0]?.message?.content ?? '')
  if (!events) return NextResponse.json({ error: 'The AI’s answer couldn’t be read. Try again, or with a sharper photo.' }, { status: 502 })
  return NextResponse.json({ events })
}
