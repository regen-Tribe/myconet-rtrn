'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isCircleAdmin, isJoiningOrAbove, ROLE_LABELS } from '@/core/lib/roles'
import { isMenuActive, menuGroups, type MenuItem } from '@/core/lib/nav'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import { VERSION } from '@/core/lib/version'
import type { MenuState } from '@/core/lib/menu-server'
import { Icon } from '@/core/components/v4'

/**
 * The v4 menu (Sonia, 19–20 Nov; design/redesign-prototype/app.js › navHTML), used when the community
 * sets "design": "v4". Full height, like the prototype: the community's letter mark and name on top, the
 * next step, You / Community / Working together / Admin, and you at the foot. Collapsed, it becomes a
 * slim rail of icons (names on hover) instead of disappearing. Today's AppSideNav stays for everyone else.
 */

// The community's small square mark (instance config "brandMark", e.g. Protopia's spiral); the letter otherwise
const BRAND_MARK = process.env.NEXT_PUBLIC_BRAND_MARK || ''

const JOURNEY = ['Explorer', 'Joining member', 'Member']

function NextStepCard({ state, onClose, collapsed }: { state: MenuState; onClose?: () => void; collapsed: boolean }) {
  const n = state.next
  if (!n) return null
  if (collapsed) {
    return (
      <Link href={n.href} onClick={onClose} className="mv4-next mv4-next--rail" title={`Your next step: ${n.title}`} aria-label={`Your next step: ${n.title}`}>
        <Icon name="right" size={16} />
      </Link>
    )
  }
  const showJourney = state.journey === 0 || state.journey === 1
  return (
    <div className="mv4-nextwrap">
      <Link href={n.href} onClick={onClose} className="mv4-next">
        <span className="mv4-next__txt">
          <small>Your next step</small>
          <b>{n.title}</b>
          {showJourney && (
            // Where you are on the way in (orientation review O3)
            <span className="mv4-journey" aria-label={`Step ${state.journey! + 1} of 3: ${JOURNEY[state.journey!]}`}>
              <span aria-hidden="true">{JOURNEY.map((s, i) => <i key={s} className={i <= state.journey! ? 'on' : ''} />)}</span>
              <em aria-hidden="true">Step {state.journey! + 1} of 3 · {JOURNEY[state.journey!]}</em>
            </span>
          )}
          <span className="mv4-next__line">{n.line}</span>
        </span>
        <span className="mv4-next__go"><Icon name="right" size={15} /></span>
      </Link>
      {n.alt && <div className="mv4-alt">Have an account? <Link href={n.alt.href} onClick={onClose}>{n.alt.label}</Link></div>}
    </div>
  )
}

function Item({ item, active, locked, count, onClose, collapsed }: {
  item: MenuItem; active: boolean; locked: boolean; count?: number; onClose?: () => void; collapsed: boolean
}) {
  const cls = `mv4-item${active ? ' on' : ''}${locked ? ' locked' : ''}`
  if (locked) {
    // Locked items say why (O5); they aren't links, since the page would turn the person away
    const why = 'Opens when you’re a joining member'
    return (
      <span role="link" aria-disabled="true" title={`${item.name}: ${why}`} className={cls}>
        <span className="mv4-ic"><Icon name={item.icon} /></span>
        <span className="mv4-name">{item.name}<span className="sr-only"> ({why})</span></span>
        <span className="mv4-note"><Icon name="lock" size={13} /></span>
      </span>
    )
  }
  return (
    <Link
      href={item.href}
      title={collapsed ? (count ? `${item.name} · ${count}` : item.name) : undefined}
      onClick={e => {
        onClose?.()
        // The page you're already on: load it fresh, its front page with the latest data (v4.38.2)
        if (active && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); window.location.assign(item.href) }
      }}
      aria-current={active ? 'page' : undefined}
      className={cls}
    >
      <span className="mv4-ic"><Icon name={item.icon} />{collapsed && count ? <i className="mv4-dot" /> : null}</span>
      <span className="mv4-name">{item.name}</span>
      {count !== undefined && <span className="mv4-count">{count}</span>}
    </Link>
  )
}

export default function MenuV4({ mobileOpen, onClose, role, isLoggedIn, state, collapsed = false, onToggleCollapse }: {
  mobileOpen?: boolean; onClose?: () => void; role: string; isLoggedIn: boolean; state: MenuState
  collapsed?: boolean; onToggleCollapse?: () => void
}) {
  const pathname = usePathname()
  const joined = isLoggedIn && isJoiningOrAbove(role)
  // Explorers, joining members and visitors get a line under each group (O7)
  const newcomer = state.journey !== 2
  // On a phone the menu opens full, whatever the desktop setting
  const rail = collapsed && !mobileOpen

  const countFor = (key: string): number | undefined => {
    if (key === 'dashboard') return joined ? state.counts.tasks : undefined
    if (key === 'applications') return state.counts.applications || undefined
    if (key === 'bookings') return state.counts.bookings || undefined
    return undefined
  }

  return (
    <nav aria-label="Menu" className={`app-shell-sidenav menu-v4${mobileOpen ? ' mobile-open' : ''}${rail ? ' mv4--rail' : ''}`}>
      <div className="mv4-top">
        <Link href="/dashboard" className="mv4-brand" title={COMMUNITY_NAME} onClick={onClose}>
          {BRAND_MARK
            ? <img className="mv4-mark mv4-mark--img" src={BRAND_MARK} alt="" aria-hidden="true" />
            : <span className="mv4-mark" aria-hidden="true">{COMMUNITY_NAME.slice(0, 1).toUpperCase()}</span>}
          <span className="mv4-brand__txt"><b>{COMMUNITY_NAME}</b><small>on MyCoNet</small></span>
        </Link>
        {onToggleCollapse && (
          <button type="button" className="mv4-collapse" onClick={onToggleCollapse}
            aria-label={collapsed ? 'Open the menu' : 'Make the menu slim'} title={collapsed ? 'Open the menu' : 'Make the menu slim'}>
            <Icon name={collapsed ? 'right' : 'left'} size={15} />
          </button>
        )}
        <button type="button" className="mv4-close" onClick={onClose} aria-label="Close the menu"><Icon name="x" size={16} /></button>
      </div>

      {/* My dashboard shows its own next step (DashboardV4), so the menu doesn't repeat it there (O3) */}
      {pathname !== '/dashboard' && <NextStepCard state={state} onClose={onClose} collapsed={rail} />}

      <div className="mv4-groups">
        {menuGroups(COMMUNITY_NAME).map(g => {
          const items = g.items.filter(i => !i.admin || isCircleAdmin(role))
          if (!items.length) return null
          return (
            <div key={g.label} role="group" aria-label={g.label} className="mv4-group">
              <div className="mv4-label">{g.label}</div>
              {newcomer && g.line && !rail && <div className="mv4-line">{g.line}</div>}
              {items.map(i => (
                <Item key={i.key} item={i} active={isMenuActive(i.href, pathname)} locked={!!i.joiningUp && !joined}
                  count={countFor(i.key)} onClose={onClose} collapsed={rail} />
              ))}
            </div>
          )
        })}
      </div>

      <div className="mv4-foot">
        {state.me ? (
          <Link href={state.me.username ? `/u/${state.me.username}` : '/profile/edit'} className="mv4-me" onClick={onClose} title={rail ? state.me.name : undefined}>
            {state.me.avatar ? <img loading="lazy" decoding="async" src={state.me.avatar} alt="" className="mv4-av" /> : <span className="mv4-av">{state.me.name.slice(0, 1).toUpperCase()}</span>}
            <span className="mv4-me__txt"><b>{state.me.name}</b><small>{ROLE_LABELS[role] ?? 'Explorer'}</small></span>
            <span className="mv4-me__go"><Icon name="right" size={15} /></span>
          </Link>
        ) : null}
        <Link href="/changelog" className="mv4-version" onClick={onClose}>{VERSION}</Link>
      </div>
    </nav>
  )
}
