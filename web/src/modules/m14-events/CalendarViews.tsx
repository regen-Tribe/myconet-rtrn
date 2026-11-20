'use client'

import { useEffect, useRef } from 'react'
import { useCircles } from '@/core/components/CirclesProvider'
import type { CalendarEvent, EventRsvp } from './types'
import { KIND_META } from './lib/permissions'
import {
  DAY_LABELS, WEEK_LABELS, addDays, dayKey, fmtDayLong, fmtEventWhen, fmtTime, groupByDay, isPast,
  monthGrid, sameDay, startOfDay, weekDays,
} from './lib/calendar'
import { DESIGN } from '@/core/lib/instance'
import { Icon, StatusPill } from '@/core/components/v4'

const V4 = DESIGN === 'v4'

/** An event takes its calendar's colour (Daily, Core, Community, Tasks); categories show as a dot */
export function eventColor(e: CalendarEvent): string {
  return KIND_META[e.kind]?.color ?? 'var(--m14)'
}

/** A steady colour per category name ("Food" is always the same colour); none clash with the calendars' */
const CATEGORY_COLORS = ['#d97706', '#0284c7', '#7c3aed', '#ca8a04', '#0d9488', '#9333ea']
export function categoryColor(category: string): string {
  const known: Record<string, string> = { food: '#d97706', movement: '#0284c7', 'focus hours': '#7c3aed', focus: '#7c3aed' }
  const key = category.trim().toLowerCase()
  if (known[key]) return known[key]
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return CATEGORY_COLORS[h % CATEGORY_COLORS.length]
}

function EventChip({ event, onOpen, showTime = true }: { event: CalendarEvent; onOpen: (id: string) => void; showTime?: boolean }) {
  const color = eventColor(event)
  return (
    <button
      onClick={ev => { ev.stopPropagation(); onOpen(event.id) }}
      title={`${event.title} · ${fmtEventWhen(event)}`}
      className="ev-chip"
      style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
        fontSize: 11, lineHeight: 1.3, fontWeight: 600, color,
        background: `color-mix(in srgb, ${color} 10%, var(--surface))`,
        border: 'none', borderLeft: `3px solid ${color}`, borderRadius: 4,
        padding: '2px 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
    >
      {event.category && <span aria-hidden style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: categoryColor(event.category), marginRight: 4, verticalAlign: 1 }} />}
      {showTime && !event.all_day && <span style={{ fontWeight: 500, opacity: 0.8 }}>{fmtTime(event.starts_at)} </span>}
      {event.title}
    </button>
  )
}

// ─── Month ───────────────────────────────────────────────────────────────────

export function MonthView({ anchor, events, now, onOpen, onPickDay }: {
  anchor: Date; events: CalendarEvent[]; now: Date
  onOpen: (id: string) => void
  /** Clicking a day's empty space or "+N more" jumps to that day's week. */
  onPickDay: (d: Date) => void
}) {
  const days = monthGrid(anchor)
  const byDay = groupByDay(events)
  const MAX = 3

  return (
    <div className={V4 ? 'v4-calframe' : undefined} style={{ border: '1px solid var(--rule)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
      <div className="ev-grid7" style={{ borderBottom: '1px solid var(--rule)', background: 'var(--bg-2)' }}>
        {WEEK_LABELS.map(l => (
          <div key={l} style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', padding: '8px 8px' }}>
            {l}
          </div>
        ))}
      </div>
      <div className="ev-grid7">
        {days.map((d, i) => {
          const list = byDay.get(dayKey(d)) ?? []
          const inMonth = d.getMonth() === anchor.getMonth()
          const isToday = sameDay(d, now)
          return (
            <div
              key={i}
              className="ev-cell"
              onClick={() => onPickDay(d)}
              style={{
                borderRight: i % 7 === 6 ? 'none' : '1px solid var(--rule)',
                borderBottom: i >= 35 ? 'none' : '1px solid var(--rule)',
                padding: 5, cursor: 'pointer', minWidth: 0,
                background: inMonth ? 'transparent' : 'var(--bg-2)',
              }}
            >
              <div style={{
                fontSize: 12, fontWeight: isToday ? 700 : 500, marginBottom: 4,
                color: isToday ? '#fff' : inMonth ? 'var(--ink-2)' : 'var(--ink-4)',
                background: isToday ? 'var(--m14)' : 'none',
                borderRadius: 20, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {d.getDate()}
              </div>
              <div className="ev-chips" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {list.slice(0, MAX).map(e => <EventChip key={e.id} event={e} onOpen={onOpen} />)}
                {list.length > MAX && (
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', padding: '0 4px' }}>+{list.length - MAX} more</div>
                )}
              </div>
              {/* Phones: dots instead of chips */}
              {list.length > 0 && (
                <div className="ev-dots" style={{ gap: 3, flexWrap: 'wrap' }}>
                  {list.slice(0, 4).map(e => (
                    <span key={e.id} style={{ width: 6, height: 6, borderRadius: '50%', background: eventColor(e), opacity: isPast(e, now) ? 0.5 : 1 }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week ────────────────────────────────────────────────────────────────────

const HOUR_PX = 44
const GUTTER_PX = 52
const DAY_MIN_PX = 104

interface Placed { event: CalendarEvent; top: number; height: number; col: number; cols: number }

/** One day's timed events as blocks; events that overlap share the width side by side */
function placeDay(events: CalendarEvent[], day: Date): Placed[] {
  const dayStart = day.getTime()
  const dayEnd = addDays(day, 1).getTime()
  const items = events.map(e => {
    const s = Math.max(new Date(e.starts_at).getTime(), dayStart)
    const rawEnd = e.ends_at ? new Date(e.ends_at).getTime() : new Date(e.starts_at).getTime() + 3600_000
    const end = Math.min(Math.max(rawEnd, s + 15 * 60_000), dayEnd)
    return { event: e, s, end }
  }).sort((a, b) => a.s - b.s || b.end - a.end)

  const placed: Placed[] = []
  let cluster: { item: (typeof items)[number]; col: number }[] = []
  let clusterEnd = 0
  const flush = () => {
    const cols = Math.max(0, ...cluster.map(c => c.col)) + 1
    for (const { item, col } of cluster) {
      placed.push({
        event: item.event, col, cols,
        top: ((item.s - dayStart) / 3600_000) * HOUR_PX,
        height: Math.max(18, ((item.end - item.s) / 3600_000) * HOUR_PX - 2),
      })
    }
    cluster = []
  }
  for (const item of items) {
    if (cluster.length && item.s >= clusterEnd) flush()
    // First column whose last event has ended
    const used = new Set(cluster.filter(c => {
      const last = cluster.filter(x => x.col === c.col).at(-1)!
      return last.item.end > item.s
    }).map(c => c.col))
    let col = 0
    while (used.has(col)) col++
    cluster.push({ item, col })
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  if (cluster.length) flush()
  return placed
}

/** Google-style week on wider screens: hours down the side, one column per day, events at their times; day cards on phones */
export function WeekView(props: { anchor: Date; events: CalendarEvent[]; now: Date; onOpen: (id: string) => void }) {
  return (
    <>
      <div className="ev-week-grid"><WeekGrid {...props} /></div>
      <div className="ev-week-cards"><WeekCards {...props} /></div>
    </>
  )
}

function WeekGrid({ anchor, events, now, onOpen }: {
  anchor: Date; events: CalendarEvent[]; now: Date; onOpen: (id: string) => void
}) {
  const days = weekDays(anchor)
  const byDay = groupByDay(events)
  const scroller = useRef<HTMLDivElement>(null)
  // All-day and multi-day events go in the strip at the top; the rest on the grid
  const isBanner = (e: CalendarEvent) => e.all_day || (!!e.ends_at && new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime() >= 24 * 3600_000)
  const firstHour = Math.min(7, ...days.flatMap(d => (byDay.get(dayKey(d)) ?? []).filter(e => !isBanner(e) && sameDay(new Date(e.starts_at), d)).map(e => new Date(e.starts_at).getHours())))

  // Open scrolled to the morning (or the week's earliest event)
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = Math.max(0, firstHour * HOUR_PX - 8)
  }, [firstHour, anchor])

  const gridCols = `${GUTTER_PX}px repeat(7, minmax(${DAY_MIN_PX}px, 1fr))`
  const nowTop = ((now.getTime() - startOfDay(now).getTime()) / 3600_000) * HOUR_PX
  const banners = days.map(d => (byDay.get(dayKey(d)) ?? []).filter(isBanner))
  const hasBanners = banners.some(b => b.length)

  return (
    <div ref={scroller} className={V4 ? 'v4-calframe' : undefined} style={{
      border: '1px solid var(--rule)', borderRadius: 10, background: 'var(--surface)',
      overflow: 'auto', maxHeight: 'min(72vh, 760px)', position: 'relative',
    }}>
      <div style={{ minWidth: GUTTER_PX + 7 * DAY_MIN_PX }}>
        {/* Day names, and all-day events, stay on top while scrolling */}
        <div style={{ position: 'sticky', top: 0, zIndex: 3, background: 'var(--surface)', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols }}>
            <div style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }} />
            {days.map(d => {
              const isToday = sameDay(d, now)
              return (
                <div key={dayKey(d)} style={{ padding: '8px 6px 6px', textAlign: 'center', borderLeft: '1px solid var(--rule)' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: isToday ? 'var(--m14)' : 'var(--ink-4)' }}>
                    {DAY_LABELS[d.getDay()]}
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 700, lineHeight: '30px', width: 30, height: 30, margin: '2px auto 0', borderRadius: '50%',
                    color: isToday ? '#fff' : 'var(--ink)', background: isToday ? 'var(--m14)' : 'transparent',
                  }}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>
          {hasBanners && (
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderTop: '1px solid var(--rule)' }}>
              <div style={{ position: 'sticky', left: 0, background: 'var(--surface)', fontSize: 10, color: 'var(--ink-4)', padding: '4px 6px', textAlign: 'right' }}>all day</div>
              {banners.map((list, i) => (
                <div key={i} style={{ borderLeft: '1px solid var(--rule)', padding: 3, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  {list.map(e => <EventChip key={e.id} event={e} onOpen={onOpen} showTime={false} />)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* The hours */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, position: 'relative' }}>
          <div style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface)' }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ height: HOUR_PX, position: 'relative' }}>
                {h > 0 && (
                  <span style={{ position: 'absolute', top: -7, right: 6, fontSize: 10, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                    {new Date(2000, 0, 1, h).toLocaleTimeString('en-US', { hour: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
          </div>
          {days.map(d => {
            const timed = (byDay.get(dayKey(d)) ?? []).filter(e => !isBanner(e))
            const isToday = sameDay(d, now)
            return (
              <div key={dayKey(d)} style={{
                position: 'relative', height: 24 * HOUR_PX, borderLeft: '1px solid var(--rule)',
                backgroundImage: `repeating-linear-gradient(to bottom, var(--rule) 0, var(--rule) 1px, transparent 1px, transparent ${HOUR_PX}px)`,
              }}>
                {placeDay(timed, d).map(({ event: e, top, height, col, cols }) => {
                  const color = eventColor(e)
                  return (
                    <button
                      key={e.id}
                      onClick={() => onOpen(e.id)}
                      title={`${e.title} · ${fmtEventWhen(e)}`}
                      style={{
                        position: 'absolute', top, height, left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)`,
                        textAlign: 'left', cursor: 'pointer', overflow: 'hidden', zIndex: 1,
                        border: 'none', borderLeft: `3px solid ${color}`, borderRadius: 4, padding: '2px 4px',
                        background: `color-mix(in srgb, ${color} 16%, var(--surface))`,
                        boxShadow: '0 0 0 1px var(--surface)', opacity: isPast(e, now) ? 0.6 : 1,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2, overflowWrap: 'anywhere' }}>
                        {e.category && <span aria-hidden style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: categoryColor(e.category), marginRight: 3, verticalAlign: 1 }} />}
                        {e.title}
                      </div>
                      {height >= 30 && <div style={{ fontSize: 10, color, fontWeight: 600, lineHeight: 1.2 }}>{fmtTime(e.starts_at)}{e.ends_at ? ` – ${fmtTime(e.ends_at)}` : ''}</div>}
                      {height >= 52 && e.location && <div style={{ fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.2 }}>📍 {e.location}</div>}
                    </button>
                  )
                })}
                {isToday && (
                  <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: nowTop, height: 2, background: '#dc2626', zIndex: 2 }}>
                    <span style={{ position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Phones: one card per day with its events listed (the time grid is too wide) */
function WeekCards({ anchor, events, now, onOpen }: {
  anchor: Date; events: CalendarEvent[]; now: Date; onOpen: (id: string) => void
}) {
  const days = weekDays(anchor)
  const byDay = groupByDay(events)

  return (
    <div className="ev-week" style={{ gap: 8 }}>
      {days.map(d => {
        const list = byDay.get(dayKey(d)) ?? []
        const isToday = sameDay(d, now)
        return (
          <div key={dayKey(d)} style={{
            background: 'var(--surface)', borderRadius: 10, minWidth: 0,
            border: `1px solid ${isToday ? 'var(--m14)' : 'var(--rule)'}`,
            padding: 10, minHeight: 120,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
                {DAY_LABELS[d.getDay()]}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: isToday ? 'var(--m14)' : 'var(--ink)' }}>{d.getDate()}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {list.length === 0 && <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>—</div>}
              {list.map(e => {
                const color = eventColor(e)
                return (
                  <button
                    key={e.id}
                    onClick={() => onOpen(e.id)}
                    style={{
                      textAlign: 'left', cursor: 'pointer', border: 'none', borderLeft: `3px solid ${color}`,
                      background: `color-mix(in srgb, ${color} 9%, var(--surface))`, borderRadius: 6, padding: '6px 8px',
                      opacity: isPast(e, now) ? 0.6 : 1,
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 600, color }}>
                      {e.all_day ? 'All day' : fmtTime(e.starts_at)}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{e.title}</div>
                    {e.location && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, overflowWrap: 'anywhere' }}>📍 {e.location}</div>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** One event as a row with its time, place, circle and RSVPs (List and Day views) */
function EventRow({ event: e, rsvps, userId, onOpen, dim = false }: {
  event: CalendarEvent; rsvps: EventRsvp[]; userId: string | null; onOpen: (id: string) => void
  /** Already over (Day view) */
  dim?: boolean
}) {
  const circles = useCircles()
  const color = eventColor(e)
  const going = rsvps.filter(r => r.event_id === e.id && r.status === 'going').length
  const mine = userId ? rsvps.find(r => r.event_id === e.id && r.user_id === userId) : null
  // The v4 look: the same facts as a soft row (time, title, where, circle, who's going, your answer)
  if (V4) {
    return (
      <button type="button" className={`v4-evrow${dim ? ' v4-evrow--dim' : ''}`} onClick={() => onOpen(e.id)} style={{ ['--ev' as string]: color }}>
        <span className="v4-evrow__time">{e.all_day ? 'All day' : fmtTime(e.starts_at)}</span>
        <span className="v4-evrow__main">
          <b>{e.title}</b>
          <small>
            {e.location && <span><Icon name="pin" size={13} />{e.location}</span>}
            {e.online_url && <span><Icon name="laptop" size={13} />Online</span>}
            {circles.has(e.circle) && <span><span className="v4-dot" style={{ background: circles.meta(e.circle).color, width: 7, height: 7 }} />{circles.meta(e.circle).label}</span>}
            {e.project && <span><Icon name="board" size={13} />{e.project.title}</span>}
            {e.is_public && <span><Icon name="globe" size={13} />Public</span>}
          </small>
        </span>
        <span className="v4-evrow__trail">
          {going > 0 && <small>{going} {KIND_META[e.kind].goingCount}</small>}
          {mine && <StatusPill status={mine.status === 'going' ? 'done' : 'review'} label={mine.status === 'going' ? KIND_META[e.kind].youGoing : 'Maybe'} />}
        </span>
      </button>
    )
  }
  return (
    <button
      onClick={() => onOpen(e.id)}
      style={{
        display: 'flex', gap: 14, alignItems: 'flex-start', textAlign: 'left', cursor: 'pointer',
        background: 'var(--surface)', border: '1px solid var(--rule)', borderLeft: `3px solid ${color}`,
        borderRadius: 10, padding: '12px 14px', width: '100%', opacity: dim ? 0.6 : 1,
      }}
    >
      <div style={{ width: 64, flexShrink: 0, fontSize: 12, fontWeight: 600, color }}>
        {e.all_day ? 'All day' : fmtTime(e.starts_at)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{e.title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
          {e.location && <span>📍 {e.location}</span>}
          {e.online_url && <span>💻 Online</span>}
          {circles.has(e.circle) && <span style={{ color }}>{circles.meta(e.circle).emoji} {circles.meta(e.circle).label}</span>}
          {e.project && <span>⚙️ {e.project.title}</span>}
          {e.is_public && <span>🌍 Public</span>}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right', fontSize: 11, color: 'var(--ink-3)' }}>
        {going > 0 && <div>{going} {KIND_META[e.kind].goingCount}</div>}
        {mine && <div style={{ fontWeight: 700, color: 'var(--m14)' }}>{mine.status === 'going' ? KIND_META[e.kind].youGoing : 'Maybe'}</div>}
      </div>
    </button>
  )
}

// ─── Day ─────────────────────────────────────────────────────────────────────

/** One day's events in full; the calendar opens here, on today */
export function DayView({ anchor, events, rsvps, userId, now, onOpen, onPickDay }: {
  anchor: Date; events: CalendarEvent[]; rsvps: EventRsvp[]; userId: string | null; now: Date
  onOpen: (id: string) => void; onPickDay: (d: Date) => void
}) {
  const list = groupByDay(events).get(dayKey(anchor)) ?? []
  if (list.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(e => <EventRow key={e.id} event={e} rsvps={rsvps} userId={userId} onOpen={onOpen} dim={isPast(e, now)} />)}
      </div>
    )
  }
  // Nothing today: point at the next day that has something
  const dayEnd = addDays(anchor, 1).getTime()
  const next = events
    .filter(e => new Date(e.starts_at).getTime() >= dayEnd)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0]
  return (
    <div style={{ background: 'var(--surface)', border: '1px dashed var(--rule)', borderRadius: 10, padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
      {sameDay(anchor, now) ? 'Nothing on today.' : 'Nothing on this day.'}
      {next && (
        <div style={{ marginTop: 10 }}>
          <button onClick={() => onPickDay(startOfDay(new Date(next.starts_at)))} style={{ fontSize: 13, fontWeight: 600, color: 'var(--m14)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Next: {next.title} · {fmtDayLong(startOfDay(new Date(next.starts_at)))} →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── List ────────────────────────────────────────────────────────────────────

export function ListView({ events, rsvps, userId, now, showPast, onOpen }: {
  events: CalendarEvent[]; rsvps: EventRsvp[]; userId: string | null; now: Date
  showPast: boolean; onOpen: (id: string) => void
}) {
  const visible = events
    .filter(e => showPast ? isPast(e, now) : !isPast(e, now))
    .sort((a, b) => (showPast ? -1 : 1) * (new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()))

  if (visible.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px dashed var(--rule)', borderRadius: 10, padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
        {showPast ? 'No past events here yet.' : 'Nothing coming up here yet.'}
      </div>
    )
  }

  // Group by the event's start day
  const groups: { day: Date; items: CalendarEvent[] }[] = []
  for (const e of visible) {
    const day = startOfDay(new Date(e.starts_at))
    const last = groups[groups.length - 1]
    if (last && sameDay(last.day, day)) last.items.push(e)
    else groups.push({ day, items: [e] })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {groups.map(g => (
        <div key={dayKey(g.day)}>
          <div className={V4 ? 'v4-evday' : undefined} style={V4 ? undefined : { fontSize: 12, fontWeight: 700, color: sameDay(g.day, now) ? 'var(--m14)' : 'var(--ink-3)', marginBottom: 8 }}>
            {sameDay(g.day, now) ? 'Today · ' : ''}{fmtDayLong(g.day)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.items.map(e => <EventRow key={e.id} event={e} rsvps={rsvps} userId={userId} onOpen={onOpen} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
