'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/core/components/v4'

/**
 * Design review (decision #22): the Members views as one segmented control that sits under the title, never
 * above it. Up to three show (Everyone · Matches for you · Discover; on a phone Discover moves into More);
 * the rest (My offers, My requests, My profile) are behind "More". Every tab of the old row keeps its address.
 */
type View = { href: string; label: string; short?: string; signedIn?: boolean; where: 'main' | 'wide' | 'more' }
const VIEWS: View[] = [
  { href: '/members', label: 'Everyone', where: 'main' },
  { href: '/members/matches', label: 'Matches for you', short: 'Matches', signedIn: true, where: 'main' },
  // A third view on wider screens; on a phone it sits in More so the row keeps room for search and Filter
  { href: '/members/discover', label: 'Discover', where: 'wide' },
  { href: '/members/offers', label: 'My offers', signedIn: true, where: 'more' },
  { href: '/members/requests', label: 'My requests', signedIn: true, where: 'more' },
  { href: '/members/profile', label: 'My profile', signedIn: true, where: 'more' },
]

const isOn = (href: string, path: string) => href === '/members' ? path === '/members' : path.startsWith(href)

export default function MembersViews({ signedIn, className }: { signedIn: boolean; className?: string }) {
  const path = usePathname() ?? '/members'
  // A visitor has two views (Everyone, Discover): both fit, so there is no More
  const views = signedIn ? VIEWS : VIEWS.filter(v => !v.signedIn).map(v => ({ ...v, where: 'main' as const }))
  const more = views.filter(v => v.where !== 'main')
  const moreOn = more.find(v => isOn(v.href, path))
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open])

  return (
    <nav className={`mbv${className ? ` ${className}` : ''}`} aria-label="Members views">
      {views.filter(v => v.where !== 'more').map(v => {
        const on = isOn(v.href, path)
        return (
          <Link key={v.href} href={v.href} className={`mbv__tab${on ? ' on' : ''}${v.where === 'wide' ? ' mbv__tab--wide' : ''}`} aria-current={on ? 'page' : undefined}>
            {v.short ? <><span className="mbv__long">{v.label}</span><span className="mbv__short">{v.short}</span></> : v.label}
          </Link>
        )
      })}
      {/* More holds the rest. On a phone it also holds Discover; when you're on one of them, More shows its name */}
      {more.length > 0 && (
        <div ref={box} className={`mbv__more${moreOn ? ' mbv__more--on' : ''}${moreOn?.where === 'wide' ? ' mbv__more--wide-on' : ''}`}>
          <button type="button" className="mbv__tab mbv__morebtn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
            {moreOn
              ? <><span className={moreOn.where === 'wide' ? 'mbv__short' : undefined}>{moreOn.label}</span>{moreOn.where === 'wide' && <span className="mbv__long">More</span>}</>
              : 'More'}
            <Icon name="down" size={16} />
          </button>
          {open && (
            <div className="mbv__menu" role="menu">
              {more.map(v => {
                const on = isOn(v.href, path)
                return (
                  <Link key={v.href} href={v.href} role="menuitem" onClick={() => setOpen(false)} className={`mbv__item${on ? ' on' : ''}${v.where === 'wide' ? ' mbv__item--phone' : ''}`} aria-current={on ? 'page' : undefined}>
                    {v.label}{on && <Icon name="check" size={16} />}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
