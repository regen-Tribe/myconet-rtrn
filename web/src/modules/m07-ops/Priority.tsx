'use client'
import { DESIGN_REVIEW } from '@/core/lib/instance'
import { Icon } from '@/core/components/v4'

/** A task's priority (v4.32.0): deliverables.priority */
export type Priority = 'none' | 'low' | 'medium' | 'high'

export const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'none', label: 'None', color: 'var(--ink-4)' },
  { value: 'low', label: 'Low', color: '#0ea5e9' },
  { value: 'medium', label: 'Med', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
]

const meta = (p: string | null | undefined) => PRIORITIES.find(x => x.value === p) ?? PRIORITIES[0]

/** The badge on a task card or row; nothing for "none" */
export function PriorityBadge({ priority }: { priority?: string | null }) {
  const m = meta(priority)
  if (m.value === 'none') return null
  // Design review: priority is a result-style badge, not a sixth colour. High needs attention; Low and Med are quiet.
  if (DESIGN_REVIEW) return (
    <span title={`Priority: ${m.label}`} className={`v4-result ${m.value === 'high' ? 'v4-result--attention' : 'v4-result--neutral'} ops5-prio`}>
      {m.value === 'high' && <Icon name="up" size={12} />}{m.value === 'medium' ? 'Medium' : m.label}
    </span>
  )
  return (
    <span title={`Priority: ${m.label}`} style={{ fontSize: 9, fontWeight: 700, color: m.color, background: `color-mix(in srgb, ${m.color} 12%, transparent)`, padding: '1px 6px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {m.value === 'high' ? '▲ ' : ''}{m.label}
    </span>
  )
}

/** The four-step slider in the task pop-up: None · Low · Med · High */
export function PrioritySlider({ value, onChange, id }: { value: Priority; onChange: (p: Priority) => void; id?: string }) {
  const i = PRIORITIES.findIndex(p => p.value === value)
  const m = PRIORITIES[Math.max(0, i)]
  return (
    <div>
      <input
        id={id}
        type="range" min={0} max={3} step={1} value={Math.max(0, i)}
        onChange={e => onChange(PRIORITIES[Number(e.target.value)].value)}
        aria-valuetext={m.label}
        style={{ width: '100%', accentColor: m.value === 'none' ? 'var(--ink-3)' : m.color, cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        {PRIORITIES.map(p => (
          <button
            key={p.value} type="button" onClick={() => onChange(p.value)}
            style={{ background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, color: p.value === value ? p.color : 'var(--ink-4)', fontWeight: p.value === value ? 700 : 500 }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
