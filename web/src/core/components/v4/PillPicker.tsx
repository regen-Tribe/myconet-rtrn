'use client'
/**
 * Groups first, then pills (Sonia, 25 Nov 2026; design/decisions.md #89). Tap a group to open its pills, pick a few,
 * add your own. "You might also pick" follows what you picked; a small number on a pill says how many people here
 * already have it. With `share`, the picked pills can be marked "Sharing" (they become offers, #90).
 *
 * Phone: the groups are one row that scrolls sideways; from 960px they wrap. Styles: pill-picker.css (design review).
 */
import { useId, useMemo, useState } from 'react'
import { Icon } from '.'
import { PILL_GROUPS, canonicalPill, groupOfPill, suggestPills, type PillStats } from '@/core/lib/skills-interests'
import './pill-picker.css'

const norm = (s: string) => s.trim().toLowerCase()

export function PillPicker({ label, hint, value, onChange, stats, share, ownExample = 'Pottery' }: {
  label: string
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
  const firstGroup = Math.max(0, value.map(groupOfPill).find(g => g >= 0) ?? 0)
  const [open, setOpen] = useState(firstGroup)
  const [own, setOwn] = useState('')
  const group = PILL_GROUPS[open]
  const suggestions = useMemo(() => suggestPills(value, stats), [value, stats])

  const toggle = (p: string) => {
    if (has(p)) {
      onChange(value.filter(v => norm(v) !== norm(p)))
      if (share) share.onChange(share.value.filter(v => norm(v) !== norm(p)))
    } else onChange([...value, canonicalPill(p)])
  }
  const addOwn = () => {
    const t = own.trim()
    if (t && !has(t)) onChange([...value, canonicalPill(t)])
    setOwn('')
  }
  const sharing = (p: string) => !!share?.value.some(v => norm(v) === norm(p))
  const flipShare = (p: string) => share && share.onChange(sharing(p) ? share.value.filter(v => norm(v) !== norm(p)) : [...share.value, p])

  const pill = (p: string, sug = false) => {
    const n = stats.count[p]
    return (
      <button key={p} type="button" className={`pp-pill${sug ? ' pp-pill--sug' : ''}`} aria-pressed={!sug && has(p)} onClick={() => toggle(p)}>
        {sug && <Icon name="plus" size={16} />}{p}{n ? <span className="pp-pill__n" aria-label={`${n} here`}>{n}</span> : null}
      </button>
    )
  }

  return (
    <fieldset className="pp">
      <legend className="pp-legend"><span>{label}</span>{hint && <small>{hint}</small>}</legend>

      <div className="pp-groups" role="group" aria-label="Groups">
        {PILL_GROUPS.map((g, i) => {
          const n = g.pills.filter(has).length
          return (
            <button key={g.name} type="button" className={`v4-chip${i === open ? ' v4-chip--on' : ''}`} aria-pressed={i === open} aria-controls={`${id}-panel`} onClick={() => setOpen(i)}>
              {g.name}{n > 0 && <span className="pp-count">{n}</span>}
            </button>
          )
        })}
      </div>

      <div className="pp-panel" id={`${id}-panel`} role="region" aria-label={group.name}>
        <div className="pp-pills">{group.pills.map(p => pill(p))}</div>
        <div className="pp-own">
          <input className="v4-input" value={own} onChange={e => setOwn(e.target.value)} placeholder={`Your own, e.g. ${ownExample}`} aria-label={`Add your own to ${label}`}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOwn() } }} />
          <button type="button" className="v4-btn v4-btn--secondary v4-btn--sm" onClick={addOwn} disabled={!own.trim()}>Add</button>
        </div>
      </div>

      {value.length > 0 && (
        <div className="pp-row">
          <span className="pp-row__t">Picked · {value.length}</span>
          <div className="pp-pills">
            {value.map(p => (
              <button key={p} type="button" className="pp-pill" aria-pressed="true" aria-label={`Remove ${p}`} onClick={() => toggle(p)}>
                {p}<Icon name="x" size={16} />
              </button>
            ))}
          </div>
        </div>
      )}

      {share && value.length > 0 && (
        <div className="pp-row">
          <span className="pp-row__t">Excited to share any of these? Tap them</span>
          <div className="pp-pills">
            {value.map(p => (
              <button key={p} type="button" className="pp-pill pp-pill--share" aria-pressed={sharing(p)} onClick={() => flipShare(p)}>
                {sharing(p) && <Icon name="check" size={16} />}{p}
              </button>
            ))}
          </div>
          <small className="pp-note">Each one you share shows under Offers on your profile.</small>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="pp-row">
          <span className="pp-row__t">{value.length ? 'You might also pick' : 'Popular here'}</span>
          <div className="pp-pills">{suggestions.map(p => pill(p, true))}</div>
        </div>
      )}
    </fieldset>
  )
}
