/**
 * "The community at a glance" — short tiles built from the community
 * blueprint's answers, so the landing page updates whenever the Blueprint does.
 * Each tile tries its keys in order and skips itself if none are filled in.
 */

import type { IconName } from '@/core/components/v4/icons'

export interface GlanceTile {
  icon: IconName
  label: string
  text: string
  href: string
}

const TILES: { icon: IconName; label: string; keys: string[]; href?: string }[] = [
  { icon: 'sprout', label: 'What we are',       keys: ['community_type', 'mission_statement', 'vision_statement'] },
  { icon: 'spark', label: 'Why we exist',      keys: ['purpose', 'why_world', 'dream_origin'] },
  { icon: 'pin', label: 'Where',             keys: ['location_setting', 'sites_considered', 'project_country'] },
  { icon: 'home', label: 'Land & homes',      keys: ['community_size', 'planned_homes', 'density_target'] },
  { icon: 'bowl', label: 'Food',              keys: ['food_systems', 'c_food_note'] },
  { icon: 'sun', label: 'Energy & water',    keys: ['energy_source', 'c_energy_note', 'water_fresh'] },
  { icon: 'scale', label: 'How we decide',     keys: ['governance_model', 'decision_method'], href: '/governance' },
  { icon: 'handshake', label: 'How we live',       keys: ['gatherings_internal', 'rituals', 'daily_rhythms'], href: '/calendar' },
  { icon: 'key', label: 'Who owns it',       keys: ['real_estate_model', 'legal_structure'] },
  { icon: 'compass', label: 'Our values',        keys: ['values', 'community_agreements'] },
  { icon: 'flag', label: 'Where we are now',  keys: ['where_now', 'build_timeline'] },
  { icon: 'hand', label: 'How to join',       keys: ['onboarding', 'recruitment_funnel'], href: '/join' },
]

/** Plain text, first sentence (or clause), trimmed to fit a tile. */
export function glanceText(raw: unknown, max = 170): string | null {
  if (typeof raw !== 'string') return null
  let s = raw.replace(/\s+/g, ' ').trim().replace(/^["“]|["”]$/g, '')
  if (s.length < 5) return null
  // First sentence: stop at ". " / "; " / " — " if it comes early enough
  const cut = s.search(/(?<=[a-z0-9)%])\.\s|;\s/i)
  if (cut > 40) s = s.slice(0, cut + 1)
  if (s.length > max) {
    s = s.slice(0, s.lastIndexOf(' ', max - 1))
    // Don't end inside an unfinished parenthetical — drop it instead
    const open = s.lastIndexOf('(')
    if (open > 40 && s.indexOf(')', open) === -1) s = s.slice(0, open)
    s = s.trim().replace(/[,;:—–-]+$/, '') + '…'
  }
  return s.replace(/;$/, '.')
}

export function buildGlanceTiles(answers: Record<string, unknown> | null | undefined): GlanceTile[] {
  if (!answers) return []
  const tiles: GlanceTile[] = []
  for (const t of TILES) {
    const text = t.keys.map(k => glanceText(answers[k])).find(Boolean)
    if (text) tiles.push({ icon: t.icon, label: t.label, text, href: t.href ?? '/blueprint' })
  }
  return tiles
}
