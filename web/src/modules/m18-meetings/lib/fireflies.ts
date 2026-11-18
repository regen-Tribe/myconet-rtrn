/**
 * Fireflies.ai (transcription) — server only. FIREFLIES_API_KEY is a Cloudflare secret.
 * uploadAudio sends a recording by URL; Fireflies calls /api/fireflies-webhook when it's done,
 * and fetchTranscript reads the result.
 */

async function graphql<T>(query: string, variables: object): Promise<T> {
  const key = process.env.FIREFLIES_API_KEY
  if (!key) throw new Error('FIREFLIES_API_KEY not configured')
  const res = await fetch('https://api.fireflies.ai/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Fireflies ${res.status}: ${await res.text()}`)
  const json = await res.json() as { data: T; errors?: { message: string }[] }
  if (json.errors?.length) throw new Error(`Fireflies GraphQL: ${json.errors[0].message}`)
  return json.data
}

export async function uploadAudio(input: {
  url: string; title: string; clientReferenceId: string; webhook: string
  attendees?: { displayName: string }[]; meetingDate?: string | null
}): Promise<{ success: boolean; title: string; message: string }> {
  const data = await graphql<{ uploadAudio: { success: boolean; title: string; message: string } }>(
    'mutation($input: AudioUploadInput) { uploadAudio(input: $input) { success title message } }',
    {
      input: {
        url: input.url, title: input.title.slice(0, 256), client_reference_id: input.clientReferenceId, webhook: input.webhook,
        ...(input.attendees?.length ? { attendees: input.attendees } : {}),
        ...(input.meetingDate ? { meeting_date: input.meetingDate } : {}),
      },
    },
  )
  return data.uploadAudio
}

export interface Transcript {
  id: string; title: string | null; date: number | null; duration: number | null
  speakers: { name: string }[] | null
  sentences: { speaker_name: string; text: string; start_time: number }[]
  summary: { action_items: string | null; overview: string | null; short_summary: string | null } | null
}

export async function fetchTranscript(id: string): Promise<Transcript> {
  const data = await graphql<{ transcript: Transcript | null }>(`query($id: String!) { transcript(id: $id) {
      id title date duration
      speakers { name }
      sentences { speaker_name text start_time }
      summary { action_items overview short_summary }
    } }`, { id })
  if (!data.transcript) throw new Error(`No Fireflies transcript for ${id}`)
  return data.transcript
}

/** The rest of Fireflies' notes: the meeting page's tabs (meeting_transcripts.fireflies_notes) */
export interface FirefliesNotes {
  notes?: string; outline?: string; shorthand_bullet?: string; bullet_gist?: string
  keywords?: string[]; topics?: string[]
}

const list = (v: unknown): string[] | undefined => {
  const items = Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(/[,\n]/) : []
  const out = items.map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
  return out.length ? out : undefined
}
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/**
 * A query of its own, so a field Fireflies doesn't fill (or a plan without it) never stops the
 * transcript and summary coming in. Null when there's nothing yet or Fireflies refused.
 */
export async function fetchFirefliesNotes(id: string): Promise<FirefliesNotes | null> {
  try {
    const data = await graphql<{ transcript: { summary: Record<string, unknown> | null } | null }>(`query($id: String!) { transcript(id: $id) {
        summary { notes outline shorthand_bullet bullet_gist keywords topics_discussed }
      } }`, { id })
    const s = data.transcript?.summary
    if (!s) return null
    const notes: FirefliesNotes = {
      notes: text(s.notes), outline: text(s.outline), shorthand_bullet: text(s.shorthand_bullet),
      bullet_gist: text(s.bullet_gist), keywords: list(s.keywords), topics: list(s.topics_discussed),
    }
    return Object.values(notes).some(Boolean) ? notes : null
  } catch {
    return null
  }
}

/** Webhooks V2 signature: X-Hub-Signature = "sha256=" + hex HMAC-SHA256 of the raw body */
export async function verifyFirefliesSignature(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(raw)))
  const expected = 'sha256=' + Array.from(mac, b => b.toString(16).padStart(2, '0')).join('')
  const got = header.trim().toLowerCase()
  // Constant time over the expected length
  let diff = got.length ^ expected.length
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ (got.charCodeAt(i) || 0)
  return diff === 0
}

/** What a Fireflies transcript fills in on meeting_transcripts (all three webhooks) */
export function transcriptFields(t: Transcript) {
  return {
    status: 'done' as const,
    summary: t.summary?.overview || t.summary?.short_summary || null,
    action_items: parseActionItems(t.summary?.action_items),
    transcript: buildTranscriptText(t.sentences),
    ...(t.date ? { meeting_date: new Date(t.date).toISOString() } : {}),
  }
}

/** "[mm:ss] Speaker: text", one line per sentence */
export function buildTranscriptText(sentences: Transcript['sentences']): string {
  return (sentences ?? []).map(s => {
    const m = Math.floor(s.start_time / 60), sec = Math.floor(s.start_time % 60)
    return `[${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}] ${s.speaker_name}: ${s.text}`
  }).join('\n')
}

/** Fireflies' action items come as markdown: "**Name**" headings, then "- item" lines */
export function parseActionItems(text: string | null | undefined): { text: string; speaker: string | null }[] {
  if (!text || !text.trim()) return []
  const out: { text: string; speaker: string | null }[] = []
  let speaker: string | null = null
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    const heading = line.match(/^\*{1,2}(.+?)\*{1,2}:?$/)
    if (heading) { speaker = heading[1].trim(); continue }
    const item = line.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim()
    if (item) out.push({ text: item, speaker })
  }
  return out
}
