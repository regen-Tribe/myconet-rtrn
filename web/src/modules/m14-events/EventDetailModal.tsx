'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCircles } from '@/core/components/CirclesProvider'
import type { CalendarEvent, EventRsvp, RsvpStatus } from './types'
import { fmtEventWhen } from './lib/calendar'
import { KIND_META } from './lib/permissions'
import { categoryColor, eventColor } from './CalendarViews'
import { ModalShell } from '@/core/components/ModalShell'
import { EventComments } from './EventComments'

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--ink-4)', marginBottom: 8,
}

function PeopleChips({ people }: { people: EventRsvp[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {people.map(r => (
        <Link
          key={r.user_id}
          href={r.person?.username ? `/u/${r.person.username}` : '#'}
          style={{
            fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', textDecoration: 'none',
            background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 20, padding: '3px 10px',
          }}
        >
          {r.person?.first_name ?? r.person?.username ?? 'Member'}
        </Link>
      ))}
    </div>
  )
}

export function EventDetailModal({
  event, rsvps, userId, canEdit, canAddNotes, canComment, isAdmin, onClose, onRsvp, onEdit, onDelete, onSaveNotes,
}: {
  event: CalendarEvent
  rsvps: EventRsvp[]
  userId: string | null
  canEdit: boolean
  /** A linked event, and the viewer is a full member */
  canAddNotes: boolean
  canComment: boolean
  isAdmin: boolean
  onClose: () => void
  onRsvp: (status: RsvpStatus | null) => Promise<void>
  onEdit: () => void
  onDelete: () => Promise<void>
  /** Returns an error message, or null when saved */
  onSaveNotes: (notes: string) => Promise<string | null>
}) {
  const circles = useCircles()
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [notesDraft, setNotesDraft] = useState<string | null>(null)
  const [notesError, setNotesError] = useState('')
  const color = eventColor(event, circles)
  const kindMeta = KIND_META[event.kind]
  const going = rsvps.filter(r => r.status === 'going')
  const maybe = rsvps.filter(r => r.status === 'maybe')
  const mine = userId ? rsvps.find(r => r.user_id === userId)?.status ?? null : null
  const creatorName = event.creator?.first_name ?? event.creator?.username ?? 'A member'

  async function rsvp(status: RsvpStatus) {
    setBusy(true)
    await onRsvp(mine === status ? null : status)
    setBusy(false)
  }

  async function saveNotes() {
    if (notesDraft === null) return
    setBusy(true)
    const err = await onSaveNotes(notesDraft)
    setBusy(false)
    if (err) setNotesError(err)
    else { setNotesDraft(null); setNotesError('') }
  }

  async function remove() {
    setBusy(true)
    await onDelete()
    setBusy(false)
  }

  const rsvpBtn = (status: RsvpStatus, label: string) => {
    const active = mine === status
    return (
      <button
        onClick={() => rsvp(status)}
        disabled={busy}
        style={{
          fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--radius)', cursor: busy ? 'wait' : 'pointer',
          border: `1px solid ${active ? 'var(--m14)' : 'var(--rule)'}`,
          background: active ? 'var(--m14)' : 'var(--surface)',
          color: active ? '#fff' : 'var(--ink-2)',
        }}
      >
        {active ? `✓ ${label}` : label}
      </button>
    )
  }

  return (
    <ModalShell title={event.title} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--m14)', borderRadius: 20, padding: '2px 9px' }}>
            {KIND_META[event.kind].short}
          </span>
          {event.category && (
            <span style={{ fontSize: 11, fontWeight: 700, color: categoryColor(event.category), background: `color-mix(in srgb, ${categoryColor(event.category)} 12%, var(--surface))`, borderRadius: 20, padding: '2px 9px' }}>
              {event.category}
            </span>
          )}
          {circles.has(event.circle) && (
            <span style={{ fontSize: 11, fontWeight: 700, color, background: `color-mix(in srgb, ${color} 12%, var(--surface))`, borderRadius: 20, padding: '2px 9px' }}>
              {circles.meta(event.circle).emoji} {circles.meta(event.circle).label}
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', background: 'var(--bg-2)', borderRadius: 20, padding: '2px 9px' }}>
            {event.is_public ? '🌍 Public' : '🔒 Members only'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: 'var(--ink-2)' }}>
          <div>🗓 {fmtEventWhen(event)}</div>
          {event.location && <div style={{ overflowWrap: 'anywhere' }}>📍 {event.location}</div>}
          {event.online_url && (
            <div style={{ overflowWrap: 'anywhere' }}>
              💻 <a href={event.online_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--m14)', fontWeight: 600 }}>Join online</a>
            </div>
          )}
        </div>

        {event.description && (
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{event.description}</p>
        )}

        {event.feed_id && (event.notes || canAddNotes) && (
          <div>
            <div style={sectionLabel}>Description{event.notes_author ? ` · added by ${event.notes_author.first_name ?? event.notes_author.username ?? 'a member'}` : ''}</div>
            {notesDraft !== null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={4} maxLength={5000} autoFocus
                  placeholder="What to expect, what to bring, who's hosting…" aria-label="Event description"
                  style={{ fontSize: 14, fontFamily: 'inherit', lineHeight: 1.55, padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', resize: 'vertical' }}
                />
                {notesError && <div style={{ fontSize: 12.5, color: '#dc2626' }}>{notesError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveNotes} disabled={busy} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--m14)', color: '#fff', cursor: busy ? 'wait' : 'pointer' }}>
                    {busy ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setNotesDraft(null); setNotesError('') }} disabled={busy} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {event.notes && <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 8px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{event.notes}</p>}
                {canAddNotes && (
                  <button onClick={() => setNotesDraft(event.notes ?? '')} style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer' }}>
                    {event.notes ? 'Edit description' : '+ Add a description'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {(event.project || event.proposal) && (
          <div>
            <div style={sectionLabel}>Linked to</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              {event.project && <Link href={`/ops/${event.project.id}`} style={{ color: 'var(--m7)', fontWeight: 600 }}>⚙️ Project · {event.project.title}</Link>}
              {event.proposal && <Link href="/governance" style={{ color: 'var(--m9)', fontWeight: 600 }}>⚖️ Proposal · {event.proposal.title}</Link>}
            </div>
          </div>
        )}

        <div>
          <div style={sectionLabel}>{kindMeta.rsvpHeading}</div>
          {userId ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {rsvpBtn('going', kindMeta.goingLabel)}
                {rsvpBtn('maybe', 'Maybe')}
              </div>
              {going.length === 0 && maybe.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{kindMeta.noneYet}</div>}
              {going.length > 0 && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>{going.length} {kindMeta.goingCount}</div><PeopleChips people={going} /></div>}
              {maybe.length > 0 && <div><div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>{maybe.length} maybe</div><PeopleChips people={maybe} /></div>}
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              <Link href="/auth/login" style={{ color: 'var(--m14)', fontWeight: 600 }}>Sign in</Link> to RSVP and see who’s going.
            </div>
          )}
        </div>

        <EventComments eventId={event.id} userId={userId} canComment={canComment} isAdmin={isAdmin} labelStyle={sectionLabel} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
          {event.feed_id ? (
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>🔗 From a linked calendar. Changes there show up here within the hour.</div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Hosted by{' '}
              {event.creator?.username
                ? <Link href={`/u/${event.creator.username}`} style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{creatorName}</Link>
                : creatorName}
            </div>
          )}
          {canEdit && (
            <div style={{ display: 'flex', gap: 8 }}>
              {confirmDelete ? (
                <>
                  <button onClick={() => setConfirmDelete(false)} disabled={busy} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer' }}>
                    Keep it
                  </button>
                  <button onClick={remove} disabled={busy} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius)', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' }}>
                    {busy ? 'Deleting…' : 'Delete event'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setConfirmDelete(true)} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: '#dc2626', cursor: 'pointer' }}>
                    Delete
                  </button>
                  <button onClick={onEdit} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--m14)', color: '#fff', cursor: 'pointer' }}>
                    Edit
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  )
}
