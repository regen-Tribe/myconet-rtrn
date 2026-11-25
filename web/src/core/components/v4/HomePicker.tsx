'use client'
/**
 * "Where do you call home?": type a town, pick it from GeoNames' world list (towns over 15,000 people and capitals;
 * CC BY 4.0, credited under the field), or keep what you typed. More than one place (decision #97). The list is our
 * own file (/places/towns.json, built by scripts/build-towns.mjs), loaded the first time the field is used, so
 * nothing anyone types leaves MyCoNet.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '.'
import type { Home } from '@/core/lib/homes'
import './pill-picker.css'

type Town = [name: string, ascii: string, cc: string]
let townsPromise: Promise<Town[]> | null = null
const loadTowns = () => (townsPromise ??= fetch('/places/towns.json').then(r => r.json()).then(d => d.towns as Town[]).catch(() => { townsPromise = null; return [] }))

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const MAX = 5

export function HomePicker({ value, onChange, label = 'Where do you call home?' }: { value: Home[]; onChange: (next: Home[]) => void; label?: string }) {
  const [q, setQ] = useState('')
  const [towns, setTowns] = useState<Town[] | null>(null)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const region = useMemo(() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }) } catch { return null } }, [])
  const countryOf = (cc: string) => region?.of(cc) ?? cc

  useEffect(() => { if (q && !towns) loadTowns().then(setTowns) }, [q, towns])

  const matches = useMemo(() => {
    const f = fold(q)
    if (f.length < 2 || !towns) return []
    const starts: Town[] = [], within: Town[] = []
    for (const t of towns) {
      const a = fold(t[0]), b = t[1] ? fold(t[1]) : ''
      if (a.startsWith(f) || b.startsWith(f)) starts.push(t)
      else if (within.length < 6 && (a.includes(f) || b.includes(f))) within.push(t)
      if (starts.length >= 6) break
    }
    return [...starts, ...within].slice(0, 6)
  }, [q, towns])

  // On a phone the suggestions would open behind the bottom bar: bring them into view (scroll-margin in the CSS)
  const shown = q.trim().length >= 2 ? matches.length + 1 : 0
  useEffect(() => { if (shown) list.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [shown])

  const add = (h: Home) => {
    if (!h.city.trim() || value.length >= MAX) return
    if (!value.some(v => fold(v.city) === fold(h.city) && fold(v.country) === fold(h.country))) onChange([...value, h])
    setQ(''); setActive(0); input.current?.focus()
  }
  // Typed and not picked: "Ericeira, Portugal" keeps both parts; "Ericeira" keeps the city
  const typed = (): Home => { const [c, ...k] = q.split(','); return { city: c.trim(), country: k.join(',').trim() } }

  return (
    <div className="hp">
      <span className="hp-label" id="hp-label">{label}</span>
      {value.length > 0 && (
        <div className="pp-pills">
          {value.map((h, i) => (
            <button key={`${h.city}|${h.country}|${i}`} type="button" className="pp-pill" aria-pressed="true" aria-label={`Remove ${h.city}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Icon name="pin" size={16} />{[h.city, h.country].filter(Boolean).join(', ')}<Icon name="x" size={16} />
            </button>
          ))}
        </div>
      )}
      {value.length < MAX && (
        <div className="hp-box">
          <input ref={input} className="v4-input hp-input" value={q} onChange={e => { setQ(e.target.value); setActive(0) }}
            placeholder={value.length ? 'Add another city' : 'Type a city'} aria-labelledby="hp-label" autoComplete="off"
            role="combobox" aria-expanded={matches.length > 0} aria-controls="hp-list"
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, matches.length)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
              if (e.key === 'Enter') {
                e.preventDefault()
                const t = matches[active]
                add(t ? { city: t[0], country: countryOf(t[2]) } : typed())
              }
            }} />
          {q.trim().length >= 2 && (
            <ul ref={list} className="hp-list" id="hp-list" role="listbox">
              {matches.map((t, i) => (
                <li key={`${t[0]}|${t[2]}`} role="option" aria-selected={i === active}>
                  <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => add({ city: t[0], country: countryOf(t[2]) })}>
                    <Icon name="pin" size={16} /><b>{t[0]}</b><small>{countryOf(t[2])}</small>
                  </button>
                </li>
              ))}
              <li role="option" aria-selected={active === matches.length}>
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => add(typed())}>
                  <Icon name="plus" size={16} /><span>Use “{q.trim()}”</span>
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
      <small className="hp-credit">Places: <a href="https://www.geonames.org" target="_blank" rel="noopener noreferrer">GeoNames</a></small>
    </div>
  )
}
