'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/client'
import { CircleLeadName } from '@/core/components/CircleLeadName'
import {
  CIRCLE_COLORS, CIRCLE_EMOJIS, CIRCLE_TEMPLATES, emojiFor, foundCircles, roleDescription, slugFor,
  type CircleRole, type FoundCircle,
} from '@/modules/m04-blueprint/lib/circle-setup'

/**
 * The Blueprint's final setup step (INSTANCES.md §6.2): confirm the circles the AI
 * scan found (Step B), or ask for them with two templates (Step C), then save them
 * to `circles` (Step D). Also renames and retires existing circles. Admins only;
 * everyone else sees the list.
 */

interface CircleRow {
  slug: string; name: string; emoji: string; color: string; sort_order: number
  archived_at: string | null; leads_to_assign: string | null; is_steward: boolean
}

interface Draft {
  key: string; include: boolean; name: string; purpose: string; leads: string
  source?: string; emoji?: string; color?: string
  /** From a template: created as teams in the circle */
  roles?: CircleRole[]
}

interface Edit { slug: string; name: string; purpose: string; leads: string; emoji: string; color: string; steward: boolean }

let draftSeq = 0
const draftKey = () => `d${++draftSeq}`

const fromFound = (c: FoundCircle): Draft => ({
  key: draftKey(), include: true, name: c.name, purpose: c.purpose, leads: c.lead_names.join(', '), source: c.source,
})

const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }

export default function CirclesStep({ values, canEdit, onImport, onClearFound, onPrev, onNext }: {
  values: Record<string, unknown>
  canEdit: boolean
  onImport: () => void
  onClearFound: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const router = useRouter()
  const [rows, setRows] = useState<CircleRow[] | null>(null)
  const [purposes, setPurposes] = useState<Record<string, string>>({})
  // People with an account who lead each circle (role circle_lead), as on the org chart
  const [portalLeads, setPortalLeads] = useState<Record<string, { id: string; name: string; username: string | null }[]>>({})
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [edit, setEdit] = useState<Edit | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: circles }, { data: units }, { data: directory }] = await Promise.all([
      supabase.from('circles').select('slug, name, emoji, color, sort_order, archived_at, leads_to_assign, is_steward').order('sort_order'),
      supabase.from('org_units').select('circle, description').eq('kind', 'circle'),
      supabase.rpc('public_circle_directory'),
    ])
    setRows((circles ?? []) as CircleRow[])
    setPurposes(Object.fromEntries((units ?? []).map(u => [u.circle as string, (u.description as string | null) ?? ''])))
    const leads: Record<string, { id: string; name: string; username: string | null }[]> = {}
    for (const p of directory ?? []) {
      if (p.role !== 'circle_lead') continue
      for (const c of (p.lead_circles ?? []) as string[]) (leads[c] ??= []).push({ id: p.id, name: p.first_name ?? p.username ?? 'Member', username: p.username ?? null })
    }
    setPortalLeads(leads)
  }, [])

  useEffect(() => { load() }, [load])

  const found = useMemo(() => foundCircles(values), [values])
  const active = (rows ?? []).filter(r => !r.archived_at)
  const retired = (rows ?? []).filter(r => r.archived_at)

  // Circles from a new scan replace the found list, minus any the community already
  // has. Only when the scan result changes, so reloading the rows keeps any edits.
  const appliedFound = useRef<string | null>(null)
  useEffect(() => {
    if (!rows) return
    const sig = JSON.stringify(found)
    if (appliedFound.current === sig) return
    appliedFound.current = sig
    const have = new Set(rows.map(r => r.name.toLowerCase()))
    setDrafts(d => [...d.filter(x => !x.source), ...found.filter(c => !have.has(c.name.toLowerCase())).map(fromFound)])
  }, [found, rows])

  const fromDocs = drafts.some(d => d.source)
  const included = drafts.filter(d => d.include)
  const setDraft = (key: string, patch: Partial<Draft>) => setDrafts(ds => ds.map(d => (d.key === key ? { ...d, ...patch } : d)))
  const addBlank = () => setDrafts(ds => [...ds, { key: draftKey(), include: true, name: '', purpose: '', leads: '' }])
  const applyTemplate = (id: string) => {
    const t = CIRCLE_TEMPLATES.find(x => x.id === id)
    if (t) setDrafts(t.circles.map(c => ({ key: draftKey(), include: true, name: c.name, purpose: c.purpose, emoji: c.emoji, roles: c.roles, leads: '' })))
  }

  const saveDrafts = async () => {
    setError('')
    if (included.some(d => !d.name.trim() || !d.purpose.trim())) { setError('Every circle needs a name and a one-line purpose.'); return }
    const names = included.map(d => d.name.trim().toLowerCase())
    if (new Set(names).size < names.length) { setError('Two circles have the same name. Merge them or rename one.'); return }
    setBusy(true)
    const taken = new Set((rows ?? []).map(r => r.slug))
    let order = Math.max(0, ...(rows ?? []).map(r => r.sort_order))
    const usedColors = new Set(active.map(r => r.color))
    const free = CIRCLE_COLORS.filter(c => !usedColors.has(c))
    const newRows = included.map((d, i) => {
      const slug = slugFor(d.name.trim(), taken); taken.add(slug)
      return {
        slug, name: d.name.trim(), sort_order: ++order,
        emoji: d.emoji ?? emojiFor(d.name),
        color: d.color ?? free[i] ?? CIRCLE_COLORS[(active.length + i) % CIRCLE_COLORS.length],
        leads_to_assign: d.leads.trim() || null,
      }
    })
    const supabase = createClient()
    const { error: insErr } = await supabase.from('circles').insert(newRows)
    if (insErr) { setBusy(false); setError(insErr.message); return }
    // Adding a circle creates its org-chart unit; its description is the circle's purpose
    await Promise.all(included.map((d, i) => supabase.from('org_units')
      .update({ description: d.purpose.trim() }).eq('kind', 'circle').eq('circle', newRows[i].slug)))
    const teams = included.flatMap((d, i) => (d.roles ?? []).map((r, j) => ({
      kind: 'team', circle: newRows[i].slug, name: r.name, description: roleDescription(r), sort_order: j + 1,
    })))
    if (teams.length) {
      const { error: teamErr } = await supabase.from('org_units').insert(teams)
      if (teamErr) setError(`Circles saved, but their roles weren't: ${teamErr.message}`)
    }
    setDrafts([])
    onClearFound()
    await load()
    setBusy(false)
    router.refresh()
  }

  const saveEdit = async () => {
    if (!edit) return
    setError('')
    if (!edit.name.trim()) { setError('A circle needs a name.'); return }
    setBusy(true)
    const supabase = createClient()
    // Only one circle can be the stewards: clear the others first
    if (edit.steward) await supabase.from('circles').update({ is_steward: false }).neq('slug', edit.slug).eq('is_steward', true)
    const { error: upErr } = await supabase.from('circles')
      .update({ name: edit.name.trim(), emoji: edit.emoji, color: edit.color, leads_to_assign: edit.leads.trim() || null, is_steward: edit.steward })
      .eq('slug', edit.slug)
    if (!upErr) {
      await supabase.from('org_units').update({ description: edit.purpose.trim() || null }).eq('kind', 'circle').eq('circle', edit.slug)
    }
    if (upErr) setError(upErr.message)
    else setEdit(null)
    await load()
    setBusy(false)
    router.refresh()
  }

  const setArchived = async (slug: string, archived: boolean) => {
    setBusy(true); setError('')
    const { error: upErr } = await createClient().from('circles')
      .update({ archived_at: archived ? new Date().toISOString() : null }).eq('slug', slug)
    if (upErr) setError(upErr.message)
    await load()
    setBusy(false)
    router.refresh()
  }

  return (
    <div>
      <div className="crumb"><span>Setup</span><span className="crumb-sep">/</span><span>Circles</span></div>
      <h1 className="step-title">Circles</h1>
      <p className="step-lede">
        The standing groups that look after an area of community life. Projects, events, bookable items and the org chart all belong to a circle, and circle leads can edit their circle&rsquo;s work.
      </p>
      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, marginTop: -6, marginBottom: 20 }}>
        Not the same as the Blueprint&rsquo;s framework pillars, which are fixed scoring axes. Your circles can match them, but don&rsquo;t have to.
      </p>

      {rows && active.length === 0 && (
        <div className="card" style={{ background: 'var(--warn-soft)', padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 20 }}>
          Setup isn&rsquo;t finished until your community has at least one circle.
        </div>
      )}

      {error && (
        <div style={{ fontSize: 13, color: '#b91c1c', background: '#b91c1c12', border: '1px solid #b91c1c40', borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 16 }}>{error}</div>
      )}

      {active.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div className="section-title">Your circles</div>
            <div className="section-meta-row"><span className="section-meta">{active.length}</span></div>
          </div>
          {active.map(r => edit?.slug === r.slug ? (
            <div key={r.slug} style={{ padding: 14, marginBottom: 8, border: '1px solid var(--accent)', borderRadius: 6, background: 'var(--bg-2)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: 10, marginBottom: 10 }}>
                <div><div style={label}>Name</div><input className="input" value={edit.name} maxLength={60} onChange={e => setEdit({ ...edit, name: e.target.value })} /></div>
                <div><div style={label}>Purpose</div><input className="input" value={edit.purpose} onChange={e => setEdit({ ...edit, purpose: e.target.value })} /></div>
              </div>
              <div style={label}>Lead’s name (shown on the org chart; give portal members the circle lead role in Admin › Users)</div>
              <input className="input" value={edit.leads} maxLength={300} onChange={e => setEdit({ ...edit, leads: e.target.value })} style={{ marginBottom: 10 }} />
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: 'var(--ink-2)', marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={edit.steward} onChange={e => setEdit({ ...edit, steward: e.target.checked })} style={{ marginTop: 3 }} />
                <span><strong>Community stewards:</strong> this circle looks after every circle. It goes at the top of the org chart. Only one circle can be the stewards.</span>
              </label>
              <div style={label}>Emoji</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {CIRCLE_EMOJIS.map(em => (
                  <button key={em} type="button" onClick={() => setEdit({ ...edit, emoji: em })} aria-label={`Emoji ${em}`}
                    style={{ width: 32, height: 32, fontSize: 16, borderRadius: 6, cursor: 'pointer', background: 'var(--surface)', border: `1.5px solid ${edit.emoji === em ? 'var(--ink)' : 'var(--rule)'}` }}>{em}</button>
                ))}
              </div>
              <div style={label}>Colour</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {CIRCLE_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setEdit({ ...edit, color: c })} aria-label={`Colour ${c}`}
                    style={{ width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', background: c, border: edit.color === c ? '3px solid var(--ink)' : '2px solid var(--surface)' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setEdit(null)} disabled={busy}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEdit} disabled={busy}>Save</button>
              </div>
            </div>
          ) : (
            <div key={r.slug} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', marginBottom: 8, border: '1px solid var(--rule)', borderLeft: `4px solid ${r.color}`, borderRadius: 6, background: 'var(--surface)' }}>
              <span style={{ fontSize: 20, lineHeight: 1.2 }}>{r.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}{r.is_steward && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>· Community stewards</span>}</div>
                <div style={{ fontSize: 12.5, color: purposes[r.slug] ? 'var(--ink-2)' : 'var(--ink-4)', lineHeight: 1.45, marginTop: 2 }}>{purposes[r.slug] || 'No purpose written yet.'}</div>
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <CircleLeadName slug={r.slug} canEdit={canEdit} color={r.color}
                    onSaved={name => setRows(list => (list ?? []).map(x => (x.slug === r.slug ? { ...x, leads_to_assign: name } : x)))} />
                  {(portalLeads[r.slug] ?? []).length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      On the portal:{' '}
                      {portalLeads[r.slug].map((p, i) => (
                        <span key={p.id}>{i > 0 && ', '}{p.username ? <Link href={`/u/${p.username}`} style={{ color: r.color, fontWeight: 600, textDecoration: 'none' }}>{p.name}</Link> : p.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {canEdit && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} disabled={busy}
                    onClick={() => setEdit({ slug: r.slug, name: r.name, purpose: purposes[r.slug] ?? '', leads: r.leads_to_assign ?? '', emoji: r.emoji, color: r.color, steward: r.is_steward })}>Edit</button>
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} disabled={busy} onClick={() => setArchived(r.slug, true)}
                    title="Hide it from pickers; its projects and events keep it">Retire</button>
                </div>
              )}
            </div>
          ))}
          {retired.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>
              Retired: {retired.map((r, i) => (
                <span key={r.slug}>
                  {i > 0 && ' · '}{r.emoji} {r.name}
                  {canEdit && <button onClick={() => setArchived(r.slug, false)} disabled={busy}
                    style={{ marginLeft: 6, background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }}>restore</button>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {canEdit && rows && (
        <div className="section">
          <div className="section-head">
            <div className="section-title">{active.length ? 'Add circles' : 'Establish your circles'}</div>
            <div className="section-meta-row">
              <button className="btn-section-import" onClick={onImport} title="Use AI to find circles in a document">
                <span className="btn-section-import-icon">✨</span>
                Find in a document
              </button>
            </div>
          </div>

          {fromDocs && (
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-2)', margin: '0 0 14px' }}>
              Your documents describe these circles. Are these right? You can rename, merge, remove or add circles. Only the ticked ones are saved.
            </p>
          )}

          {drafts.length === 0 && active.length === 0 && (
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)', marginBottom: 14 }}>
              <p style={{ margin: '0 0 10px' }}>
                What are your community&rsquo;s circles? These are the standing groups that look after an area of community life, like land and food, building, finances, or care and wellbeing. For each one, give a <strong>name</strong> and a <strong>one-line purpose</strong>. If you already know who leads it, add their name. Most communities start with 3 to 7.
              </p>
              <p style={{ margin: '0 0 10px' }}>Not sure yet? You can start from a template and change it any time:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CIRCLE_TEMPLATES.map(t => (
                  <button key={t.id} className="btn" onClick={() => applyTemplate(t.id)} style={{ textAlign: 'left' }}>
                    <strong>{t.label}:</strong>&nbsp;{t.circles.map(c => c.name).join(' · ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {drafts.map(d => (
            <div key={d.key} style={{ padding: 12, marginBottom: 8, border: `1px solid ${d.include ? 'var(--accent)' : 'var(--rule-soft)'}`, borderRadius: 6, background: d.include ? 'var(--accent-soft)' : 'var(--bg-2)', opacity: d.include ? 1 : 0.6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <input type="checkbox" checked={d.include} onChange={e => setDraft(d.key, { include: e.target.checked })}
                  aria-label={`Save ${d.name || 'this circle'}`} style={{ marginTop: 22 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: 10 }}>
                    <div><div style={label}>Name</div><input className="input" value={d.name} maxLength={60} placeholder="Land & Food" onChange={e => setDraft(d.key, { name: e.target.value })} /></div>
                    <div><div style={label}>Purpose</div><input className="input" value={d.purpose} placeholder="One line on what this circle takes care of" onChange={e => setDraft(d.key, { purpose: e.target.value })} /></div>
                  </div>
                  <div style={{ ...label, marginTop: 8 }}>Who leads it (optional, a note for now)</div>
                  <input className="input" value={d.leads} maxLength={300} placeholder="Names, comma separated" onChange={e => setDraft(d.key, { leads: e.target.value })} />
                  {d.roles && d.roles.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.45 }}>
                      Roles (added as teams on the Circles page): {d.roles.map(r => r.name).join(' · ')}
                    </div>
                  )}
                  {d.source && <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.45 }}>From your document: &ldquo;{d.source}&rdquo;</div>}
                </div>
                <button onClick={() => setDrafts(ds => ds.filter(x => x.key !== d.key))} aria-label="Remove"
                  style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--ink-3)', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={addBlank} disabled={busy}>+ Add a circle</button>
            {drafts.length > 0 && (
              <button className="btn btn-primary" onClick={saveDrafts} disabled={busy || included.length === 0}>
                {busy ? 'Saving…' : `Save ${included.length} circle${included.length === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
        </div>
      )}

      {!canEdit && (
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Only admins can add or change circles.</p>
      )}

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={onPrev}>← Previous</button>
        <button className="btn btn-primary" onClick={onNext}>Continue to dashboard →</button>
      </div>
    </div>
  )
}
