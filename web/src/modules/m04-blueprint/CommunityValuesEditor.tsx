'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'

/**
 * The community values members sign on the Join page (step 1), edited in the
 * Blueprint's Step 1.4. Stored in `community_values`; admins and circle leads
 * can write. Removing a value also removes the signatures it had.
 */

interface Value { id: string; title: string; description: string | null; sort_order: number }

const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }

export default function CommunityValuesEditor({ canEdit }: { canEdit: boolean }) {
  const [values, setValues] = useState<Value[] | null>(null)
  const [signatures, setSignatures] = useState<Record<string, number>>({})
  const [edit, setEdit] = useState<{ id: string | null; title: string; description: string } | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: rows }, { data: sigs }] = await Promise.all([
      supabase.from('community_values').select('id, title, description, sort_order').order('sort_order'),
      supabase.from('value_signatures').select('value_id'),
    ])
    setValues((rows ?? []) as Value[])
    const counts: Record<string, number> = {}
    for (const s of sigs ?? []) counts[s.value_id as string] = (counts[s.value_id as string] ?? 0) + 1
    setSignatures(counts)
  }, [])

  useEffect(() => { load() }, [load])

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true); setError('')
    const { error: err } = await fn()
    if (err) setError(err.message)
    await load()
    setBusy(false)
    return !err
  }

  const save = async () => {
    if (!edit) return
    if (!edit.title.trim()) { setError('A value needs a title.'); return }
    const row = { title: edit.title.trim(), description: edit.description.trim() || null }
    const supabase = createClient()
    const ok = await run(() => edit.id
      ? supabase.from('community_values').update(row).eq('id', edit.id)
      : supabase.from('community_values').insert({ ...row, sort_order: Math.max(0, ...(values ?? []).map(v => v.sort_order)) + 1 }))
    if (ok) setEdit(null)
  }

  const move = async (i: number, dir: -1 | 1) => {
    const list = values ?? []
    const a = list[i], b = list[i + dir]
    if (!a || !b) return
    const supabase = createClient()
    await run(async () => {
      const r1 = await supabase.from('community_values').update({ sort_order: b.sort_order }).eq('id', a.id)
      if (r1.error) return r1
      return supabase.from('community_values').update({ sort_order: a.sort_order }).eq('id', b.id)
    })
  }

  const remove = async (id: string) => {
    setConfirmRemove(null)
    await run(() => createClient().from('community_values').delete().eq('id', id))
  }

  const form = edit && (
    <div style={{ padding: 14, marginBottom: 8, border: '1px solid var(--accent)', borderRadius: 6, background: 'var(--bg-2)' }}>
      <div style={label}>Value</div>
      <input className="input" value={edit.title} maxLength={120} placeholder="Care for the land before yield."
        onChange={e => setEdit({ ...edit, title: e.target.value })} style={{ marginBottom: 10 }} />
      <div style={label}>What it means in practice (optional)</div>
      <textarea className="textarea" rows={2} value={edit.description}
        placeholder="Decisions are tested against ecological impact first, profit second."
        onChange={e => setEdit({ ...edit, description: e.target.value })} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn btn-ghost" onClick={() => setEdit(null)} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save value'}</button>
      </div>
    </div>
  )

  return (
    <div className="section">
      <div className="section-head">
        <div className="section-title">Community values</div>
        <div className="section-meta-row"><span className="section-meta">Signed on the Join page</span></div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, margin: '0 0 14px' }}>
        The values everyone signs when they apply to join (Join, step 1). Keep each one short and concrete. The application questions are the field above.
      </p>

      {error && (
        <div style={{ fontSize: 13, color: '#b91c1c', background: '#b91c1c12', border: '1px solid #b91c1c40', borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 12 }}>{error}</div>
      )}

      {values && values.length === 0 && !edit && (
        <div style={{ fontSize: 13, color: 'var(--ink-3)', border: '1px dashed var(--rule)', borderRadius: 6, padding: '12px 14px', marginBottom: 10 }}>
          No values yet. Until there are some, the Join page tells applicants an admin will add them here.
        </div>
      )}

      {(values ?? []).map((v, i) => edit?.id === v.id ? <div key={v.id}>{form}</div> : (
        <div key={v.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', marginBottom: 8, border: '1px solid var(--rule)', borderRadius: 6, background: 'var(--surface)' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', paddingTop: 2 }}>{i + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{v.title}</div>
            {v.description && <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45, marginTop: 2 }}>{v.description}</div>}
            {(signatures[v.id] ?? 0) > 0 && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>Signed by {signatures[v.id]}</div>}
          </div>
          {canEdit && (confirmRemove === v.id ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                Remove{(signatures[v.id] ?? 0) > 0 ? ` and its ${signatures[v.id]} signature${signatures[v.id] === 1 ? '' : 's'}` : ''}?
              </span>
              <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setConfirmRemove(null)} disabled={busy}>Keep</button>
              <button className="btn" style={{ fontSize: 12, color: '#b91c1c' }} onClick={() => remove(v.id)} disabled={busy}>Remove</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label="Move up">↑</button>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => move(i, 1)} disabled={busy || i === (values ?? []).length - 1} aria-label="Move down">↓</button>
              <button className="btn btn-ghost" style={{ fontSize: 12 }} disabled={busy}
                onClick={() => setEdit({ id: v.id, title: v.title, description: v.description ?? '' })}>Edit</button>
              <button className="btn btn-ghost" style={{ fontSize: 12 }} disabled={busy} onClick={() => setConfirmRemove(v.id)}>Remove</button>
            </div>
          ))}
        </div>
      ))}

      {edit && edit.id === null && form}

      {canEdit && !edit && (
        <button className="btn btn-ghost" onClick={() => setEdit({ id: null, title: '', description: '' })} disabled={busy}>+ Add a value</button>
      )}
      {!canEdit && (
        <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '6px 0 0' }}>Admins and circle leads edit these.</p>
      )}
    </div>
  )
}
