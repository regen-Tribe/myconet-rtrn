'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import type { CircleSlug } from '@/core/lib/circles'
import type { CalendarEvent, CalendarFeed, EventKind, EventRsvp, EventsView, LinkOption, PersonLite, RsvpStatus } from './types'
import { addDays, fmtMonthTitle, fmtWeekTitle, isPast, startOfDay } from './lib/calendar'
import { canCreateKind, canEditEvent, EVENT_KINDS, KIND_META } from './lib/permissions'
import { EVENT_SELECT, toEvent } from './lib/queries'
import { ListView, MonthView, WeekView } from './CalendarViews'
import { EventDetailModal } from './EventDetailModal'
import { EventFormModal, type EventDraft, type EventPayload } from './EventFormModal'
import { CalendarFeedsModal } from './CalendarFeedsModal'

const VIEWS: { id: EventsView; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'list', label: 'List' },
]

export default function EventsClient({
  initialEvents, initialRsvps, userId, me, role, leadCircles, projects, proposals,
  initialTab, initialView, initialEventId, initialDraft, initialFeeds,
}: {
  initialEvents: CalendarEvent[]
  initialRsvps: EventRsvp[]
  userId: string | null
  me: PersonLite | null
  role: string
  leadCircles: string[]
  projects: LinkOption[]
  proposals: LinkOption[]
  initialTab: EventKind
  initialView: EventsView
  initialEventId: string | null
  /** Set when arriving from "+ Add event" on a project or proposal. */
  initialDraft: EventDraft | null
  /** Linked calendars; set for admins only */
  initialFeeds: CalendarFeed[] | null
}) {
  const circles = useCircles()
  const supabase = createClient()
  const [events, setEvents] = useState(initialEvents)
  const [rsvps, setRsvps] = useState(initialRsvps)
  const [tab, setTab] = useState<EventKind>(initialTab)
  const [view, setView] = useState<EventsView>(initialView)
  const [circleFilter, setCircleFilter] = useState<CircleSlug | ''>('')
  const [showPast, setShowPast] = useState(false)
  const [openId, setOpenId] = useState<string | null>(initialEventId)
  const [form, setForm] = useState<{ existing: CalendarEvent | null; draft: EventDraft } | null>(
    initialDraft ? { existing: null, draft: initialDraft } : null,
  )
  const [toast, setToast] = useState<string | null>(null)
  const [showFeeds, setShowFeeds] = useState(false)

  // Dates depend on the viewer's time zone, so the calendar renders after mount
  const [now, setNow] = useState<Date | null>(null)
  const [anchor, setAnchor] = useState<Date | null>(null)
  useEffect(() => {
    const n = new Date()
    setNow(n)
    const linked = initialEventId ? initialEvents.find(e => e.id === initialEventId) : null
    setAnchor(startOfDay(linked ? new Date(linked.starts_at) : n))
  }, [initialEventId, initialEvents])

  // Keep the URL shareable without a navigation
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('tab', tab)
    params.set('view', view)
    if (openId) params.set('event', openId)
    window.history.replaceState(null, '', `/events?${params.toString()}`)
  }, [tab, view, openId])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const counts = useMemo(() => Object.fromEntries(
    EVENT_KINDS.map(k => [k, now ? events.filter(e => e.kind === k && !isPast(e, now)).length : 0]),
  ) as Record<EventKind, number>, [events, now])

  const visible = events.filter(e => e.kind === tab && (!circleFilter || e.circle === circleFilter))
  const openEvent = openId ? events.find(e => e.id === openId) ?? null : null
  const canPostCommunity = canCreateKind('community', role)

  function step(dir: -1 | 1) {
    if (!anchor) return
    if (view === 'month') setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1))
    else setAnchor(addDays(anchor, 7 * dir))
  }

  function openNew(draft: EventDraft = {}) {
    setForm({ existing: null, draft: { kind: tab, circle: circleFilter || null, ...draft } })
  }

  async function saveEvent(payload: EventPayload): Promise<string | null> {
    if (!userId) return 'Sign in to post events.'
    const existing = form?.existing
    if (existing) {
      const { data, error } = await supabase.from('events').update(payload).eq('id', existing.id).select(EVENT_SELECT)
      if (error) return error.message
      if (!data?.length) return 'You can’t edit this event. Only its host, an admin, or a lead of its circle can.'
      const saved = toEvent(data[0])
      setEvents(list => list.map(e => (e.id === saved.id ? saved : e)))
      setForm(null)
      setOpenId(saved.id)
      setToast('Event updated')
      return null
    }
    const { data, error } = await supabase.from('events').insert({ ...payload, created_by: userId }).select(EVENT_SELECT).single()
    if (error) {
      return error.code === '42501'
        ? payload.kind === 'core'
          ? 'Only full members, circle leads and project leads can post core events.'
          : 'Only joining members and above can post events.'
        : error.message
    }
    const saved = toEvent(data)
    setEvents(list => [...list, saved])
    setForm(null)
    setTab(saved.kind)
    setAnchor(startOfDay(new Date(saved.starts_at)))
    setOpenId(saved.id)
    setToast('Event posted')
    return null
  }

  async function rsvp(eventId: string, status: RsvpStatus | null) {
    if (!userId) return
    const prev = rsvps
    setRsvps(list => {
      const rest = list.filter(r => !(r.event_id === eventId && r.user_id === userId))
      return status ? [...rest, { event_id: eventId, user_id: userId, status, person: me }] : rest
    })
    const { error } = status
      ? await supabase.from('event_rsvps').upsert({ event_id: eventId, user_id: userId, status }, { onConflict: 'event_id,user_id' })
      : await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', userId)
    if (error) {
      setRsvps(prev)
      setToast('Your RSVP didn’t save. Try again.')
    }
  }

  async function deleteEvent(eventId: string) {
    const { data, error } = await supabase.from('events').delete().eq('id', eventId).select('id')
    if (error || !data?.length) {
      setToast('That event couldn’t be deleted.')
      return
    }
    setEvents(list => list.filter(e => e.id !== eventId))
    setRsvps(list => list.filter(r => r.event_id !== eventId))
    setOpenId(null)
    setToast('Event deleted')
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--ink)' : 'var(--ink-3)',
    padding: '8px 14px', background: 'none', border: 'none',
    borderBottom: active ? '2px solid var(--m14)' : '2px solid transparent',
    cursor: 'pointer', marginBottom: -1, outline: 'none', whiteSpace: 'nowrap',
  })
  const navBtn: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--surface)',
    border: '1px solid var(--rule)', borderRadius: 8, padding: '6px 11px', cursor: 'pointer',
  }

  return (
    <div className="ev-page" style={{ padding: '26px 32px 60px' }}>
      {/* ── Page head ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb, var(--m14) 10%, var(--surface))', color: 'var(--m14)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, marginBottom: 10 }}>
            Module 14 · Calendar
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 8px' }}>
            Community calendar
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            {counts.core} core · {counts.community} community hosted · {counts.task} task{counts.task === 1 ? '' : 's'} · upcoming
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {initialFeeds && (
            <button onClick={() => setShowFeeds(true)} title="Show events from Google Calendar or another calendar" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
              🔗 Linked calendars{initialFeeds.length > 0 ? ` (${initialFeeds.length})` : ''}
            </button>
          )}
          {canPostCommunity ? (
            <button onClick={() => openNew()} style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--m14)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
              + New event or task
            </button>
          ) : userId ? (
            <Link href="/join" style={{ fontSize: 12, color: 'var(--ink-3)', maxWidth: 260, lineHeight: 1.45, textDecoration: 'none' }}>
              Joining members can post events. <span style={{ color: 'var(--m14)', fontWeight: 600 }}>Start joining →</span>
            </Link>
          ) : (
            <Link href="/auth/login" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '8px 16px', textDecoration: 'none' }}>
              Sign in for member events
            </Link>
          )}
        </div>
      </div>

      {!userId && (
        <div style={{ fontSize: 13, color: 'var(--ink-2)', background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          You’re seeing public events. <Link href="/auth/login" style={{ color: 'var(--m14)', fontWeight: 600 }}>Sign in</Link> to see member events and RSVP.
        </div>
      )}

      {/* ── Kind tabs ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--rule)', marginBottom: 8, overflowX: 'auto' }}>
        {EVENT_KINDS.map(k => (
          <button key={k} onClick={() => setTab(k)} style={tabStyle(tab === k)}>
            {KIND_META[k].label}
            {counts[k] > 0 && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: 'var(--m14)' }}>{counts[k]}</span>}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 16px' }}>{KIND_META[tab].blurb}</p>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {view !== 'list' ? (
            <>
              <button onClick={() => step(-1)} style={navBtn} aria-label="Previous">‹</button>
              <button onClick={() => now && setAnchor(startOfDay(now))} style={navBtn}>Today</button>
              <button onClick={() => step(1)} style={navBtn} aria-label="Next">›</button>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginLeft: 6 }}>
                {anchor ? (view === 'month' ? fmtMonthTitle(anchor) : fmtWeekTitle(anchor)) : ''}
              </span>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setShowPast(false)} style={{ ...navBtn, ...(showPast ? {} : { borderColor: 'var(--m14)', color: 'var(--m14)' }) }}>Upcoming</button>
              <button onClick={() => setShowPast(true)} style={{ ...navBtn, ...(showPast ? { borderColor: 'var(--m14)', color: 'var(--m14)' } : {}) }}>Past</button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={circleFilter}
            onChange={e => setCircleFilter(e.target.value as CircleSlug | '')}
            aria-label="Filter by circle"
            style={{ fontSize: 13, color: 'var(--ink-2)', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '6px 8px' }}
          >
            <option value="">All circles</option>
            {circles.slugs.map(p => <option key={p} value={p}>{circles.meta(p).emoji} {circles.meta(p).label}</option>)}
          </select>
          <div style={{ display: 'flex', border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden' }}>
            {VIEWS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                fontSize: 13, fontWeight: 600, padding: '6px 12px', border: 'none', cursor: 'pointer',
                background: view === v.id ? 'var(--m14)' : 'var(--surface)', color: view === v.id ? '#fff' : 'var(--ink-2)',
              }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Calendar ──────────────────────────────────────────────────── */}
      {!now || !anchor ? (
        <div style={{ height: 420, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--rule)' }} />
      ) : view === 'month' ? (
        <MonthView
          anchor={anchor} events={visible} now={now} onOpen={setOpenId}
          onPickDay={d => { setAnchor(d); setView('week') }}
        />
      ) : view === 'week' ? (
        <WeekView anchor={anchor} events={visible} now={now} onOpen={setOpenId} />
      ) : (
        <ListView events={visible} rsvps={rsvps} userId={userId} now={now} showPast={showPast} onOpen={setOpenId} />
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 14, fontSize: 11.5, color: 'var(--ink-3)' }}>
        {circles.slugs.map(p => (
          <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: circles.meta(p).color }} />{circles.meta(p).label}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--m14)' }} />No circle
        </span>
      </div>

      {openEvent && !form && (
        <EventDetailModal
          event={openEvent}
          rsvps={rsvps.filter(r => r.event_id === openEvent.id)}
          userId={userId}
          canEdit={!openEvent.feed_id && canEditEvent(openEvent, userId, role, leadCircles)}
          onClose={() => setOpenId(null)}
          onRsvp={status => rsvp(openEvent.id, status)}
          onEdit={() => setForm({ existing: openEvent, draft: {} })}
          onDelete={() => deleteEvent(openEvent.id)}
        />
      )}

      {showFeeds && initialFeeds && (
        <CalendarFeedsModal initial={initialFeeds} onClose={() => setShowFeeds(false)} />
      )}

      {form && (
        <EventFormModal
          existing={form.existing}
          draft={form.draft}
          role={role}
          projects={projects}
          proposals={proposals}
          onClose={() => setForm(null)}
          onSave={saveEvent}
        />
      )}

      {toast && (
        <div role="status" style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
          background: 'var(--ink)', color: 'var(--surface)', fontSize: 13, fontWeight: 600,
          padding: '10px 18px', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxWidth: 'calc(100vw - 32px)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
