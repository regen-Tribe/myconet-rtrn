'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isMenuActive, menuGroups, tabKeys } from '@/core/lib/nav'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import { Icon } from '@/core/components/v4'

/**
 * The v4 phone tab bar (design/redesign-prototype/app.js › tabsHTML): four pages and
 * Menu, each with its name under the icon (orientation review O9). Explorers and
 * joining members get About instead of Operations (O8). Menu shows the name of the
 * page you're on when it isn't one of the four. Hidden on wider screens (globals.css).
 */
export default function TabBarV4({ newcomer, menuOpen, onMenu }: { newcomer: boolean; menuOpen: boolean; onMenu: () => void }) {
  const pathname = usePathname()
  const all = menuGroups(COMMUNITY_NAME).flatMap(g => g.items)
  const tabs = tabKeys(newcomer).map(k => all.find(i => i.key === k)!).filter(Boolean)
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
        <Icon name="grid" size={22} />
        <span style={label}>{here && !menuOpen ? short(here.name) : 'Menu'}</span>
      </button>
    </nav>
  )
}
