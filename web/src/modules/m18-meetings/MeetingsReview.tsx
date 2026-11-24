'use client'
/**
 * Meetings, the 22–23 Nov 2026 design review (decisions #4, #37, #38, #50). Only used when DESIGN_REVIEW is on
 * (core/lib/instance.ts); styles in ./meetings-v4.css, all under html[data-review] (`mtr-` classes).
 *
 * The list's one toolbar row: the circle picker (My circles / All circles / one circle), search, and one Filter
 * button that holds "Needs review". Filter is a pop-over on a computer and a bottom sheet on a phone, with a
 * black count when on; on a phone the search is an icon that opens over the row while you type.
 * Same look as Calendar's (m14-events, PR #176) and The space's (m15-bookings, PR #182) Filter. When a shared
 * Toolbar / Filter lands in core/components/v4, all three should move onto it.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Count, Icon } from '@/core/components/v4'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

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
    <div ref={panel} id={id} className={cx('mtr-filter', phone && 'mtr-filter--sheet')} role="dialog" aria-label={label}>
      {phone && <div className="mtr-filter__grab" aria-hidden />}
      <div className="mtr-filter__head"><b>Filter</b>{on > 0 && <button type="button" className="mtr-link" onClick={onClear}>Clear all</button>}</div>
      <div className="mtr-filter__scroll">
        {groups.map(g => (
          <fieldset key={g.legend} className="mtr-filter__group">
            <legend>{g.legend}</legend>
            {g.options.map(o => (
              <label key={o.value ?? '∅'} className={cx('mtr-row', g.value === o.value && 'mtr-row--on')}>
                <input type="radio" name={`${id}-${g.legend}`} checked={g.value === o.value} onChange={() => g.onPick(o.value)} />
                <span className="mtr-row__name">{o.label}</span>
                {o.count != null && o.count > 0 && <span className="mtr-row__count">{o.count}</span>}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="mtr-filter__foot">
        <button type="button" className="v4-btn v4-btn--primary v4-btn--sm" onClick={close}><span>Done</span></button>
      </div>
    </div>
  )

  return (
    <div ref={box} className="mtr-filterbox">
      <button ref={btn} type="button" className={cx('mtr-filterbtn', on > 0 && 'mtr-filterbtn--on')}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
        aria-label={on > 0 ? `Filter, ${on} on` : 'Filter'}
        onClick={() => setOpen(o => !o)}>
        <Icon name="filter" size={16} /><span className="mtr-filterbtn__label">Filter</span>
        {on > 0 && <Count n={on} />}
      </button>
      {open && (phone ? createPortal(<><div className="mtr-scrim" onClick={() => setOpen(false)} aria-hidden />{body}</>, document.body) : body)}
    </div>
  )
}

/**
 * The one toolbar row: `picker` (the circle picker) on the left, then search, then Filter. Filter is left out
 * when it would be empty (members have no "Needs review"), so the row is then the picker and search.
 */
export function MeetingsBar({ picker, search, filter }: {
  picker: React.ReactNode
  search: { value: string; onChange: (q: string) => void; placeholder: string; label: string }
  filter?: { groups: FilterGroup[]; onClear: () => void; label: string }
}) {
  const [searching, setSearching] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  // On a phone the search opens over the row; it stays open while it holds words
  const open = searching || !!search.value

  return (
    <div className={cx('mtr-bar', open && 'mtr-bar--search')}>
      <div className="mtr-bar__picker">{picker}</div>
      <button type="button" className="mtr-iconbtn mtr-search__open" aria-label={search.label}
        onClick={() => { setSearching(true); requestAnimationFrame(() => input.current?.focus()) }}>
        <Icon name="search" size={16} />
      </button>
      <label className="mtr-search">
        <Icon name="search" size={16} />
        <input ref={input} type="search" className="no-min-height" value={search.value} placeholder={search.placeholder} aria-label={search.label}
          onChange={e => search.onChange(e.target.value)} onFocus={() => setSearching(true)} onBlur={() => setSearching(false)} />
        <button type="button" className="mtr-search__close" aria-label="Close search"
          onMouseDown={e => e.preventDefault()} onClick={() => { search.onChange(''); setSearching(false); input.current?.blur() }}>
          <Icon name="x" size={16} />
        </button>
      </label>
      {filter && <FilterButton {...filter} />}
    </div>
  )
}
