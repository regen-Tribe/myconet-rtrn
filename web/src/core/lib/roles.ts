export const MEMBER_ROLES = ['member', 'circle_lead', 'project_lead', 'advisor', 'admin'] as const
export const JOINING_OR_ABOVE = ['joining', 'member', 'circle_lead', 'project_lead', 'advisor', 'admin'] as const

// All full members + leads + admin can vote and propose in Governance
export const isFullMember = (role: string): boolean =>
  MEMBER_ROLES.includes(role as (typeof MEMBER_ROLES)[number])

// Joining users and above (access to member-gated content on Home etc.)
export const isJoiningOrAbove = (role: string): boolean =>
  JOINING_OR_ABOVE.includes(role as (typeof JOINING_OR_ABOVE)[number])

// Manages Blueprint, Join, Agreements — circle_lead + admin only
export const isCircleAdmin = (role: string): boolean =>
  ['circle_lead', 'admin'].includes(role)

// Sees full Ops admin panel — circle_lead, project_lead, admin
export const isOpsAdmin = (role: string): boolean =>
  ['circle_lead', 'project_lead', 'admin'].includes(role)

// Only admin can directly edit records
export const isAdmin = (role: string): boolean => role === 'admin'

// L1 Sociocracy voters
export const isCircleLead = (role: string): boolean => role === 'circle_lead'

// L3 Meritocracy voters
export const isAdvisorOrAdmin = (role: string): boolean =>
  ['advisor', 'admin'].includes(role)

// Seniority for "at least X" checks. Advisors sit with full members; the two
// lead roles share a rank because neither outranks the other.
const ROLE_RANK: Record<string, number> = {
  explorer: 0, joining: 1, member: 2, advisor: 2, project_lead: 3, circle_lead: 3, admin: 4,
}

export const roleAtLeast = (role: string, minRole: string): boolean =>
  (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minRole] ?? 0)

// Display names for user_profiles.role
export const ROLE_LABELS: Record<string, string> = {
  explorer: 'Explorer',
  joining: 'Joining member',
  member: 'Member',
  circle_lead: 'Circle lead',
  project_lead: 'Task lead',
  advisor: 'Advisor',
  admin: 'Admin',
}
