/**
 * A community's circles, from the `circles` table (each community defines its own
 * during setup). Client components get them with `useCircles()`; server code loads
 * them with `loadCircles()` (core/lib/circles-server.ts).
 */

export interface Circle {
  slug: string
  name: string
  emoji: string
  color: string
  sort_order: number
  archived_at: string | null
  /** A lead's name typed in setup or on the org chart (they may not be on the portal) */
  leads_to_assign: string | null
  /** The circle that looks after every circle (shown at the top of the org chart) */
  is_steward: boolean
}

export type CircleSlug = string

export interface CircleMeta { label: string; color: string; emoji: string }

export interface CircleSet {
  /** Active circles, in order: use for pickers, filters and lists. */
  list: Circle[]
  /** Slugs of `list`. */
  slugs: CircleSlug[]
  /** True for any known circle, including retired ones (old projects keep theirs). */
  has(slug: unknown): slug is CircleSlug
  meta(slug: CircleSlug): CircleMeta
  /** "🌱 Ecology" */
  label(slug: CircleSlug): string
}

export const CIRCLE_SELECT = 'slug, name, emoji, color, sort_order, archived_at, leads_to_assign, is_steward'

const UNKNOWN: Omit<CircleMeta, 'label'> = { color: '#64748b', emoji: '◯' }

export function circleSet(rows: Circle[]): CircleSet {
  const all = [...rows].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  const bySlug = new Map(all.map(c => [c.slug, c]))
  const list = all.filter(c => !c.archived_at)
  const meta = (slug: CircleSlug): CircleMeta => {
    const c = bySlug.get(slug)
    return c ? { label: c.name, color: c.color, emoji: c.emoji } : { label: slug, ...UNKNOWN }
  }
  return {
    list,
    slugs: list.map(c => c.slug),
    has: (slug): slug is CircleSlug => typeof slug === 'string' && bySlug.has(slug),
    meta,
    label: slug => { const m = meta(slug); return `${m.emoji} ${m.label}` },
  }
}
