/**
 * Governance's four checks: when a proposal counts as approved. Used by the Governance page
 * and the bell (activity: "… was approved"), so both always agree. Approval isn't stored;
 * it follows from the votes, with each voter's role.
 */
export type Vote = { vote: string; user_id: string; layer: string; voter?: { role: string } | null }

export function layerVotes(votes: Vote[], layer: string) {
  const lv = votes.filter(v => v.layer === layer)
  const clVotes = lv.filter(v => v.voter?.role === 'circle_lead')
  const expertVotes = lv.filter(v => ['admin', 'advisor'].includes(v.voter?.role ?? ''))
  return {
    consent: lv.filter(v => v.vote === 'consent').length,
    concern: lv.filter(v => v.vote === 'concern').length,
    object:  lv.filter(v => v.vote === 'object').length,
    yes:     lv.filter(v => v.vote === 'yes').length,
    no:      lv.filter(v => v.vote === 'no').length,
    approve: lv.filter(v => v.vote === 'approve').length,
    reject:  lv.filter(v => v.vote === 'reject').length,
    total:   lv.length,
    clConsent: clVotes.filter(v => v.vote === 'consent').length,
    clConcern: clVotes.filter(v => v.vote === 'concern').length,
    clObject:  clVotes.filter(v => v.vote === 'object').length,
    clTotal:   clVotes.length,
    expertApprove: expertVotes.filter(v => v.vote === 'approve').length,
    expertReject:  expertVotes.filter(v => v.vote === 'reject').length,
    expertTotal:   expertVotes.length,
  }
}

// Approved when APPROVE_AT of the PEOPLE_CHECKS people checks pass (circle leads, all members,
// admins & advisors). The screen text below states the same rule: change both together.
export const PEOPLE_CHECKS = 3
export const APPROVE_AT = 2
export const RULE = 'Approved when 2 of the 3 people checks pass. The AI check is advice.'

export function evalLayers(p: { votes: Vote[] }) {
  const s = layerVotes(p.votes, 'sociocracy')
  const d = layerVotes(p.votes, 'democracy')
  const m = layerVotes(p.votes, 'merit')

  // L1 Sociocracy: circle_leads must have voted, none have objected
  const sociocracyPassed = s.clTotal > 0 && s.clObject === 0
  // L2 Democracy: majority of yes over no
  const democPassed = d.total > 0 && d.yes > d.no
  // L3 Meritocracy: at least one expert approved, none rejected
  const meritPassed = m.expertTotal > 0 && m.expertApprove > 0 && m.expertReject === 0
  // The AI · Blueprint check is advice only: it isn't saved and doesn't count.
  const passed = [sociocracyPassed, democPassed, meritPassed].filter(Boolean).length
  return { sociocracyPassed, democPassed, meritPassed, passed, isLive: passed >= APPROVE_AT }
}
