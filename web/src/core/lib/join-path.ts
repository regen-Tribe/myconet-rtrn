import type { SupabaseClient } from '@supabase/supabase-js'
import type { IconName } from '@/core/components/v4'
import { isJoiningOrAbove } from './roles'
import { DESIGN_REVIEW } from './instance'

/**
 * With the design review, the way in is two steps: Get to know us · About you, and About you ends with Send application
 * (Sonia, 25 Nov; decision #93). Without it, three steps: Get to know us · About you · Apply (decisions #80, #81; it was
 * "Values · Profile · Application" until 23 Nov). One list,
 * read by the Join page (m05-join/JoinReview.tsx), the menu's next step and My dashboard, so all three always
 * say the same thing. Words: LEXICON.md › Joining.
 */

export type JoinStepKey = 'values' | 'profile' | 'application'

export interface JoinStep {
  key: JoinStepKey
  /** Short, on the path ("Values") */
  label: string
  /** As a next step ("Sign the values") */
  title: string
  icon: IconName
  /** About how long the step takes, shown on the welcome (decision #80) */
  minutes: number
  done: boolean
}

export interface JoinPath {
  steps: JoinStep[]
  /** The first step not done, or null when all three are */
  next: JoinStep | null
  doneCount: number
  /** The application's status: pending, reviewing, accepted, rejected; null before one is sent */
  application: string | null
  /** Accepted: the person is a joining member or more */
  joined: boolean
}

/** Who reads join applications and answers them: a steward, an admin who welcomes new people (LEXICON.md › Joining;
 *  Sonia, 2026-11-22). A word, never a person's name: who the steward is belongs to the community, not core. */
export const JOIN_REVIEWER = 'a steward'

export function joinSteps(s: { valuesSigned: number; valuesTotal: number; hasPhoto: boolean; hasHeadline: boolean; application: string | null; joined: boolean }): JoinPath {
  const sent = s.joined || (!!s.application && s.application !== 'rejected')
  const steps: JoinStep[] = [
    // Step 1: the values, shared inside Start joining (Sonia, 24 Nov; About's values chapter can sign them too). With none written yet
    // the step can't hold anyone back
    { key: 'values', label: 'Get to know us', title: 'Get to know us', icon: 'book', minutes: 5, done: s.joined || s.valuesSigned >= s.valuesTotal },
    // Step 2 (#81): a short form inside Start joining. A line about you finishes it; the photo is asked for, not required
    { key: 'profile', label: 'About you', title: 'Tell us about you', icon: 'user', minutes: 2, done: s.joined || s.hasHeadline },
    { key: 'application', label: 'Apply', title: s.application === 'rejected' ? 'Send a new application' : 'Send your application', icon: 'mail', minutes: 3, done: sent },
  ]
  // Once someone is in, the way in reads as done (a joining member's profile is the menu's next step instead).
  // The application is the last step even when the profile isn't finished: it can be sent without it
  // Design review (#93): About you ends with Send application, so it's done once the application is sent
  if (DESIGN_REVIEW) {
    steps.splice(1, 2, { key: 'profile', label: 'About you', title: s.application === 'rejected' ? 'Ask to join again' : 'Tell us about you', icon: 'user', minutes: 5, done: sent })
  }
  const next = steps.find(x => !x.done) ?? null
  return { steps, next, doneCount: steps.filter(x => x.done).length, application: s.application, joined: s.joined }
}

export async function loadJoinPath(supabase: SupabaseClient, userId: string, role: string): Promise<JoinPath> {
  const [values, signed, profile, app] = await Promise.all([
    supabase.from('community_values').select('id', { count: 'exact', head: true }),
    supabase.from('value_signatures').select('value_id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('user_profiles').select('avatar_url, headline').eq('id', userId).maybeSingle(),
    supabase.from('applications').select('status').eq('user_id', userId).maybeSingle(),
  ])
  return joinSteps({
    valuesSigned: signed.count ?? 0,
    valuesTotal: values.count ?? 0,
    hasPhoto: !!profile.data?.avatar_url,
    hasHeadline: !!profile.data?.headline,
    application: (app.data?.status as string | undefined) ?? null,
    joined: isJoiningOrAbove(role),
  })
}
