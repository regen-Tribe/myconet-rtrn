'use client'

import type { TaskTeamOption } from './TaskModal'

/**
 * Which team of the circle a project belongs to (v4.37.0): "Whole circle" or one of its teams from the org chart.
 * Shows nothing when the circle has no teams. Chips, like the circle picker above it.
 */
export function TeamPicker({ circle, teams, value, onChange, color, size = 'md' }: {
  circle: string
  teams: TaskTeamOption[]
  value: string
  onChange: (teamId: string) => void
  color: string
  size?: 'sm' | 'md'
}) {
  const mine = teams.filter(t => t.circle === circle)
  if (!circle || !mine.length) return null
  const chip = (id: string, label: string) => {
    const on = value === id
    return (
      <button
        key={id || 'whole'} type="button" onClick={() => onChange(id)}
        style={{
          fontSize: size === 'sm' ? 11 : 13, fontWeight: 600, padding: size === 'sm' ? '4px 9px' : '7px 14px', borderRadius: 20,
          background: on ? `color-mix(in srgb, ${color} 14%, var(--surface))` : 'var(--surface)',
          color: on ? color : 'var(--ink-3)', border: `1px solid ${on ? color : 'var(--rule)'}`, cursor: 'pointer',
        }}
      >
        {label}
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: size === 'sm' ? 4 : 6 }}>
      {chip('', 'Whole circle')}
      {mine.map(t => chip(t.id, t.name))}
    </div>
  )
}
