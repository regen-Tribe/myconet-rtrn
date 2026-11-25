/**
 * One list of groups and pills for two questions: "What are you good at?" (user_bio.skills) and "What are you
 * curious about?" (user_bio.interests). The same words in both, so a skill meets a curiosity exactly when matching
 * (modules/m01-network/lib/match-score.ts). Sonia, 25 Nov 2026; design/decisions.md #89, #90.
 *
 * Pills are stored as plain text, as before: anything typed by hand still works and still matches by similar
 * spelling. The groups are for picking, and for "also into Land and food" when two people pick different pills of
 * one group. Words: LEXICON.md › Profiles.
 */

export interface PillGroup {
  name: string
  /** One line under the name on the group's card */
  desc: string
  pills: string[]
  /** Where an offer made from a shared skill lands (Edit profile's offer categories) */
  offerCategory: string
  /** The group's pastel: card and pill tint, and its border (as Spotka's picker; Sonia, 25 Nov) */
  bg: string
  line: string
}

export const PILL_GROUPS: PillGroup[] = [
  { name: 'Land and food', desc: 'Growing, cooking, animals', bg: '#e1ead9', line: '#aebfa5', offerCategory: 'Food', pills: ['Permaculture', 'Regenerative farming', 'Gardening', 'Food forests', 'Seed saving', 'Foraging', 'Soil and compost', 'Beekeeping', 'Fermentation', 'Cooking', 'Animal care'] },
  { name: 'Nature and ecology', desc: 'Wild places and living systems', bg: '#d8ece6', line: '#98bbb0', offerCategory: 'Permaculture', pills: ['Nature', 'Rewilding', 'Water and rivers', 'Ocean', 'Wildlife and birds', 'Climate', 'Biodiversity', 'Hiking', 'Animal psychology'] },
  { name: 'Building and making', desc: 'Building, energy, crafts', bg: '#eee3bd', line: '#bfad71', offerCategory: 'Construction', pills: ['Construction', 'Natural building', 'Architecture', 'Carpentry', 'Off-grid energy', 'Water systems', 'Repair and upcycling', 'Crafts', 'Tiny houses'] },
  { name: 'Body and health', desc: 'Movement, care, healing', bg: '#dfe3fa', line: '#a0aacb', offerCategory: 'Healing', pills: ['Movement', 'Yoga', 'Dance', 'Breathwork', 'Herbal medicine', 'Nutrition', 'Bodywork', 'Martial arts', 'Sport'] },
  { name: 'Mind and spirit', desc: 'Inner life and practice', bg: '#e6def1', line: '#b3a0ca', offerCategory: 'Healing', pills: ['Spirituality', 'Meditation', 'Psychology', 'Inner work', 'Ceremony and ritual', 'Astrology', 'Philosophy', 'Dreams'] },
  { name: 'Arts and culture', desc: 'Music, art, stories', bg: '#f2dce7', line: '#c79daf', offerCategory: 'Art', pills: ['Music', 'Art', 'Film', 'Photography', 'Writing and storytelling', 'Theatre', 'Flow arts', 'Design', 'Singing'] },
  { name: 'Living together', desc: 'Community, decisions, family', bg: '#f2dfd2', line: '#caa48e', offerCategory: 'Other', pills: ['Community', 'Co-living', 'Sociocracy', 'Facilitation', 'Conflict resolution', 'Nonviolent communication', 'Intergenerational living', 'Parenting'] },
  { name: 'Learning', desc: 'Teaching and learning', bg: '#dce8f3', line: '#98b1c9', offerCategory: 'Education', pills: ['Education', 'Unschooling', 'Teaching', 'Languages', 'Mentoring', 'Skill sharing', 'Reading'] },
  { name: 'Work and organising', desc: 'Projects, money, getting it done', bg: '#e1e5ed', line: '#a3adbf', offerCategory: 'Consulting', pills: ['Project management', 'Operations', 'Strategy', 'Leadership', 'Fundraising', 'Marketing and branding', 'Social media', 'Accounting', 'Legal', 'Translation'] },
  { name: 'Tech and new economies', desc: 'Software, tools, new money', bg: '#d9eef2', line: '#8fbcc6', offerCategory: 'Technology', pills: ['Technology', 'Software', 'Web design', 'Digital sovereignty', 'Open source', 'AI', 'Web3 and DAOs', 'Community currencies', 'Gift economy', 'Regenerative finance', 'Network passport'] },
  { name: 'Systems change', desc: 'The bigger picture', bg: '#e8eed5', line: '#b2bd8a', offerCategory: 'Consulting', pills: ['Regenerative systems change', 'Sustainability', 'Circular economy', 'Social enterprise', 'Activism', 'Policy', 'Impact investing'] },
  { name: 'Travel and adventure', desc: 'On the move', bg: '#f6e4d0', line: '#d2a983', offerCategory: 'Other', pills: ['Travel', 'Nomad life', 'Sailing', 'Camping', 'Volunteering', 'Other cultures'] },
]

/** Often picked together, as a start; once members have picked, what they pick together counts more */
export const PILL_FRIENDS: Record<string, string[]> = {
  Permaculture: ['Food forests', 'Seed saving', 'Soil and compost', 'Natural building', 'Off-grid energy'],
  Nature: ['Hiking', 'Rewilding', 'Wildlife and birds', 'Foraging'],
  Community: ['Co-living', 'Sociocracy', 'Facilitation', 'Nonviolent communication'],
  Music: ['Singing', 'Dance', 'Flow arts'],
  Spirituality: ['Meditation', 'Ceremony and ritual', 'Breathwork', 'Inner work'],
  Sustainability: ['Circular economy', 'Off-grid energy', 'Permaculture'],
  Travel: ['Nomad life', 'Volunteering', 'Other cultures'],
  Movement: ['Yoga', 'Dance', 'Breathwork', 'Martial arts'],
  Psychology: ['Inner work', 'Nonviolent communication', 'Animal psychology'],
  'Digital sovereignty': ['Open source', 'Network passport', 'Community currencies'],
  Cooking: ['Fermentation', 'Foraging', 'Nutrition'],
  Art: ['Design', 'Crafts', 'Photography'],
  Yoga: ['Meditation', 'Breathwork', 'Movement'],
  Construction: ['Natural building', 'Carpentry', 'Off-grid energy'],
  'Natural building': ['Carpentry', 'Tiny houses', 'Architecture'],
  Teaching: ['Mentoring', 'Facilitation', 'Skill sharing'],
  Software: ['Web design', 'Open source', 'AI'],
  Technology: ['Software', 'Open source', 'Digital sovereignty'],
  'Project management': ['Operations', 'Strategy', 'Leadership'],
  Facilitation: ['Sociocracy', 'Conflict resolution', 'Nonviolent communication'],
}

const norm = (s: string) => s.trim().toLowerCase()

/** The group a pill belongs to (case-insensitive), or -1 for one typed by hand */
export function groupOfPill(pill: string): number {
  const p = norm(pill)
  return PILL_GROUPS.findIndex(g => g.pills.some(x => norm(x) === p))
}

/** How many people list each pill, and how often two are picked by the same person: the start of "You might also pick" */
export interface PillStats {
  count: Record<string, number>
  together: Record<string, Record<string, number>>
}

export function pillStats(lists: (string[] | null | undefined)[]): PillStats {
  const count: Record<string, number> = {}
  const together: Record<string, Record<string, number>> = {}
  for (const list of lists) {
    // Count each person once per pill, in the list's own spelling mapped to the pill's
    const pills = [...new Set((list ?? []).map(canonicalPill).filter(Boolean))] as string[]
    for (const a of pills) {
      count[a] = (count[a] ?? 0) + 1
      for (const b of pills) if (a !== b) (together[a] ??= {})[b] = (together[a][b] ?? 0) + 1
    }
  }
  return { count, together }
}

/** "music" → "Music"; anything not on the list stays as typed */
export function canonicalPill(s: string): string {
  const gi = groupOfPill(s)
  if (gi < 0) return s.trim()
  return PILL_GROUPS[gi].pills.find(x => norm(x) === norm(s)) ?? s.trim()
}

/** Up to `max` pills to suggest next: picked together with yours, then the rest of your groups, then popular here */
export function suggestPills(picked: string[], stats: PillStats, max = 6): string[] {
  const mine = new Set(picked.map(norm))
  const score: Record<string, number> = {}
  const add = (p: string, v: number) => { if (!mine.has(norm(p)) && groupOfPill(p) >= 0) score[p] = (score[p] ?? 0) + v }
  for (const p of picked) {
    const c = canonicalPill(p)
    for (const [q, n] of Object.entries(stats.together[c] ?? {})) add(q, 2 * n)
    for (const q of PILL_FRIENDS[c] ?? []) add(q, 3)
    const gi = groupOfPill(c)
    if (gi >= 0) for (const q of PILL_GROUPS[gi].pills) add(q, 1)
  }
  for (const [p, n] of Object.entries(stats.count)) add(p, picked.length ? n / 4 : n)
  return Object.entries(score).sort((a, b) => b[1] - a[1]).slice(0, max).map(([p]) => p)
}

/**
 * "What best describes you? Choose all that apply" (user_profiles.user_types). The list MyCoNet had as "Who are you in
 * this network?" (Sonia, 25 Nov: "should be archetypes that we had before"; decision #94), flattened to one tap each.
 * `id` is what's stored, the same as before, so earlier choices still show as chosen.
 */
export const DESCRIBES: { id: string; label: string; hint: string }[] = [
  { id: 'Exploring', label: 'Exploring', hint: 'Curious about regenerative neighbourhoods and community life' },
  { id: 'Community Member - Living In', label: 'Living in a community', hint: 'Already part of a regenerative community' },
  { id: 'Community Member - Looking For', label: 'Looking for a community', hint: 'Searching for one to join' },
  { id: 'Vision Holder', label: 'Vision holder', hint: 'Holding a vision or building a regenerative project' },
  { id: 'Service Provider', label: 'Service provider', hint: 'Offering skills, services or expertise to communities' },
  { id: 'Resource Holder - Land', label: 'Land holder', hint: 'Land that could support a regenerative project' },
  { id: 'Resource Holder - Money', label: 'Funder', hint: 'Money to invest in regenerative projects' },
]

/** A pastel for the i-th card of a list (the groups' colours in turn), as CSS variables for .pp-pick and .pp-pill */
export function pastel(i: number): Record<string, string> {
  const g = PILL_GROUPS[[0, 3, 5, 1, 4, 2, 6, 7, 9, 11, 10, 8][i % 12]]
  return { '--pp-bg': g.bg, '--pp-line': g.line }
}

/** Personal values as a list: one per line ("Honesty", "Slow living"). Older free text stays one paragraph. */
export function valueList(text: string | null | undefined): string[] | null {
  const lines = (text ?? '').split('\n').map(s => s.trim()).filter(Boolean)
  if (!lines.length) return null
  // A list when every line is a short name (up to four words, no full stop at the end)
  return lines.every(l => l.split(/\s+/).length <= 4 && !/[.!?]$/.test(l)) ? lines : null
}
