'use client'

import { useState } from 'react'
import { ModalShell } from '@/core/components/ModalShell'
import { useCircles } from '@/core/components/CirclesProvider'
import { Button } from '@/core/components/v4'
import { KIND_META, KINDS, slugify, type Place, type PlaceKind } from './lib/places'

export interface PlacePayload {
  name: string
  slug?: string
  kind: PlaceKind
  description: string | null
  circle: string | null
  project_id: string | null
}

/** Add or change a place on the Map page: what it is, a photo, who looks after it, a task. */
export default function PlaceFormModal({ existing, role, leadCircles, taken, taskOptions, onClose, onSave, onRemove, onPlace }: {
  existing: Place | null
  role: string
  leadCircles: string[]
  /** Slugs already used, so a new place gets a free one */
  taken: string[]
  taskOptions: { id: string; title: string }[]
  onClose: () => void
  onSave: (payload: PlacePayload, photo: File | null | 'remove') => Promise<string | null>
  onRemove?: () => void
  onPlace?: () => void
}) {
  const circles = useCircles()
  const [name, setName] = useState(existing?.name ?? '')
  const [kind, setKind] = useState<PlaceKind>(existing?.kind ?? 'other')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [circle, setCircle] = useState(existing?.circle ?? (role === 'circle_lead' ? leadCircles[0] ?? '' : ''))
  const [projectId, setProjectId] = useState(existing?.project_id ?? '')
  const [photo, setPhoto] = useState<File | null | 'remove'>(null)
  const [preview, setPreview] = useState<string | null>(existing?.photo_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Circle leads change places of their own circles; admins any (the database checks it too)
  const circleAllowed = (c: string) => role === 'admin' || leadCircles.includes(c)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Give the place a name.'); return }
    if (role !== 'admin' && !circle) { setError('Pick the circle that looks after it.'); return }
    let slug: string | undefined
    if (!existing) {
      const base = slugify(name)
      slug = base
      for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`
    }
    setSaving(true)
    const err = await onSave({
      name: name.trim(), ...(slug ? { slug } : {}), kind,
      description: description.trim() || null, circle: circle || null, project_id: projectId || null,
    }, photo)
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <ModalShell title={existing ? `Edit ${existing.name}` : 'Add a place'} onClose={onClose} maxWidth={560}>
      <form onSubmit={submit} className="v4-form v4-modal">
        <label className="v4-field">
          <span>Name</span>
          <input className="v4-input" value={name} onChange={e => setName(e.target.value)} placeholder="Bamboo house, fish pond, mother tree…" autoFocus={!existing} />
        </label>

        <div className="v4-field">
          <span>What it is</span>
          <div className="v4-chiprow">
            {KINDS.map(k => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`v4-chip${kind === k ? ' v4-chip--on' : ''}`}>{KIND_META[k].label}</button>
            ))}
          </div>
        </div>

        <div className="v4-field">
          <span>Photo</span>
          <div className="v4-placephoto">
            {preview ? <img src={preview} alt="" /> : <span className="v4-placephoto__none">No photo yet</span>}
            <span className="v4-placephoto__btns">
              <label className="v4-btn v4-btn--secondary v4-btn--sm">
                <span>{preview ? 'Replace photo' : 'Add a photo'}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) { setPhoto(f); setPreview(URL.createObjectURL(f)) }
                  e.target.value = ''
                }} />
              </label>
              {preview && <Button size="sm" variant="quiet" onClick={() => { setPhoto(existing?.photo_url ? 'remove' : null); setPreview(null) }}>Remove</Button>}
            </span>
          </div>
        </div>

        <label className="v4-field">
          <span>Description <small>a few lines: what it is, what it’s for</small></span>
          <textarea className="v4-input" value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={2000} />
        </label>

        <div className="v4-field">
          <span>Circle <small>who looks after it</small></span>
          <div className="v4-chiprow">
            {role === 'admin' && <button type="button" className={`v4-chip${circle === '' ? ' v4-chip--on' : ''}`} aria-pressed={circle === ''} onClick={() => setCircle('')}>None</button>}
            {circles.slugs.map(c => {
              const ok = circleAllowed(c)
              return (
                <button key={c} type="button" disabled={!ok} aria-pressed={circle === c} onClick={() => setCircle(c)}
                  title={ok ? undefined : 'You can only choose circles you lead.'}
                  className={`v4-chip${circle === c ? ' v4-chip--on' : ''}`}>
                  <span className="v4-dot" style={{ background: circles.meta(c).color, width: 8, height: 8 }} />{circles.meta(c).label}
                </button>
              )
            })}
          </div>
        </div>

        {taskOptions.length > 0 && (
          <label className="v4-field">
            <span>Task <small>work happening here, from Operations</small></span>
            <select className="v4-input" value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">None</option>
              {taskOptions.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
        )}

        {error && <p className="v4-error-box">{error}</p>}

        <div className="v4-modal__foot">
          {onRemove && <Button variant="danger" onClick={onRemove} className="v4-modal__left">Remove</Button>}
          {onPlace && <Button variant="secondary" onClick={onPlace}>{existing?.map_x != null ? 'Move the pin' : 'Put it on the map'}</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : existing ? 'Save' : 'Add place'}</Button>
        </div>
      </form>
    </ModalShell>
  )
}
