'use client'

import { useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'

export interface JoinRequest {
  id: string
  circle: string
  user_id: string
  note: string | null
  created_at: string
  name: string
}

/**
 * People asking to join a circle (v4.35.0), for its leads and admins on the Circles page: Approve makes them a
 * member, Decline closes the request (decide_circle_join() checks and does both in one step).
 */
export function JoinRequests({ requests, color, onDecided }: {
  requests: JoinRequest[]
  color: string
  onDecided: (id: string, approved: boolean) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  if (!requests.length) return null

  async function decide(r: JoinRequest, approve: boolean) {
    setBusy(r.id); setError('')
    const { error: e } = await createClient().rpc('decide_circle_join', { p_request: r.id, p_approve: approve })
    setBusy(null)
    if (e) { setError(e.message); return }
    onDecided(r.id, approve)
  }

  return (
    <div style={{ border: `1px solid color-mix(in srgb, ${color} 35%, var(--rule))`, background: `color-mix(in srgb, ${color} 6%, var(--surface))`, borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color, marginBottom: 6 }}>
        {requests.length} asking to join
      </div>
      {requests.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{r.name}</div>
            {r.note && <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>“{r.note}”</div>}
          </div>
          <button disabled={!!busy} onClick={() => decide(r, true)} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: color, border: 'none', borderRadius: 7, padding: '5px 11px', cursor: 'pointer' }}>
            {busy === r.id ? '…' : 'Approve'}
          </button>
          <button disabled={!!busy} onClick={() => decide(r, false)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer' }}>
            Decline
          </button>
        </div>
      ))}
      {error && <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>{error}</div>}
    </div>
  )
}
