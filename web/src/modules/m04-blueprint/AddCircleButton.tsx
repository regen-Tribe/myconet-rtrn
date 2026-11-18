'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import { CIRCLE_COLORS, CIRCLE_EMOJIS, emojiFor, slugFor } from '@/modules/m04-blueprint/lib/circle-setup'

/**
 * "+ Add circle" for admins on the circle pages (Operations › Circles, /org). The same as Blueprint ›
 * ◯ Circles › + Add a circle: a name, a one-line purpose (the org chart's description, which the
 * meeting agent reads to place tasks), an emoji; a free colour; the trigger makes its org-chart unit.
 * Leads are given on the circle afterwards (Admin › Users, or "Who leads it" on the card).
 */
export function AddCircleButton() {
  const circles = useCircles()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [emoji, setEmoji] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const close = () => { setOpen(false); setName(''); setPurpose(''); setEmoji(null); setError('') }
  const save = async () => {
    const n = name.trim(), p = purpose.trim()
    if (!n || !p) { setError('A circle needs a name and a one-line purpose.'); return }
    if (circles.list.some(c => c.name.toLowerCase() === n.toLowerCase())) { setError('There’s already a circle with that name.'); return }
    setBusy(true); setError('')
    const supabase = createClient()
    // Archived circles keep their slugs
    const { data: all } = await supabase.from('circles').select('slug, color, sort_order, archived_at')
    const taken = new Set((all ?? []).map(r => r.slug as string))
    const used = new Set((all ?? []).filter(r => !r.archived_at).map(r => r.color as string))
    const slug = slugFor(n, taken)
    const { error: insErr } = await supabase.from('circles').insert({
      slug, name: n, emoji: emoji ?? emojiFor(n),
      color: CIRCLE_COLORS.find(c => !used.has(c)) ?? CIRCLE_COLORS[(all?.length ?? 0) % CIRCLE_COLORS.length],
      sort_order: Math.max(0, ...(all ?? []).map(r => r.sort_order as number)) + 1,
    })
    if (insErr) { setBusy(false); setError(insErr.message); return }
    // Its org-chart unit (made by the trigger) carries the purpose
    await supabase.from('org_units').update({ description: p }).eq('kind', 'circle').eq('circle', slug)
    setBusy(false); close()
    router.refresh()
  }

  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 14 }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', margin: '12px 0 5px' }
  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        fontSize: 13, fontWeight: 600, color: 'var(--m17, var(--m7))', background: 'var(--surface)', whiteSpace: 'nowrap',
        border: '1px solid color-mix(in srgb, var(--m17, var(--m7)) 40%, var(--rule))', borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
      }}>+ Add circle</button>
      {open && (
        <div role="dialog" aria-label="Add a circle" onClick={e => { if (e.target === e.currentTarget && !busy) close() }}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '18px 20px', width: 'min(440px, 100%)', boxShadow: '0 12px 40px rgba(0,0,0,.22)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Add a circle</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>A standing group that looks after one area of the community.</div>
            <label style={lbl} htmlFor="ac-name">Name</label>
            <input id="ac-name" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Incubator" style={input} maxLength={60} />
            <label style={lbl} htmlFor="ac-purpose">Purpose (one line)</label>
            <input id="ac-purpose" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="What this circle takes care of" style={input} maxLength={300} />
            <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 4 }}>The meeting agent reads this to put tasks in the right circle.</div>
            <span style={lbl}>Emoji</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {CIRCLE_EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => setEmoji(e)} aria-pressed={(emoji ?? emojiFor(name)) === e}
                  style={{ fontSize: 17, width: 34, height: 34, borderRadius: 8, cursor: 'pointer', background: (emoji ?? emojiFor(name)) === e ? 'var(--bg-2)' : 'transparent', border: `1px solid ${(emoji ?? emojiFor(name)) === e ? 'var(--ink-3)' : 'var(--rule)'}` }}>{e}</button>
              ))}
            </div>
            {error && <div style={{ fontSize: 12.5, color: '#b91c1c', marginTop: 10 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={close} disabled={busy} style={{ fontSize: 13, fontWeight: 600, borderRadius: 8, padding: '8px 14px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={busy} style={{ fontSize: 13, fontWeight: 700, borderRadius: 8, padding: '8px 16px', border: 'none', background: 'var(--m7)', color: '#fff', cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Adding…' : 'Add circle'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
