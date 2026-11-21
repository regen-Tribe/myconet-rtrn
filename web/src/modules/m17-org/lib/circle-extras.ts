/**
 * What the v4 Circles pages show beyond the org chart (v4.63.0) — server only: people's photos, each circle's
 * open tasks, its coming meetings (calendar events tagged with the circle), its meeting notes, and its manuals &
 * guides (the notes people keep in the circle's folder of the second brain). RLS decides what each person sees.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { listPaths, secondBrainOn } from '@/modules/m18-meetings/lib/second-brain'

export type CircleTask = {
  id: string; title: string; status: string; due_date: string | null; circle: string | null
  assignee_id: string | null; assignee_name: string | null; project_id: string | null; project_title: string | null
  /** The subcircle it's given to (org_units id) */
  team_id: string | null
}
export type CircleEvent = { id: string; title: string; starts_at: string; all_day: boolean; circle: string; location: string | null }
export type CircleMeeting = { id: string; title: string | null; meeting_date: string | null; circle: string; team_id?: string | null }
/** A note in the circle's folder. `group` is its topic (first subfolder, null at the top), `sub` any deeper folders */
export type CircleGuide = { path: string; name: string; group: string | null; sub: string | null }

/** "running-at-100" → "Running at 100" */
export const readableName = (s: string) => { const t = s.replace(/\.md$/, '').replace(/[-_]+/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1) }

export type CircleExtras = {
  /** user id → photo URL */
  avatars: Record<string, string>
  tasks: CircleTask[]
  upcoming: CircleEvent[]
  meetings: CircleMeeting[]
  /** The open circle's guides; null when no second brain is set up (or no circle is open) */
  guides: CircleGuide[] | null
  /** The open circle's folder in the second brain */
  guideFolder: string | null
}

const clean = (p: string) => p.replace(/^\/+|\/+$/g, '')

/** The circle's folder in the second brain: circles.brain_folder, else its slug */
export async function circleFolderOf(supabase: SupabaseClient, slug: string): Promise<string> {
  const { data } = await supabase.from('circles').select('brain_folder').eq('slug', slug).maybeSingle()
  return clean((data?.brain_folder as string | null) || slug)
}

/** A path is one of this circle's guides: a markdown note in its folder that isn't its index, board or a meeting */
export function isGuidePath(path: string, folder: string): boolean {
  if (!path.startsWith(`${folder}/`) || !path.endsWith('.md') || path.includes('..')) return false
  const rest = path.slice(folder.length + 1)
  if (/^(README|board)\.md$/i.test(rest) || /(^|\/)transcripts\//.test(rest)) return false
  const skip = [process.env.KNOWLEDGE_MEETINGS_FOLDER, process.env.KNOWLEDGE_BOARD_FOLDER].filter((x): x is string => !!x).map(clean)
  return !skip.some(s => path.startsWith(`${s}/`))
}

export async function loadCircleExtras(supabase: SupabaseClient, opts: { signedIn: boolean; canReadGuides: boolean; peopleIds: string[]; openCircle: string | null }): Promise<CircleExtras> {
  const now = new Date().toISOString()
  const [av, tasks, events, meetings] = await Promise.all([
    opts.peopleIds.length ? supabase.from('user_profiles').select('id, avatar_url').in('id', opts.peopleIds) : Promise.resolve({ data: [] as any[] }),
    opts.signedIn
      ? supabase.from('deliverables').select('id, title, status, due_date, circle, assignee_id, assignee_name, project_id, team_id, projects(title, circle)').neq('status', 'done').order('due_date', { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('events').select('id, title, starts_at, all_day, circle, location').not('circle', 'is', null).gte('starts_at', now).order('starts_at').limit(300),
    opts.signedIn
      ? supabase.from('meeting_transcripts').select('id, title, meeting_date, circle').not('circle', 'is', null).order('meeting_date', { ascending: false, nullsFirst: false }).limit(500)
      : Promise.resolve({ data: [] as any[] }),
  ])

  // Which meetings belong to a subcircle (v4.108.0), read on its own: a community without the column keeps its pages
  const teamOf = new Map<string, string>()
  if (opts.signedIn) {
    const { data, error } = await supabase.from('meeting_transcripts').select('id, team_id').not('team_id', 'is', null).limit(500)
    if (!error) for (const r of data ?? []) teamOf.set(r.id as string, r.team_id as string)
  }

  const avatars: Record<string, string> = {}
  for (const r of av.data ?? []) if (r.avatar_url) avatars[r.id] = r.avatar_url

  let guides: CircleGuide[] | null = null
  let guideFolder: string | null = null
  if (opts.openCircle && opts.canReadGuides && secondBrainOn()) {
    guideFolder = await circleFolderOf(supabase, opts.openCircle)
    try {
      const folder = guideFolder
      guides = [...await listPaths()].filter(p => isGuidePath(p, folder)).map(path => {
        const parts = path.slice(folder.length + 1).split('/')
        const file = parts.pop()!
        const group = parts.length ? readableName(parts[0]) : null
        const sub = parts.length > 1 ? parts.slice(1).map(readableName).join(' / ') : null
        // A topic's README is its introduction
        const name = /^README\.md$/i.test(file) ? `About ${group?.toLowerCase() ?? 'this circle'}` : readableName(file)
        return { path, name, group, sub }
      }).sort((a, b) => (a.group ?? '').localeCompare(b.group ?? '') || Number(b.name.startsWith('About ')) - Number(a.name.startsWith('About ')) || (a.sub ?? '').localeCompare(b.sub ?? '') || a.name.localeCompare(b.name))
    } catch { guides = null }
  }

  return {
    avatars,
    tasks: (tasks.data ?? []).map((d: any) => {
      const proj = Array.isArray(d.projects) ? d.projects[0] : d.projects
      return {
        id: d.id, title: d.title, status: d.status, due_date: d.due_date ?? null, circle: d.circle ?? proj?.circle ?? null,
        assignee_id: d.assignee_id ?? null, assignee_name: d.assignee_name ?? null, project_id: d.project_id ?? null, project_title: proj?.title ?? null, team_id: d.team_id ?? null,
      }
    }),
    upcoming: (events.data ?? []) as CircleEvent[],
    meetings: ((meetings.data ?? []) as CircleMeeting[]).map(m => ({ ...m, team_id: teamOf.get(m.id) ?? null })),
    guides,
    guideFolder,
  }
}
