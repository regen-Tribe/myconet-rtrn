'use client'

import { Icon } from '@/core/components/v4'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { DraftBadge } from '@/core/components/DraftBadge'

// How far the pill must slide to count (px), and how long "Declined · Undo" waits before the task is deleted
const THRESHOLD = 36
const UNDO_MS = 5000

/**
 * The Draft pill on a task the agent drafted (v4.33.0). Someone who may confirm it (a lead or admin) slides it
 * right to approve (the task stays, no longer a draft) or left to decline (the task is deleted after a few
 * seconds, with Undo). Arrow keys do the same. Everyone else sees the plain pill. The pill keeps its pointer to
 * itself, so sliding it doesn't drag the card or open the task.
 */
export function DraftSwipe({ taskId, canDecide, onApproved, onDeclined }: {
  taskId: string; canDecide: boolean
  onApproved?: () => void; onDeclined?: () => void
}) {
  const [dx, setDx] = useState(0)
  const [sliding, setSliding] = useState(false)
  const [state, setState] = useState<'draft' | 'saving' | 'declining' | 'approved' | 'gone'>('draft')
  const [error, setError] = useState('')
  const start = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  if (!canDecide) return <DraftBadge />
  if (state === 'approved' || state === 'gone') return null

  async function approve() {
    setState('saving'); setError('')
    const { error: e } = await createClient().from('deliverables').update({ needs_review: false }).eq('id', taskId)
    if (e) { setState('draft'); setError(e.message); return }
    setState('approved'); onApproved?.()
  }
  function decline() {
    setState('declining'); setError('')
    timer.current = setTimeout(async () => {
      const { error: e } = await createClient().from('deliverables').delete().eq('id', taskId)
      if (e) { setState('draft'); setError(e.message); return }
      setState('gone'); onDeclined?.()
    }, UNDO_MS)
  }
  function undo() {
    if (timer.current) clearTimeout(timer.current)
    setState('draft')
  }

  // Inside a card that is a link, draggable, or opens the task on click: keep the pill's events to itself
  const stop = (e: React.SyntheticEvent) => { e.stopPropagation(); e.preventDefault() }

  if (state === 'declining') {
    return (
      <span onClick={stop} onPointerDown={e => e.stopPropagation()} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#b91c1c', background: '#fee2e2', borderRadius: 4, padding: '1px 5px', marginRight: 6, verticalAlign: 1 }}>
        Declined ·{' '}
        <button type="button" onClick={e => { stop(e); undo() }} style={{ all: 'unset', cursor: 'pointer', textDecoration: 'underline' }}>Undo</button>
      </span>
    )
  }

  const pull = Math.max(-THRESHOLD - 12, Math.min(THRESHOLD + 12, dx))
  const toward = pull > 8 ? 'approve' : pull < -8 ? 'decline' : null
  const ready = Math.abs(pull) >= THRESHOLD
  const color = toward === 'approve' ? '#15803d' : toward === 'decline' ? '#b91c1c' : '#b45309'
  const bg = toward === 'approve' ? '#dcfce7' : toward === 'decline' ? '#fee2e2' : '#fef3c7'

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
        display: 'inline-flex', alignItems: 'center', gap: 4, position: 'relative',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        color, background: bg, borderRadius: 4, padding: '1px 5px', marginRight: 6, verticalAlign: 1,
        outline: error ? '1px solid #b91c1c' : undefined,
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
