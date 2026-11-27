'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import type { OrgPerson } from './types'

/**
 * Edit a circle's lead list (Oscar: "add the ability for admin and circle leads to edit the circle lead list"): a
 * Remove button for each lead and "+ Add lead", which searches the community's people. Both go through
 * public.set_circle_lead(), which checks who may (admins, and the circle's own leads), makes a member a circle lead,
 * and keeps a circle from losing its last lead unless an admin does it. The page reloads its lead list afterwards.
 */
export function useCircleLeads(circle: string) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  async function setLead(userId: string, lead: boolean) {
    setBusy(userId); setError('')
    const { error: e } = await createClient().rpc('set_circle_lead', { p_user: userId, p_circle: circle, p_lead: lead })
    setBusy(null)
    if (e) { setError(e.message); return false }
    router.refresh()
    return true
  }
  return { busy, error, setLead }
}

export function RemoveLeadButton({ name, busy, onRemove }: { name: string; busy: boolean; onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove} disabled={busy} aria-label={`Remove ${name} as a lead`} title="Remove as a lead"
      style={{
        position: 'absolute', top: 8, right: 8, fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', cursor: busy ? 'wait' : 'pointer',
        background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 999, padding: '3px 9px',
      }}>
      {busy ? '…' : 'Remove'}
    </button>
  )
}

export function AddCircleLead({ color, people, existing, busy, onAdd }: {
  color: string
  people: OrgPerson[]
  /** The circle's leads already */
  existing: string[]
  busy: string | null
  onAdd: (p: OrgPerson) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const matches = people
    .filter(p => !existing.includes(p.id))
    .filter(p => !term || p.name.toLowerCase().includes(term) || (p.username ?? '').toLowerCase().includes(term))
    .slice(0, 6)

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{
        fontSize: 12, fontWeight: 600, color, background: 'transparent', cursor: 'pointer', width: '100%',
        border: `1px dashed color-mix(in srgb, ${color} 45%, var(--rule))`, borderRadius: 8, padding: '7px 10px',
      }}>
        + Add lead
      </button>
    )
  }
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 8, padding: 8, background: 'var(--surface)' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search people to make a lead"
          aria-label="Search people to make a lead" onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
          style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '6px 9px', borderRadius: 7, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit', outline: 'none' }}
        />
        <button type="button" onClick={() => { setOpen(false); setQ('') }} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>Done</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
        {matches.map(p => (
          <button type="button" key={p.id} disabled={!!busy} onClick={async () => { if (await onAdd(p)) setQ('') }} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, textAlign: 'left',
            fontSize: 13, color: 'var(--ink)', background: 'none', border: 'none', borderRadius: 6, padding: '6px 6px', cursor: busy ? 'wait' : 'pointer',
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color }}>{busy === p.id ? '…' : 'Make lead'}</span>
          </button>
        ))}
        {!matches.length && <div style={{ fontSize: 12, color: 'var(--ink-4)', padding: '6px' }}>{term ? 'No one by that name.' : 'Everyone is a lead already.'}</div>}
      </div>
    </div>
  )
}
