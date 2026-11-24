'use client'

import { Icon } from '@/core/components/v4'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { DraftBadge } from '@/core/components/DraftBadge'
import { DESIGN_REVIEW } from '@/core/lib/instance'

// Colours of the pill: with the design review, the v4 tokens (yellow = waiting, green = yes, red = no; #34, #40);
// without it, the hex values as before
const TONE = DESIGN_REVIEW
  ? { draft: ['var(--yellow-ink, #7a5b00)', 'var(--yellow, #fff0b3)'], yes: ['var(--green-ink, #2e7a4a)', 'var(--green, #d3f1dc)'], no: ['var(--red-ink, #ae3a35)', 'var(--red, #ffd9d6)'] }
  : { draft: ['#b45309', '#fef3c7'], yes: ['#15803d', '#dcfce7'], no: ['#b91c1c', '#fee2e2'] }

// How far the pill must slide to count (px), and how long "Declined · Undo" waits before the task is deleted
const THRESHOLD = 36
const UNDO_MS = 5000

/**
 * The Draft pill on a task the agent drafted (v4.33.0). Someone who may confirm it (a lead or admin) slides it
 * right to approve (the task stays, no longer a draft) or left to decline (the task is deleted after a few
 * seconds, with Undo). Arrow keys do the same. Everyone else sees the plain pill. The pill keeps its pointer to
 * itself, so sliding it doesn't drag the card or open the task.
 */
export function DraftSwipe({ taskId, canDecide, onApproved, onDeclined, onUndone, keepLabel = false }: {
  taskId: string; canDecide: boolean
  onApproved?: () => void; onDeclined?: () => void
  /** An approval undone: it's a draft again */
  onUndone?: () => void
  /** Show "Approved" / "Declined" once decided, instead of nothing (v4.114.0: the To decide list keeps its rows until a reload) */
  keepLabel?: boolean
}) {
  const [dx, setDx] = useState(0)
  const [sliding, setSliding] = useState(false)
  const [state, setState] = useState<'draft' | 'saving' | 'declining' | 'approved' | 'gone'>('draft')
  const [error, setError] = useState('')
  const start = useRef<number | null>(null)
  // The decline's log entry, for an Undo that lasts until the page is reloaded (v4.130.0)
  const [declineLog, setDeclineLog] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  if (!canDecide) return <DraftBadge />
  const label = (text: string, color: string, bg: string, action?: { label: string; run: () => void }) => (
    <span onClick={e => { e.stopPropagation(); e.preventDefault() }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, lineHeight: 1.2, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color, background: bg, borderRadius: 6, padding: '5px 11px', marginRight: 8, verticalAlign: 'middle' }}>
      {text}{action && <>{' · '}<button type="button" onClick={e => { e.stopPropagation(); e.preventDefault(); action.run() }} style={{ all: 'unset', cursor: 'pointer', textDecoration: 'underline' }}>{action.label}</button></>}
    </span>
  )
  if (state === 'approved') return keepLabel ? label('Approved', TONE.yes[0], TONE.yes[1], { label: 'Undo', run: unapprove }) : null
  if (state === 'gone') return keepLabel ? label('Declined', TONE.no[0], TONE.no[1], declineLog ? { label: 'Undo', run: restore } : undefined) : null

  async function approve() {
    setState('saving'); setError('')
    const { error: e } = await createClient().from('deliverables').update({ needs_review: false }).eq('id', taskId)
    if (e) { setState('draft'); setError(e.message); return }
    setState('approved'); onApproved?.()
  }
  // Declining goes through /api/ops/drafts/[id], which keeps the whole task so Undo can put it back (v4.130.0). With
  // keepLabel (the To decide list) the task goes at once and "Declined · Undo" stays until the page is reloaded; on a
  // board card there's still a few seconds' Undo before it goes.
  async function sendDecline() {
    const res = await fetch(`/api/ops/drafts/${taskId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'decline' }) })
    const r = await res.json().catch(() => ({})) as { log?: string | null; error?: string }
    if (!res.ok) { setState('draft'); setError(r.error ?? 'That didn’t work.'); return }
    setDeclineLog(r.log ?? null)
    setState('gone'); onDeclined?.()
  }
  function decline() {
    setError('')
    if (keepLabel) { setState('saving'); sendDecline(); return }
    setState('declining')
    timer.current = setTimeout(sendDecline, UNDO_MS)
  }
  async function restore() {
    if (!declineLog) return
    setState('saving'); setError('')
    const res = await fetch(`/api/ops/drafts/${taskId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restore', log: declineLog }) })
    const r = await res.json().catch(() => ({})) as { error?: string }
    if (!res.ok) { setState('gone'); setError(r.error ?? 'Couldn’t undo that.'); return }
    setDeclineLog(null)
    setState('draft'); onUndone?.()
  }
  async function unapprove() {
    setState('saving'); setError('')
    const { error: e } = await createClient().from('deliverables').update({ needs_review: true }).eq('id', taskId)
    if (e) { setState('approved'); setError(e.message); return }
    setState('draft'); onUndone?.()
  }
  function undo() {
    if (timer.current) clearTimeout(timer.current)
    setState('draft')
  }

  // Inside a card that is a link, draggable, or opens the task on click: keep the pill's events to itself
  const stop = (e: React.SyntheticEvent) => { e.stopPropagation(); e.preventDefault() }

  if (state === 'declining') {
    return (
      <span onClick={stop} onPointerDown={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, lineHeight: 1.2, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: TONE.no[0], background: TONE.no[1], borderRadius: 6, padding: '5px 11px', marginRight: 8, verticalAlign: 'middle' }}>
        Declined ·{' '}
        <button type="button" onClick={e => { stop(e); undo() }} style={{ all: 'unset', cursor: 'pointer', textDecoration: 'underline' }}>Undo</button>
      </span>
    )
  }

  const pull = Math.max(-THRESHOLD - 12, Math.min(THRESHOLD + 12, dx))
  const toward = pull > 8 ? 'approve' : pull < -8 ? 'decline' : null
  const ready = Math.abs(pull) >= THRESHOLD
  const color = toward === 'approve' ? TONE.yes[0] : toward === 'decline' ? TONE.no[0] : TONE.draft[0]
  const bg = toward === 'approve' ? TONE.yes[1] : toward === 'decline' ? TONE.no[1] : TONE.draft[1]

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="Draft. Slide right or press the right arrow to approve; slide left or press the left arrow to decline."
      title={error || 'Draft: slide right to approve, left to decline'}
      draggable
      onDragStart={stop}
      onClick={stop}
      onPointerDown={e => {
        e.stopPropagation()
        if (state !== 'draft') return
        start.current = e.clientX; setSliding(true)
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={e => {
        if (start.current === null) return
        setDx(e.clientX - start.current)
      }}
      onPointerUp={e => {
        e.stopPropagation()
        if (start.current === null) return
        start.current = null; setSliding(false)
        const d = dx
        setDx(0)
        if (d >= THRESHOLD) approve()
        else if (d <= -THRESHOLD) decline()
      }}
      onPointerCancel={() => { start.current = null; setSliding(false); setDx(0) }}
      onKeyDown={e => {
        if (state !== 'draft') return
        if (e.key === 'ArrowRight') { stop(e); approve() }
        else if (e.key === 'ArrowLeft') { stop(e); decline() }
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, position: 'relative',
        fontSize: 11, lineHeight: 1.2, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        color, background: bg, borderRadius: 6, padding: '5px 11px', marginRight: 8, verticalAlign: 'middle',
        outline: error ? `1px solid ${TONE.no[0]}` : undefined,
        transform: `translateX(${pull}px)`, transition: sliding ? 'none' : 'transform 150ms, background 150ms',
        cursor: state === 'saving' ? 'progress' : 'grab', touchAction: 'pan-y', userSelect: 'none',
      }}
    >
      {toward === 'decline' && <span aria-hidden>{ready ? <Icon name="x" size={16} /> : '‹'}</span>}
      {state === 'saving' ? '…' : toward === 'approve' ? (ready ? 'Approve' : 'Draft') : toward === 'decline' ? (ready ? 'Decline' : 'Draft') : '‹ Draft ›'}
      {toward === 'approve' && <span aria-hidden>{ready ? <Icon name="check" size={16} /> : '›'}</span>}
    </span>
  )
}
