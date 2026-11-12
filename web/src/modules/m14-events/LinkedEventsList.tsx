'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CalendarEvent } from './types'
import { fmtEventWhen, isPast } from './lib/calendar'
import { KIND_META } from './lib/permissions'
import { eventColor } from './CalendarViews'

/**
 * Upcoming events for other modules' pages — a project's events on /ops/[id],
 * the dashboard card, the home page section.
 */
export function LinkedEventsList({
  events, addHref, title = 'Events', viewAllHref, limit, showKind = false, emptyText = 'No upcoming events.', hideWhenEmpty = false,
}: {
  events: CalendarEvent[]
  /** "+ Add event" target, or null when the viewer can't post. */
  addHref: string | null
  title?: string
  viewAllHref?: string
  limit?: number
  /** Tag each row as Core / Community. */
  showKind?: boolean
  emptyText?: string
  hideWhenEmpty?: boolean
}) {
  // Times are formatted in the viewer's zone, so wait for mount
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])
  const upcoming = now ? events.filter(e => !isPast(e, now)).slice(0, limit) : []

  if (hideWhenEmpty && !addHref && events.length === 0) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
          {title}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {addHref && (
            <Link href={addHref} style={{ fontSize: 12, fontWeight: 600, color: 'var(--m14)', textDecoration: 'none' }}>+ Add event</Link>
          )}
          {viewAllHref && (
            <Link href={viewAllHref} style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: 'var(--m14)', textDecoration: 'none' }}>Calendar →</Link>
          )}
        </div>
      </div>
      {!now ? (
        <div style={{ height: 56, borderRadius: 8, background: 'var(--bg-2)' }} />
      ) : upcoming.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{emptyText}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upcoming.map(e => (
            <Link
              key={e.id}
              href={`/events?event=${e.id}`}
              style={{
                display: 'block', textDecoration: 'none', background: 'var(--surface)',
                border: '1px solid var(--rule)', borderLeft: `3px solid ${eventColor(e)}`, borderRadius: 8, padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', overflowWrap: 'anywhere' }}>{e.title}</div>
                {showKind && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--m14)', flexShrink: 0 }}>{KIND_META[e.kind].short}</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {fmtEventWhen(e)}{e.location ? ` · ${e.location}` : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
