'use client'
/**
 * The interest picker, as Spotka has it (Sonia, 25 Nov 2026: "take it as Spotka has it"; decisions #89, #95):
 * "Your picks · N" with Review, a search that filters every pill in place, then one pastel card per group (its name,
 * a count, a chevron), one card open at a time, with soft borderless pills (#96) and "Something else" at the end that
 * opens a box for your own words. A flame marks what's popular here. With `share`, the picked pills can be
 * marked "Sharing" (they become offers, #90). "You might also pick" follows what you picked.
 *
 * The same layout on a phone and a computer: cards are full width and pills wrap. Styles: pill-picker.css.
 */
import { useId, useMemo, useState } from 'react'
import { Icon } from '.'
import { PILL_GROUPS, canonicalPill, groupOfPill, suggestPills, type PillStats } from '@/core/lib/skills-interests'
import './pill-picker.css'

const norm = (s: string) => s.trim().toLowerCase()
/** Listed by this many people here or more: the pill gets a flame */
const POPULAR = 3

export function PillPicker({ label, hint, hideLabel = false, value, onChange, stats, share, ownExample = 'Pottery' }: {
  label: string
  /** The screen's title already asks it (Start joining, #100) */
  hideLabel?: boolean
  hint?: string
  value: string[]
  onChange: (next: string[]) => void
  stats: PillStats
  /** The picked pills you'd share, and how to change them */
  share?: { value: string[]; onChange: (next: string[]) => void }
  ownExample?: string
}) {
  const id = useId()
  const has = (p: string) => value.some(v => norm(v) === norm(p))
  const [open, setOpen] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [review, setReview] = useState(true)
  const [ownOpen, setOwnOpen] = useState(false)
  const [own, setOwn] = useState('')
  const suggestions = useMemo(() => (value.length ? suggestPills(value, stats) : []), [value, stats])
  const q = norm(query)
  const found = q ? PILL_GROUPS.flatMap((g, gi) => g.pills.filter(p => norm(p).includes(q)).map(p => ({ p, gi }))) : []

  const toggle = (p: string) => {
    if (has(p)) {
      onChange(value.filter(v => norm(v) !== norm(p)))
      if (share) share.onChange(share.value.filter(v => norm(v) !== norm(p)))
    } else onChange([...value, canonicalPill(p)])
  }
  const addOwn = (t = own) => {
    const w = t.trim()
    if (w && !has(w)) onChange([...value, canonicalPill(w)])
    setOwn(''); setQuery('')
  }
  const sharing = (p: string) => !!share?.value.some(v => norm(v) === norm(p))
  const flipShare = (p: string) => share && share.onChange(sharing(p) ? share.value.filter(v => norm(v) !== norm(p)) : [...share.value, p])
  const tint = (gi: number) => (gi >= 0 ? { '--pp-bg': PILL_GROUPS[gi].bg, '--pp-line': PILL_GROUPS[gi].line } as React.CSSProperties : undefined)

  const pill = (p: string, gi = groupOfPill(p), extra = '') => {
    const on = has(p)
    const hot = (stats.count[p] ?? 0) >= POPULAR
    return (
      <button key={p} type="button" className={`pp-pill${extra}`} style={tint(gi)} aria-pressed={on} onClick={() => toggle(p)}>
        {on && <Icon name="check" size={16} />}{p}
        {hot && <span className="pp-hot" title="Popular here" aria-label="popular here"><Icon name="flame" size={16} /></span>}
      </button>
    )
  }
  const somethingElse = (
    <button type="button" className="pp-pill pp-pill--more" onClick={() => setOwnOpen(true)}><Icon name="plus" size={16} />Something else</button>
  )

  return (
    <fieldset className="pp">
      <legend className={hideLabel ? 'sr-only' : 'pp-legend'}><span>{label}</span>{hint && <small>{hint}</small>}</legend>

      {/* Your picks · N, with Review */}
      {value.length > 0 && <div className="pp-picks">
        <div className="pp-picks__row">
          <span className="pp-picks__t">Your picks · {value.length}</span>
          {value.length > 0 && <button type="button" className="pp-link" aria-expanded={review} onClick={() => setReview(!review)}>{review ? 'Hide' : 'Review'}</button>}
        </div>
        {review && <div className="pp-pills">{value.map(p => pill(p))}</div>}
      </div>}

      {share && value.length > 0 && (
        <div className="pp-row">
          <span className="pp-row__t">Happy to share any? They show as your offers</span>
          <div className="pp-pills">
            {value.map(p => (
              <button key={p} type="button" className="pp-pill pp-pill--share" aria-pressed={sharing(p)} onClick={() => flipShare(p)}>
                {sharing(p) && <Icon name="check" size={16} />}{p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search all, filtering in place */}
      <input className="v4-input pp-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search all" aria-label={`Search ${label}`} />

      {q ? (
        <div className="pp-found">
          {found.length > 0
            ? <div className="pp-pills">{found.map(({ p, gi }) => pill(p, gi))}</div>
            : <p className="pp-note">Nothing matches.</p>}
          <button type="button" className="pp-pill pp-pill--more" onClick={() => addOwn(query)}><Icon name="plus" size={16} />Add “{query.trim()}” as your own</button>
        </div>
      ) : (
        <div className="pp-groups">
          {PILL_GROUPS.map((g, gi) => {
            const n = g.pills.filter(has).length
            const isOpen = open === gi
            return (
              <div key={g.name} className="pp-group" style={tint(gi)} data-open={isOpen}>
                <button type="button" className="pp-group__head" aria-expanded={isOpen} aria-controls={`${id}-g${gi}`} onClick={() => setOpen(isOpen ? null : gi)}>
                  <span className="pp-group__text"><b>{g.name}</b></span>
                  {n > 0 && <span className="pp-group__n" aria-label={`${n} picked`}>{n}</span>}
                  <Icon name="down" size={20} className="pp-group__chev" />
                </button>
                {isOpen && <div className="pp-pills pp-group__body" id={`${id}-g${gi}`}>{g.pills.map(p => pill(p, gi))}{somethingElse}</div>}
              </div>
            )
          })}
        </div>
      )}

      {ownOpen && (
        <div className="pp-own">
          <input className="v4-input" value={own} onChange={e => setOwn(e.target.value)} placeholder={`In your own words, e.g. ${ownExample}`} aria-label={`Add your own to ${label}`} autoFocus
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOwn() } }} />
          <button type="button" className="v4-btn v4-btn--secondary v4-btn--sm" onClick={() => addOwn()} disabled={!own.trim()}>Add</button>
        </div>
      )}

      {suggestions.length > 0 && !q && (
        <div className="pp-row">
          <span className="pp-row__t">You might also pick</span>
          <div className="pp-pills">{suggestions.map(p => pill(p, groupOfPill(p), ' pp-pill--sug'))}</div>
        </div>
      )}
    </fieldset>
  )
}
