'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'

type Mine = { circle: string; how: 'lead' | 'member' | 'asked' }

/**
 * "My circles" on your own profile (v4.35.0): the circles you're in (as a member, a lead, or on one of its teams),
 * the ones you've asked to join, and "Ask to join" for the rest. A circle's leads approve on the Circles page.
 */
export function MyCircles({ userId }: { userId: string }) {
  const circles = useCircles()
  const [mine, setMine] = useState<Mine[] | null>(null)
  const [asking, setAsking] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    const supabase = createClient()
    Promise.all([
      supabase.from('org_unit_members').select('role, unit:org_units!inner(circle, kind)').eq('user_id', userId),
      supabase.from('circle_join_requests').select('circle').eq('user_id', userId).eq('status', 'pending'),
      supabase.from('user_profiles').select('role, lead_circles').eq('id', userId).maybeSingle(),
    ]).then(([m, r, p]) => {
      if (!live) return
      const out = new Map<string, Mine['how']>()
      const leadCircles: string[] = p.data?.role === 'circle_lead' ? (p.data?.lead_circles ?? []) : []
      for (const c of leadCircles) out.set(c, 'lead')
      for (const row of (m.data ?? []) as { role: string; unit: { circle: string; kind: string } | { circle: string; kind: string }[] }[]) {
        const unit = Array.isArray(row.unit) ? row.unit[0] : row.unit
        if (!unit || out.get(unit.circle) === 'lead') continue
        out.set(unit.circle, unit.kind === 'circle' && row.role === 'lead' ? 'lead' : 'member')
      }
      for (const row of r.data ?? []) if (!out.has(row.circle)) out.set(row.circle, 'asked')
      setMine([...out].map(([circle, how]) => ({ circle, how })))
    })
    return () => { live = false }
  }, [userId])

  async function ask(circle: string) {
    setBusy(true); setError('')
    const { error: e } = await createClient().from('circle_join_requests').insert({ circle, user_id: userId, note: note.trim() || null })
    setBusy(false)
    if (e) { setError(e.message); return }
    setMine(prev => [...(prev ?? []), { circle, how: 'asked' }])
    setAsking(null); setNote('')
  }

  async function withdraw(circle: string) {
    await createClient().from('circle_join_requests').delete().eq('user_id', userId).eq('circle', circle).eq('status', 'pending')
    setMine(prev => (prev ?? []).filter(m => !(m.circle === circle && m.how === 'asked')))
  }

  if (!mine) return null
  const how = (c: string) => mine.find(m => m.circle === c)?.how
  const others = circles.slugs.filter(c => !how(c))
  const chip = (c: string, label: string, solid: boolean) => {
    const meta = circles.meta(c)
    return (
      <span key={c} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, color: solid ? '#fff' : meta.color, background: solid ? meta.color : `color-mix(in srgb, ${meta.color} 10%, var(--surface))`, border: `1px solid ${meta.color}` }}>
        {meta.emoji} {meta.label}{label ? ` · ${label}` : ''}
      </span>
    )
  }

  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 18px', margin: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>My circles</h2>
        <Link href="/circles" style={{ fontSize: 12, fontWeight: 600, color: 'var(--m17)', textDecoration: 'none' }}>All circles →</Link>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: others.length ? 14 : 0 }}>
        {mine.filter(m => m.how !== 'asked' && circles.has(m.circle)).map(m => chip(m.circle, m.how === 'lead' ? 'lead' : '', true))}
        {mine.filter(m => m.how === 'asked' && circles.has(m.circle)).map(m => (
          <span key={m.circle} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {chip(m.circle, 'asked', false)}
            <button onClick={() => withdraw(m.circle)} style={{ fontSize: 11.5, color: 'var(--ink-4)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Withdraw</button>
          </span>
        ))}
        {!mine.length && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>You’re not in a circle yet.</span>}
      </div>
      {others.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Ask to join a circle</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {others.map(c => {
              const meta = circles.meta(c)
              const on = asking === c
              return (
                <button key={c} onClick={() => setAsking(on ? null : c)} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', color: on ? '#fff' : 'var(--ink-2)', background: on ? meta.color : 'var(--surface)', border: `1px solid ${on ? meta.color : 'var(--rule)'}` }}>
                  {meta.emoji} {meta.label}
                </button>
              )
            })}
          </div>
          {asking && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder={`A line for the ${circles.meta(asking).label} leads (optional)`}
                style={{ flex: '1 1 220px', fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit' }} />
              <button disabled={busy} onClick={() => ask(asking)} style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', background: circles.meta(asking).color, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: busy ? 'wait' : 'pointer' }}>
                {busy ? 'Sending…' : 'Ask to join'}
              </button>
            </div>
          )}
          {error && <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 6 }}>{error}</div>}
        </>
      )}
    </section>
  )
}
