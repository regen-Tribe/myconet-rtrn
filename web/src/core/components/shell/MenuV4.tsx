'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
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
 *
 * Arrows mean "go somewhere" only on the next-step card. The open/slim switch is a sidebar icon (top right
 * when open, at the foot of the rail), and the rail's next step is a green flag, so no two arrows sit side
 * by side (v4.99.0). The rail's names show in a quick label beside the icon, on hover and keyboard focus.
 */

// The community's small square mark (instance config "brandMark", e.g. Protopia's spiral); the letter otherwise
const BRAND_MARK = process.env.NEXT_PUBLIC_BRAND_MARK || ''

const JOURNEY = ['Explorer', 'Joining member', 'Member']

function NextStepCard({ state, onClose, collapsed }: { state: MenuState; onClose?: () => void; collapsed: boolean }) {
  const n = state.next
  if (!n) return null
  if (collapsed) {
    return (
      <Link href={n.href} onClick={onClose} className="mv4-next mv4-next--rail" data-tip={`Your next step: ${n.title}`} aria-label={`Your next step: ${n.title}`}>
        <Icon name="flag" size={17} />
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
      <span role="link" aria-disabled="true" title={collapsed ? undefined : `${item.name}: ${why}`} data-tip={collapsed ? `${item.name} · ${why}` : undefined}
        tabIndex={collapsed ? 0 : undefined} className={cls}>
        <span className="mv4-ic"><Icon name={item.icon} /></span>
        <span className="mv4-name">{item.name}<span className="sr-only"> ({why})</span></span>
        <span className="mv4-note"><Icon name="lock" size={13} /></span>
      </span>
    )
  }
  return (
    <Link
      href={item.href}
      data-tip={collapsed ? (count ? `${item.name} · ${count}` : item.name) : undefined}
      aria-label={collapsed ? (count ? `${item.name}, ${count}` : item.name) : undefined}
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

  // The rail's quick labels: one fixed label beside the hovered or focused icon (the menu clips
  // anything drawn outside it, and the browser's own tooltip takes a second to appear)
  const [tip, setTip] = useState<{ text: string; top: number; left: number } | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  // On a phone, the opened drawer takes the keyboard focus, so Tab and screen readers start in it
  useEffect(() => { if (mobileOpen) closeRef.current?.focus({ preventScroll: true }) }, [mobileOpen])
  const showTip = (e: React.SyntheticEvent) => {
    if (!rail) return
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]')
    if (!el || !navRef.current?.contains(el)) return setTip(null)
    const r = el.getBoundingClientRect()
    setTip({ text: el.dataset.tip!, top: r.top + r.height / 2, left: navRef.current.getBoundingClientRect().right + 8 })
  }

  const toggle = onToggleCollapse && (
    <button type="button" className="mv4-collapse" onClick={() => { setTip(null); onToggleCollapse() }}
      aria-expanded={!collapsed} aria-label={collapsed ? 'Open the menu' : 'Make the menu slim'}
      data-tip={rail ? 'Open the menu' : undefined} title={rail ? undefined : 'Make the menu slim'}>
      <Icon name="sidebar" size={17} />
    </button>
  )

  const countFor = (key: string): number | undefined => {
    if (key === 'dashboard') return joined ? state.counts.tasks : undefined
    if (key === 'applications') return state.counts.applications || undefined
    if (key === 'bookings') return state.counts.bookings || undefined
    return undefined
  }

  return (
    <nav ref={navRef} id="app-menu" aria-label="Menu" className={`app-shell-sidenav menu-v4${mobileOpen ? ' mobile-open' : ''}${rail ? ' mv4--rail' : ''}`}
      onMouseOver={showTip} onFocus={showTip} onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)} onScroll={() => setTip(null)}>
      <div className="mv4-top">
        <Link href="/home" className="mv4-brand" title={rail ? undefined : COMMUNITY_NAME} data-tip={rail ? COMMUNITY_NAME : undefined} aria-label={rail ? COMMUNITY_NAME : undefined} onClick={onClose}>
          {BRAND_MARK
            ? <img className="mv4-mark mv4-mark--img" src={BRAND_MARK} alt="" aria-hidden="true" />
            : <span className="mv4-mark" aria-hidden="true">{COMMUNITY_NAME.slice(0, 1).toUpperCase()}</span>}
          <span className="mv4-brand__txt"><b>{COMMUNITY_NAME}</b><small>on MyCoNet</small></span>
        </Link>
        {!rail && toggle}
        <button ref={closeRef} type="button" className="mv4-close" onClick={onClose} aria-label="Close the menu"><Icon name="x" size={16} /></button>
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
        {rail && toggle}
        {state.me ? (
          <Link href={state.me.username ? `/u/${state.me.username}` : '/profile/edit'} className="mv4-me" onClick={onClose}
            data-tip={rail ? state.me.name : undefined} aria-label={rail ? state.me.name : undefined}>
            {state.me.avatar ? <img loading="lazy" decoding="async" src={state.me.avatar} alt="" className="mv4-av" /> : <span className="mv4-av">{state.me.name.slice(0, 1).toUpperCase()}</span>}
            <span className="mv4-me__txt"><b>{state.me.name}</b><small>{ROLE_LABELS[role] ?? 'Explorer'}</small></span>
            <span className="mv4-me__go"><Icon name="right" size={15} /></span>
          </Link>
        ) : null}
        <Link href="/changelog" className="mv4-version" onClick={onClose}>{VERSION}</Link>
      </div>
      {rail && tip && <span className="mv4-tip" role="presentation" style={{ top: tip.top, left: tip.left }}>{tip.text}</span>}
    </nav>
  )
}
