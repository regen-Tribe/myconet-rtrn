'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import type { CircleSlug } from '@/core/lib/circles'
import { useCircles, usePatchCircle } from './CirclesProvider'

const btn: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
  border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)',
}

/**
 * A circle's lead name (`circles.leads_to_assign`): the same on the org chart, Ops ›
 * Circles and Blueprint › Circles. It can be someone who isn't on the portal yet;
 * people with an account who lead the circle show beside it as profile chips.
 * Admins edit it in place.
 */
export function CircleLeadName({ slug, canEdit, color = 'var(--ink)', onSaved }: {
  slug: CircleSlug
  canEdit: boolean
  color?: string
  onSaved?: (name: string | null) => void
}) {
  const circles = useCircles()
  const patch = usePatchCircle()
  const router = useRouter()
  const name = circles.get(slug)?.leads_to_assign ?? null
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (draft === null) return
    const value = draft.trim() || null
    setBusy(true)
    setError('')
    const { data, error } = await createClient().from('circles').update({ leads_to_assign: value }).eq('slug', slug).select('slug')
    setBusy(false)
    if (error || !data?.length) { setError('Only admins can change a circle’s lead name.'); return }
    patch(slug, { leads_to_assign: value })
    onSaved?.(value)
    setDraft(null)
    router.refresh()
  }

  if (draft !== null) {
    return (
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={draft} onChange={e => setDraft(e.target.value)} maxLength={300} autoFocus
            placeholder="Lead’s name, e.g. Marcos" aria-label="Lead’s name"
            style={{ flex: '1 1 140px', minWidth: 0, fontSize: 13, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
          />
          <button type="submit" disabled={busy} style={{ ...btn, color: '#fff', background: color, borderColor: color }}>{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" onClick={() => { setDraft(null); setError('') }} style={btn}>Cancel</button>
        </div>
        {error && <div style={{ fontSize: 12, color: '#dc2626' }}>{error}</div>}
      </form>
    )
  }
  if (!name && !canEdit) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: 'var(--ink-2)' }}>
      {name ? <span><span style={{ color: 'var(--ink-3)' }}>Lead:</span> <strong style={{ color }}>{name}</strong></span>
            : <span style={{ fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic' }}>No lead name yet.</span>}
      {canEdit && <button type="button" onClick={() => setDraft(name ?? '')} style={btn}>{name ? 'Edit' : '+ Lead name'}</button>}
    </div>
  )
}
