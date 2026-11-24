import { moduleOn } from './modules'
import { DESIGN_REVIEW } from './instance'

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

/* ─── The v4 menu (Sonia, 19 Nov; design/redesign-prototype/app.js › NAV) ───
 * Only communities with "design": "v4" use it (AppShell picks the menu). The
 * sidebar, the phone tab bar and search all read this one list.
 */

/** Names from the shared v4 icon set (core/components/v4/icons.ts) */
export type MenuIcon =
  | 'home' | 'book' | 'users' | 'calendar' | 'circles' | 'pin' | 'map'
  | 'board' | 'handshake' | 'chat' | 'scale' | 'inbox' | 'box' | 'shield'

export interface MenuItem {
  key: string
  name: string
  href: string
  icon: MenuIcon
  /** Below joining member the item shows a lock and isn't a link (orientation review O5). */
  joiningUp?: boolean
  /** Shown only to circle leads and admins. */
  admin?: boolean
}

export interface MenuGroup {
  label: string
  /** One quiet line under the label, for explorers and joining members (O7). */
  line?: string
  items: MenuItem[]
}

export function menuGroups(communityName: string): MenuGroup[] {
  return [
    { label: 'You', items: [
      { key: 'dashboard', name: 'My dashboard', href: '/dashboard', icon: 'home' },
    ] },
    { label: 'Community', line: 'Who we are and what’s here', items: [
      { key: 'about', name: `About ${communityName}`, href: '/about', icon: 'book' },
      { key: 'members', name: 'Members', href: '/members', icon: 'users' },
      { key: 'calendar', name: 'Calendar', href: '/calendar', icon: 'calendar' },
      { key: 'circles', name: 'Circles', href: '/circles', icon: 'circles' },
      // The space (v4.102.0): Amenities & tools and the Map behind one item; both pages switch between the two.
      // Readable by explorers; only booking waits (O5)
      { key: 'space', name: 'The space', href: '/amenities', icon: 'pin' },
    ] },
    { label: 'Working together', line: 'How we plan, agree and decide', items: [
      { key: 'operations', name: 'Operations', href: '/operations', icon: 'board' },
      // Parked in the design review (Sonia, 2026-11-22): no agreements yet; /agreements still works
      ...(DESIGN_REVIEW ? [] : [{ key: 'agreements', name: 'Agreements', href: '/agreements', icon: 'handshake' as const, joiningUp: true }]),
      ...(moduleOn('meetings') ? [{ key: 'meetings', name: 'Meetings', href: '/meetings', icon: 'chat' as const, joiningUp: true }] : []),
      { key: 'governance', name: 'Governance', href: '/governance', icon: 'scale' },
    ] },
    { label: 'Admin', items: [
      { key: 'applications', name: 'Applications', href: '/admin/applications', icon: 'inbox', admin: true },
      { key: 'bookings', name: 'Bookings', href: '/admin/bookings', icon: 'box', admin: true },
      // Circle leads may look; only admins change it (the page decides)
      { key: 'permissions', name: 'Permissions', href: '/admin/permissions', icon: 'shield', admin: true },
    ] },
  ]
}

/** The phone tab bar: four pages and Menu. Explorers and joining members get About instead of Operations (O8). */
export function tabKeys(newcomer: boolean): string[] {
  return ['dashboard', newcomer ? 'about' : 'operations', 'calendar', 'members']
}

/** Older addresses that open the same page, so the menu item stays highlighted there. */
const ALSO: Record<string, string[]> = {
  '/members': ['/u/'],
  '/about': ['/blueprint'],
  '/amenities': ['/accommodation', '/resources', '/map'],
  '/admin/permissions': ['/admin/users', '/admin/questions'],
}

export function isMenuActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return [href, ...(ALSO[href] ?? [])].some(p => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`))
}
