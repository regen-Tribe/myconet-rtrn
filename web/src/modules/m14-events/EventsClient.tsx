'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import { CircleFilter, parseCircleParam } from '@/core/components/v4/CircleFilter'
import type { CircleSlug } from '@/core/lib/circles'
import type { BoardTask, CalendarEvent, CalendarFeed, EventKind, EventRsvp, EventsView, LinkOption, PersonLite, RsvpStatus } from './types'
import { boardTaskEvent } from './lib/board-tasks'
import { addDays, fmtDayLong, fmtMonthTitle, fmtWeekTitle, isPast, sameDay, startOfDay } from './lib/calendar'
import { canCreateKind, canEditEvent, EVENT_KINDS, KIND_META } from './lib/permissions'
import { isFullMember } from '@/core/lib/roles'
import { EVENT_SELECT, toEvent } from './lib/queries'
import { categoryColor, DayView, ListView, MonthView, WeekView } from './CalendarViews'
import { EventDetailModal } from './EventDetailModal'
import { EventFormModal, type EventDraft, type EventPayload } from './EventFormModal'
import { CalendarFeedsModal } from './CalendarFeedsModal'
import { PhotoImportModal } from './PhotoImportModal'
import { modLabel } from '@/core/lib/module-label'
import { DESIGN } from '@/core/lib/instance'
import { Button, Card, Icon, PageHeader } from '@/core/components/v4'

const VIEWS: { id: EventsView; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'list', label: 'List' },
]

export default function EventsClient({
  initialEvents, boardTasks, initialRsvps, userId, me, role, leadCircles, projects, proposals,
  initialKinds, initialView, initialEventId, initialDraft, initialFeeds, canAddFromPhoto,
}: {
  initialEvents: CalendarEvent[]
  /** Dated tasks from the task board, for the Tasks layer */
  boardTasks: BoardTask[]
  initialRsvps: EventRsvp[]
  userId: string | null
  me: PersonLite | null
  role: string
  leadCircles: string[]
  projects: LinkOption[]
  proposals: LinkOption[]
  /** The kinds ticked on arrival */
  initialKinds: EventKind[]
  initialView: EventsView
  initialEventId: string | null
  /** Set when arriving from "+ Add event" on a project or proposal. */
  initialDraft: EventDraft | null
  /** Linked calendars; set for admins only */
  initialFeeds: CalendarFeed[] | null
  /** Admins and the circle that hosts the calendar: "Add from a photo" */
  canAddFromPhoto: boolean
}) {
  const circles = useCircles()
  const router = useRouter()
  const supabase = createClient()
  const [events, setEvents] = useState(initialEvents)
  const [rsvps, setRsvps] = useState(initialRsvps)
  const [kinds, setKinds] = useState<EventKind[]>(initialKinds)
  const [view, setView] = useState<EventsView>(initialView)
  // The circle filter: several circles at once ([] = all), in the address as ?circle=a,b (v4.68.0)
  const searchParams = useSearchParams()
  const [circlePicks, setCirclePicks] = useState<string[]>(() => parseCircleParam(searchParams.get('circle'), c => circles.slugs.length === 0 || circles.has(c)))
  const circleFilter = (circlePicks.length === 1 ? circlePicks[0] : '') as CircleSlug | ''
  const setCircleFilter = (c: CircleSlug | '') => setCirclePicks(c ? [c] : [])
  // Categories the viewer has unticked ("Food"…); everything else shows
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([])
  const [showPast, setShowPast] = useState(false)
  const [openId, setOpenId] = useState<string | null>(initialEventId)
  const [form, setForm] = useState<{ existing: CalendarEvent | null; draft: EventDraft } | null>(
    initialDraft ? { existing: null, draft: initialDraft } : null,
  )
  const [toast, setToast] = useState<string | null>(null)
  const [showFeeds, setShowFeeds] = useState(false)
  const [showPhoto, setShowPhoto] = useState(false)

  // Dates depend on the viewer's time zone, so the calendar renders after mount
  const [now, setNow] = useState<Date | null>(null)
  const [anchor, setAnchor] = useState<Date | null>(null)
  useEffect(() => {
    const n = new Date()
    setNow(n)
    const linked = initialEventId ? initialEvents.find(e => e.id === initialEventId) : null
    setAnchor(startOfDay(linked ? new Date(linked.starts_at) : n))
  }, [initialEventId, initialEvents])

  // Board tasks become calendar items in the browser (their dates and times are local)
  const taskEvents = useMemo(() => (now ? boardTasks.map(boardTaskEvent) : []), [boardTasks, now])
  const shown = useMemo(() => [...events, ...taskEvents], [events, taskEvents])
  // A board task opens on the board; everything else opens the event pop-up
  function open(id: string) {
    const task = taskEvents.find(e => e.id === id)?.board
    if (task) router.push(task.projectId ? `/operations/${task.projectId}?task=${task.taskId}` : `/operations?task=${task.taskId}`)
    else setOpenId(id)
  }

  // Keep the URL shareable without a navigation
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('show', kinds.join(','))
    params.set('view', view)
    if (openId) params.set('event', openId)
    if (circlePicks.length) params.set('circle', circlePicks.join(','))
    window.history.replaceState(null, '', `/calendar?${params.toString()}`)
  }, [kinds, view, openId, circlePicks])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const counts = useMemo(() => Object.fromEntries(
    EVENT_KINDS.map(k => [k, now ? shown.filter(e => e.kind === k && !isPast(e, now)).length : 0]),
  ) as Record<EventKind, number>, [shown, now])

  // Categories ("Food", "Movement"…) used by the ticked kinds, for the checkboxes
  const categories = useMemo(() => [...new Set(shown.filter(e => kinds.includes(e.kind) && e.category).map(e => e.category as string))].sort(), [shown, kinds])
  const visible = shown.filter(e => kinds.includes(e.kind) && (!circlePicks.length || (!!e.circle && circlePicks.includes(e.circle))) && !(e.category && hiddenCategories.includes(e.category)))
  const openEvent = openId ? events.find(e => e.id === openId) ?? null : null
  const canPostCommunity = canCreateKind('community', role)

  function step(dir: -1 | 1) {
    if (!anchor) return
    if (view === 'month') setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1))
    else setAnchor(addDays(anchor, (view === 'day' ? 1 : 7) * dir))
  }

  function openNew(draft: EventDraft = {}) {
    const kind = EVENT_KINDS.find(k => k !== 'task' && kinds.includes(k) && canCreateKind(k, role)) ?? 'community'
    setForm({ existing: null, draft: { kind, circle: circleFilter || null, ...draft } })
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
      push({ action: 'saved', eventId: saved.id }).then(r => setToast(googleNote(r, 'Event updated')))
      return null
    }
    const { data, error } = await supabase.from('events').insert({ ...payload, created_by: userId }).select(EVENT_SELECT).single()
    if (error) {
      return error.code === '42501'
        ? payload.kind === 'core'
          ? 'Only full members, circle leads and task leads can post core events.'
          : 'Only joining members and above can post events.'
        : error.message
    }
    const saved = toEvent(data)
    setEvents(list => [...list, saved])
    setForm(null)
    setKinds(list => (list.includes(saved.kind) ? list : [...list, saved.kind]))
    if (saved.category) setHiddenCategories(list => list.filter(c => c !== saved.category))
    setAnchor(startOfDay(new Date(saved.starts_at)))
    setOpenId(saved.id)
    setToast('Event posted')
    push({ action: 'saved', eventId: saved.id }).then(r => setToast(googleNote(r, 'Event posted')))
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

  async function saveNotes(eventId: string, notes: string): Promise<string | null> {
    const { error } = await supabase.rpc('event_set_notes', { p_event_id: eventId, p_notes: notes })
    if (error) return error.code === '42501' ? 'Only full members can add descriptions.' : error.message
    const { data } = await supabase.from('events').select(EVENT_SELECT).eq('id', eventId).single()
    if (data) { const saved = toEvent(data); setEvents(list => list.map(e => (e.id === saved.id ? saved : e))) }
    return null
  }

  // Changes that also go to the linked Google calendar run through the server (it holds the Google key)
  async function push(body: object): Promise<{ ok?: boolean; error?: string; google?: string; googleError?: string }> {
    try {
      const res = await fetch('/api/calendar-push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      return await res.json()
    } catch (e) {
      return { error: (e as Error).message }
    }
  }
  const googleNote = (r: { google?: string; googleError?: string }, done: string) =>
    r.googleError ? `${done} here. Google Calendar wasn’t updated: ${r.googleError}`
      : r.google === 'updated' ? `${done}, here and in Google Calendar`
      : r.google === 'added' ? `${done}, and added to Google Calendar`
      : r.google === 'removed' ? `${done}, and removed from Google Calendar`
      : done

  async function saveTimes(eventId: string, startsAt: string, endsAt: string | null): Promise<string | null> {
    const r = await push({ action: 'times', eventId, startsAt, endsAt })
    if (r.error) return r.error
    const { data } = await supabase.from('events').select(EVENT_SELECT).eq('id', eventId).single()
    if (data) { const saved = toEvent(data); setEvents(list => list.map(e => (e.id === saved.id ? saved : e))) }
    setToast(googleNote(r, 'Time changed'))
    return null
  }

  async function deleteEvent(eventId: string) {
    const r = await push({ action: 'delete', eventId })
    if (r.error) {
      setToast('That event couldn’t be deleted.')
      return
    }
    setEvents(list => list.filter(e => e.id !== eventId))
    setRsvps(list => list.filter(r => r.event_id !== eventId))
    setOpenId(null)
    setToast(googleNote(r, 'Event deleted'))
  }

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter(x => x !== item) : [...list, item])
  const checkStyle = (on: boolean, color: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
    fontSize: 13, fontWeight: on ? 600 : 400, color: on ? 'var(--ink)' : 'var(--ink-3)',
    padding: '6px 12px', borderRadius: 999, background: 'var(--surface)',
    border: `1px solid ${on ? color : 'var(--rule)'}`,
  })
  const navBtn: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--surface)',
    border: '1px solid var(--rule)', borderRadius: 8, padding: '6px 11px', cursor: 'pointer',
  }

  return (
    <div className={DESIGN === 'v4' ? 'ev-page v4-page v4-page--wide' : 'ev-page'} style={DESIGN === 'v4' ? undefined : { padding: '26px 32px 60px' }}>
      {DESIGN === 'v4' ? (
        <>
          <PageHeader
            eyebrow="Community"
            title="Calendar"
            subtitle={<>What’s on, and what you can join. <b>{EVENT_KINDS.filter(k => k !== 'task').reduce((n, k) => n + counts[k], 0)} events</b> coming up.</>}
            actions={<>
              {initialFeeds && <Button variant="secondary" icon="link" onClick={() => setShowFeeds(true)}>Linked calendars{initialFeeds.length > 0 ? ` · ${initialFeeds.length}` : ''}</Button>}
              {canAddFromPhoto && userId && <Button variant="secondary" icon="camera" onClick={() => setShowPhoto(true)}>Add from a photo</Button>}
              {canPostCommunity ? <Button variant="next" className="ev4-add" onClick={() => openNew()}>+ Add event</Button>
                : userId ? <Button variant="quiet" href="/join">Joining members can post events →</Button>
                : <Button variant="secondary" href="/auth/login">Sign in for member events</Button>}
            </>}
          />
          {!userId && (
            <Card className="v4-note"><Icon name="lock" /><span>You’re seeing public events. <Link href="/auth/login">Sign in</Link> to see member events and RSVP.</span></Card>
          )}

          <div className="v4-chiprow ev4-filters" role="group" aria-label="Show these events">
            {EVENT_KINDS.map(k => {
              const on = kinds.includes(k)
              return (
                <button key={k} type="button" title={KIND_META[k].blurb} aria-pressed={on} className={`v4-chip${on ? ' v4-chip--on' : ''}`} onClick={() => setKinds(list => toggle(list, k))}>
                  <span className="v4-dot" style={{ background: KIND_META[k].color, width: 8, height: 8 }} />{KIND_META[k].label}
                  {counts[k] > 0 && <span className="v4-chip__count">{counts[k]}</span>}
                </button>
              )
            })}
            {categories.length > 0 && <span className="ev4-sep" aria-hidden="true" />}
            {categories.map(c => {
              const on = !hiddenCategories.includes(c)
              return (
                <button key={c} type="button" aria-pressed={on} aria-label={`Category ${c}`} className={`v4-tag ev4-cat${on ? '' : ' v4-tag--out'}`} onClick={() => setHiddenCategories(list => toggle(list, c))}>
                  <span className="v4-dot" style={{ background: categoryColor(c) }} />{c}
                </button>
              )
            })}
          </div>
          {kinds.length === 0 && <p className="v4-hint">Pick at least one kind of event to see the calendar.</p>}

          <div className="v4-toolbar v4-caltools">
            <span className="v4-toolbar__end">
              {view !== 'list' ? (
                <>
                  <span className="v4-seg">
                    <button type="button" onClick={() => step(-1)} aria-label="Previous"><Icon name="left" size={15} /></button>
                    <button type="button" onClick={() => now && setAnchor(startOfDay(now))}>Today</button>
                    <button type="button" onClick={() => step(1)} aria-label="Next"><Icon name="right" size={15} /></button>
                  </span>
                  <b className="v4-caltools__title">
                    {!anchor ? '' : view === 'month' ? fmtMonthTitle(anchor) : view === 'week' ? fmtWeekTitle(anchor)
                      : `${now && sameDay(anchor, now) ? 'Today · ' : ''}${fmtDayLong(anchor)}`}
                  </b>
                </>
              ) : (
                <span className="v4-seg">
                  <button type="button" className={showPast ? '' : 'on'} aria-pressed={!showPast} onClick={() => setShowPast(false)}>Upcoming</button>
                  <button type="button" className={showPast ? 'on' : ''} aria-pressed={showPast} onClick={() => setShowPast(true)}>Past</button>
                </span>
              )}
            </span>
            <span className="v4-toolbar__end">
              <CircleFilter
                options={circles.slugs.map(c => ({ slug: c, label: circles.meta(c).label, color: circles.meta(c).color, count: now ? shown.filter(e => e.circle === c && !isPast(e, now)).length : undefined }))}
                value={circlePicks} onChange={setCirclePicks} mine={leadCircles}
              />
              <span className="v4-seg" role="group" aria-label="View">
                {VIEWS.map(v => <button key={v.id} type="button" className={view === v.id ? 'on' : ''} aria-pressed={view === v.id} onClick={() => setView(v.id)}>{v.label}</button>)}
              </span>
            </span>
          </div>
        </>
      ) : (
        <>
      {/* ── Page head ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb, var(--m14) 10%, var(--surface))', color: 'var(--m14)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, marginBottom: 10 }}>
            {modLabel('14', 'Calendar', 'Module')}
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 8px' }}>
            Community calendar
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            {EVENT_KINDS.map(k => `${counts[k]} ${KIND_META[k].short.toLowerCase()}`).join(' · ')} · upcoming
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {initialFeeds && (
            <button onClick={() => setShowFeeds(true)} title="Show events from Google Calendar or another calendar" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
              🔗 Linked calendars{initialFeeds.length > 0 ? ` (${initialFeeds.length})` : ''}
            </button>
          )}
          {canAddFromPhoto && userId && (
            <button onClick={() => setShowPhoto(true)} title="Read a photo of the schedule board and add its events" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
              📷 Add from a photo
            </button>
          )}
          {canPostCommunity ? (
            <button onClick={() => openNew()} style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--m14)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
              + New event
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

      {/* ── What to show: kinds and categories, any mix ───────────────── */}
      <div role="group" aria-label="Show these events" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {EVENT_KINDS.map(k => {
          const on = kinds.includes(k)
          return (
            <label key={k} title={KIND_META[k].blurb} style={checkStyle(on, KIND_META[k].color)}>
              <input type="checkbox" checked={on} onChange={() => setKinds(list => toggle(list, k))} style={{ margin: 0, accentColor: KIND_META[k].color }} />
              <span aria-hidden style={{ width: 9, height: 9, borderRadius: 2, background: KIND_META[k].color }} />
              {KIND_META[k].label}
              {counts[k] > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: KIND_META[k].color }}>{counts[k]}</span>}
            </label>
          )
        })}
      </div>
      {categories.length > 0 && (
        <div role="group" aria-label="Categories" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {categories.map(c => {
            const on = !hiddenCategories.includes(c)
            const color = categoryColor(c)
            return (
              <label key={c} style={{ ...checkStyle(on, color), fontSize: 12.5, padding: '4px 10px' }}>
                <input type="checkbox" checked={on} onChange={() => setHiddenCategories(list => toggle(list, c))} style={{ margin: 0, accentColor: color }} />
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: color }} />{c}
              </label>
            )
          })}
        </div>
      )}
      {kinds.length === 0 && <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 10px' }}>Tick at least one kind of event to see the calendar.</p>}
      <div style={{ marginBottom: 6 }} />

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {view !== 'list' ? (
            <>
              <button onClick={() => step(-1)} style={navBtn} aria-label="Previous">‹</button>
              <button onClick={() => now && setAnchor(startOfDay(now))} style={navBtn}>Today</button>
              <button onClick={() => step(1)} style={navBtn} aria-label="Next">›</button>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginLeft: 6 }}>
                {!anchor ? '' : view === 'month' ? fmtMonthTitle(anchor) : view === 'week' ? fmtWeekTitle(anchor)
                  : `${now && sameDay(anchor, now) ? 'Today · ' : ''}${fmtDayLong(anchor)}`}
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

        </>
      )}

      {/* ── Calendar ──────────────────────────────────────────────────── */}
      {!now || !anchor ? (
        <div style={{ height: 420, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--rule)' }} />
      ) : view === 'day' ? (
        <DayView
          anchor={anchor} events={visible} rsvps={rsvps} userId={userId} now={now} onOpen={open}
          onPickDay={setAnchor}
        />
      ) : view === 'month' ? (
        <MonthView
          anchor={anchor} events={visible} now={now} onOpen={open}
          onPickDay={d => { setAnchor(d); setView('day') }}
        />
      ) : view === 'week' ? (
        <WeekView anchor={anchor} events={visible} now={now} onOpen={open} />
      ) : (
        <ListView events={visible} rsvps={rsvps} userId={userId} now={now} showPast={showPast} onOpen={open} />
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 14, fontSize: 11.5, color: 'var(--ink-3)' }}>
        {EVENT_KINDS.map(k => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: KIND_META[k].color }} />{KIND_META[k].label}
          </span>
        ))}
        {categories.map(c => (
          <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: categoryColor(c) }} />{c}
          </span>
        ))}
      </div>

      {openEvent && !form && (
        <EventDetailModal
          event={openEvent}
          rsvps={rsvps.filter(r => r.event_id === openEvent.id)}
          userId={userId}
          canEdit={!openEvent.feed_id && canEditEvent(openEvent, userId, role, leadCircles)}
          canAddNotes={!!userId && !!openEvent.feed_id && isFullMember(role)}
          canComment={!!userId && isFullMember(role)}
          isAdmin={role === 'admin'}
          onSaveNotes={notes => saveNotes(openEvent.id, notes)}
          canChangeTime={!!userId}
          onSaveTimes={(start, end) => saveTimes(openEvent.id, start, end)}
          onClose={() => setOpenId(null)}
          onRsvp={status => rsvp(openEvent.id, status)}
          onEdit={() => setForm({ existing: openEvent, draft: {} })}
          onDelete={() => deleteEvent(openEvent.id)}
        />
      )}

      {showPhoto && userId && (
        <PhotoImportModal
          events={events}
          role={role}
          userId={userId}
          circleNames={circles.slugs.map(c => circles.meta(c).label)}
          onClose={() => setShowPhoto(false)}
          onAdded={(added, note) => {
            setEvents(list => [...list, ...added])
            setKinds(list => [...new Set([...list, ...added.map(e => e.kind)])])
            setShowPhoto(false)
            if (added[0]) setAnchor(startOfDay(new Date(added[0].starts_at)))
            setView('week')
            setToast(note)
          }}
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
