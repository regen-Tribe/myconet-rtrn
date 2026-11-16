'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { ModalShell } from '@/core/components/ModalShell'
import type { CalendarEvent, EventKind } from './types'
import type { PhotoEvent } from '@/app/api/events/photo/route'
import { addDays, sameDay, startOfDay, startOfWeek, WEEK_LABELS } from './lib/calendar'
import { canCreateKind, EVENT_KINDS, KIND_META } from './lib/permissions'
import { EVENT_SELECT, toEvent } from './lib/queries'

/**
 * Add events from a photo of the schedule board: the AI reads the board (/api/events/photo),
 * the person checks every row, and the ticked ones are posted as them (so the usual rules
 * apply) and sent to the linked Google calendar like any saved event.
 */

const DAY_CODES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const MAX_SIDE = 2000

interface Row extends PhotoEvent { key: number; on: boolean; already: string | null }

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }
const inputStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--ink)', background: 'var(--bg)', border: '1px solid var(--rule)',
  borderRadius: 6, padding: '5px 7px', outline: 'none', boxSizing: 'border-box', minWidth: 0,
}
const primaryBtn: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--m14)', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer' }

const dateInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9áéíóúñü ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && w !== 'circle' && w !== 'the'))

/** Shrinks the photo in the browser so it uploads quickly and fits the AI's limit */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}

export function PhotoImportModal({ events, role, userId, circleNames, onClose, onAdded }: {
  events: CalendarEvent[]
  role: string
  userId: string
  circleNames: string[]
  onClose: () => void
  /** The new events, and a toast line */
  onAdded: (added: CalendarEvent[], note: string) => void
}) {
  const supabase = createClient()
  const [week, setWeek] = useState(() => {
    // The coming week: today if it's Monday, else next Monday
    const today = startOfDay(new Date())
    const monday = startOfWeek(today)
    return dateInput(sameDay(monday, today) ? monday : addDays(monday, 7))
  })
  const [preview, setPreview] = useState<string | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [kind, setKind] = useState<EventKind>('community')
  const [isPublic, setIsPublic] = useState(true)
  const [busy, setBusy] = useState<'read' | 'add' | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const monday = useMemo(() => { const [y, m, d] = week.split('-').map(Number); return new Date(y, m - 1, d) }, [week])
  const weekEvents = useMemo(() => events.filter(e => {
    const s = new Date(e.starts_at)
    return s >= monday && s < addDays(monday, 7)
  }), [events, monday])

  useEffect(() => {
    if (busy !== 'read') return
    const started = Date.now()
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(t)
  }, [busy])

  // An event already on the calendar that day with the same start, or sharing a word of its name
  const findAlready = (r: PhotoEvent): string | null => {
    const day = addDays(monday, DAY_CODES.indexOf(r.day))
    const w = words(r.title)
    const hit = weekEvents.find(e => {
      const s = new Date(e.starts_at)
      if (!sameDay(s, day)) return false
      const sameStart = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}` === r.start
      return [...words(e.title)].some(x => w.has(x)) || (sameStart && w.size === 0)
    })
    return hit?.title ?? null
  }

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(''); setRows(null)
    try {
      const url = await shrink(file)
      setImage(url); setPreview(url)
    } catch {
      setError('That photo couldn’t be opened. Try a JPEG or PNG (on iPhone, share it as “Most compatible”).')
    }
  }

  const read = async () => {
    if (!image) return
    setBusy('read'); setError(''); setElapsed(0)
    const names = [...new Set([...weekEvents.map(e => e.title), ...weekEvents.map(e => e.location ?? ''), ...circleNames])].filter(Boolean)
    try {
      const res = await fetch('/api/events/photo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image, names }) })
      const body = await res.json().catch(() => ({})) as { events?: PhotoEvent[]; error?: string }
      if (!res.ok || !body.events) throw new Error(body.error ?? `HTTP ${res.status}`)
      if (!body.events.length) throw new Error('No events were found on the photo. Try a sharper, straight-on photo.')
      setRows(body.events.map((e, key) => { const already = findAlready(e); return { ...e, key, already, on: !already } }))
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(null)
  }

  const edit = (key: number, patch: Partial<Row>) => setRows(list => list?.map(r => (r.key === key ? { ...r, ...patch } : r)) ?? null)

  const at = (r: Row, time: string) => {
    const [h, m] = time.split(':').map(Number)
    const d = addDays(monday, DAY_CODES.indexOf(r.day))
    d.setHours(h, m, 0, 0)
    return d
  }

  const add = async () => {
    const chosen = (rows ?? []).filter(r => r.on && r.title.trim())
    if (!chosen.length) return setError('Tick at least one event to add.')
    setBusy('add'); setError('')
    const payload = chosen.map(r => {
      const starts = at(r, r.start)
      let ends = r.end ? at(r, r.end) : null
      if (ends && ends <= starts) ends = null
      return {
        title: r.title.trim(), description: r.host ? `With ${r.host}.` : null, location: r.location?.trim() || null,
        starts_at: starts.toISOString(), ends_at: ends?.toISOString() ?? null, all_day: false,
        kind, is_public: isPublic, created_by: userId,
      }
    })
    const { data, error: err } = await supabase.from('events').insert(payload).select(EVENT_SELECT)
    if (err) {
      setBusy(null)
      return setError(err.code === '42501' ? `You can’t post ${KIND_META[kind].label.toLowerCase()}. Pick another calendar.` : err.message)
    }
    const added = (data ?? []).map(toEvent)
    // Each one goes to the linked Google calendar, like an event saved from the form
    let inGoogle = 0
    for (const [i, e] of added.entries()) {
      setProgress(`Adding to Google Calendar ${i + 1} of ${added.length}…`)
      try {
        const res = await fetch('/api/calendar-push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'saved', eventId: e.id }) })
        const r = await res.json() as { google?: string }
        if (r.google === 'added' || r.google === 'updated') inGoogle++
      } catch { /* the event is posted; Google just missed this one */ }
    }
    setBusy(null); setProgress('')
    onAdded(added, `Added ${added.length} event${added.length === 1 ? '' : 's'}${inGoogle ? `, ${inGoogle === added.length ? 'and' : `${inGoogle} of them`} to Google Calendar` : ''}`)
  }

  const kinds = EVENT_KINDS.filter(k => k !== 'task' && canCreateKind(k, role))
  const ticked = rows?.filter(r => r.on).length ?? 0

  return (
    <ModalShell title="📷 Add events from a photo" onClose={busy ? () => {} : onClose} maxWidth={rows ? 860 : 560}>
      {!rows ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, lineHeight: 1.55 }}>
            Take a photo of the schedule board, straight on and in good light. The AI reads the notes, then you check each one before anything is added.
          </p>
          <div>
            <label style={labelStyle} htmlFor="photo-week">Week the board is for (Monday)</label>
            <input id="photo-week" type="date" value={week} onChange={e => e.target.value && setWeek(dateInput(startOfWeek(new Date(`${e.target.value}T12:00`))))} style={{ ...inputStyle, fontSize: 14, padding: '8px 10px' }} />
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={e => pick(e.target.files?.[0])} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} disabled={!!busy} style={{ ...primaryBtn, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--rule)' }}>
              {preview ? 'Choose another photo' : 'Choose or take a photo'}
            </button>
          </div>
          {preview && <img src={preview} alt="The schedule board" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--rule)' }} />}
          {busy === 'read' && (
            <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
              Reading the board… {elapsed}s. This usually takes 2–3 minutes; keep this window open.
            </p>
          )}
          {error && <p style={{ fontSize: 13, color: 'var(--danger, #dc2626)', margin: 0 }}>{error}</p>}
          <div>
            <button onClick={read} disabled={!image || !!busy} style={{ ...primaryBtn, opacity: !image || busy ? 0.6 : 1 }}>
              {busy === 'read' ? 'Reading…' : 'Read the board'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, lineHeight: 1.55 }}>
            Check each event against the board and fix anything misread. Ones marked <strong>already on the calendar</strong> are unticked.
          </p>
          <div style={{ display: 'grid', gap: 6 }}>
            {rows.map(r => (
              <div key={r.key} style={{
                display: 'grid', gridTemplateColumns: 'auto 64px minmax(140px, 2fr) 84px 84px minmax(90px, 1fr)', gap: 6, alignItems: 'center',
                padding: '6px 8px', borderRadius: 8, border: '1px solid var(--rule)', background: r.on ? 'var(--surface)' : 'var(--bg-2)', opacity: r.on ? 1 : 0.7,
              }}>
                <input type="checkbox" checked={r.on} onChange={e => edit(r.key, { on: e.target.checked })} aria-label={`Add ${r.title}`} />
                <select value={r.day} onChange={e => edit(r.key, { day: e.target.value as Row['day'] })} style={inputStyle} aria-label="Day">
                  {DAY_CODES.map((d, i) => <option key={d} value={d}>{WEEK_LABELS[i]} {addDays(monday, i).getDate()}</option>)}
                </select>
                <input value={r.title} onChange={e => edit(r.key, { title: e.target.value })} style={inputStyle} aria-label="Title" />
                <input type="time" value={r.start} onChange={e => e.target.value && edit(r.key, { start: e.target.value })} style={inputStyle} aria-label="Starts" />
                <input type="time" value={r.end ?? ''} onChange={e => edit(r.key, { end: e.target.value || null })} style={inputStyle} aria-label="Ends" />
                <input value={r.location ?? ''} onChange={e => edit(r.key, { location: e.target.value || null })} placeholder="Where" style={inputStyle} aria-label="Where" />
                {(r.unsure || r.already || r.host) && (
                  <div style={{ gridColumn: '3 / -1', fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {r.unsure && <span style={{ color: '#b45309', fontWeight: 600 }}>⚠ Hard to read: check it</span>}
                    {r.already && <span>Already on the calendar: “{r.already}”</span>}
                    {r.host && <span>With {r.host}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', fontSize: 13, color: 'var(--ink-2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Add to
              <select value={kind} onChange={e => setKind(e.target.value as EventKind)} style={inputStyle}>
                {kinds.map(k => <option key={k} value={k}>{KIND_META[k].label}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} /> Public
            </label>
          </div>
          {progress && <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>{progress}</p>}
          {error && <p style={{ fontSize: 13, color: 'var(--danger, #dc2626)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={add} disabled={!!busy || !ticked} style={{ ...primaryBtn, opacity: busy || !ticked ? 0.6 : 1 }}>
              {busy === 'add' ? 'Adding…' : `Add ${ticked} event${ticked === 1 ? '' : 's'}`}
            </button>
            <button onClick={() => { setRows(null); setError('') }} disabled={!!busy} style={{ ...primaryBtn, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--rule)' }}>
              Back to the photo
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
