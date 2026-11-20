'use client'

import { useState } from 'react'
import { ModalShell } from '@/core/components/ModalShell'
import { useCircles } from '@/core/components/CirclesProvider'
import type { CircleSlug } from '@/core/lib/circles'
import type { OrgMember, OrgPerson, OrgUnit, UnitRole } from './types'

export interface UnitDraft {
  name: string
  description: string | null
  members: { user_id: string; role: UnitRole; title: string | null }[]
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }
const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 14, color: 'var(--ink)', background: 'var(--bg)', border: '1px solid var(--rule)',
  borderRadius: 'var(--radius)', padding: '8px 10px', outline: 'none', boxSizing: 'border-box',
}

/** Edit a circle (purpose + members) or a team (name, description, leads and members). */
export function UnitEditModal({
  unit, circle, members, people, canDelete, onClose, onSave, onDelete,
}: {
  /** null when creating a new team */
  unit: OrgUnit | null
  circle: CircleSlug
  members: OrgMember[]
  people: OrgPerson[]
  canDelete: boolean
  onClose: () => void
  onSave: (draft: UnitDraft) => Promise<string | null>
  onDelete: () => Promise<string | null>
}) {
  const circles = useCircles()
  const isCircle = unit?.kind === 'circle'
  const meta = circles.meta(circle)
  const [name, setName] = useState(unit?.name ?? '')
  const [description, setDescription] = useState(unit?.description ?? '')
  const [rows, setRows] = useState(members.map(m => ({ user_id: m.user_id, role: m.role, title: m.title ?? '' })))
  const [adding, setAdding] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const personById = new Map(people.map(p => [p.id, p]))
  const available = people.filter(p => !rows.some(r => r.user_id === p.id)).sort((a, b) => a.name.localeCompare(b.name))

  function addPerson(id: string) {
    if (!id) return
    // The first person added to a new team becomes its lead
    setRows(r => [...r, { user_id: id, role: !isCircle && r.length === 0 ? 'lead' : 'member', title: '' }])
    setAdding('')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isCircle && !name.trim()) return setError('Give the subcircle a name.')
    setBusy(true)
    const err = await onSave({
      name: isCircle ? unit!.name : name.trim(),
      description: description.trim() || null,
      members: rows.map(r => ({ user_id: r.user_id, role: isCircle ? 'member' : r.role, title: r.title.trim() || null })),
    })
    setBusy(false)
    if (err) setError(err)
  }

  async function remove() {
    setBusy(true)
    const err = await onDelete()
    setBusy(false)
    if (err) setError(err)
  }

  const title = isCircle ? `${meta.emoji} ${meta.label} circle` : unit ? `Edit subcircle · ${unit.name}` : `New subcircle in ${meta.emoji} ${meta.label}`

  return (
    <ModalShell title={title} onClose={onClose} maxWidth={560}>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!isCircle && (
          <div>
            <label style={labelStyle} htmlFor="ou-name">Subcircle name</label>
            <input id="ou-name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Food forest crew, Web team, Welcome desk…" autoFocus />
          </div>
        )}

        <div>
          <label style={labelStyle} htmlFor="ou-desc">{isCircle ? 'Purpose' : 'What this subcircle does'}</label>
          <textarea id="ou-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
            placeholder={isCircle ? 'What this circle is responsible for…' : 'Responsibilities, rhythms, how to get involved…'} />
        </div>

        <div>
          <span style={labelStyle}>{isCircle ? 'Circle members' : 'People'}</span>
          {isCircle && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 8 }}>
              Circle leads are assigned by admins under Admin → Users. Add the rest of the circle here.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rows.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No one yet.</div>}
            {rows.map(r => (
              <div key={r.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'var(--bg-2)', borderRadius: 8, padding: '6px 8px' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', flex: '1 1 120px', minWidth: 0 }}>{personById.get(r.user_id)?.name ?? 'Member'}</span>
                {!isCircle && (
                  <select
                    value={r.role}
                    onChange={e => setRows(list => list.map(x => (x.user_id === r.user_id ? { ...x, role: e.target.value as UnitRole } : x)))}
                    aria-label="Role in subcircle"
                    style={{ fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)' }}
                  >
                    <option value="lead">Lead</option>
                    <option value="member">Member</option>
                  </select>
                )}
                <input
                  value={r.title}
                  onChange={e => setRows(list => list.map(x => (x.user_id === r.user_id ? { ...x, title: e.target.value.slice(0, 60) } : x)))}
                  placeholder="Title (optional)"
                  aria-label="Title"
                  style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', flex: '1 1 120px', minWidth: 0 }}
                />
                <button type="button" onClick={() => setRows(list => list.filter(x => x.user_id !== r.user_id))} aria-label="Remove"
                  style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <select value={adding} onChange={e => addPerson(e.target.value)} aria-label="Add a person" style={{ ...inputStyle, marginTop: 8 }}>
            <option value="">+ Add a person…</option>
            {available.map(p => <option key={p.id} value={p.id}>{p.name}{p.username ? ` (@${p.username})` : ''}</option>)}
          </select>
        </div>

        {error && <div style={{ fontSize: 13, color: '#dc2626', background: 'color-mix(in srgb, #dc2626 8%, var(--surface))', borderRadius: 8, padding: '8px 10px' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div>
            {canDelete && unit && !isCircle && (
              confirmDelete ? (
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  <button type="button" onClick={() => setConfirmDelete(false)} style={{ fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer' }}>Keep it</button>
                  <button type="button" onClick={remove} disabled={busy} style={{ fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 'var(--radius)', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' }}>Delete subcircle</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} style={{ fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: '#dc2626', cursor: 'pointer' }}>Delete subcircle</button>
              )
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={busy} style={{ fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--m17)', color: '#fff', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Saving…' : unit ? 'Save' : 'Create subcircle'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
