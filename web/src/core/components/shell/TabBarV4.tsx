'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isMenuActive, menuGroups, tabKeys } from '@/core/lib/nav'
import { COMMUNITY_NAME, DESIGN_REVIEW } from '@/core/lib/instance'
import { Icon } from '@/core/components/v4'

/**
 * The v4 phone tab bar (design/redesign-prototype/app.js › tabsHTML): four pages and
 * Menu, each with its name under the icon (orientation review O9). Explorers and
 * joining members get About instead of Operations (O8). Menu shows the name of the
 * page you're on when it isn't one of the four. Hidden on wider screens (globals.css).
 */
export default function TabBarV4({ newcomer, menuOpen, onMenu, signedIn = true }: { newcomer: boolean; menuOpen: boolean; onMenu: () => void; signedIn?: boolean }) {
  const pathname = usePathname()
  const all = menuGroups(COMMUNITY_NAME).flatMap(g => g.items)
  // Design review: a visitor's home is About, so their bar has no Dashboard tab (it would only send them there)
  const tabs = tabKeys(newcomer).filter(k => !(DESIGN_REVIEW && !signedIn && k === 'dashboard')).map(k => all.find(i => i.key === k)!).filter(Boolean)
  const current = tabs.find(t => isMenuActive(t.href, pathname))
  const here = current ? null : all.find(i => isMenuActive(i.href, pathname))
  const short = (name: string) => (name.startsWith('About ') ? 'About' : name === 'My dashboard' ? 'Dashboard' : name)

  const cell = (on: boolean): React.CSSProperties => ({
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '7px 2px 6px',
    background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit',
    color: on ? 'var(--ink)' : 'var(--ink-3)', fontSize: 11, fontWeight: on ? 700 : 500,
  })
  const label: React.CSSProperties = { maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

  return (
    <nav className="v4-tabbar" aria-label="Main pages">
      {tabs.map(t => {
        const on = !menuOpen && current?.key === t.key
        return (
          <Link key={t.key} href={t.href} aria-current={on ? 'page' : undefined} style={cell(on)}>
            <Icon name={t.icon} size={22} />
            <span style={label}>{short(t.name)}</span>
          </Link>
        )
      })}
      <button type="button" onClick={onMenu} aria-expanded={menuOpen} style={cell(menuOpen || !!here)}>
        <Icon name={DESIGN_REVIEW ? 'menu' : 'grid'} size={22} />
        {/* Design review: Menu keeps its name; the bold label shows you're in one of its pages */}
        <span style={label}>{here && !menuOpen && !DESIGN_REVIEW ? short(here.name) : 'Menu'}</span>
      </button>
    </nav>
  )
}
