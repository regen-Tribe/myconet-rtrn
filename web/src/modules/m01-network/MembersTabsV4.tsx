'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS: { href: string; label: string; signedIn?: boolean; joined?: boolean }[] = [
  { href: '/members', label: 'Everyone' },
  { href: '/members/matches', label: 'Matches for you', signedIn: true, joined: true },
  { href: '/members/offers', label: 'My offers', signedIn: true },
  { href: '/members/requests', label: 'My requests', signedIn: true },
  { href: '/members/discover', label: 'Discover' },
  { href: '/members/profile', label: 'My profile', signedIn: true },
]

/** With the v4 look, the Members pages share one row of tabs instead of their own side menu. */
/** Matches read other people's profiles, so they show from joining member (decision #71). */
export default function MembersTabsV4({ signedIn, joined = signedIn }: { signedIn: boolean; joined?: boolean }) {
  const path = usePathname()
  return (
    <nav className="v4-chiprow v4-subtabs" aria-label="Members">
      {TABS.filter(t => (signedIn || !t.signedIn) && (joined || !t.joined)).map(t => {
        const on = t.href === '/members' ? path === '/members' : path.startsWith(t.href)
        return <Link key={t.href} href={t.href} className={`v4-chip${on ? ' v4-chip--on' : ''}`} aria-current={on ? 'page' : undefined}>{t.label}</Link>
      })}
    </nav>
  )
}
