import { moduleOn } from './modules'

/**
 * Sidebar module order — the single source for the app sidebar and the
 * sidebar mock-ups in the landing / home page previews.
 */

export const CLUBHOUSE = [
  { num: '00', name: 'Dashboard',   color: 'var(--ink)', href: '/dashboard' },
  { num: '01', name: 'Members',     color: 'var(--m1)',  href: '/members' },
  { num: '14', name: 'Calendar',    color: 'var(--m14)', href: '/calendar' },
  { num: '04', name: 'Blueprint',   color: 'var(--m4)',  href: '/blueprint' },
  { num: '05', name: 'Join',        color: 'var(--m5)',  href: '/join' },
  { num: '15', name: 'Accommodation', color: 'var(--m15)', href: '/accommodation' },
  { num: '16', name: 'Resources',   color: 'var(--m16)', href: '/resources' },
] as const

export const MEMBER_MODULES = [
  { num: '06', name: 'Agreements',    color: 'var(--m6)', href: '/agreements' as string | null },
  { num: '17', name: 'Circles',       color: 'var(--m17)', href: '/circles' as string | null },
  { num: '07', name: 'Operations',    color: 'var(--m7)', href: '/operations' as string | null },
  { num: '08', name: 'Achievements', color: 'var(--m8)', href: '/achievements' as string | null },
  { num: '09', name: 'Governance',    color: 'var(--m9)', href: '/governance' as string | null },
  // Optional modules (instance/config.jsonc "modules")
  ...(moduleOn('meetings') ? [{ num: '18', name: 'Meetings', color: 'var(--m18)', href: '/meetings' as string | null }] : []),
]
