'use client'
/**
 * Calendar, the 22 Nov 2026 design review (instance/design/ux-review-2026-11-22.html › Calendar). Only used when
 * DESIGN_REVIEW is on (core/lib/instance.ts); styles in ./calendar-review.css, all under html[data-review].
 *
 * - One toolbar row: ‹ Today ›, the date, the views (Week · Month · List on a computer, Agenda · Month on a
 *   phone) and one Filter button. Filters (kinds of event, categories, circles) live in a pop-over on a
 *   computer and a bottom sheet on a phone; the button shows a black count when any are on.
 * - Phones open on an agenda: Today, Tomorrow, This week, then "See all".
 * - Events are neutral cards: time, title, place, the circle's seal. Kinds and categories are outline tags.
 *   Colour on an event only ever means its circle (the seal) or, for a board task, the task's status.
 */
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useCircles } from '@/core/components/CirclesProvider'
import { CircleSeal } from '@/core/components/v4/CircleSeal'
import { Icon, StatusPill, statusFromDb } from '@/core/components/v4'
import type { CalendarEvent, EventKind, EventRsvp, EventsView } from './types'
import { addDays, dayKey, fmtDayLong, fmtMonthTitle, fmtTime, fmtWeekTitle, groupByDay, isPast, sameDay, startOfDay } from './lib/calendar'
import { EVENT_KINDS, KIND_META } from './lib/permissions'
import { categoryColor, eventColor } from './lib/colors'

/** A tag in an event type's colour (#44: Calendar keeps its colour per event type) */
export function kindTagStyle(color: string): CSSProperties {
  return { '--evc': color } as CSSProperties
}

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** Phone width (the review's one phone breakpoint). False until mounted, so the server and first paint agree. */
export function usePhone(): boolean {
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

/** The views each width offers; anything else is moved to the nearest one by the page. */
export const REVIEW_VIEWS = {
  phone: [{ id: 'agenda', label: 'Agenda' }, { id: 'month', label: 'Month' }],
  wide: [{ id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'list', label: 'List' }],
} satisfies Record<string, { id: EventsView; label: string }[]>

// ─── Toolbar ────────────────────────────────────────────────────────────────

export function ReviewToolbar({ phone, view, anchor, now, seeAll, showPast, onView, onStep, onToday, onShowPast, filter }: {
  phone: boolean; view: EventsView; anchor: Date | null; now: Date | null
  /** Phone agenda showing everything (the "See all" list) */
  seeAll: boolean; showPast: boolean
  onView: (v: EventsView) => void; onStep: (dir: -1 | 1) => void; onToday: () => void; onShowPast: (past: boolean) => void
  filter: React.ReactNode
}) {
  const listLike = view === 'list' || (view === 'agenda' && seeAll)
  // On a phone the agenda's sections already name each day, so the bar keeps its room for the controls
  const title = !anchor ? ''
    : view === 'month' ? (phone
      ? anchor.toLocaleDateString('en-US', now && anchor.getFullYear() === now.getFullYear() ? { month: 'short' } : { month: 'short', year: 'numeric' })
      : fmtMonthTitle(anchor))
    : view === 'week' ? fmtWeekTitle(anchor)
    : phone ? (view === 'agenda' ? '' : anchor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    : `${now && sameDay(anchor, now) ? 'Today · ' : ''}${fmtDayLong(anchor)}`
  const views = phone ? REVIEW_VIEWS.phone : REVIEW_VIEWS.wide
  return (
    <div className="evr-bar" role="toolbar" aria-label="Calendar">
      {listLike ? (
        <span className="v4-seg evr-seg">
          <button type="button" className={showPast ? '' : 'on'} aria-pressed={!showPast} onClick={() => onShowPast(false)}>Upcoming</button>
          <button type="button" className={showPast ? 'on' : ''} aria-pressed={showPast} onClick={() => onShowPast(true)}>Past</button>
        </span>
      ) : (
        <>
          <span className="v4-seg evr-seg evr-nav">
            <button type="button" onClick={() => onStep(-1)} aria-label={view === 'month' ? 'Previous month' : view === 'week' ? 'Previous week' : 'Previous day'}><Icon name="left" size={15} /></button>
            <button type="button" onClick={onToday}>Today</button>
            <button type="button" onClick={() => onStep(1)} aria-label={view === 'month' ? 'Next month' : view === 'week' ? 'Next week' : 'Next day'}><Icon name="right" size={15} /></button>
          </span>
          <b className="evr-bar__title">{title}</b>
        </>
      )}
      <span className="evr-bar__end">
        <span className="v4-seg evr-seg" role="group" aria-label="View">
          {views.map(v => {
            const on = view === v.id && !(v.id === 'agenda' && seeAll)
            return <button key={v.id} type="button" className={on ? 'on' : ''} aria-pressed={on} onClick={() => onView(v.id)}>{v.label}</button>
          })}
        </span>
        {filter}
      </span>
    </div>
  )
}

// ─── Filter (pop-over on a computer, bottom sheet on a phone) ──────────────

export function FilterButton({ phone, count, signedIn, kinds, kindCounts, onKind, categories, hiddenCategories, onCategory, circlePicks, onCircles, circleCounts, mine, onClear }: {
  phone: boolean
  /** How many filters differ from the default: the black badge */
  count: number
  signedIn: boolean
  kinds: EventKind[]; kindCounts: Record<EventKind, number>; onKind: (k: EventKind) => void
  categories: string[]; hiddenCategories: string[]; onCategory: (c: string) => void
  circlePicks: string[]; onCircles: (next: string[]) => void
  circleCounts: Record<string, number>
  /** The viewer's own circles, for "My circles" */
  mine: string[]
  onClear: () => void
}) {
  const circles = useCircles()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    const onDown = (e: MouseEvent) => { const t = e.target as Node; if (!box.current?.contains(t) && !panel.current?.contains(t)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open])

  const myOwn = mine.filter(s => circles.has(s))
  const mineOn = myOwn.length > 0 && myOwn.length === circlePicks.length && myOwn.every(s => circlePicks.includes(s))
  const needle = q.trim().toLowerCase()
  const slugs = needle ? circles.slugs.filter(s => circles.meta(s).label.toLowerCase().includes(needle)) : circles.slugs
  const toggleCircle = (s: string) => onCircles(circlePicks.includes(s) ? circlePicks.filter(x => x !== s) : [...circlePicks, s])

  const body = (
    <div ref={panel} id={id} className={cx('evr-filter', phone && 'evr-filter--sheet')} role="dialog" aria-label="Filter the calendar">
      {phone && <div className="evr-filter__grab" aria-hidden />}
      <div className="evr-filter__head"><b>Filter</b>{count > 0 && <button type="button" className="evr-link" onClick={onClear}>Clear all</button>}</div>
      <div className="evr-filter__scroll">
        {!signedIn && (
          <p className="evr-filter__note"><Icon name="lock" size={14} /><span>You’re seeing public events. <Link href="/auth/login">Sign in</Link> to see member events too.</span></p>
        )}
        <fieldset className="evr-filter__group">
          <legend>Show</legend>
          {EVENT_KINDS.map(k => (
            <label key={k} className={cx('evr-row', kinds.includes(k) && 'evr-row--on')}>
              <input type="checkbox" checked={kinds.includes(k)} onChange={() => onKind(k)} />
              <span aria-hidden className="evr-swatch" style={{ background: KIND_META[k].color }} />
              <span className="evr-row__name">{KIND_META[k].label}<small>{KIND_META[k].blurb}</small></span>
              {kindCounts[k] > 0 && <span className="evr-row__count">{kindCounts[k]}</span>}
            </label>
          ))}
        </fieldset>
        {categories.length > 0 && (
          <fieldset className="evr-filter__group">
            <legend>Categories</legend>
            {categories.map(c => {
              const on = !hiddenCategories.includes(c)
              return (
                <label key={c} className={cx('evr-row', on && 'evr-row--on')}>
                  <input type="checkbox" checked={on} onChange={() => onCategory(c)} />
                  <span aria-hidden className="evr-swatch evr-swatch--dot" style={{ background: categoryColor(c) }} />
                  <span className="evr-row__name">{c}</span>
                </label>
              )
            })}
          </fieldset>
        )}
        {circles.slugs.length > 0 && (
          <fieldset className="evr-filter__group">
            <legend>Circles{circlePicks.length === 0 && <small> · all</small>}</legend>
            {circles.slugs.length > 6 && (
              <label className="evr-find">
                <Icon name="search" size={15} />
                <input type="search" className="no-min-height" value={q} onChange={e => setQ(e.target.value)} placeholder="Find a circle" aria-label="Find a circle" />
              </label>
            )}
            {!needle && myOwn.length > 0 && (
              <label className={cx('evr-row', mineOn && 'evr-row--on')}>
                <input type="checkbox" checked={mineOn} onChange={() => onCircles(mineOn ? [] : myOwn)} />
                <Icon name="star" size={16} /><span className="evr-row__name">My circles</span>
                <span className="evr-row__count">{myOwn.length}</span>
              </label>
            )}
            {slugs.map(s => (
              <label key={s} className={cx('evr-row', circlePicks.includes(s) && 'evr-row--on')}>
                <input type="checkbox" checked={circlePicks.includes(s)} onChange={() => toggleCircle(s)} />
                <CircleSeal slug={s} size={16} />
                <span className="evr-row__name">{circles.meta(s).label}</span>
                {(circleCounts[s] ?? 0) > 0 && <span className="evr-row__count">{circleCounts[s]}</span>}
              </label>
            ))}
            {slugs.length === 0 && <p className="evr-filter__none">No circle called “{q.trim()}”.</p>}
          </fieldset>
        )}
      </div>
      <div className="evr-filter__foot">
        <button type="button" className="v4-btn v4-btn--primary v4-btn--sm" onClick={() => { setOpen(false); btn.current?.focus() }}><span>Done</span></button>
      </div>
    </div>
  )

  return (
    <div ref={box} className="evr-filterbox">
      <button ref={btn} type="button" className={cx('evr-filterbtn', count > 0 && 'evr-filterbtn--on')}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
        aria-label={count > 0 ? `Filter, ${count} on` : 'Filter'}
        onClick={() => { setQ(''); setOpen(o => !o) }}>
        <Icon name="filter" size={16} /><span className="evr-filterbtn__label">Filter</span>
        {count > 0 && <span className="evr-badge" aria-hidden>{count}</span>}
      </button>
      {open && (phone ? createPortal(<><div className="evr-scrim" onClick={() => setOpen(false)} aria-hidden />{body}</>, document.body) : body)}
    </div>
  )
}

// ─── One event: a card in its type's colour (#44) ─────────────────────────────────────────────

export function EventCard({ event: e, rsvps, userId, onOpen, dim = false, showDay = false }: {
  event: CalendarEvent; rsvps: EventRsvp[]; userId: string | null; onOpen: (id: string) => void
  dim?: boolean
  /** Inside "This week": say which day */
  showDay?: boolean
}) {
  const circles = useCircles()
  const going = rsvps.filter(r => r.event_id === e.id && r.status === 'going').length
  const mine = userId ? rsvps.find(r => r.event_id === e.id && r.user_id === userId) : null
  const hasCircle = circles.has(e.circle)
  return (
    <button type="button" className={cx('evr-card', 'evr-card--kind', `evr-card--${e.kind}`, dim && 'evr-card--dim')} style={kindTagStyle(eventColor(e))} onClick={() => onOpen(e.id)}>
      <span className="evr-card__time">
        {showDay && <small>{new Date(e.starts_at).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</small>}
        {e.all_day ? 'All day' : fmtTime(e.starts_at)}
        {!e.all_day && e.ends_at && <small>{fmtTime(e.ends_at)}</small>}
      </span>
      <span className="evr-card__main">
        <b>{e.title}</b>
        {(e.location || e.online_url) && (
          <span className="evr-card__where">
            {e.location && <span><Icon name="pin" size={13} />{e.location}</span>}
            {e.online_url && <span><Icon name="laptop" size={13} />Online</span>}
          </span>
        )}
        <span className="evr-tags">
          {hasCircle && e.circle && <span className="evr-tag"><CircleSeal slug={e.circle} size={16} />{circles.meta(e.circle).label}</span>}
          {/* A board task's status pill already says it is a task */}
          {!e.board && <span className="evr-tag evr-tag--kind" style={kindTagStyle(eventColor(e))}>{KIND_META[e.kind].short}</span>}
          {e.category && <span className="evr-tag evr-tag--kind" style={kindTagStyle(categoryColor(e.category))}>{e.category}</span>}
          {e.project && <span className="evr-tag evr-tag--long" title={e.project.title}><Icon name="board" size={12} /><span>{e.project.title}</span></span>}
          {e.is_public && <span className="evr-tag"><Icon name="globe" size={12} />Public</span>}
        </span>
      </span>
      {(going > 0 || mine || e.board) && (
        <span className="evr-card__trail">
          {e.board && <StatusPill status={statusFromDb(e.board.status)} />}
          {going > 0 && <small>{going} {KIND_META[e.kind].goingCount}</small>}
          {mine && <small className="evr-mine">{mine.status === 'going' ? KIND_META[e.kind].youGoing : 'Maybe'}</small>}
        </span>
      )}
    </button>
  )
}

// ─── Phones: the agenda ────────────────────────────────────────────────────

export function AgendaView({ anchor, events, rsvps, userId, now, onOpen, onSeeAll, onPickDay }: {
  anchor: Date; events: CalendarEvent[]; rsvps: EventRsvp[]; userId: string | null; now: Date
  onOpen: (id: string) => void; onSeeAll: () => void; onPickDay: (d: Date) => void
}) {
  // "Show earlier events" is remembered for the day it was opened on
  const [earlierOn, setEarlierOn] = useState<string | null>(null)
  const byDay = groupByDay(events)
  const today = startOfDay(now)
  const day0 = startOfDay(anchor)
  const earlier = earlierOn === dayKey(day0)
  const setEarlier = (f: (v: boolean) => boolean) => setEarlierOn(f(earlier) ? dayKey(day0) : null)
  const day1 = addDays(day0, 1)
  const label = (d: Date) => sameDay(d, today) ? 'Today' : sameDay(d, addDays(today, 1)) ? 'Tomorrow' : fmtDayLong(d)
  const list0 = byDay.get(dayKey(day0)) ?? []
  const done0 = list0.filter(e => isPast(e, now))
  const left0 = list0.filter(e => !isPast(e, now))
  const list1 = byDay.get(dayKey(day1)) ?? []
  const rest = Array.from({ length: 5 }, (_, i) => addDays(day0, i + 2)).map(d => ({ day: d, items: byDay.get(dayKey(d)) ?? [] }))
  const restCount = rest.reduce((n, r) => n + r.items.length, 0)
  const card = (e: CalendarEvent, extra?: { dim?: boolean }) => <EventCard key={e.id} event={e} rsvps={rsvps} userId={userId} onOpen={onOpen} dim={extra?.dim} />
  // After this stretch, the next day that has something (for an empty agenda)
  const after = addDays(day0, 7).getTime()
  const next = restCount + list0.length + list1.length === 0
    ? events.filter(e => new Date(e.starts_at).getTime() >= after).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))[0]
    : undefined

  return (
    <div className="evr-agenda">
      <section aria-label={label(day0)}>
        <h2 className="evr-day">{label(day0)}{list0.length > 0 && <small>{list0.length}</small>}
          {done0.length > 0 && (
            <button type="button" className="evr-earlier" aria-expanded={earlier} onClick={() => setEarlier(v => !v)}>
              {earlier ? 'Hide' : 'Show'} {done0.length} earlier
              <Icon name="down" size={14} />
            </button>
          )}
        </h2>
        <div className="evr-cards">
          {earlier && done0.map(e => card(e, { dim: true }))}
          {left0.map(e => card(e))}
          {left0.length === 0 && <p className="evr-none">{done0.length ? 'Nothing else on today.' : sameDay(day0, today) ? 'Nothing on today.' : 'Nothing on this day.'}</p>}
        </div>
      </section>
      <section aria-label={label(day1)}>
        <h2 className="evr-day">{label(day1)}{list1.length > 0 && <small>{list1.length}</small>}</h2>
        <div className="evr-cards">
          {list1.map(e => card(e, { dim: isPast(e, now) }))}
          {list1.length === 0 && <p className="evr-none">Nothing on yet.</p>}
        </div>
      </section>
      <section aria-label="This week">
        <h2 className="evr-day">{sameDay(day0, today) ? 'This week' : `Until ${fmtDayLong(rest[4].day)}`}{restCount > 0 && <small>{restCount}</small>}</h2>
        {rest.filter(r => r.items.length).map(r => (
          <div key={dayKey(r.day)} className="evr-sub">
            <h3>{r.day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
            <div className="evr-cards">{r.items.map(e => card(e, { dim: isPast(e, now) }))}</div>
          </div>
        ))}
        {restCount === 0 && <p className="evr-none">Nothing on yet.</p>}
      </section>
      {next && (
        <button type="button" className="evr-next" onClick={() => onPickDay(startOfDay(new Date(next.starts_at)))}>
          Next: {next.title} · {fmtDayLong(startOfDay(new Date(next.starts_at)))}<Icon name="right" size={14} />
        </button>
      )}
      <button type="button" className="v4-btn v4-btn--secondary evr-seeall" onClick={onSeeAll}><span>See all</span><Icon name="right" size={15} /></button>
    </div>
  )
}
