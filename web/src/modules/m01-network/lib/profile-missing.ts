/**
 * What a profile still needs, and where each piece is filled in (design review, decision #11 and #60).
 *
 * The same eleven checks as the top bar's old completion bar (AppTopBar › computeCompletion) and the menu's
 * "Finish your profile" step (core/lib/profile-completion.ts, PR #175), so the number never differs between
 * screens. Each check also says which Edit profile step and field it belongs to, so "Still to add" can link
 * straight to it: /profile/edit?add=<key>.
 */

export type ProfileFieldKey =
  | 'photo' | 'name' | 'headline' | 'offer' | 'skills' | 'city'
  | 'types' | 'values' | 'goals' | 'request' | 'travel'

export interface ProfileFacts {
  avatar: boolean; firstName: boolean; headline: boolean; city: boolean; types: boolean
  values: boolean; skills: boolean; goals: boolean
  offers: boolean; requests: boolean; travel: boolean
}

export interface ProfileCheck {
  key: ProfileFieldKey
  /** Short words for the "Still to add" line: "a photo", "a headline" */
  label: string
  /** The Edit profile step it's on (1-8) */
  step: number
  /** The id of the field (or the button that adds one) on that step */
  field: string
  done: (f: ProfileFacts) => boolean
}

/** Most useful first: what people see first on a profile and on a person card. */
export const PROFILE_CHECKS: ProfileCheck[] = [
  { key: 'photo',    label: 'a photo',          step: 1, field: 'pe-photo',    done: f => f.avatar },
  { key: 'name',     label: 'your name',        step: 1, field: 'pe-name',     done: f => f.firstName },
  { key: 'headline', label: 'a headline',       step: 1, field: 'pe-headline', done: f => f.headline },
  { key: 'offer',    label: 'an offer',         step: 6, field: 'pe-offer',    done: f => f.offers },
  { key: 'skills',   label: 'your skills',      step: 1, field: 'pe-skills',   done: f => f.skills },
  { key: 'city',     label: 'your city',        step: 1, field: 'pe-city',     done: f => f.city },
  { key: 'types',    label: 'who you are here', step: 1, field: 'pe-types',    done: f => f.types },
  { key: 'values',   label: 'your values',      step: 2, field: 'pe-values',   done: f => f.values },
  { key: 'goals',    label: 'your goals',       step: 5, field: 'pe-goals',    done: f => f.goals },
  { key: 'request',  label: 'a request',        step: 7, field: 'pe-request',  done: f => f.requests },
  { key: 'travel',   label: 'travel plans',     step: 8, field: 'pe-travel',   done: f => f.travel },
]

export function profileMissing(f: ProfileFacts): { pct: number; missing: ProfileCheck[] } {
  const missing = PROFILE_CHECKS.filter(c => !c.done(f))
  return { pct: Math.round((PROFILE_CHECKS.length - missing.length) / PROFILE_CHECKS.length * 100), missing }
}

/** The facts from the database rows a profile page already has */
export function factsFromRows(
  p: { avatar_url?: string | null; first_name?: string | null; headline?: string | null; city?: string | null; user_types?: string[] | null } | null,
  b: { values_principles?: string | null; skills?: string[] | null; goals?: string | null; places_traveling?: unknown[] | null } | null,
  offers: number, requests: number,
): ProfileFacts {
  return {
    avatar: !!p?.avatar_url, firstName: !!p?.first_name, headline: !!p?.headline, city: !!p?.city,
    types: (p?.user_types?.length ?? 0) > 0, values: !!b?.values_principles, skills: (b?.skills?.length ?? 0) > 0,
    goals: !!b?.goals, offers: offers > 0, requests: requests > 0, travel: (b?.places_traveling?.length ?? 0) > 0,
  }
}

/** "a photo, a headline and an offer" (the first three; "and 4 more" after that) */
export function missingWords(missing: ProfileCheck[], max = 3): string {
  const shown = missing.slice(0, max).map(c => c.label)
  const rest = missing.length - shown.length
  if (rest > 0) return `${shown.join(', ')} and ${rest} more`
  return shown.length > 1 ? `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}` : (shown[0] ?? '')
}
