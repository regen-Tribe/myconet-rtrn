'use client'

import { useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { MEMBER_SELECT, toMember } from './lib/org'
import type { OrgMember, OrgPerson } from './types'

/**
 * "+ Add member" under a circle (v4.35.0), like "+ Add team": search the community's people and add one as a member
 * of the circle (org_unit_members of its circle unit). Used on the Circles page and Ops › Circles. The database
 * decides who may (private.can_edit_org_unit: admins and the circle's leads).
 */
export function AddCircleMember({ unitId, color, people, existing, onAdded }: {
  unitId: string
  color: string
  people: OrgPerson[]
  /** Who's in the circle already (members and leads) */
  existing: string[]
  onAdded: (m: OrgMember) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const term = q.trim().toLowerCase()
  const matches = people
    .filter(p => !existing.includes(p.id))
    .filter(p => !term || p.name.toLowerCase().includes(term) || (p.username ?? '').toLowerCase().includes(term))
    .slice(0, 6)

  async function add(p: OrgPerson) {
    setBusy(p.id); setError('')
    const { data, error: e } = await createClient().from('org_unit_members')
      .insert({ unit_id: unitId, user_id: p.id, role: 'member' }).select(MEMBER_SELECT).single()
    setBusy(null)
    if (e || !data) { setError(e?.message ?? 'That didn’t save.'); return }
    onAdded(toMember(data))
    setQ('')
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        fontSize: 12, fontWeight: 600, color, background: 'transparent', cursor: 'pointer', width: '100%',
        border: `1px dashed color-mix(in srgb, ${color} 45%, var(--rule))`, borderRadius: 8, padding: '7px 10px',
      }}>
        + Add member
      </button>
    )
  }
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 8, padding: 8, background: 'var(--surface)' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search people"
          aria-label="Search people to add" onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
          style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '6px 9px', borderRadius: 7, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit', outline: 'none' }}
        />
        <button onClick={() => { setOpen(false); setQ(''); setError('') }} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>Done</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
        {matches.map(p => (
          <button key={p.id} disabled={!!busy} onClick={() => add(p)} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, textAlign: 'left',
            fontSize: 13, color: 'var(--ink)', background: 'none', border: 'none', borderRadius: 6, padding: '6px 6px', cursor: busy ? 'wait' : 'pointer',
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color }}>{busy === p.id ? '…' : 'Add'}</span>
          </button>
        ))}
        {!matches.length && <div style={{ fontSize: 12, color: 'var(--ink-4)', padding: '6px' }}>{term ? 'No one by that name.' : 'Everyone’s in this circle already.'}</div>}
      </div>
      {error && <div style={{ fontSize: 12, color: '#b91c1c', padding: '4px 6px 0' }}>{error}</div>}
    </div>
  )
}
