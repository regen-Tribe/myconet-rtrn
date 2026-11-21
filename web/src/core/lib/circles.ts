import { DESIGN } from './instance'

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
  /** Its glyph on the circle seal (core/components/v4/circle-glyphs.ts); null shows the initial */
  icon?: string | null
}

export type CircleSlug = string

export interface CircleMeta { label: string; color: string; emoji: string; icon: string | null }

export interface CircleSet {
  /** Active circles, in order: use for pickers, filters and lists. */
  list: Circle[]
  /** Slugs of `list`. */
  slugs: CircleSlug[]
  /** True for any known circle, including retired ones (old projects keep theirs). */
  has(slug: unknown): slug is CircleSlug
  /** The full row, including retired circles. */
  get(slug: CircleSlug): Circle | undefined
  meta(slug: CircleSlug): CircleMeta
  /** "🌱 Ecology"; in the v4 look just "Ecology" (the seal is the circle's mark, never an emoji) */
  label(slug: CircleSlug): string
}

export const CIRCLE_SELECT = 'slug, name, emoji, color, sort_order, archived_at, leads_to_assign, is_steward, icon'
/** Before the `circles.icon` migration (v4.79.0) */
export const CIRCLE_SELECT_NO_ICON = 'slug, name, emoji, color, sort_order, archived_at, leads_to_assign, is_steward'

/**
 * True when a write failed only because this community hasn't applied the `circles.icon` migration yet
 * (PostgREST: column not in the schema cache; Postgres: undefined column). The glyph is then skipped quietly.
 */
export function isMissingIconColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === 'PGRST204' || error.code === '42703' || /column.*icon|'icon' column/i.test(error.message ?? '')
}

const UNKNOWN: Omit<CircleMeta, 'label'> = { color: '#64748b', emoji: DESIGN === 'v4' ? '' : '◯', icon: null }

export function circleSet(rows: Circle[]): CircleSet {
  const all = [...rows].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  const bySlug = new Map(all.map(c => [c.slug, c]))
  const list = all.filter(c => !c.archived_at)
  const meta = (slug: CircleSlug): CircleMeta => {
    const c = bySlug.get(slug)
    // v4: no emoji in text; the circle's seal (CircleSeal) shows where it has room
    return c ? { label: c.name, color: c.color, emoji: DESIGN === 'v4' ? '' : c.emoji, icon: c.icon ?? null } : { label: slug, ...UNKNOWN }
  }
  return {
    list,
    slugs: list.map(c => c.slug),
    has: (slug): slug is CircleSlug => typeof slug === 'string' && bySlug.has(slug),
    get: slug => bySlug.get(slug),
    meta,
    label: slug => { const m = meta(slug); return m.emoji ? `${m.emoji} ${m.label}` : m.label },
  }
}
