'use client'
/**
 * The space, the 22 Nov 2026 design review (decision #23; instance/design/ux-review-2026-11-22.html). Only used when
 * DESIGN_REVIEW is on (core/lib/instance.ts); styles in ./space-review.css, all under html[data-review].
 *
 * Both pages of The space (/amenities and /map) share one toolbar row:
 *   Places · Map · My bookings, search, and one Filter button. There is no Manage tab (decision #43): whoever can
 *   manage a thing has an Edit button on its photo (PhotoEdit), and requests and the inventory are in Admin › Bookings.
 * Filter is a pop-over on a computer and a bottom sheet on a phone; the button carries a black count when on.
 * On a phone the search is an icon that opens over the row while you type.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Count, Icon } from '@/core/components/v4'
import './space-review.css'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** The heading and purpose line of both pages (LEXICON: The space) */
export const SPACE_TITLE = 'The space'
export const SPACE_PURPOSE = 'Places to stay, spaces and tools to share, and the map.'

export type SpaceView = 'places' | 'map' | 'mine'

const VIEW_LABEL: Record<SpaceView, string> = { places: 'Places', map: 'Map', mine: 'My bookings' }
const VIEW_HREF: Record<SpaceView, string> = { places: '/amenities', map: '/map', mine: '/amenities?tab=mine' }

/** Phone width (the review's phone breakpoint). False until mounted, so the server and first paint agree. */
function usePhone(): boolean {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const on = () => setPhone(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return phone
}

/** The view switch. Views this page can show switch in place (`onPick`); the others are links to the other page. */
function SpaceViews({ on, views, onPick, counts }: {
  on: SpaceView
  views: SpaceView[]
  onPick?: Partial<Record<SpaceView, () => void>>
  counts?: Partial<Record<SpaceView, number>>
}) {
  return (
    <nav className="spr-seg" aria-label={SPACE_TITLE}>
      {views.map(v => {
        const n = counts?.[v] ?? 0
        const inner = <>{VIEW_LABEL[v]}{n > 0 && <Count n={n} label={`${n} upcoming`} />}</>
        const pick = onPick?.[v]
        return pick
          ? <button key={v} type="button" className={cx(v === on && 'on')} aria-current={v === on ? 'page' : undefined} onClick={pick}>{inner}</button>
          : <Link key={v} href={VIEW_HREF[v]} className={cx(v === on && 'on')} aria-current={v === on ? 'page' : undefined}>{inner}</Link>
      })}
    </nav>
  )
}

/** One choice in a Filter group */
export type FilterOption = { value: string | null; label: string; count?: number }
/** A Filter group: pick one (a null value is "all") */
export type FilterGroup = { legend: string; options: FilterOption[]; value: string | null; onPick: (v: string | null) => void }

function FilterButton({ groups, onClear, label }: { groups: FilterGroup[]; onClear: () => void; label: string }) {
  const phone = usePhone()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const id = useId()
  const on = groups.filter(g => g.value !== null).length

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    const onDown = (e: MouseEvent) => { const t = e.target as Node; if (!box.current?.contains(t) && !panel.current?.contains(t)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open])

  const close = () => { setOpen(false); btn.current?.focus() }
  const body = (
    <div ref={panel} id={id} className={cx('spr-filter', phone && 'spr-filter--sheet')} role="dialog" aria-label={label}>
      {phone && <div className="spr-filter__grab" aria-hidden />}
      <div className="spr-filter__head"><b>Filter</b>{on > 0 && <button type="button" className="spr-link" onClick={onClear}>Clear all</button>}</div>
      <div className="spr-filter__scroll">
        {groups.map(g => (
          <fieldset key={g.legend} className="spr-filter__group">
            <legend>{g.legend}</legend>
            {g.options.map(o => (
              <label key={o.value ?? '∅'} className={cx('spr-row', g.value === o.value && 'spr-row--on')}>
                <input type="radio" name={`${id}-${g.legend}`} checked={g.value === o.value} onChange={() => g.onPick(o.value)} />
                <span className="spr-row__name">{o.label}</span>
                {o.count != null && o.count > 0 && <span className="spr-row__count">{o.count}</span>}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="spr-filter__foot">
        <button type="button" className="v4-btn v4-btn--primary v4-btn--sm" onClick={close}><span>Done</span></button>
      </div>
    </div>
  )

  return (
    <div ref={box} className="spr-filterbox">
      <button ref={btn} type="button" className={cx('spr-filterbtn', on > 0 && 'spr-filterbtn--on')}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
        aria-label={on > 0 ? `Filter, ${on} on` : 'Filter'}
        onClick={() => setOpen(o => !o)}>
        <Icon name="filter" size={16} /><span className="spr-filterbtn__label">Filter</span>
        {on > 0 && <Count n={on} />}
      </button>
      {open && (phone ? createPortal(<><div className="spr-scrim" onClick={() => setOpen(false)} aria-hidden />{body}</>, document.body) : body)}
    </div>
  )
}

/**
 * The one toolbar row. `search` and `filter` are left out on views they don't apply to (My bookings),
 * so the row is then just the views.
 */
export function SpaceBar({ on, views, onPick, counts, search, filter }: {
  on: SpaceView
  views: SpaceView[]
  onPick?: Partial<Record<SpaceView, () => void>>
  counts?: Partial<Record<SpaceView, number>>
  search?: { value: string; onChange: (q: string) => void; placeholder: string; label: string }
  filter?: { groups: FilterGroup[]; onClear: () => void; label: string }
}) {
  const [searching, setSearching] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  // On a phone the search opens over the row; it stays open while it holds words
  const open = searching || !!search?.value
  const seg = useRef<HTMLDivElement>(null)
  // A view further along the switch scrolls into sight when it's the one shown (a narrow phone)
  useEffect(() => { seg.current?.querySelector<HTMLElement>('.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }, [on])

  return (
    <div className={cx('spr-bar', open && 'spr-bar--search')}>
      <div className="spr-bar__views" ref={seg}><SpaceViews on={on} views={views} onPick={onPick} counts={counts} /></div>
      {search && (
        <>
          <button type="button" className="spr-iconbtn spr-search__open" aria-label={search.label}
            onClick={() => { setSearching(true); requestAnimationFrame(() => input.current?.focus()) }}>
            <Icon name="search" size={16} />
          </button>
          <label className="spr-search">
            <Icon name="search" size={16} />
            <input ref={input} type="search" className="no-min-height" value={search.value} placeholder={search.placeholder} aria-label={search.label}
              onChange={e => search.onChange(e.target.value)} onFocus={() => setSearching(true)} onBlur={() => setSearching(false)} />
            <button type="button" className="spr-search__close" aria-label="Close search"
              onMouseDown={e => e.preventDefault()} onClick={() => { search.onChange(''); setSearching(false); input.current?.blur() }}>
              <Icon name="x" size={16} />
            </button>
          </label>
        </>
      )}
      {filter && <FilterButton {...filter} />}
    </div>
  )
}

/** One quiet line at the point of use, instead of a banner (visitor: sign in to book; explorer: opens when you join) */
export function SpaceNote({ children }: { children: React.ReactNode }) {
  return <p className="spr-note"><Icon name="lock" size={16} /><span>{children}</span></p>
}

/**
 * The round Edit button on a card's photo, for whoever can manage that thing (decision #43, in place of a Manage
 * tab). One thing: it opens its edit form. A card that groups several (Dorm 1's beds): it lists them to pick from.
 * It sits beside the card, not inside it, because the card is itself a button or a link.
 */
export function PhotoEdit<T extends { id: string; name: string }>({ items, label, onEdit }: { items: T[]; label: string; onEdit: (item: T) => void }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open])
  if (items.length === 0) return null
  const one = items.length === 1
  return (
    <div ref={box} className="spr-edit">
      <button type="button" className="spr-edit__btn" aria-label={`Edit ${label}`} title={`Edit ${label}`}
        aria-haspopup={one ? undefined : 'menu'} aria-expanded={one ? undefined : open} aria-controls={!one && open ? id : undefined}
        onClick={() => (one ? onEdit(items[0]) : setOpen(o => !o))}>
        <Icon name="pencil" size={16} />
      </button>
      {!one && open && (
        <div id={id} role="menu" className="spr-edit__menu" aria-label={`Edit ${label}`}>
          {items.map(i => (
            <button key={i.id} type="button" role="menuitem" onClick={() => { setOpen(false); onEdit(i) }}>{i.name}</button>
          ))}
        </div>
      )}
    </div>
  )
}
