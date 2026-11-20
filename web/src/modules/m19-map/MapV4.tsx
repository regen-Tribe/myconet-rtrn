'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import { Button, Chip, ChipRow, EmptyState, Icon, IconTile, List, ListRow, PageHeader } from '@/core/components/v4'
import SiteMap, { type SitePin } from '@/core/components/v4/SiteMap'
import { canEditPlace, KIND_META, KINDS, near, PLACE_SELECT, type Place, type PlaceKind } from './lib/places'
import PlaceFormModal, { type PlacePayload } from './PlaceFormModal'

/** A bookable thing with a pin on the Amenities map (booking_items) */
export interface MapBookable { id: string; name: string; category: 'accommodation' | 'tools' | 'spaces'; map_x: number; map_y: number }

/** Which place kind a booking category shows under in the filter */
const KIND_OF_CATEGORY: Record<MapBookable['category'], PlaceKind> = { accommodation: 'stay', spaces: 'space', tools: 'amenity' }
const CATEGORY_LABEL: Record<MapBookable['category'], string> = { accommodation: 'Accommodation', spaces: 'Space to book', tools: 'Tool to book' }
const bookHref = (id: string) => `/amenities?item=${encodeURIComponent(id)}`
const B = 'b:' // pin ids of bookable things, so they never clash with a place's id

export default function MapV4({ communityName, mapUrl, initialPlaces, bookables, tasks, taskOptions, role, leadCircles, initialPlace, initialKind, placesReady }: {
  communityName: string
  mapUrl: string | null
  initialPlaces: Place[]
  bookables: MapBookable[]
  tasks: { id: string; title: string }[]
  taskOptions: { id: string; title: string }[]
  role: string
  leadCircles: string[]
  initialPlace: string | null
  initialKind: PlaceKind | null
  placesReady: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const circles = useCircles()
  const [places, setPlaces] = useState(initialPlaces)
  const [taskTitles, setTaskTitles] = useState(() => new Map(tasks.map(t => [t.id, t.title])))
  const [kind, setKind] = useState<PlaceKind | null>(initialKind)
  const [editing, setEditing] = useState(false)
  const [placingId, setPlacingId] = useState<string | null>(null)
  const [form, setForm] = useState<Place | 'new' | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast])

  const canAdd = placesReady && canEditPlace(null, role, leadCircles)
  const canEdit = (p: Place) => canEditPlace(p, role, leadCircles)

  // Bookable things whose pin sits on a place belong to that place's card; the rest get their own pin
  const pinned = places.filter(p => p.map_x != null && p.map_y != null)
  const bookablesAt = (p: Place) => p.map_x == null ? [] : bookables.filter(b => near({ x: b.map_x, y: b.map_y }, { x: p.map_x!, y: p.map_y! }))
  const looseBookables = bookables.filter(b => !pinned.some(p => near({ x: b.map_x, y: b.map_y }, { x: p.map_x!, y: p.map_y! })))

  const kindsHere = KINDS.filter(k => pinned.some(p => p.kind === k) || looseBookables.some(b => KIND_OF_CATEGORY[b.category] === k))
  const count = (k: PlaceKind) => pinned.filter(p => p.kind === k).length + looseBookables.filter(b => KIND_OF_CATEGORY[b.category] === k).length

  const pins: SitePin[] = [
    ...pinned.filter(p => !kind || p.kind === kind).map(p => ({
      id: p.id, name: p.name, x: p.map_x!, y: p.map_y!, icon: KIND_META[p.kind].icon, tone: KIND_META[p.kind].tone,
      sub: [KIND_META[p.kind].label, bookablesAt(p).length ? 'to book' : null].filter(Boolean).join(' · '),
    })),
    ...looseBookables.filter(b => !kind || KIND_OF_CATEGORY[b.category] === kind).map(b => {
      const m = KIND_META[KIND_OF_CATEGORY[b.category]]
      return { id: B + b.id, name: b.name, x: b.map_x, y: b.map_y, icon: m.icon, tone: m.tone, sub: CATEGORY_LABEL[b.category] }
    }),
  ]
  const openId = initialPlace ? places.find(p => p.slug === initialPlace || p.id === initialPlace)?.id ?? null : null

  function renderCard(id: string) {
    if (id.startsWith(B)) {
      const b = bookables.find(x => B + x.id === id)
      if (!b) return null
      return (
        <>
          <b>{b.name}</b>
          <small>{CATEGORY_LABEL[b.category]}</small>
          <Button size="sm" href={bookHref(b.id)}>See and book</Button>
        </>
      )
    }
    const p = places.find(x => x.id === id)
    if (!p) return null
    const here = bookablesAt(p)
    const circle = p.circle ? circles.meta(p.circle) : null
    const task = p.project_id ? taskTitles.get(p.project_id) : null
    return (
      <>
        {p.photo_url
          ? <img src={p.photo_url} alt="" className="v4-mapcard__photo" loading="lazy" />
          : <span className={`v4-mapcard__nophoto v4-tile--${KIND_META[p.kind].tone}`}><Icon name={KIND_META[p.kind].icon} size={22} /></span>}
        <b>{p.name}</b>
        <small>{[KIND_META[p.kind].label, circle ? `${circle.label} circle` : null].filter(Boolean).join(' · ')}</small>
        {p.description && <p className="v4-mapcard__text">{p.description}</p>}
        {here.length > 1 && (
          <div className="v4-mapcard__book">
            <small>To book here</small>
            {here.map(b => <a key={b.id} href={bookHref(b.id)} className="v4-linkbtn">{b.name}</a>)}
          </div>
        )}
        <div className="v4-mapcard__actions">
          {here.length === 1 && <Button size="sm" href={bookHref(here[0].id)}>Book {here[0].name}</Button>}
          {p.circle && circle && <Button size="sm" variant="secondary" href={`/circles?c=${encodeURIComponent(p.circle)}`}>{circle.label} circle</Button>}
          {p.project_id && task && <Button size="sm" variant="secondary" href={`/operations/${p.project_id}`}>Task: {task}</Button>}
          {canEdit(p) && <Button size="sm" variant="quiet" onClick={() => setForm(p)}>Edit</Button>}
        </div>
      </>
    )
  }

  async function save(payload: PlacePayload, existing: Place | null, photo: File | null | 'remove'): Promise<string | null> {
    let row: Place
    if (existing) {
      const { data, error } = await supabase.from('places').update(payload).eq('id', existing.id).select(PLACE_SELECT)
      if (error || !data?.length) return error?.message ?? 'That didn’t save. You may not be allowed to change this place.'
      row = data[0] as Place
    } else {
      const { data, error } = await supabase.from('places').insert(payload).select(PLACE_SELECT)
      if (error || !data?.length) return error?.code === '23505' ? 'There is already a place with that name.' : error?.message ?? 'That didn’t save.'
      row = data[0] as Place
    }
    if (photo) {
      const err = await savePhoto(row, photo)
      if (typeof err === 'string') { setToast(err); } else row = err
    }
    setPlaces(list => existing ? list.map(p => p.id === row.id ? row : p) : [...list, row])
    if (payload.project_id && !taskTitles.has(payload.project_id)) {
      const { data } = await supabase.from('projects').select('id, title').eq('id', payload.project_id).maybeSingle()
      if (data) setTaskTitles(m => new Map(m).set(data.id as string, data.title as string))
    }
    // A new place without a pin: put it on the map next
    if (!existing && mapUrl) { setEditing(true); setPlacingId(row.id) }
    setToast(existing ? 'Saved' : `${row.name} added${mapUrl ? ': now click where it is' : ''}`)
    return null
  }

  /** The place's photo, in the public branding bucket (admins may upload there) */
  async function savePhoto(p: Place, photo: File | 'remove'): Promise<Place | string> {
    const old = p.photo_url?.split('/object/public/branding/')[1]?.split('?')[0] ?? null
    let url: string | null = null
    if (photo !== 'remove') {
      const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[photo.type] ?? 'jpg'
      const path = `place-${p.slug}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('branding').upload(path, photo, { contentType: photo.type })
      if (error) return `The photo didn’t upload: ${error.message}`
      url = supabase.storage.from('branding').getPublicUrl(path).data.publicUrl
    }
    const { data, error } = await supabase.from('places').update({ photo_url: url }).eq('id', p.id).select(PLACE_SELECT)
    if (error || !data?.length) return 'The photo didn’t save.'
    if (old) await supabase.storage.from('branding').remove([old])
    return data[0] as Place
  }

  async function setPin(p: Place, x: number | null, y: number | null) {
    const { data, error } = await supabase.from('places').update({ map_x: x, map_y: y }).eq('id', p.id).select(PLACE_SELECT)
    if (error || !data?.length) { setToast('That didn’t save.'); return }
    setPlaces(list => list.map(q => q.id === p.id ? data[0] as Place : q))
    setToast(x == null ? `${p.name} is off the map` : `${p.name} is on the map`)
  }

  async function remove(p: Place) {
    if (!confirm(`Remove ${p.name} from the map? This can’t be undone.`)) return
    const { error } = await supabase.from('places').delete().eq('id', p.id)
    if (error) { setToast('That didn’t delete.'); return }
    setPlaces(list => list.filter(q => q.id !== p.id))
    setForm(null)
    setToast(`${p.name} removed`)
  }

  const placing = places.find(p => p.id === placingId) ?? null
  const mine = places.filter(canEdit).sort((a, b) => Number(a.map_x != null) - Number(b.map_x != null) || a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  const unplaced = places.filter(p => p.map_x == null)

  return (
    <div className="v4-page v4-page--wide">
      <PageHeader
        eyebrow="Community"
        title={`Map of ${communityName}`}
        subtitle="Where everything is on the land. Tap a pin to see what it is, who looks after it and what you can book there."
        actions={canAdd && (
          editing
            ? <><Button variant="secondary" onClick={() => setForm('new')} icon="plus">Add a place</Button><Button onClick={() => { setEditing(false); setPlacingId(null) }}>Done</Button></>
            : <Button variant="secondary" onClick={() => setEditing(true)} icon="pencil">Edit places</Button>
        )}
      />

      {!mapUrl ? (
        <EmptyState icon="map" title="No map yet"
          text={role === 'admin' ? 'Upload an aerial photo or a drawn plan of the land in Admin › Bookings › Map. Then the places go on it here.' : 'An admin adds a picture of the land; then every place shows here.'}
          action={role === 'admin' ? { href: '/admin/bookings', label: 'Open Bookings' } : undefined} />
      ) : (
        <>
          {!editing && kindsHere.length > 1 && (
            <div className="v4-toolbar v4-mapfilter">
              <ChipRow>
                <Chip on={kind === null} onClick={() => setKind(null)}>All</Chip>
                {kindsHere.map(k => <Chip key={k} on={kind === k} onClick={() => setKind(kind === k ? null : k)} count={count(k)}>{KIND_META[k].label}</Chip>)}
              </ChipRow>
            </div>
          )}

          {editing ? (
            <>
              <div className="v4-sec">
                <h2>{placing ? <>Click where <em>{placing.name}</em> is</> : `${mine.filter(p => p.map_x != null).length} of ${mine.length} on the map`}</h2>
                {placing && <span className="v4-ph__actions"><Button size="sm" variant="secondary" onClick={() => setPlacingId(null)}>Cancel</Button></span>}
              </div>
              <div className="v4-mapedit">
                <SiteMap url={mapUrl} alt={`Map of ${communityName}`} pins={pins} selectedId={placingId} wideCard renderCard={renderCard}
                  placing={placing} onPlace={(x, y) => { if (placing) { void setPin(placing, Math.round(x * 10) / 10, Math.round(y * 10) / 10); setPlacingId(null) } }} />
                <List>
                  {mine.length === 0 && <ListRow title="Nothing you can change yet" meta="Add the first place with “Add a place”." />}
                  {mine.map(p => {
                    const on = p.map_x != null
                    return (
                      <ListRow key={p.id}
                        lead={<IconTile name={KIND_META[p.kind].icon} tone={on ? KIND_META[p.kind].tone : 'grey'} />}
                        title={p.name}
                        meta={[KIND_META[p.kind].label, on ? null : 'not on the map', p.photo_url ? null : 'no photo'].filter(Boolean).join(' · ')}
                        trail={<>
                          <Button size="sm" variant={placingId === p.id ? 'primary' : 'secondary'} onClick={() => setPlacingId(placingId === p.id ? null : p.id)}>{on ? 'Move' : 'Place'}</Button>
                          <Button size="sm" variant="quiet" onClick={() => setForm(p)}>Edit</Button>
                        </>}
                      />
                    )
                  })}
                </List>
              </div>
            </>
          ) : pins.length === 0 ? (
            <EmptyState icon="map" title="Nothing on the map yet"
              text={canAdd ? 'Add the houses, gardens, spaces and meeting spots with “Edit places”.' : 'Admins and circle leads put the places on the map.'} />
          ) : (
            <SiteMap url={mapUrl} alt={`Map of ${communityName}`} pins={pins} renderCard={renderCard} showList wideCard
              listLabel="Places on the map" initialOpen={openId} key={kind ?? 'all'} />
          )}

          {!editing && unplaced.length > 0 && canAdd && (
            <p className="v4-hint v4-map__rest">Not on the map yet: {unplaced.map(p => p.name).join(', ')}. Put them on with “Edit places”.</p>
          )}
          {!placesReady && role === 'admin' && (
            <p className="v4-hint v4-map__rest">Only bookable things show: this community’s database doesn’t have places yet (migration 20261211000000_places).</p>
          )}
        </>
      )}

      {form && (
        <PlaceFormModal
          existing={form === 'new' ? null : form}
          role={role}
          leadCircles={leadCircles}
          taken={places.map(p => p.slug)}
          taskOptions={taskOptions}
          onClose={() => setForm(null)}
          onSave={async (payload, photo) => { const err = await save(payload, form === 'new' ? null : form, photo); if (!err) setForm(null); return err }}
          onRemove={form !== 'new' ? () => void remove(form) : undefined}
          onPlace={form !== 'new' && mapUrl ? () => { setEditing(true); setPlacingId(form.id); setForm(null) } : undefined}
        />
      )}
      {toast && <div role="status" className="v4-toast">{toast}</div>}
    </div>
  )
}
