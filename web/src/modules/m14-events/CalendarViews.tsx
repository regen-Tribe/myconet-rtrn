'use client'

import { useCircles } from '@/core/components/CirclesProvider'
import type { CircleSet } from '@/core/lib/circles'
import type { CalendarEvent, EventRsvp } from './types'
import { KIND_META } from './lib/permissions'
import {
  DAY_LABELS, dayKey, fmtDayLong, fmtEventWhen, fmtTime, groupByDay, isPast,
  monthGrid, sameDay, startOfDay, weekDays,
} from './lib/calendar'

export function eventColor(e: CalendarEvent, circles: CircleSet): string {
  if (circles.has(e.circle)) return circles.meta(e.circle).color
  return e.category ? categoryColor(e.category) : 'var(--m14)'
}

/** A steady colour per category name ("Food" is always the same colour) */
const CATEGORY_COLORS = ['#d97706', '#0d9488', '#7c3aed', '#db2777', '#2563eb', '#65a30d', '#dc2626', '#0891b2']
export function categoryColor(category: string): string {
  const known: Record<string, string> = { food: '#d97706', movement: '#0d9488', 'focus hours': '#7c3aed', focus: '#7c3aed' }
  const key = category.trim().toLowerCase()
  if (known[key]) return known[key]
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return CATEGORY_COLORS[h % CATEGORY_COLORS.length]
}

function EventChip({ event, onOpen, showTime = true }: { event: CalendarEvent; onOpen: (id: string) => void; showTime?: boolean }) {
  const circles = useCircles()
  const color = eventColor(event, circles)
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
  const circles = useCircles()
  const days = monthGrid(anchor)
  const byDay = groupByDay(events)
  const MAX = 3

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
      <div className="ev-grid7" style={{ borderBottom: '1px solid var(--rule)', background: 'var(--bg-2)' }}>
        {DAY_LABELS.map(l => (
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
                    <span key={e.id} style={{ width: 6, height: 6, borderRadius: '50%', background: eventColor(e, circles), opacity: isPast(e, now) ? 0.5 : 1 }} />
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

export function WeekView({ anchor, events, now, onOpen }: {
  anchor: Date; events: CalendarEvent[]; now: Date; onOpen: (id: string) => void
}) {
  const circles = useCircles()
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
                const color = eventColor(e, circles)
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

// ─── List ────────────────────────────────────────────────────────────────────

export function ListView({ events, rsvps, userId, now, showPast, onOpen }: {
  events: CalendarEvent[]; rsvps: EventRsvp[]; userId: string | null; now: Date
  showPast: boolean; onOpen: (id: string) => void
}) {
  const circles = useCircles()
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
          <div style={{ fontSize: 12, fontWeight: 700, color: sameDay(g.day, now) ? 'var(--m14)' : 'var(--ink-3)', marginBottom: 8 }}>
            {sameDay(g.day, now) ? 'Today · ' : ''}{fmtDayLong(g.day)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.items.map(e => {
              const color = eventColor(e, circles)
              const going = rsvps.filter(r => r.event_id === e.id && r.status === 'going').length
              const mine = userId ? rsvps.find(r => r.event_id === e.id && r.user_id === userId) : null
              return (
                <button
                  key={e.id}
                  onClick={() => onOpen(e.id)}
                  style={{
                    display: 'flex', gap: 14, alignItems: 'flex-start', textAlign: 'left', cursor: 'pointer',
                    background: 'var(--surface)', border: '1px solid var(--rule)', borderLeft: `3px solid ${color}`,
                    borderRadius: 10, padding: '12px 14px', width: '100%',
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
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
