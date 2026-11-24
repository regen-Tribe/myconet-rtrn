import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * How complete someone's profile is, and what's missing first. The same eleven checks as the top bar's
 * old completion bar (AppTopBar › computeCompletion), so the number doesn't change when the bar moves.
 * With the design review the bar leaves the top bar: the menu's next step says "Finish your profile"
 * when it's the most useful thing (core/lib/menu-server.ts).
 */

export interface ProfileCompletion {
  pct: number
  /** Short words for what's missing, most useful first ("a photo", "what you offer") */
  missing: string[]
}

const CHECKS: [string, (p: Row, b: Bio, offers: number, requests: number) => boolean][] = [
  ['a photo', p => !!p?.avatar_url],
  ['your name', p => !!p?.first_name],
  ['a line about you', p => !!p?.headline],
  ['what you offer', (_p, _b, offers) => offers > 0],
  ['your skills', (_p, b) => (b?.skills?.length ?? 0) > 0],
  ['where you live', p => !!p?.city],
  ['what brings you here', p => (p?.user_types?.length ?? 0) > 0],
  ['your values', (_p, b) => !!b?.values_principles],
  ['your goals', (_p, b) => !!b?.goals],
  ['what you’re looking for', (_p, _b, _o, requests) => requests > 0],
  ['places you’re travelling', (_p, b) => (b?.places_traveling?.length ?? 0) > 0],
]

type Row = { first_name?: string | null; avatar_url?: string | null; headline?: string | null; city?: string | null; user_types?: string[] | null } | null
type Bio = { values_principles?: string | null; skills?: string[] | null; goals?: string | null; places_traveling?: unknown[] | null } | null

export function computeProfileCompletion(p: Row, b: Bio, offers: number, requests: number): ProfileCompletion {
  const results = CHECKS.map(([label, ok]) => [label, ok(p, b, offers, requests)] as const)
  const done = results.filter(([, ok]) => ok).length
  return { pct: Math.round(done / CHECKS.length * 100), missing: results.filter(([, ok]) => !ok).map(([label]) => label) }
}

export async function loadProfileCompletion(supabase: SupabaseClient, userId: string): Promise<ProfileCompletion> {
  const [p, b, offers, requests] = await Promise.all([
    supabase.from('user_profiles').select('first_name, avatar_url, headline, city, user_types').eq('id', userId).maybeSingle(),
    supabase.from('user_bio').select('values_principles, skills, goals, places_traveling').eq('user_id', userId).maybeSingle(),
    supabase.from('user_offers').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),
    supabase.from('user_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),
  ])
  return computeProfileCompletion(p.data as Row, b.data as Bio, offers.count ?? 0, requests.count ?? 0)
}

/** "Add a photo and what you offer": the first two missing things, as one short line */
export function missingLine(c: ProfileCompletion): string {
  const [a, b] = c.missing
  if (!a) return 'Your profile is complete'
  return `Add ${a}${b ? ` and ${b}` : ''}`
}
