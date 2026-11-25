// Pure match-scoring logic. No DB calls.
import { PILL_GROUPS, groupOfPill } from '@/core/lib/skills-interests'
import { homesOf } from '@/core/lib/homes'
// `city` and `country` come from user_profiles; callers merge them onto Bio before passing in.

export type Bio = {
  skills?: string[] | null
  interests?: string[] | null
  goals?: string | null
  places_traveling?: Array<{
    location?: string | null
    startDate?: string | null
    endDate?: string | null
    notes?: string | null
  }> | null
  personality_details?: {
    myersBriggs?: string | null
    ocean?: {
      openness?: number | null
      conscientiousness?: number | null
      extraversion?: number | null
      agreeableness?: number | null
      neuroticism?: number | null
    } | null
  } | null
  // Merged from user_profiles by the caller — used for location proximity.
  city?: string | null
  country?: string | null
} | null

export type MatchResult = { score: number; reasons: string[] }

const MBTI_IDEAL_PAIRS: Record<string, string[]> = {
  INTJ: ['ENFP', 'ENTP'], INTP: ['ENTJ', 'ENFJ'],
  INFJ: ['ENFP', 'ENTP'], INFP: ['ENFJ', 'ENTJ'],
  ISTJ: ['ESFP', 'ESTP'], ISTP: ['ESFJ', 'ESTJ'],
  ISFJ: ['ESFP', 'ESTP'], ISFP: ['ESFJ', 'ESTJ'],
  ENTJ: ['INTP', 'INFP'], ENTP: ['INTJ', 'INFJ'],
  ENFJ: ['INFP', 'INTP'], ENFP: ['INTJ', 'INFJ'],
  ESTJ: ['ISTP', 'ISFP'], ESTP: ['ISTJ', 'ISFJ'],
  ESFJ: ['ISFP', 'ISTP'], ESFP: ['ISTJ', 'ISFJ'],
}

const MBTI_TEMPERAMENT: Record<string, string> = {
  INTJ: 'NT', INTP: 'NT', ENTJ: 'NT', ENTP: 'NT',
  INFJ: 'NF', INFP: 'NF', ENFJ: 'NF', ENFP: 'NF',
  ISTJ: 'SJ', ISFJ: 'SJ', ESTJ: 'SJ', ESFJ: 'SJ',
  ISTP: 'SP', ISFP: 'SP', ESTP: 'SP', ESFP: 'SP',
}

// Regenerative-community signal words — both bios sharing these in `goals` is meaningful.
const GOAL_KEYWORDS = ['community', 'regenerative', 'sustainable', 'permaculture', 'nature', 'spiritual']

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i)
  const curr = new Array(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1])
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

// True for exact match, substring containment, or Levenshtein similarity ≥ 0.8.
// Trims and lowercases. Used for skills, interests, and city/country.
function fuzzyMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  const s1 = a.toLowerCase().trim()
  const s2 = b.toLowerCase().trim()
  if (!s1 || !s2) return false
  if (s1 === s2) return true
  if (s1.includes(s2) || s2.includes(s1)) return true
  const maxLen = Math.max(s1.length, s2.length)
  return 1 - levenshtein(s1, s2) / maxLen >= 0.8
}

function mbtiCompat(a?: string | null, b?: string | null): { points: number; label: string | null } {
  if (!a || !b) return { points: 0, label: null }
  if (a === b) return { points: 10, label: `Same MBTI type (${a})` }
  if (MBTI_IDEAL_PAIRS[a]?.[0] === b || MBTI_IDEAL_PAIRS[b]?.[0] === a)
    return { points: 20, label: `Ideal MBTI pair (${a} & ${b})` }
  if (MBTI_IDEAL_PAIRS[a]?.includes(b))
    return { points: 15, label: `MBTI complement (${a} & ${b})` }
  if (MBTI_TEMPERAMENT[a] === MBTI_TEMPERAMENT[b])
    return { points: 8, label: 'Same temperament' }
  const shared = [...a].filter((ch, i) => ch === b[i]).length
  if (shared >= 2) return { points: 4, label: null }
  return { points: 0, label: null }
}

// Score breakdown (max 100):
//   Skills shared (fuzzy)   → up to 25
//   Interests shared (fuzzy)→ up to 15
//   Skill meets curiosity   → up to 10
//   Same group of pills     → up to  3
//   OCEAN similarity        → up to 20
//   MBTI compatibility      → up to 20
//   Location proximity      → up to  5
//   Travel overlap (+dates) → up to 10
//   Goal keywords           → up to  5
export function computeMatch(mine: Bio, theirs: Bio): MatchResult {
  if (!mine || !theirs) return { score: 0, reasons: [] }
  const reasons: string[] = []
  let score = 0

  // Skills (fuzzy) — 25 max
  const mySkills = mine.skills ?? []
  const theirSkills = theirs.skills ?? []
  const sharedSkills = mySkills.filter(s => theirSkills.some(t => fuzzyMatch(s, t)))
  if (sharedSkills.length) {
    score += Math.min(sharedSkills.length * 5, 25)
    const list = sharedSkills.slice(0, 2).join(', ')
    reasons.push(sharedSkills.length === 1
      ? `Shared skill: ${sharedSkills[0]}`
      : `${sharedSkills.length} shared skills (${list}${sharedSkills.length > 2 ? '...' : ''})`)
  }

  // Interests (fuzzy) — 15 max
  const myInterests = mine.interests ?? []
  const theirInterests = theirs.interests ?? []
  const sharedInterests = myInterests.filter(i => theirInterests.some(t => fuzzyMatch(i, t)))
  if (sharedInterests.length) {
    score += Math.min(sharedInterests.length * 3, 15)
    const list = sharedInterests.slice(0, 2).join(', ')
    reasons.push(sharedInterests.length === 1
      ? `Shared interest: ${sharedInterests[0]}`
      : `${sharedInterests.length} shared interests (${list}${sharedInterests.length > 2 ? '...' : ''})`)
  }

  // A skill meets a curiosity — 10 max (decision #89): one's "good at" is the other's "curious about". Said first,
  // since it's the most useful reason to meet
  const teaches = (theirs.skills ?? []).filter(s => myInterests.some(i => fuzzyMatch(s, i)))
  const learns = (mine.skills ?? []).filter(s => theirInterests.some(i => fuzzyMatch(s, i)))
  if (teaches.length || learns.length) {
    score += Math.min((teaches.length + learns.length) * 4, 10)
    const words: string[] = []
    if (teaches.length) words.push(`Good at ${teaches.slice(0, 2).join(', ')}, which you're curious about`)
    if (learns.length) words.push(`Curious about ${learns.slice(0, 2).join(', ')}, which you're good at`)
    reasons.unshift(...words)
  }

  // The same group, different pills — 3 max: "Both into Land and food"
  const groupsOf = (b: NonNullable<Bio>) => new Set([...(b.skills ?? []), ...(b.interests ?? [])].map(groupOfPill).filter(g => g >= 0))
  const sameGroups = [...groupsOf(mine)].filter(g => groupsOf(theirs).has(g))
    .filter(g => ![...sharedSkills, ...sharedInterests, ...teaches, ...learns].some(p => groupOfPill(p) === g))
  if (sameGroups.length) {
    score += Math.min(sameGroups.length, 3)
    reasons.push(`Both into ${sameGroups.slice(0, 2).map(g => PILL_GROUPS[g].name).join(' and ')}`)
  }

  // OCEAN similarity — 20 max
  const mOcean = mine.personality_details?.ocean
  const tOcean = theirs.personality_details?.ocean
  if (mOcean && tOcean) {
    const keys = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const
    const avgDiff = keys.reduce((sum, k) => sum + Math.abs((mOcean[k] ?? 50) - (tOcean[k] ?? 50)), 0) / 5
    const oceanPts = Math.round((1 - avgDiff / 100) * 20)
    score += oceanPts
    if (avgDiff <= 15) reasons.push('Remarkably similar personality traits')
    else if (avgDiff <= 25) reasons.push('Compatible personality profile')
  }

  // MBTI — 20 max
  const { points: mbtiPts, label: mbtiLabel } = mbtiCompat(
    mine.personality_details?.myersBriggs,
    theirs.personality_details?.myersBriggs
  )
  score += mbtiPts
  if (mbtiLabel) reasons.push(mbtiLabel)

  // Location proximity — 5 max. Each person may call several places home (decision #97): the best pair counts
  {
    const mineH = homesOf(mine.city, mine.country), theirsH = homesOf(theirs.city, theirs.country)
    let best: { pts: number; why: string } | null = null
    for (const a of mineH) for (const b of theirsH) {
      if (!a.country || !b.country || !fuzzyMatch(a.country, b.country)) continue
      const sameTown = !!a.city && !!b.city && fuzzyMatch(a.city, b.city)
      const pick = sameTown ? { pts: 5, why: `Both in ${b.city}, ${b.country}` } : { pts: 3, why: `Both in ${b.country}` }
      if (!best || pick.pts > best.pts) best = pick
    }
    if (best) { score += best.pts; reasons.push(best.why) }
  }

  // Travel overlap with date awareness — 10 max
  const myTravel = mine.places_traveling ?? []
  const theirTravel = theirs.places_traveling ?? []
  if (myTravel.length && theirTravel.length) {
    let bestPts = 0
    let bestReason: string | null = null
    for (const mt of myTravel) {
      for (const tt of theirTravel) {
        if (!fuzzyMatch(mt.location, tt.location)) continue
        const dest = (tt.location ?? '').trim()
        const mStart = mt.startDate ? new Date(mt.startDate) : null
        const mEnd = mt.endDate ? new Date(mt.endDate) : null
        const tStart = tt.startDate ? new Date(tt.startDate) : null
        const tEnd = tt.endDate ? new Date(tt.endDate) : null
        if (mStart && mEnd && tStart && tEnd && !isNaN(+mStart) && !isNaN(+mEnd) && !isNaN(+tStart) && !isNaN(+tEnd)) {
          const overlaps = mStart <= tEnd && tStart <= mEnd
          if (overlaps) {
            const month = (mStart > tStart ? mStart : tStart).toLocaleDateString('en-US', { month: 'short' })
            if (10 > bestPts) { bestPts = 10; bestReason = `Both in ${dest} at the same time (${month})` }
            continue
          }
          const daysApart = Math.min(
            Math.abs(+mStart - +tStart), Math.abs(+mStart - +tEnd),
            Math.abs(+mEnd - +tStart), Math.abs(+mEnd - +tEnd),
          ) / 86_400_000
          if (daysApart <= 30 && 6 > bestPts) {
            bestPts = 6
            bestReason = `Both visiting ${dest} within a month of each other`
            continue
          }
        }
        if (4 > bestPts) { bestPts = 4; bestReason = `Both have ${dest} on travel list` }
      }
    }
    if (bestReason) {
      score += bestPts
      reasons.push(bestReason)
    }
  }

  // Goal keywords — 5 max
  if (mine.goals && theirs.goals) {
    const mg = mine.goals.toLowerCase()
    const tg = theirs.goals.toLowerCase()
    const common = GOAL_KEYWORDS.filter(k => mg.includes(k) && tg.includes(k))
    if (common.length) {
      score += Math.min(common.length * 2, 5)
      reasons.push(common.length === 1
        ? `Aligned on ${common[0]}`
        : `Aligned aspirations (${common.slice(0, 2).join(', ')})`)
    }
  }

  return { score: Math.min(Math.round(score), 100), reasons }
}
