/**
 * Sidebar module order — the single source for the app sidebar and the
 * sidebar mock-ups in the landing / home page previews.
 */

export const CLUBHOUSE = [
  { num: '00', name: 'Dashboard',   color: 'var(--ink)', href: '/dashboard' },
  { num: '01', name: 'Members',     color: 'var(--m1)',  href: '/network' },
  { num: '14', name: 'Calendar',    color: 'var(--m14)', href: '/events' },
  { num: '04', name: 'Blueprint',   color: 'var(--m4)',  href: '/blueprint' },
  { num: '05', name: 'Join',        color: 'var(--m5)',  href: '/join' },
  { num: '15', name: 'Accommodation', color: 'var(--m15)', href: '/stays' },
  { num: '16', name: 'Resources',   color: 'var(--m16)', href: '/bookings' },
] as const

export const MEMBER_MODULES = [
  { num: '06', name: 'Agreements',    color: 'var(--m6)', href: '/agreements' as string | null },
  { num: '17', name: 'Circles',       color: 'var(--m17)', href: '/org' as string | null },
  { num: '07', name: 'Operations',    color: 'var(--m7)', href: '/ops' as string | null },
  { num: '08', name: 'Achievements', color: 'var(--m8)', href: '/contributions' as string | null },
  { num: '09', name: 'Governance',    color: 'var(--m9)', href: '/governance' as string | null },
]
