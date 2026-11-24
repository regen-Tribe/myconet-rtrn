'use client'
import { CircleSeal } from './CircleSeal'

/**
 * The one way to filter by circle in the v4 look (v4.68.0, Sonia's option A).
 *
 * A "Circles ▾" button opens a list of every circle with its colour dot, how many things it has and
 * a search box; people tick one or several. The chosen circles show beside the button as pills with ✕.
 * On a computer the list is a pop-over under the button; on a phone it slides up from the bottom.
 * Nothing scrolls sideways. Empty `value` means every circle.
 *
 * The page keeps the state (and, where it wants, the URL: see `parseCircleParam` / `circleParam`).
 */
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './index'

export type CircleOption = { slug: string; label: string; color: string; count?: number }

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function CircleFilter({ options, value, onChange, mine = [], label = 'Circles', className, compact = false }: {
  options: CircleOption[]
  /** The chosen circles' slugs; [] = all circles */
  value: string[]
  onChange: (next: string[]) => void
  /** The viewer's own circles: adds a "My circles" shortcut at the top of the list */
  mine?: string[]
  label?: string
  className?: string
  /**
   * One toolbar row (design review, Meetings): the button says what is shown (My circles, All circles, one
   * circle with its seal, or "3 circles") and nothing sits beside it; the list starts with "All circles".
   */
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  // On a phone the list is a sheet from the bottom, put on <body> so nothing on the page sits above it
  const [sheet, setSheet] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const listId = useId()

  // Close on Escape or a click outside (the phone sheet's backdrop closes it on its own click)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    const onDown = (e: MouseEvent) => { const t = e.target as Node; if (!box.current?.contains(t) && !panel.current?.contains(t)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open])

  const byslug = new Map(options.map(o => [o.slug, o]))
  const chosen = value.filter(s => byslug.has(s))
  const myOwn = mine.filter(s => byslug.has(s))
  const mineOn = myOwn.length > 0 && myOwn.length === chosen.length && myOwn.every(s => chosen.includes(s))
  const needle = q.trim().toLowerCase()
  const shown = needle ? options.filter(o => o.label.toLowerCase().includes(needle)) : options
  const one = chosen.length === 1 ? byslug.get(chosen[0]) : undefined
  const compactLabel = mineOn ? 'My circles'
    : chosen.length === 0 ? `All ${label.toLowerCase()}`
    : one ? <><CircleSeal slug={one.slug} size={16} />{one.label}</>
    : `${chosen.length} ${label.toLowerCase()}`
  const toggle = (slug: string) => onChange(chosen.includes(slug) ? chosen.filter(s => s !== slug) : [...chosen, slug])

  const list = (
    <div ref={panel} id={listId} className={cx('v4-cf__panel', sheet && 'v4-cf__panel--sheet')} role="dialog" aria-label={`Filter by ${label.toLowerCase()}`}>
      <div className="v4-cf__grab" aria-hidden />
      <div className="v4-cf__title">{label}</div>
      {options.length > 6 && (
        <label className="v4-cf__find">
          <Icon name="search" size={15} />
          <input type="search" className="v4-input no-min-height" value={q} onChange={e => setQ(e.target.value)} placeholder="Find a circle" aria-label="Find a circle" />
        </label>
      )}
      <div className="v4-cf__list">
        {compact && !needle && (
          <label className={cx('v4-cf__row', chosen.length === 0 && 'v4-cf__row--on')}>
            <input type="checkbox" checked={chosen.length === 0} onChange={() => onChange([])} />
            <Icon name="circles" size={14} className="v4-cf__all" /><span className="v4-cf__name">All {label.toLowerCase()}</span>
          </label>
        )}
        {!needle && myOwn.length > 0 && <>
          <label className={cx('v4-cf__row', mineOn && 'v4-cf__row--on')}>
            <input type="checkbox" checked={mineOn} onChange={() => onChange(mineOn ? [] : myOwn)} />
            <Icon name="star" size={14} /><span className="v4-cf__name">My circles</span>
            <span className="v4-cf__count">{myOwn.length}</span>
          </label>
          <div className="v4-cf__sep" />
        </>}
        {shown.map(o => {
          const on = chosen.includes(o.slug)
          return (
            <label key={o.slug} className={cx('v4-cf__row', on && 'v4-cf__row--on')}>
              <input type="checkbox" checked={on} onChange={() => toggle(o.slug)} />
              <CircleSeal slug={o.slug} size={18} />
              <span className="v4-cf__name">{o.label}</span>
              {o.count != null && <span className="v4-cf__count">{o.count}</span>}
            </label>
          )
        })}
        {shown.length === 0 && <p className="v4-cf__none">{needle ? <>No circle called “{q.trim()}”.</> : 'No circles yet.'}</p>}
      </div>
      <div className="v4-cf__foot">
        <button type="button" className="v4-btn v4-btn--quiet v4-btn--sm" onClick={() => onChange([])} disabled={chosen.length === 0}><span>Clear</span></button>
        <button type="button" className="v4-btn v4-btn--primary v4-btn--sm" onClick={() => { setOpen(false); btn.current?.focus() }}><span>Done</span></button>
      </div>
    </div>
  )

  return (
    <div ref={box} className={cx('v4-cf', className)}>
      <button ref={btn} type="button" className={cx('v4-cf__btn', chosen.length > 0 && 'v4-cf__btn--on')}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? listId : undefined} onClick={() => { setQ(''); setSheet(window.matchMedia('(max-width: 640px)').matches); setOpen(o => !o) }}>
        {compact ? compactLabel : <>{mineOn ? 'My circles' : label}{chosen.length > 0 && !mineOn && <span className="v4-cf__n">{chosen.length}</span>}</>}
        <Icon name="down" size={14} />
      </button>
      {!compact && !mineOn && chosen.map(s => {
        const o = byslug.get(s)!
        return (
          <span key={s} className="v4-cf__pill">
            <CircleSeal slug={o.slug} size={16} />{o.label}
            <button type="button" className="no-min-height" onClick={() => toggle(s)} aria-label={`Stop filtering by ${o.label}`}><Icon name="x" size={11} /></button>
          </span>
        )
      })}
      {!compact && chosen.length > 0 && <button type="button" className="v4-cf__clear no-min-height" onClick={() => onChange([])}>{mineOn ? 'All circles' : 'Clear'}</button>}

      {open && (sheet ? createPortal(<><div className="v4-cf__scrim" onClick={() => setOpen(false)} aria-hidden />{list}</>, document.body) : list)}
    </div>
  )
}

/** Read `?circle=` (one slug, or several joined with commas) into a list; unknown slugs drop out. */
export function parseCircleParam(raw: string | null | undefined, known: (slug: string) => boolean): string[] {
  if (!raw) return []
  return [...new Set(raw.split(',').map(s => s.trim()).filter(s => s && known(s)))]
}

/** Write the chosen circles into the page's address (`?circle=a,b`), so links and the back button keep them. */
export function setCircleParam(slugs: string[], key = 'circle') {
  const url = new URL(window.location.href)
  if (slugs.length) url.searchParams.set(key, slugs.join(',')); else url.searchParams.delete(key)
  window.history.replaceState(window.history.state, '', url.toString())
}
