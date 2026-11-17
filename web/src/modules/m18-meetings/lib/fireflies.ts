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
