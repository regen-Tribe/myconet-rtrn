/**
 * The community's second brain (the GitHub repo in knowledge.repo) as a source for Ask and Do — server only.
 * On when the community sets "assistant": { "secondBrain": true } (→ ASSISTANT_SECOND_BRAIN) and the second
 * brain is set up (KNOWLEDGE_REPO + SECOND_BRAIN_GITHUB_TOKEN).
 *
 * Light on purpose (Workers free plan: 50 outside calls and little CPU per request): one call lists the repo
 * (kept 3 minutes), the notes whose path matches the question best are fetched (at most MAX_FETCH, each kept by
 * its git sha, so an unchanged note is never fetched twice), then each note's front matter decides who may read
 * it, and only the visible ones that match go to the AI.
 *
 * Who reads what (Oscar, 2026-11-20: "Tiered"):
 * - visitors: nothing from the brain
 * - joining members and up: notes marked `visibility: members` (meeting notes, circle boards and pages MyCoNet
 *   writes); `visibility: circle` only for that circle's people (its leads and subcircles, like Circle-only
 *   meetings) and admins
 * - circle leads, project leads and admins: also the notes with no visibility (the ones people write by hand) and
 *   `visibility: leads`
 * - any other visibility value: admins only
 * Transcripts, AGENTS.md, hidden folders and files over MAX_BYTES are never read.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { secondBrainOn } from '@/modules/m18-meetings/lib/second-brain'
import { terms } from './context'

export const brainOn = () => process.env.ASSISTANT_SECOND_BRAIN === 'on' && secondBrainOn()

const LIST_TTL_MS = 3 * 60_000
const MAX_BYTES = 150_000
const MAX_CACHED = 300

export interface BrainViewer { role: string; circles: string[] }
interface Entry { path: string; sha: string; size: number }
interface Note { path: string; title: string; visibility: string | null; circle: string | null; date: string | null; body: string }

let listing: { at: number; entries: Entry[] } | null = null
let listingPromise: Promise<Entry[]> | null = null
const notes = new Map<string, Note>() // by git sha: a changed note has a new sha

const headers = (raw = false) => ({
  Authorization: `Bearer ${process.env.SECOND_BRAIN_GITHUB_TOKEN}`,
  Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'myconet-agent',
})
const repo = () => process.env.KNOWLEDGE_REPO!
const branch = () => process.env.KNOWLEDGE_BRANCH || 'main'

const readable = (path: string) =>
  path.endsWith('.md') && path !== 'AGENTS.md' && !path.split('/').some(s => s === 'transcripts' || s.startsWith('.'))

async function list(): Promise<Entry[]> {
  if (listing && Date.now() - listing.at < LIST_TTL_MS) return listing.entries
  listingPromise ??= (async () => {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo()}/git/trees/${encodeURIComponent(branch())}?recursive=1`, { headers: headers() })
      if (!res.ok) throw new Error(`GitHub ${res.status}`)
      const data = await res.json() as { tree?: { path: string; type: string; sha: string; size?: number }[] }
      const entries = (data.tree ?? [])
        .filter(t => t.type === 'blob' && readable(t.path) && (t.size ?? 0) <= MAX_BYTES)
        .map(t => ({ path: t.path, sha: t.sha, size: t.size ?? 0 }))
      listing = { at: Date.now(), entries }
      return entries
    } finally {
      listingPromise = null
    }
  })()
  return listingPromise
}

function parse(path: string, text: string): Note {
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(text)
  const field = (k: string) => {
    const m = fm && new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(fm[1])
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
  }
  const body = (fm ? text.slice(fm[0].length) : text).trim()
  const file = path.split('/').pop()!.replace(/\.md$/, '')
  return { path, title: field('title') || file, visibility: field('visibility')?.toLowerCase() ?? null, circle: field('circle'), date: field('date') || /^(\d{4}-\d{2}-\d{2})/.exec(file)?.[1] || null, body }
}

async function fetchNote(e: Entry): Promise<Note | null> {
  const cached = notes.get(e.sha)
  if (cached) return cached
  const enc = e.path.split('/').map(encodeURIComponent).join('/')
  const res = await fetch(`https://api.github.com/repos/${repo()}/contents/${enc}?ref=${encodeURIComponent(branch())}`, { headers: headers(true) }).catch(() => null)
  if (!res?.ok) return null
  const note = parse(e.path, await res.text())
  if (notes.size >= MAX_CACHED) notes.delete(notes.keys().next().value!)
  notes.set(e.sha, note)
  return note
}

const LEADS = ['circle_lead', 'project_lead', 'admin']
const MEMBERS = ['joining', 'member', 'circle_lead', 'project_lead', 'advisor', 'admin']

/** May this person read this note? (the rules at the top) */
export function mayRead(n: Pick<Note, 'visibility' | 'circle'>, v: BrainViewer): boolean {
  if (!MEMBERS.includes(v.role)) return false
  if (v.role === 'admin') return true
  const vis = n.visibility
  if (vis === 'members' || vis === 'community' || vis === 'everyone') return true
  if (vis === 'circle') return !!n.circle && v.circles.includes(n.circle)
  if (vis === null || vis === 'leads') return LEADS.includes(v.role)
  return false
}

/** The person's role and circles (the ones they lead and the ones they're on a subcircle of), as in private.in_circle() */
export async function brainViewer(db: SupabaseClient, userId: string): Promise<BrainViewer> {
  const [{ data: p }, { data: teams }] = await Promise.all([
    db.from('user_profiles').select('role, lead_circles').eq('id', userId).maybeSingle(),
    db.from('org_unit_members').select('org_units(circle)').eq('user_id', userId),
  ])
  const teamCircles = (teams ?? []).map((t: any) => (Array.isArray(t.org_units) ? t.org_units[0] : t.org_units)?.circle).filter(Boolean) as string[]
  return { role: p?.role ?? 'explorer', circles: [...new Set([...((p?.lead_circles ?? []) as string[]), ...teamCircles])] }
}

const hits = (text: string, q: string[]) => { const t = text.toLowerCase(); return q.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0) }

/**
 * The second-brain notes this person may read that best match the conversation, as <source> blocks within
 * `budget` characters ('' when it's off, they're a visitor, or nothing matches). Never throws: a GitHub
 * hiccup just means no brain this time.
 */
export async function brainSources(conversation: string, viewer: BrainViewer | null, opts: { budget: number; maxFetch: number; perNote: number }): Promise<string> {
  if (!brainOn() || !viewer || !MEMBERS.includes(viewer.role)) return ''
  try {
    const entries = await list()
    const q = terms(conversation)
    // Candidates by path (folder + file name): most matching words first, then the newest
    const dated = (p: string) => /(\d{4}-\d{2}-\d{2})/.exec(p.split('/').pop()!)?.[1] ?? ''
    let ranked = entries.map(e => ({ e, score: hits(e.path.replace(/[-_/]/g, ' '), q) })).sort((a, b) => (b.score - a.score) || dated(b.e.path).localeCompare(dated(a.e.path)))
    // Nothing in the names matches: the newest meeting notes and the top-level pages (what's going on)
    if (!ranked.some(r => r.score > 0)) ranked = ranked.filter(r => dated(r.e.path) || !r.e.path.includes('/'))
    const fetched = (await Promise.all(ranked.slice(0, opts.maxFetch).map(r => fetchNote(r.e)))).filter((n): n is Note => !!n && mayRead(n, viewer))
    const scored = fetched.map(n => ({ n, score: hits(`${n.title} ${n.path}`, q) * 3 + hits(n.body, q) })).sort((a, b) => (b.score - a.score) || (b.n.date ?? '').localeCompare(a.n.date ?? ''))
    const out: string[] = []
    let left = opts.budget
    for (const { n } of scored) {
      const body = n.body.length > opts.perNote ? `${n.body.slice(0, opts.perNote)}\n[…the note goes on]` : n.body
      const block = `<source name="Second brain · ${n.title.replace(/"/g, "'")}" path="${n.path.replace(/"/g, "'")}"${n.date ? ` date="${n.date}"` : ''}>\n${body}\n</source>`
      if (block.length > left) continue
      left -= block.length
      out.push(block)
    }
    return out.join('\n\n')
  } catch (e) {
    console.error('[brain] skipped:', (e as Error).message)
    return ''
  }
}
