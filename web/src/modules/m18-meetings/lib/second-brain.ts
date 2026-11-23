/**
 * Meeting notes in the community's second brain (a GitHub repo) — server only.
 * On when instance/config.jsonc sets knowledge.repo (→ KNOWLEDGE_REPO, KNOWLEDGE_BRANCH) and the
 * SECOND_BRAIN_GITHUB_TOKEN secret exists: a fine-grained token for that repo only, Contents r/w.
 * Each meeting is a note (summary, Fireflies' notes, action items, tasks with their links) in
 * knowledge.meetingsFolder (→ KNOWLEDGE_MEETINGS_FOLDER), and its transcript in transcripts/ beside it,
 * linked from the note. Renamed meetings move: the old files are removed, never left as duplicates.
 */
import type { ActionItem, MeetingVisibility, NotesTask } from '../types'
import type { FirefliesNotes } from './fireflies'
import { withoutDate } from './title'

export const secondBrainOn = () => Boolean(process.env.KNOWLEDGE_REPO && process.env.SECOND_BRAIN_GITHUB_TOKEN)

/** Bumped when the note's shape changes: the sweep rewrites older notes */
export const NOTES_VERSION = 2

const meetingsFolder = () => (process.env.KNOWLEDGE_MEETINGS_FOLDER || 'operations/meetings').replace(/^\/+|\/+$/g, '')

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
  /** Fireflies' other notes (the meeting page's tabs) */
  fireflies: FirefliesNotes | null
  /** The transcript file, relative to the note; null without a transcript */
  transcriptLink: string | null
  tasks: NotesTask[]
  appUrl: string
}

const safe = (s: string) => s.replace(/[\\/:*?"<>|#^[\]]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Meeting'


/** "<folder>/2026-11-17 Kitchen lead handover.md": sorts by date in the folder */
export const notePath = (date: string, title: string) => `${meetingsFolder()}/${date} ${safe(withoutDate(title))}.md`

/** The note's transcript: "<folder>/transcripts/<same name>" */
export const transcriptPath = (path: string) => path.replace(/\/([^/]+)$/, '/transcripts/$1')

/** Where this community's agent may have written notes before: the folder (and its old name) */
export const legacyNotePaths = (date: string, titles: (string | null)[]) =>
  [...new Set(titles.filter((t): t is string => !!t).flatMap(t => [notePath(date, t), `operations/meetings/${date} ${safe(t)}.md`, `${meetingsFolder()}/${date} ${safe(t)}.md`]))]

export function buildNote(n: NoteInput): string {
  const meetingUrl = `${n.appUrl}/meetings/${n.id}`
  const fm = [
    '---',
    `title: ${JSON.stringify(withoutDate(n.title))}`,
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
    `# ${withoutDate(n.title)}`,
    '',
    `*${n.date} · ${n.circle ? `${n.circle.name} circle` : 'community-wide'}${n.visibility === 'circle' ? ' · circle only' : ''}. Notes from Fireflies, saved by the MyCoNet agent. [Open in the portal](${meetingUrl})${n.transcriptLink ? ` · [Transcript](<${n.transcriptLink}>)` : ''}.*`,
    '',
  ]
  const f = n.fireflies ?? {}
  if (n.attendees.length) lines.push(`**Who was there:** ${n.attendees.join(', ')}`, '')
  if (f.topics?.length) lines.push(`**Topics:** ${f.topics.join(' · ')}`, '')
  if (f.keywords?.length) lines.push(`**Keywords:** ${f.keywords.join(' · ')}`, '')
  lines.push('## Summary', '', n.summary?.trim() || '_No summary._', '')
  // Fireflies' own notes, as it wrote them (their headings become one level lower)
  const section = (heading: string, text?: string) => {
    if (text?.trim()) lines.push(`## ${heading}`, '', text.trim().replace(/^(#{1,4}) /gm, '$1## '), '')
  }
  section('Bullet points', [f.bullet_gist, f.shorthand_bullet].filter(Boolean).join('\n\n'))
  section('Notes', f.notes)
  section('Outline', f.outline)
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

/** The transcript file: the same front matter, then "[mm:ss] Speaker: text" lines */
export function buildTranscript(n: Pick<NoteInput, 'id' | 'title' | 'date' | 'circle' | 'circles' | 'visibility' | 'appUrl'>, transcript: string, noteName: string): string {
  return [
    '---',
    `title: ${JSON.stringify(`${n.title} (transcript)`)}`,
    `date: ${n.date}`,
    `circle: ${n.circle?.slug ?? 'community'}`,
    `circles: [${n.circles.map(c => c.slug).join(', ')}]`,
    `visibility: ${n.visibility === 'circle' ? 'circle' : 'members'}`,
    'source: myconet-meeting-transcript',
    `meeting: ${n.appUrl}/meetings/${n.id}`,
    `updated: ${new Date().toISOString().slice(0, 10)}`,
    '---',
    '',
    `# ${n.title} (transcript)`,
    '',
    `*Fireflies' transcript, saved by the MyCoNet agent. The notes: [${noteName.replace(/\.md$/, '')}](<../${noteName}>).*`,
    '',
    transcript.trim(),
    '',
  ].join('\n')
}

const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/')
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64')

/** The note as it is in the repo now (people may have edited it), without its front matter; null if none */
export async function readNote(path: string): Promise<string | null> {
  if (!secondBrainOn()) return null
  const branch = process.env.KNOWLEDGE_BRANCH || 'main'
  try {
    const res = await fetch(`https://api.github.com/repos/${process.env.KNOWLEDGE_REPO}/contents/${enc(path)}?ref=${encodeURIComponent(branch)}`, {
      headers: {
        Authorization: `Bearer ${process.env.SECOND_BRAIN_GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.raw+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'myconet-agent',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.text()).replace(/^---\n[\s\S]*?\n---\n/, '').trim() || null
  } catch {
    return null
  }
}

const gh = () => ({
  repo: process.env.KNOWLEDGE_REPO!,
  branch: process.env.KNOWLEDGE_BRANCH || 'main',
  headers: {
    Authorization: `Bearer ${process.env.SECOND_BRAIN_GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'myconet-agent',
  },
})

/** A file as it is in the repo (front matter included); null if there's none */
export async function readFile(path: string): Promise<string | null> {
  const { repo, branch, headers } = gh()
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${enc(path)}?ref=${encodeURIComponent(branch)}`, {
    headers: { ...headers, Accept: 'application/vnd.github.raw+json' }, cache: 'no-store',
  })
  return res.ok ? await res.text() : null
}

/** Every file path in the repo, in one call (to find a renamed meeting's old files cheaply) */
export async function listPaths(): Promise<Set<string>> {
  const { repo, branch, headers } = gh()
  const res = await fetch(`https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers })
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json() as { tree?: { path: string; type: string }[] }
  return new Set((data.tree ?? []).filter(t => t.type === 'blob').map(t => t.path))
}

/**
 * Removes a file the agent wrote earlier (a renamed meeting's old note); false if it's gone. Only the
 * agent's own files (source: myconet-…): a note a person wrote is never removed.
 */
export async function deleteFile(path: string, message: string): Promise<boolean> {
  const { repo, branch, headers } = gh()
  const api = `https://api.github.com/repos/${repo}/contents/${enc(path)}`
  const existing = await fetch(`${api}?ref=${encodeURIComponent(branch)}&t=${Date.now()}`, { headers })
  if (!existing.ok) return false
  const { sha: first, content } = (await existing.json()) as { sha?: string; content?: string }
  let sha = first
  const text = content ? Buffer.from(content, 'base64').toString('utf8') : ''
  if (!sha || !/^source: myconet-/m.test(text.split('\n---')[0])) return false
  let res: Response
  // As in saveNote (v4.121.0): a 409 names the file's current version; retry with it
  for (let attempt = 1; ; attempt++) {
    res = await fetch(api, {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, branch, sha, committer: { name: 'MyCoNet agent', email: 'myconet-agent@users.noreply.github.com' } }),
    })
    if (res.ok || attempt >= 3 || res.status !== 409) break
    sha = (await res.text()).match(/is at ([0-9a-f]{40})/)?.[1] ?? sha
    await new Promise(r => setTimeout(r, 300 * attempt))
  }
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return true
}

/** A file's current version on the branch, past any cache; undefined when it doesn't exist */
async function currentSha(api: string, branch: string, headers: Record<string, string>): Promise<string | undefined> {
  const r = await fetch(`${api}?ref=${encodeURIComponent(branch)}&t=${Date.now()}`, { headers })
  return r.ok ? ((await r.json()) as { sha?: string }).sha : undefined
}

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
  // The file's current version. Never from a cache: GitHub can serve a version that's a few seconds old right after
  // another write, and a save with it is refused (409)
  const existing = await fetch(`${api}?ref=${encodeURIComponent(branch)}&t=${Date.now()}`, { headers })
  let sha = existing.ok ? ((await existing.json()) as { sha?: string }).sha : undefined
  let res: Response
  // v4.121.0: when two writes meet (a circle's README and the second brain's map, two reviews at once), GitHub refuses
  // the second with 409 "is at <sha> but expected <sha>". Retry with the version it names, a few times.
  for (let attempt = 1; ; attempt++) {
    res = await fetch(api, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message, branch, content: b64(content), ...(sha ? { sha } : {}),
        committer: { name: 'MyCoNet agent', email: 'myconet-agent@users.noreply.github.com' },
      }),
    })
    if (res.ok || attempt >= 3 || (res.status !== 409 && res.status !== 422)) break
    const body = await res.text()
    const named = body.match(/is at ([0-9a-f]{40})/)?.[1]
    sha = named ?? (await currentSha(api, branch, headers)) ?? sha
    await new Promise(r => setTimeout(r, 300 * attempt))
  }
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json() as { content?: { html_url?: string } }
  return { url: data.content?.html_url ?? `https://github.com/${repo}/blob/${branch}/${enc(path)}` }
}
