'use client'

import { useState } from 'react'
import { useCircles } from '@/core/components/CirclesProvider'
import type { CircleSlug } from '@/core/lib/circles'
import { ROLE_LABELS } from '@/core/lib/roles'
import type { CalendarEvent, EventKind, LinkOption } from './types'
import { toLocalInput } from './lib/calendar'
import { canCreateKind, EVENT_KINDS, KIND_META } from './lib/permissions'
import { DAILY_CATEGORIES } from './lib/feed-url'
import { ModalShell } from '@/core/components/ModalShell'

/** Columns written to `events` on create/update. */
export interface EventPayload {
  title: string
  description: string | null
  location: string | null
  online_url: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
  kind: EventKind
  is_public: boolean
  circle: CircleSlug | null
  category: string | null
  project_id: string | null
  proposal_id: string | null
}

export interface EventDraft {
  kind?: EventKind
  project_id?: string | null
  proposal_id?: string | null
  circle?: string | null
  /** Local day to start on, e.g. the month cell that was clicked. */
  day?: Date
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }
const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 14, color: 'var(--ink)', background: 'var(--bg)', border: '1px solid var(--rule)',
  borderRadius: 'var(--radius)', padding: '8px 10px', outline: 'none', boxSizing: 'border-box',
}

function defaultStart(day?: Date): string {
  const d = day ? new Date(day) : new Date()
  if (day) d.setHours(18, 0, 0, 0)
  else { d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0) }
  return toLocalInput(d.toISOString())
}

export function EventFormModal({
  existing, draft, role, projects, proposals, onClose, onSave,
}: {
  existing: CalendarEvent | null
  draft: EventDraft
  role: string
  projects: LinkOption[]
  proposals: LinkOption[]
  onClose: () => void
  /** Resolves to an error message, or null on success. */
  onSave: (payload: EventPayload) => Promise<string | null>
}) {
  const circles = useCircles()
  const canCore = canCreateKind('core', role)
  const initialKind: EventKind = existing?.kind ?? (draft.kind && draft.kind !== 'community' && canCore ? draft.kind : 'community')

  const [title, setTitle] = useState(existing?.title ?? '')
  const [kind, setKind] = useState<EventKind>(initialKind)
  const [allDay, setAllDay] = useState(existing?.all_day ?? false)
  const [start, setStart] = useState(existing ? toLocalInput(existing.starts_at) : defaultStart(draft.day))
  const [end, setEnd] = useState(existing ? toLocalInput(existing.ends_at) : '')
  const [location, setLocation] = useState(existing?.location ?? '')
  const [onlineUrl, setOnlineUrl] = useState(existing?.online_url ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [circle, setCircle] = useState<CircleSlug | ''>(
    (circles.slugs as readonly string[]).includes(existing?.circle ?? draft.circle ?? '') ? ((existing?.circle ?? draft.circle) as CircleSlug) : '',
  )
  const [projectId, setProjectId] = useState(existing?.project_id ?? draft.project_id ?? '')
  const [proposalId, setProposalId] = useState(existing?.proposal_id ?? draft.proposal_id ?? '')
  const [isPublic, setIsPublic] = useState(existing?.is_public ?? true)
  const [category, setCategory] = useState(existing?.category ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [kindNote, setKindNote] = useState<string | null>(null)

  // Date-only inputs use the first 10 chars of the datetime-local value
  const startDate = start.slice(0, 10)
  const endDate = end.slice(0, 10)

  function pickKind(k: EventKind) {
    if (k !== 'community' && !canCore) {
      setKindNote(`${KIND_META[k].label} are posted by full members, circle leads and project leads. You're a ${ROLE_LABELS[role] ?? 'Explorer'}, so you can post a community hosted event instead.`)
      return
    }
    setKindNote(null)
    setKind(k)
  }

  function pickProject(id: string) {
    setProjectId(id)
    // Default the circle to the project's circle when none is chosen yet
    const p = projects.find(x => x.id === id)
    if (p?.circle && !circle && (circles.slugs as readonly string[]).includes(p.circle)) setCircle(p.circle as CircleSlug)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError('Give the event a title.')
    if (!start) return setError('Pick when the event starts.')

    const startsAt = allDay ? new Date(`${startDate}T00:00`) : new Date(start)
    const endsAt = allDay
      ? (endDate ? new Date(`${endDate}T23:59`) : null)
      : (end ? new Date(end) : null)
    if (Number.isNaN(startsAt.getTime())) return setError('The start date isn’t valid.')
    if (endsAt && endsAt < startsAt) return setError('The event can’t end before it starts.')
    const url = onlineUrl.trim()
    if (url && !/^https?:\/\//i.test(url)) return setError('The online link should start with https://')

    setSaving(true)
    const err = await onSave({
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      online_url: url || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt ? endsAt.toISOString() : null,
      all_day: allDay,
      kind,
      is_public: isPublic,
      circle: circle || null,
      category: category.trim() || null,
      project_id: projectId || null,
      proposal_id: proposalId || null,
    })
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <ModalShell title={existing ? (existing.kind === 'task' ? 'Edit task' : 'Edit event') : 'New event or task'} onClose={onClose} maxWidth={560}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="ev-title">Title</label>
          <input id="ev-title" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="Full moon potluck" autoFocus />
        </div>

        <div>
          <span style={labelStyle}>Calendar</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
            {EVENT_KINDS.map(k => {
              const active = kind === k
              const locked = k !== 'community' && !canCore
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => pickKind(k)}
                  style={{
                    textAlign: 'left', cursor: 'pointer', borderRadius: 10, padding: '10px 12px',
                    border: `1px solid ${active ? 'var(--m14)' : 'var(--rule)'}`,
                    background: active ? 'color-mix(in srgb, var(--m14) 8%, var(--surface))' : 'var(--surface)',
                    opacity: locked ? 0.6 : 1,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--m14)' : 'var(--ink)' }}>{locked ? '🔒 ' : ''}{KIND_META[k].label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.4 }}>{KIND_META[k].blurb}</div>
                </button>
              )
            })}
          </div>
          {kindNote && <div style={{ fontSize: 12, color: 'var(--ink-2)', background: 'var(--bg-2)', borderRadius: 8, padding: '8px 10px', marginTop: 8, lineHeight: 1.5 }}>🔒 {kindNote}</div>}
        </div>

        {(kind === 'daily' || category) && (
          <div>
            <label style={labelStyle} htmlFor="ev-category">Category <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>(optional)</span></label>
            <input id="ev-category" list="ev-categories" value={category} maxLength={40} onChange={e => setCategory(e.target.value)} style={inputStyle} placeholder="Food, Movement, Focus hours…" />
            <datalist id="ev-categories">{DAILY_CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
          </div>
        )}

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', marginBottom: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} /> All-day event
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div>
              <label style={labelStyle} htmlFor="ev-start">Starts</label>
              {allDay
                ? <input id="ev-start" type="date" value={startDate} onChange={e => setStart(`${e.target.value}T${start.slice(11) || '00:00'}`)} style={inputStyle} />
                : <input id="ev-start" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} style={inputStyle} />}
            </div>
            <div>
              <label style={labelStyle} htmlFor="ev-end">Ends <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>(optional)</span></label>
              {allDay
                ? <input id="ev-end" type="date" value={endDate} min={startDate} onChange={e => setEnd(e.target.value ? `${e.target.value}T23:59` : '')} style={inputStyle} />
                : <input id="ev-end" type="datetime-local" value={end} min={start} onChange={e => setEnd(e.target.value)} style={inputStyle} />}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <div>
            <label style={labelStyle} htmlFor="ev-loc">Location</label>
            <input id="ev-loc" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} placeholder="Common house" />
          </div>
          <div>
            <label style={labelStyle} htmlFor="ev-url">Online link</label>
            <input id="ev-url" value={onlineUrl} onChange={e => setOnlineUrl(e.target.value)} style={inputStyle} placeholder="https://meet…" inputMode="url" />
          </div>
        </div>

        <div>
          <label style={labelStyle} htmlFor="ev-desc">Description</label>
          <textarea id="ev-desc" value={description} onChange={e => setDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} placeholder="What to expect, what to bring…" />
        </div>

        <div>
          <span style={labelStyle}>Circle <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>(optional)</span></span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button type="button" onClick={() => setCircle('')} style={{
              fontSize: 12, fontWeight: 600, borderRadius: 20, padding: '4px 11px', cursor: 'pointer',
              border: `1px solid ${circle === '' ? 'var(--ink-2)' : 'var(--rule)'}`, background: 'var(--surface)', color: 'var(--ink-2)',
            }}>None</button>
            {circles.slugs.map(p => {
              const meta = circles.meta(p)
              const active = circle === p
              return (
                <button key={p} type="button" onClick={() => setCircle(p)} style={{
                  fontSize: 12, fontWeight: 600, borderRadius: 20, padding: '4px 11px', cursor: 'pointer',
                  border: `1px solid ${active ? meta.color : 'var(--rule)'}`,
                  background: active ? meta.color : 'var(--surface)', color: active ? '#fff' : meta.color,
                }}>
                  {meta.emoji} {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <div>
            <label style={labelStyle} htmlFor="ev-project">Ops project</label>
            <select id="ev-project" value={projectId} onChange={e => pickProject(e.target.value)} style={inputStyle}>
              <option value="">None</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="ev-proposal">Governance proposal</label>
            <select id="ev-proposal" value={proposalId} onChange={e => setProposalId(e.target.value)} style={inputStyle}>
              <option value="">None</option>
              {proposals.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', lineHeight: 1.45 }}>
          <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} style={{ marginTop: 3 }} />
          <span><strong>Public event</strong> — visitors who aren’t signed in can see it. RSVP names stay members-only.</span>
        </label>

        {error && <div style={{ fontSize: 13, color: '#dc2626', background: 'color-mix(in srgb, #dc2626 8%, var(--surface))', borderRadius: 8, padding: '8px 10px' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={{ fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--m14)', color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Post event'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
