'use client'

import { useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import { CalendarPicker } from './CalendarPicker'

/**
 * "+ Task" on the board: a task for a circle (kitchen clean-up, a repair…), on the board with no project
 * (v4.34.0). Its pop-up can file it into a project later; tasks for a project can also be added on its page.
 */
export function NewTaskModal({ defaultCircle, onClose, onAdded }: {
  defaultCircle: string | null
  onClose: () => void
  onAdded: (taskId: string) => void
}) {
  const circles = useCircles()
  const [title, setTitle] = useState('')
  const [circle, setCircle] = useState<string>(defaultCircle && circles.has(defaultCircle) ? defaultCircle : '')
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!title.trim() || !circle) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data, error: insErr } = await supabase.from('deliverables').insert({
      project_id: null,
      title: title.trim(),
      circle,
      due_date: date,
      due_time: date && time ? time : null,
      status: 'backlog',
      progress: 0,
    }).select('id').single()
    if (insErr || !data) {
      setError(insErr?.message ?? 'The task didn’t save.')
      setSaving(false)
      return
    }
    onAdded(data.id as string)
  }

  const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }
  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, fontFamily: 'inherit',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New task"
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--rule)', width: '100%', maxWidth: 440, maxHeight: 'calc(100dvh - 24px)', overflowY: 'auto', overscrollBehavior: 'contain', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>New task</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--ink-3)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={label} htmlFor="nt-title">What needs doing</label>
            <input id="nt-title" autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Kitchen clean-up" style={input} />
          </div>
          <div>
            <label style={label} htmlFor="nt-circle">Circle</label>
            <select id="nt-circle" value={circle} onChange={e => setCircle(e.target.value)} style={input}>
              <option value="">Choose a circle…</option>
              {circles.slugs.map(c => <option key={c} value={c}>{circles.meta(c).emoji} {circles.meta(c).label}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>When (optional)</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <CalendarPicker value={date} onChange={setDate} placeholder="No date" />
              {date && <input type="time" value={time} onChange={e => setTime(e.target.value)} aria-label="Time (optional)" style={{ ...input, width: 130 }} />}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>
              It goes on the main board, tagged with its circle. With a date it also shows on the calendar.
            </div>
          </div>
          {error && <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={save}
            disabled={saving || !title.trim() || !circle}
            style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--m7)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: saving || !title.trim() || !circle ? 'not-allowed' : 'pointer', opacity: saving || !title.trim() || !circle ? 0.55 : 1 }}
          >
            {saving ? 'Adding…' : 'Add task'}
          </button>
        </div>
      </div>
    </div>
  )
}
