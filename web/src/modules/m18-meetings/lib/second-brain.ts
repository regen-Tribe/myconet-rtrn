/**
 * Meeting notes in the community's second brain (a GitHub repo) — server only.
 * On when instance/config.jsonc sets knowledge.repo (→ KNOWLEDGE_REPO, KNOWLEDGE_BRANCH) and the
 * SECOND_BRAIN_GITHUB_TOKEN secret exists: a fine-grained token for that repo only, Contents r/w.
 * The note has the summary and action items with links to their tasks; never the transcript.
 */
import type { ActionItem, MeetingVisibility, NotesTask } from '../types'

export const secondBrainOn = () => Boolean(process.env.KNOWLEDGE_REPO && process.env.SECOND_BRAIN_GITHUB_TOKEN)


export interface NoteInput {
  id: string
  title: string
  date: string            // local YYYY-MM-DD
  /** The meeting's main circle; null = community-wide */
  circle: { slug: string; name: string } | null
  /** Every circle with a task from this meeting (and the main one) */
  circles: { slug: string; name: string }[]
  visibility: MeetingVisibility
  attendees: string[]
  summary: string | null
  action_items: ActionItem[]
  tasks: NotesTask[]
  appUrl: string
}

const safe = (s: string) => s.replace(/[\\/:*?"<>|#^[\]]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Meeting'

export const notePath = (date: string, title: string) => `operations/meetings/${date} ${safe(title)}.md`

export function buildNote(n: NoteInput): string {
  const meetingUrl = `${n.appUrl}/meetings/${n.id}`
  const fm = [
    '---',
    `title: ${JSON.stringify(n.title)}`,
    `date: ${n.date}`,
    `circle: ${n.circle?.slug ?? 'community'}`,
    `circles: [${n.circles.map(c => c.slug).join(', ')}]`,
    // Who may read it: everyone in the community, or only the circle (Circle only in the portal)
    `visibility: ${n.visibility === 'circle' ? 'circle' : 'members'}`,
    'source: myconet-meeting',
    `meeting: ${meetingUrl}`,
    `updated: ${new Date().toISOString().slice(0, 10)}`,
    '---',
  ]
  const lines = [
    ...fm,
    '',
    `# ${n.title}`,
    '',
    `*${n.date} · ${n.circle ? `${n.circle.name} circle` : 'community-wide'}${n.visibility === 'circle' ? ' · circle only' : ''}. Notes from Fireflies, saved by the MyCoNet agent. [Open in the portal](${meetingUrl}) for the full transcript.*`,
    '',
  ]
  if (n.attendees.length) lines.push(`**Who was there:** ${n.attendees.join(', ')}`, '')
  lines.push('## Summary', '', n.summary?.trim() || '_No summary._', '')
  lines.push('## Tasks on the board', '')
  if (n.tasks.length) {
    // Grouped by circle when the meeting touched several
    const groups = new Map<string, NotesTask[]>()
    for (const t of n.tasks) groups.set(t.circleName, [...(groups.get(t.circleName) ?? []), t])
    for (const [circleName, list] of groups) {
      if (groups.size > 1) lines.push(`### ${circleName}`, '')
      for (const t of list) {
        const who = t.person ? `**${t.person}**${t.onMyCoNet ? '' : ' (not on MyCoNet yet)'}: ` : ''
        lines.push(`- ${who}${t.title}${t.when ? ` · ${t.when}` : ''} → [on the board](${t.url})${t.draft ? ' (draft)' : ''}`)
      }
      if (groups.size > 1) lines.push('')
    }
  } else {
    lines.push('_No tasks came out of this meeting._')
  }
  lines.push('')
  if (n.action_items.length) {
    lines.push('## Action items (as Fireflies wrote them)', '')
    for (const it of n.action_items) lines.push(`- ${it.speaker ? `**${it.speaker}**: ` : ''}${it.text}`)
    lines.push('')
  }
  return lines.join('\n')
}

const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/')
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64')

/** Creates or updates the note; returns its GitHub link */
export async function saveNote(path: string, content: string, message: string): Promise<{ url: string }> {
  const repo = process.env.KNOWLEDGE_REPO!
  const branch = process.env.KNOWLEDGE_BRANCH || 'main'
  const headers = {
    Authorization: `Bearer ${process.env.SECOND_BRAIN_GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'myconet-agent',
  }
  const api = `https://api.github.com/repos/${repo}/contents/${enc(path)}`
  const existing = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers })
  const sha = existing.ok ? ((await existing.json()) as { sha?: string }).sha : undefined
  const res = await fetch(api, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message, branch, content: b64(content), ...(sha ? { sha } : {}),
      committer: { name: 'MyCoNet agent', email: 'myconet-agent@users.noreply.github.com' },
    }),
  })
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json() as { content?: { html_url?: string } }
  return { url: data.content?.html_url ?? `https://github.com/${repo}/blob/${branch}/${enc(path)}` }
}
