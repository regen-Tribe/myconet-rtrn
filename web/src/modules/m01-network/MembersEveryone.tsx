'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Count, EmptyState, Icon } from '@/core/components/v4'
import { CircleSeal } from '@/core/components/v4/CircleSeal'
import { parseCircleParam, setCircleParam } from '@/core/components/v4/CircleFilter'
import MembersViews from './MembersViews'
import type { MemberCard } from './MembersGridV4'
import './members-v4.css'

type CircleOpt = { slug: string; name: string; color: string }
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
const toggle = (list: string[], v: string) => list.includes(v) ? list.filter(x => x !== v) : [...list, v]
/** Options people actually have, most common first, with how many have each. "Cooking" and "cooking" are one
 *  option: `value` is the lower-case key, `label` the first spelling seen. */
function tally(lists: string[][]): { value: string; label: string; n: number }[] {
  const m = new Map<string, { label: string; n: number }>()
  for (const l of lists) for (const v of new Set(l.map(x => x.toLowerCase()))) {
    const label = l.find(x => x.toLowerCase() === v) ?? v
    const e = m.get(v); if (e) e.n++; else m.set(v, { label, n: 1 })
  }
  return [...m].map(([value, e]) => ({ value, ...e })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
}

/**
 * Members › Everyone with the design review on (decision #22): one toolbar row (the views, search, one Filter
 * button with a black count), then the people. Filter holds circles, offers and requests, and skills (a bottom
 * sheet on phones). Cards show a name, one line (their first offer, or what they do) and their circles' seals.
 */
export default function MembersEveryone({ people, circles, signedIn }: { people: MemberCard[]; circles: CircleOpt[]; signedIn: boolean }) {
  const params = useSearchParams()
  const [picked, setPicked] = useState<string[]>(() => parseCircleParam(params.get('circle'), () => true))
  const [kinds, setKinds] = useState<string[]>([])      // offer categories
  const [has, setHas] = useState<string[]>([])          // 'offer' | 'request'
  const [skills, setSkills] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)     // phones: the search field takes the row
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const pickCircles = (next: string[]) => { setPicked(next); setCircleParam(next) }
  const circleOn = picked.filter(s => circles.some(c => c.slug === s))
  const query = q.trim().toLowerCase()

  const shown = people
    .filter(p => !circleOn.length || p.circles.some(c => circleOn.includes(c.slug)))
    .filter(p => !kinds.length || p.offerKinds.some(k => kinds.includes(k.toLowerCase())))
    .filter(p => !has.includes('offer') || p.offers.length > 0)
    .filter(p => !has.includes('request') || p.requests.length > 0)
    .filter(p => !skills.length || p.skills.some(s => skills.includes(s.toLowerCase())))
    .filter(p => !query || [p.name, p.username ?? '', p.headline ?? '', ...p.offers, ...p.requests, ...p.skills, ...p.circles.map(c => c.name)].some(s => s.toLowerCase().includes(query)))

  const nOn = circleOn.length + kinds.length + has.length + skills.length
  const clearAll = () => { pickCircles([]); setKinds([]); setHas([]); setSkills([]) }

  // Options: only what someone has (an empty choice is hidden), with counts
  const inCircle = (slug: string) => people.filter(p => p.circles.some(c => c.slug === slug)).length
  const circleOpts = circles.map(c => ({ ...c, n: inCircle(c.slug) })).filter(c => c.n > 0)
  const mine = people.find(p => p.you)?.circles.map(c => c.slug).filter(s => circleOpts.some(c => c.slug === s)) ?? []
  const mineOn = mine.length > 0 && mine.length === circleOn.length && mine.every(s => circleOn.includes(s))
  const kindOpts = signedIn ? tally(people.map(p => p.offerKinds)) : []
  const withOffer = people.filter(p => p.offers.length > 0).length
  const withRequest = people.filter(p => p.requests.length > 0).length
  const skillOpts = signedIn ? tally(people.map(p => p.skills)) : []
  const [allSkills, setAllSkills] = useState(false)

  // Close the filter on Escape or a click outside it
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    const onDown = (e: MouseEvent) => { const t = e.target as Node; if (!panel.current?.contains(t) && !btn.current?.contains(t)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open])
  useEffect(() => { if (searching) input.current?.focus() }, [searching])

  const opt = (key: string, on: boolean, onChange: () => void, label: React.ReactNode, n: number, lead?: React.ReactNode) => (
    <label key={key} className={cx('mbr-opt', on && 'mbr-opt--on')}>
      <input type="checkbox" checked={on} onChange={onChange} />
      {lead}<span className="mbr-opt__name">{label}</span><span className="mbr-opt__n">{n}</span>
    </label>
  )

  const filter = (
    <div ref={panel} className={cx('mbr-panel', sheet && 'mbr-panel--sheet')} role="dialog" aria-label="Filter members">
      {sheet && <div className="mbr-panel__grab" aria-hidden />}
      <div className="mbr-panel__body">
        {circleOpts.length > 0 && (
          <fieldset className="mbr-sec">
            <legend>Circles</legend>
            {mine.length > 0 && opt('mine', mineOn, () => pickCircles(mineOn ? [] : mine), 'My circles', mine.length, <Icon name="star" size={16} />)}
            {circleOpts.map(c => opt(c.slug, circleOn.includes(c.slug), () => pickCircles(toggle(circleOn, c.slug)), c.name, c.n, <CircleSeal slug={c.slug} size={16} />))}
          </fieldset>
        )}
        {signedIn && (withOffer > 0 || withRequest > 0) && (
          <fieldset className="mbr-sec">
            <legend>Offers and requests</legend>
            {withOffer > 0 && opt('offer', has.includes('offer'), () => setHas(toggle(has, 'offer')), 'Offers something', withOffer, <Icon name="gift" size={16} />)}
            {withRequest > 0 && opt('request', has.includes('request'), () => setHas(toggle(has, 'request')), 'Looking for something', withRequest, <Icon name="hand" size={16} />)}
            {kindOpts.length > 1 && <div className="mbr-chips" aria-label="Kind of offer">
              {kindOpts.map(k => <button key={k.value} type="button" className={cx('mbr-chip', kinds.includes(k.value) && 'on')} aria-pressed={kinds.includes(k.value)} onClick={() => setKinds(toggle(kinds, k.value))}>{k.label}</button>)}
            </div>}
          </fieldset>
        )}
        {skillOpts.length > 0 && (
          <fieldset className="mbr-sec">
            <legend>Skills</legend>
            <div className="mbr-chips">
              {(allSkills ? skillOpts : skillOpts.slice(0, 12)).map(s => <button key={s.value} type="button" className={cx('mbr-chip', skills.includes(s.value) && 'on')} aria-pressed={skills.includes(s.value)} onClick={() => setSkills(toggle(skills, s.value))}>{s.label}</button>)}
              {!allSkills && skillOpts.length > 12 && <button type="button" className="mbr-chip mbr-chip--more" onClick={() => setAllSkills(true)}>+{skillOpts.length - 12} more</button>}
            </div>
          </fieldset>
        )}
      </div>
      <div className="mbr-panel__foot">
        <button type="button" className="v4-btn v4-btn--quiet v4-btn--sm" onClick={clearAll} disabled={nOn === 0}><span>Clear</span></button>
        <button type="button" className="v4-btn v4-btn--primary v4-btn--sm" onClick={() => { setOpen(false); btn.current?.focus() }}><span>Show {shown.length} {shown.length === 1 ? 'person' : 'people'}</span></button>
      </div>
    </div>
  )

  return (
    <section className="mbr" aria-label="Everyone">
      <div className={cx('mbr-bar', searching && 'mbr-bar--searching')}>
        <MembersViews signedIn={signedIn} className="mbr-bar__views" />
        <label className="mb4-search mbr-search">
          <Icon name="search" size={20} />
          <input ref={input} type="search" className="mb4-search__input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, skill, offer, circle" aria-label="Search members" />
          {(q || searching) && <button type="button" className="mb4-search__clear" onClick={() => { setQ(''); setSearching(false) }} aria-label="Clear search"><Icon name="x" size={16} /></button>}
        </label>
        <button type="button" className={cx('mbr-iconbtn mbr-searchbtn', q && 'on')} onClick={() => setSearching(true)} aria-label="Search members"><Icon name="search" size={20} /></button>
        <button ref={btn} type="button" className={cx('mbr-filterbtn', nOn > 0 && 'on')} aria-haspopup="dialog" aria-expanded={open}
          onClick={() => { setSheet(window.matchMedia('(max-width: 640px)').matches); setOpen(o => !o) }}>
          <Icon name="filter" size={20} /><span className="mbr-filterbtn__txt">Filter</span>{nOn > 0 && <Count n={nOn} label={`${nOn} filters on`} />}
        </button>
        {open && !sheet && filter}
      </div>
      {open && sheet && createPortal(<><div className="mbr-scrim" onClick={() => setOpen(false)} aria-hidden />{filter}</>, document.body)}

      {(query || nOn > 0) && (
        <p className="mb4-count">{shown.length} of {people.length} people{nOn > 0 && <> · <button type="button" className="mbr-clear" onClick={clearAll}>Clear filters</button></>}</p>
      )}

      {shown.length === 0 ? (
        <EmptyState icon="users" title="Nobody matches that" text="Try fewer filters or another word." />
      ) : (
        <div className="mb4-grid mbr-grid">
          {shown.map(p => <PersonCard key={p.id} p={p} signedIn={signedIn} />)}
        </div>
      )}
    </section>
  )
}

/** A person: photo, name, one line (their first offer, else what they do), their circles as seals. Empty values are left out. */
function PersonCard({ p, signedIn }: { p: MemberCard; signedIn: boolean }) {
  const offer = signedIn ? p.offers[0] : undefined
  const line = offer ?? p.headline ?? null
  return (
    <Link href={p.username ? `/u/${p.username}` : '#'} className={cx('mb4-card mbr-card', p.you && 'mb4-card--you')}>
      <span className="mbr-card__top">
        {p.avatar
          ? <img loading="lazy" decoding="async" src={p.avatar} alt="" className="v4-avatar mb4-card__av" />
          : <span className="v4-avatar mb4-card__av">{p.name.slice(0, 1).toUpperCase()}</span>}
        {p.you ? <span className="mb4-you">you</span> : p.score != null && <span className="mb4-score" title="Your match with them">{p.score}%</span>}
      </span>
      <b className="mbr-card__name">{p.name}</b>
      {line && (
        <span className="mbr-card__line" title={offer ? p.offers.join(' · ') : undefined}>
          {offer && <Icon name="gift" size={16} label="Offers" />}<span>{line}</span>{offer && p.offers.length > 1 && <em>+{p.offers.length - 1}</em>}
        </span>
      )}
      {p.circles.length > 0 && (
        <span className="mbr-card__seals" aria-label={`Circles: ${p.circles.map(c => c.name).join(', ')}`} title={p.circles.map(c => c.name).join(', ')}>
          {p.circles.slice(0, 5).map(c => <CircleSeal key={c.slug} slug={c.slug} size={16} />)}
          {p.circles.length > 5 && <small>+{p.circles.length - 5}</small>}
        </span>
      )}
    </Link>
  )
}
