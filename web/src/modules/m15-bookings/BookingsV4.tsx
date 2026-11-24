'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DESIGN_REVIEW } from '@/core/lib/instance'
import {
  Button, Card, Chip, ChipRow, EmptyState, Icon, IconTile, List, ListRow, PageHeader, SectionHead, StatusPill, Tag,
  type IconName, type Status,
} from '@/core/components/v4'
import type { Booking, BookingCategory, BookingItem, BookingsTab, AroundPlace } from './types'
import { CATEGORY_META, STATUS_META, canManageItem, fmtBookingRange, personName } from './lib/inventory'
import AmenitiesMap from './AmenitiesMap'
import { KIND_META, isKind } from '@/modules/m19-map/lib/places'
import { SpaceTabs } from '@/core/components/SpaceTabs'
import { tagLabel } from './lib/tag-labels'
import { PhotoEdit, SPACE_PURPOSE, SPACE_TITLE, SpaceBar, SpaceNote, type FilterGroup, type SpaceView } from './SpaceReview'

/**
 * Amenities & tools and Admin › Bookings in the v4 look (Sonia's prototype, 19 Nov). Same data, rules and
 * actions as the classic page (BookingsClient keeps all the state and the writes); this is only the view.
 * Admin › Bookings adds a calendar: who stays where, day by day.
 */

export const CATEGORY_ICON: Record<BookingCategory, { icon: IconName; tone: 'yellow' | 'blue' | 'violet' }> = {
  accommodation: { icon: 'bed', tone: 'yellow' },
  tools: { icon: 'wrench', tone: 'blue' },
  spaces: { icon: 'building', tone: 'violet' },
}

const STATUS_PILL: Record<Booking['status'], Status> = { pending: 'review', confirmed: 'done', declined: 'no', cancelled: 'paused' }

export type BookingsV4Model = {
  admin: boolean
  heading: string
  categories: BookingCategory[]
  activeItems: BookingItem[]
  scopeItems: BookingItem[]
  shown: BookingItem[]
  bookings: Booking[]
  itemById: Map<string, BookingItem>
  tagsHere: string[]
  myUpcoming: Booking[]
  myPast: Booking[]
  pending: Booking[]
  now: Date | null
  userId: string | null
  role: string
  leadCircles: string[]
  isManager: boolean
  canBookHere: boolean
  tab: BookingsTab
  category: BookingCategory | null
  tag: string | null
  query: string
  toast: string | null
  availability: (item: BookingItem) => { text: string; color: string } | null
  setTab: (t: BookingsTab) => void
  setCategory: (c: BookingCategory | null) => void
  setTag: (t: string | null) => void
  setQuery: (q: string) => void
  open: (id: string) => void
  add: () => void
  edit: (item: BookingItem) => void
  toggleActive: (item: BookingItem) => void
  setStatus: (b: Booking, status: Booking['status'], okMsg: string) => void
  /** The Amenities map (v4.43.0) */
  mapUrl: string | null
  /** Map places with nothing to book, listed under Spaces (v4.113.0) */
  around: AroundPlace[]
  setPin: (item: BookingItem, x: number | null, y: number | null) => void
  setMapPicture: (file: File | null) => void
  isAdmin: boolean
  canManage: (item: BookingItem) => boolean
}

export default function BookingsV4({ vm, modals }: { vm: BookingsV4Model; modals: React.ReactNode }) {
  const [adminView, setAdminView] = useState<'calendar' | 'requests' | 'inventory' | 'map'>(vm.pending.length ? 'requests' : 'calendar')
  const counts = vm.categories.map(c => `${vm.activeItems.filter(i => i.category === c).length} ${CATEGORY_META[c].label.toLowerCase()}`).join(' · ')
  // The design review (decision #23): heading "The space", one toolbar row, kinds and tags inside Filter
  if (DESIGN_REVIEW && !vm.admin) return <SpaceReviewPage vm={vm} modals={modals} />

  return (
    <div className="v4-page">
      <PageHeader
        eyebrow={vm.admin ? 'Admin' : 'Community'}
        title={vm.admin ? 'Bookings' : vm.heading}
        subtitle={vm.admin ? 'Who stays where, the requests waiting for you, and the inventory.' : counts}
        actions={vm.isManager ? <Button icon="plus" onClick={vm.add}>Add item</Button> : undefined}
      />
      {!vm.admin && <SpaceTabs on="amenities" />}

      {!vm.admin && !vm.userId && (
        <Card className="v4-note"><Icon name="lock" /><span>Browse what the community shares. <Link href="/auth/login">Sign in</Link> to book.</span></Card>
      )}
      {!vm.admin && vm.userId && !vm.canBookHere && (
        <Card className="v4-note"><Icon name="lock" /><span>Booking opens when you’re a joining member. <Link href="/join">Start joining →</Link></span></Card>
      )}

      {vm.admin ? (
        <>
          <ChipRow>
            <Chip on={adminView === 'calendar'} onClick={() => setAdminView('calendar')}>Calendar</Chip>
            <Chip on={adminView === 'requests'} onClick={() => setAdminView('requests')} count={vm.pending.length || undefined}>Requests</Chip>
            <Chip on={adminView === 'inventory'} onClick={() => setAdminView('inventory')}>Inventory</Chip>
            <Chip on={adminView === 'map'} onClick={() => setAdminView('map')}>Map</Chip>
          </ChipRow>
          {adminView === 'calendar' && <BookingsCalendar vm={vm} />}
          {adminView === 'requests' && <Requests vm={vm} />}
          {adminView === 'inventory' && <Inventory vm={vm} />}
          {adminView === 'map' && <MapEditor vm={vm} />}
        </>
      ) : (
        <>
          {/* My bookings opens with booking, at joining member (decision #76) */}
          {vm.userId && (!DESIGN_REVIEW || vm.canBookHere || vm.isManager) && <ChipRow>
            <Chip on={vm.tab === 'browse'} onClick={() => vm.setTab('browse')}>Browse</Chip>
            {vm.userId && (!DESIGN_REVIEW || vm.canBookHere) && <Chip on={vm.tab === 'mine'} onClick={() => vm.setTab('mine')} count={vm.myUpcoming.length || undefined}>My bookings</Chip>}
            {vm.isManager && <Chip on={vm.tab === 'manage'} onClick={() => vm.setTab('manage')} count={vm.pending.length || undefined}>Manage</Chip>}
          </ChipRow>}
          {vm.tab === 'browse' && <Browse vm={vm} />}
          {vm.tab === 'mine' && vm.userId && <Mine vm={vm} />}
          {vm.tab === 'manage' && vm.isManager && <><Requests vm={vm} /><Inventory vm={vm} /></>}
        </>
      )}

      {modals}
      {vm.toast && <div role="status" className="v4-toast">{vm.toast}</div>}
    </div>
  )
}

/* ─── The space under the design review (decision #23) ───────────── */

/**
 * Heading "The space" and its purpose line; one row: Places · Map · My bookings, search and Filter; kinds and tags
 * inside Filter in plain words. Same data, cards and booking flow as the v4 page. No Manage tab (decision #43): whoever
 * can manage a thing edits it from the Edit button on its photo; requests and the inventory are in Admin › Bookings.
 */
function SpaceReviewPage({ vm, modals }: { vm: BookingsV4Model; modals: React.ReactNode }) {
  const router = useRouter()
  // An old link to /amenities?tab=manage opens Admin › Bookings, where requests and the inventory now live
  useEffect(() => { if (vm.tab === 'manage') router.replace('/admin/bookings') }, [vm.tab, router])
  const kindCount = (c: BookingCategory) => vm.activeItems.filter(i => i.category === c).length + (c === 'spaces' ? vm.around.length : 0)
  const inKind = (c: BookingCategory | null) => vm.activeItems.filter(i => !c || i.category === c)
  const on: SpaceView = vm.tab === 'mine' ? 'mine' : 'places'
  const views: SpaceView[] = vm.userId ? ['places', 'map', 'mine'] : ['places', 'map']
  const tagCount = (t: string) => inKind(vm.category).filter(i => i.tags.includes(t)).length

  const groups: FilterGroup[] = []
  if (vm.categories.length > 1) {
    groups.push({
      legend: 'Kind',
      options: [
        { value: null, label: 'All', count: vm.categories.reduce((n, c) => n + kindCount(c), 0) },
        ...vm.categories.map(c => ({ value: c, label: CATEGORY_META[c].label, count: kindCount(c) })),
      ],
      value: vm.category,
      onPick: v => {
        const c = v as BookingCategory | null
        vm.setCategory(c)
        // Keep the tag when the new kind still has it
        if (vm.tag && !inKind(c).some(i => i.tags.includes(vm.tag!))) vm.setTag(null)
      },
    })
  }
  if (vm.tagsHere.length > 0) {
    groups.push({
      legend: 'Tag',
      options: [
        { value: null, label: 'Any' },
        ...[...vm.tagsHere].sort((a, b) => tagLabel(a).localeCompare(tagLabel(b))).map(t => ({ value: t, label: tagLabel(t), count: tagCount(t) })),
      ],
      value: vm.tag,
      onPick: v => vm.setTag(v),
    })
  }

  return (
    <div className="v4-page">
      <div className="spr-head">
        <PageHeader
          eyebrow="Community"
          title={SPACE_TITLE}
          subtitle={<>{SPACE_PURPOSE}<span className="spr-counts">{vm.categories.map(c => `${CATEGORY_META[c].label} ${kindCount(c)}`).join(' · ')}</span></>}
          actions={vm.isManager ? <Button icon="plus" onClick={vm.add}>Add item</Button> : undefined}
        />
      </div>

      <SpaceBar
        on={on}
        views={views}
        onPick={{ places: () => vm.setTab('browse'), mine: () => vm.setTab('mine') }}
        counts={{ mine: vm.myUpcoming.length }}
        search={vm.tab === 'browse' ? { value: vm.query, onChange: vm.setQuery, placeholder: 'Search places and tools', label: 'Search places and tools' } : undefined}
        filter={vm.tab === 'browse' && groups.length ? {
          groups, label: 'Filter places and tools',
          onClear: () => { vm.setCategory(null); vm.setTag(null) },
        } : undefined}
      />

      {vm.tab === 'browse' && !vm.userId && <SpaceNote><Link href="/auth/login">Sign in</Link>&nbsp;to book</SpaceNote>}
      {vm.tab === 'browse' && vm.userId && !vm.canBookHere && <SpaceNote>Booking opens when you join ·&nbsp;<Link href="/join">Start joining</Link></SpaceNote>}

      {vm.tab === 'browse' && <Browse vm={vm} review />}
      {vm.tab === 'mine' && vm.userId && <Mine vm={vm} />}

      {modals}
      {vm.toast && <div role="status" className="v4-toast">{vm.toast}</div>}
    </div>
  )
}

/* ─── Browse ─────────────────────────────────────────────────────── */

const shownPhoto = (i: BookingItem) => i.photo_url ?? i.place?.photo_url ?? null

/** The top of a card: the photo (or a tinted tile with the category's icon), with what's free on it */
function ItemMedia({ photo, category, badge, busy }: { photo: string | null; category: BookingCategory; badge?: string | null; busy?: boolean }) {
  const ci = CATEGORY_ICON[category]
  return (
    <span className="v4-item__media">
      {photo
        ? <img src={photo} alt="" loading="lazy" />
        : <span className={`v4-item__ph v4-tile--${ci.tone}`}><Icon name={ci.icon} size={34} /></span>}
      {badge && <span className={`v4-item__badge${busy ? ' v4-item__badge--busy' : ''}`}>{badge}</span>}
    </span>
  )
}

/**
 * Numbered things of one kind show as one card (v4.80.0): "Dorm 1 – bed 1…10" is Dorm 1 with 10 beds to pick from,
 * "Room 1…9" is Rooms 1–9. Three or more items of a category whose names differ only in the last number group up.
 */
type GroupEntry = { kind: 'group'; key: string; title: string; unit: string; plain: boolean; items: BookingItem[] }
type BrowseEntry = { kind: 'item'; item: BookingItem } | GroupEntry

const GROUP_MIN = 3
const numbered = (name: string) => name.match(/^(.*?)\s*(\d+)$/)

function groupItems(items: BookingItem[]): BrowseEntry[] {
  const byStem = new Map<string, BookingItem[]>()
  for (const i of items) {
    const m = numbered(i.name)
    if (!m || !m[1]) continue
    const key = `${i.category}|${m[1]}`
    byStem.set(key, [...(byStem.get(key) ?? []), i])
  }
  const out: BrowseEntry[] = []
  const done = new Set<string>()
  for (const i of items) {
    const m = numbered(i.name)
    const key = m && m[1] ? `${i.category}|${m[1]}` : null
    const members = key ? byStem.get(key) ?? [] : []
    if (!key || members.length < GROUP_MIN) { out.push({ kind: 'item', item: i }); continue }
    if (done.has(key)) continue
    done.add(key)
    const sorted = [...members].sort((x, y) => Number(numbered(x.name)![2]) - Number(numbered(y.name)![2]))
    const stem = numbered(sorted[0].name)![1]
    // "Dorm 1 – bed" → Dorm 1, beds; "Room" → Rooms 1–9, rooms
    const split = stem.match(/^(.*\S)\s*[–—-]\s*(\S+)$/)
    const nums = sorted.map(x => numbered(x.name)![2])
    const title = split ? split[1] : `${stem}s ${nums[0]}–${nums[nums.length - 1]}`
    const unit = (split ? split[2] : stem).toLowerCase()
    out.push({ kind: 'group', key, title, unit, plain: !split, items: sorted })
  }
  return out
}

function GroupCard({ vm, group }: { vm: BookingsV4Model; group: GroupEntry }) {
  const first = group.items[0]
  const photo = group.items.map(shownPhoto).find(Boolean) ?? null
  const isFree = (i: BookingItem) => { const a = vm.availability(i); return !a || !a.text.startsWith('In use') }
  const free = group.items.filter(isFree).length
  const cap = first.capacity && group.items.every(i => i.capacity === first.capacity) ? first.capacity : null
  const where = first.location ?? first.place?.name ?? null
  return (
    <div className="v4-card v4-item v4-item--group">
      <ItemMedia photo={photo} category={first.category} badge={vm.now ? (free === 0 ? 'All in use now' : `${free} of ${group.items.length} free now`) : null} busy={free === 0} />
      <div className="v4-item__body">
        <b>{group.title}</b>
        <small>{[`${group.items.length} ${group.unit}s`, cap ? `${cap} ${cap === 1 ? 'person' : 'people'} each` : null, where].filter(Boolean).join(' · ')}</small>
        <div className="v4-unitpick" role="group" aria-label={`Pick a ${group.unit}`}>
        {group.items.map(i => (
          <button key={i.id} type="button" className={`v4-unit${isFree(i) ? '' : ' v4-unit--busy'}`} onClick={() => vm.open(i.id)}
            title={vm.availability(i)?.text ?? i.name}>
            {/* "Bed 3" inside Dorm 1; just the number when the card's title already says what they are (Private Rooms 1–9) */}
            {group.plain ? numbered(i.name)![2] : `${group.unit[0].toUpperCase()}${group.unit.slice(1)} ${numbered(i.name)![2]}`}
          </button>
        ))}
      </div>
      </div>
    </div>
  )
}

function Browse({ vm, review = false }: { vm: BookingsV4Model; review?: boolean }) {
  // Places with nothing to book sit under Spaces, after the bookable things
  const q = vm.query.trim().toLowerCase()
  const around = (vm.category === null || vm.category === 'spaces') && !vm.tag
    ? vm.around.filter(p => !q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q))
    : []
  // Cards with a real photo first; a drawing standing in for one, or no picture at all, goes last (v4.116.0)
  const entries = groupItems(vm.shown)
  const real = (e: BrowseEntry) => e.kind === 'group'
    ? e.items.some(i => shownPhoto(i) && !i.photo_drawn)
    : !!shownPhoto(e.item) && !e.item.photo_drawn
  // Under the review, whoever can manage a thing has an Edit button on its photo (decision #43)
  const withEdit = (key: string, card: React.ReactNode, items: BookingItem[], label: string) => {
    const mine = review ? items.filter(vm.canManage) : []
    return mine.length ? <div key={key} className="spr-cardwrap">{card}<PhotoEdit items={mine} label={label} onEdit={vm.edit} /></div> : card
  }
  const itemCard = (entry: BrowseEntry) => {
    if (entry.kind === 'group') return withEdit(entry.key, <GroupCard key={entry.key} vm={vm} group={entry} />, entry.items, entry.title)
    const item = entry.item
    const avail = vm.availability(item)
    return withEdit(item.id, (
      <button key={item.id} type="button" className="v4-card v4-card--link v4-item" onClick={() => vm.open(item.id)}>
        <ItemMedia photo={shownPhoto(item)} category={item.category} badge={avail?.text} busy={avail?.text.startsWith('In use')} />
        <span className="v4-item__body">
          <b>{item.name}</b>
          <small>{[CATEGORY_META[item.category].label, item.location ?? (item.place?.name !== item.name ? item.place?.name : null), item.capacity ? `${item.capacity} ${item.capacity === 1 ? 'person' : 'people'}` : null].filter(Boolean).join(' · ')}</small>
          {(item.tags.length > 0 || item.requires_approval) && (
            <span className="v4-tags">
              {item.requires_approval && <Tag icon="hand">Needs approval</Tag>}
              {item.tags.slice(0, 3).map(t => <Tag key={t}>{DESIGN_REVIEW ? tagLabel(t) : t}</Tag>)}
            </span>
          )}
        </span>
      </button>
    ), [item], item.name)
  }
  const placeCard = (p: AroundPlace) => {
    const meta = KIND_META[isKind(p.kind) ? p.kind : 'other']
    return (
      <Link key={p.slug} href={`/map?place=${encodeURIComponent(p.slug)}`} className="v4-card v4-card--link v4-item">
        <span className="v4-item__media">
          {p.photo_url
            ? <img src={p.photo_url} alt="" loading="lazy" />
            : <span className={`v4-item__ph v4-tile--${meta.tone}`}><Icon name={meta.icon} size={34} /></span>}
        </span>
        <span className="v4-item__body">
          <b>{p.name}</b>
          <small>{meta.label} · on the map</small>
          {p.description && <span className="v4-item__text">{p.description}</span>}
        </span>
      </Link>
    )
  }
  return (
    <>
      {!review && <div className="v4-toolbar">
        {vm.categories.length > 1 && (
          <ChipRow>
            <Chip on={vm.category === null} onClick={() => { vm.setCategory(null); vm.setTag(null) }}>All</Chip>
            {vm.categories.map(c => (
              <Chip key={c} on={vm.category === c} onClick={() => { vm.setCategory(c); vm.setTag(null) }}
                count={vm.activeItems.filter(i => i.category === c).length + (c === 'spaces' ? vm.around.length : 0)}>{CATEGORY_META[c].label}</Chip>
            ))}
          </ChipRow>
        )}
        <span className="v4-toolbar__end">
          <label className="v4-search">
            <Icon name="search" size={16} />
            <input value={vm.query} onChange={e => vm.setQuery(e.target.value)} placeholder="Search" aria-label="Search the inventory" />
          </label>
        </span>
      </div>}
      {!review && vm.tagsHere.length > 0 && (
        <div className="v4-tags v4-tags--filter">
          {vm.tagsHere.map(t => (
            <button key={t} type="button" className={`v4-tag${vm.tag === t ? ' v4-tag--on' : ''}`} aria-pressed={vm.tag === t} onClick={() => vm.setTag(vm.tag === t ? null : t)}>{t}</button>
          ))}
        </div>
      )}

      {vm.shown.length === 0 && around.length === 0 ? (
        <EmptyState
          icon="box"
          title={vm.activeItems.length === 0 ? 'The inventory is empty' : 'Nothing matches that filter'}
          text={vm.activeItems.length === 0
            ? vm.isManager ? 'Add the first room, tool or space with “Add item”.' : 'Admins and circle leads add rooms, tools and spaces here.'
            : DESIGN_REVIEW ? 'Try another kind or tag in Filter, or clear the search.' : 'Try another category or clear the search.'}
        />
      ) : (
        <div className="v4-grid v4-grid--gallery">
          {entries.filter(real).map(itemCard)}
          {around.filter(p => !p.photo_drawn).map(placeCard)}
          {entries.filter(e => !real(e)).map(itemCard)}
          {around.filter(p => p.photo_drawn).map(placeCard)}
        </div>
      )}
    </>
  )
}

/* ─── My bookings ────────────────────────────────────────────────── */

function BookingRow({ vm, b, actions }: { vm: BookingsV4Model; b: Booking; actions?: React.ReactNode }) {
  const item = vm.itemById.get(b.item_id)
  const ci = item ? CATEGORY_ICON[item.category] : { icon: 'box' as IconName, tone: 'blue' as const }
  const meta = [item && vm.now ? fmtBookingRange(b, item.category) : null, b.user_id !== vm.userId ? personName(b.person) : null, b.note ? `“${b.note}”` : null]
    .filter(Boolean).join(' · ')
  return (
    <ListRow
      lead={<IconTile name={ci.icon} tone={ci.tone} />}
      title={item?.name ?? 'Removed item'}
      meta={meta}
      onClick={item && !actions ? () => vm.open(item.id) : undefined}
      trail={<><StatusPill status={STATUS_PILL[b.status]} label={STATUS_META[b.status].label} />{actions}</>}
    />
  )
}

function Mine({ vm }: { vm: BookingsV4Model }) {
  return (
    <>
      <SectionHead title="Upcoming" />
      {vm.myUpcoming.length === 0 ? (
        <EmptyState icon="calendar" title="No upcoming bookings" text={`Book a room, a tool or a space from ${DESIGN_REVIEW ? 'Places' : 'Browse'}.`} />
      ) : (
        <List>
          {vm.myUpcoming.map(b => (
            <BookingRow key={b.id} vm={vm} b={b} actions={<Button size="sm" variant="secondary" onClick={() => vm.setStatus(b, 'cancelled', 'Booking cancelled')}>Cancel</Button>} />
          ))}
        </List>
      )}
      {vm.myPast.length > 0 && (
        <>
          <SectionHead title="Past and cancelled" />
          <div className="v4-faded"><List>{vm.myPast.map(b => <BookingRow key={b.id} vm={vm} b={b} />)}</List></div>
        </>
      )}
    </>
  )
}

/* ─── Requests and inventory (Manage, Admin › Bookings) ──────────── */

function Requests({ vm }: { vm: BookingsV4Model }) {
  return (
    <>
      <SectionHead title={`Requests waiting for you · ${vm.pending.length}`} />
      {vm.pending.length === 0 ? (
        <EmptyState icon="inbox" title="No requests waiting" text="When someone books something that needs approval, it shows here." />
      ) : (
        <List>
          {vm.pending.map(b => (
            <BookingRow key={b.id} vm={vm} b={b} actions={
              <>
                <Button size="sm" variant="secondary" onClick={() => vm.setStatus(b, 'declined', 'Request declined')}>Decline</Button>
                <Button size="sm" onClick={() => vm.setStatus(b, 'confirmed', 'Booking approved')}>Approve</Button>
              </>
            } />
          ))}
        </List>
      )}
    </>
  )
}

function Inventory({ vm }: { vm: BookingsV4Model }) {
  const mine = vm.scopeItems
    .filter(i => canManageItem(i, vm.userId, vm.role, vm.leadCircles))
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  return (
    <>
      <SectionHead title="Inventory you can manage" />
      {mine.length === 0 ? (
        <EmptyState icon="box" title="Nothing to manage yet" text="Add a room, a tool or a space with “Add item”." />
      ) : (
        <List>
          {mine.map(i => {
            const ci = CATEGORY_ICON[i.category]
            return (
              <ListRow key={i.id}
                lead={<IconTile name={ci.icon} tone={i.is_active ? ci.tone : 'grey'} off={!i.is_active} />}
                title={i.name}
                meta={[CATEGORY_META[i.category].label, i.is_active ? null : 'Archived', ...(DESIGN_REVIEW ? i.tags.map(tagLabel) : i.tags)].filter(Boolean).join(' · ')}
                trail={<>
                  <Button size="sm" variant="quiet" onClick={() => vm.open(i.id)}>Open</Button>
                  <Button size="sm" variant="secondary" onClick={() => vm.edit(i)}>Edit</Button>
                  <Button size="sm" variant={i.is_active ? 'danger' : 'secondary'} onClick={() => vm.toggleActive(i)}>{i.is_active ? 'Archive' : 'Restore'}</Button>
                </>}
              />
            )
          })}
        </List>
      )}
    </>
  )
}

/* ─── Calendar: who stays where (Admin › Bookings) ───────────────── */

const DAY = 86400000
/** Days before today in the strip, and the least it shows after today; it grows to reach the last booking */
const DAYS_BACK = 14
const DAYS_AHEAD = 56
const DAYS_MAX = 400
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

function BookingsCalendar({ vm }: { vm: BookingsV4Model }) {
  // One long strip of days that scrolls sideways (v4.112.0); it opens on today
  const scroller = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ first: DAYS_BACK, count: 14 })
  const measure = () => {
    const el = scroller.current
    const day = el?.querySelector<HTMLElement>('.v4-cal__day')
    const name = el?.querySelector<HTMLElement>('.v4-cal__name')
    if (!el || !day || !name) return null
    return { el, w: day.offsetWidth, nameW: name.offsetWidth }
  }
  const sync = () => {
    const m = measure()
    if (!m || !m.w) return
    const first = Math.round(m.el.scrollLeft / m.w)
    const count = Math.max(1, Math.floor((m.el.clientWidth - m.nameW) / m.w))
    setView(v => (v.first === first && v.count === count ? v : { first, count }))
  }
  const goTo = (idx: number, smooth = true) => {
    const m = measure()
    if (m) m.el.scrollTo({ left: Math.max(0, idx) * m.w, behavior: smooth ? 'smooth' : 'auto' })
  }
  const ready = !!vm.now
  useLayoutEffect(() => {
    if (!ready) return
    goTo(DAYS_BACK, false)
    // Fires once when it starts watching, then whenever the calendar's width changes
    const ro = new ResizeObserver(sync)
    if (scroller.current) ro.observe(scroller.current)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])
  if (!vm.now) return null
  const today = startOfDay(vm.now)
  const live = vm.bookings.filter(b => b.status === 'confirmed' || b.status === 'pending')
  const lastEnd = live.reduce((t, b) => Math.max(t, new Date(b.ends_at).getTime()), 0)
  const DAYS = Math.min(DAYS_MAX, DAYS_BACK + Math.max(DAYS_AHEAD, Math.ceil((lastEnd - today.getTime()) / DAY) + 7))
  // By calendar date, not by adding 24 hours, so a clock change can't shift a column
  const days = Array.from({ length: DAYS }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - DAYS_BACK + i))
  const from = days[0]
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() - DAYS_BACK + DAYS)
  const inWindow = live.filter(b => new Date(b.starts_at) < to && new Date(b.ends_at) > from)
  // Rooms first (who stays where), then any tool or space booked in these days
  const rows = vm.scopeItems
    .filter(i => i.is_active && (i.category === 'accommodation' || inWindow.some(b => b.item_id === i.id)))
    .sort((a, b) => Number(b.category === 'accommodation') - Number(a.category === 'accommodation') || a.name.localeCompare(b.name))
  const col = (iso: string, end: boolean) => {
    const t = new Date(iso).getTime() - from.getTime()
    const idx = end ? Math.ceil(t / DAY) : Math.floor(t / DAY)
    return Math.min(DAYS, Math.max(0, idx)) + 1
  }
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-GB', o)
  const staying = inWindow.filter(b => vm.itemById.get(b.item_id)?.category === 'accommodation' && new Date(b.starts_at) <= vm.now! && new Date(b.ends_at) > vm.now!)
  const first = Math.min(view.first, DAYS - 1)
  const last = Math.min(first + view.count - 1, DAYS - 1)
  const onToday = first <= DAYS_BACK && last >= DAYS_BACK

  return (
    <>
      <div className="v4-sec">
        <h2>{fmt(days[first], { day: 'numeric', month: 'short' })} – {fmt(days[last], { day: 'numeric', month: 'short' })} · {staying.length} staying tonight</h2>
        <span className="v4-ph__actions">
          <Button size="sm" variant="secondary" icon="left" disabled={first === 0} onClick={() => goTo(first - 7)}>Earlier</Button>
          {!onToday && <Button size="sm" variant="secondary" onClick={() => goTo(DAYS_BACK)}>Today</Button>}
          <Button size="sm" variant="secondary" disabled={last >= DAYS - 1} onClick={() => goTo(first + 7)}>Later →</Button>
        </span>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="bed" title="Nothing to show yet" text="Add rooms to the inventory and their stays show here, day by day." />
      ) : (
        <div className="v4-cal" ref={scroller} onScroll={sync} tabIndex={0} role="region" aria-label="Who stays where, day by day. Scroll sideways for more dates." style={{ ['--days' as string]: DAYS }}>
          <div className="v4-cal__row v4-cal__row--head">
            <span className="v4-cal__name" />
            <div className="v4-cal__days">
              {days.map(d => (
                <span key={d.toISOString()} className={`v4-cal__day${d.getTime() === today.getTime() ? ' v4-cal__day--today' : ''}${[0, 6].includes(d.getDay()) ? ' v4-cal__day--we' : ''}${d.getDate() === 1 ? ' v4-cal__day--month' : ''}`}>
                  <small>{d.getDate() === 1 ? fmt(d, { month: 'short' }) : fmt(d, { weekday: 'short' })}</small><b>{d.getDate()}</b>
                </span>
              ))}
            </div>
          </div>
          {rows.map(item => {
            const ci = CATEGORY_ICON[item.category]
            return (
              <div key={item.id} className="v4-cal__row">
                <button type="button" className="v4-cal__name" onClick={() => vm.open(item.id)}>
                  <IconTile name={ci.icon} tone={ci.tone} /><span>{item.name}</span>
                </button>
                <div className="v4-cal__days">
                  {/* Each cell names its column: left to the grid, cells slide past the columns a stay covers and weekends shade the wrong days */}
                  {days.map((d, i) => <span key={d.toISOString()} style={{ gridColumn: i + 1 }} className={`v4-cal__cell${[0, 6].includes(d.getDay()) ? ' v4-cal__day--we' : ''}`} />)}
                  {inWindow.filter(b => b.item_id === item.id).map(b => (
                    <span key={b.id} className={`v4-cal__bar v4-cal__bar--${b.status}`}
                      style={{ gridColumn: `${col(b.starts_at, false)} / ${col(b.ends_at, true)}` }}
                      title={`${personName(b.person)} · ${fmtBookingRange(b, item.category)} · ${STATUS_META[b.status].label}`}>
                      <span>{personName(b.person)}{b.status === 'pending' ? ' · waiting' : ''}</span>
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/* ─── Map editor (Admin › Bookings › Map) ────────────────────────── */

function MapEditor({ vm }: { vm: BookingsV4Model }) {
  const [placingId, setPlacingId] = useState<string | null>(null)
  const mine = vm.scopeItems.filter(i => i.is_active && vm.canManage(i))
    .sort((a, b) => Number(a.map_x != null) - Number(b.map_x != null) || a.name.localeCompare(b.name))
  const placing = mine.find(i => i.id === placingId) ?? null
  const upload = (
    <label className="v4-btn v4-btn--secondary v4-btn--sm">
      <Icon name="upload" size={14} /><span>{vm.mapUrl ? 'Replace picture' : 'Upload a picture of the land'}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; if (f) vm.setMapPicture(f); e.target.value = '' }} />
    </label>
  )

  if (!vm.mapUrl) {
    return vm.isAdmin ? (
      <Card className="v4-mapempty">
        <IconTile name="map" tone="green" />
        <div><b>No map yet</b><p className="v4-hint">Upload an aerial photo or a drawn plan of the land. Then put each room, tool and space on it, and members see where everything is.</p></div>
        {upload}
      </Card>
    ) : <EmptyState icon="map" title="No map yet" text="An admin adds a picture of the land here; then you can put your rooms, tools and spaces on it." />
  }

  return (
    <>
      <div className="v4-sec">
        <h2>{placing ? <>Click where <em>{placing.name}</em> is</> : `${mine.filter(i => i.map_x != null).length} of ${mine.length} on the map`}</h2>
        <span className="v4-ph__actions">
          {placing ? <Button size="sm" variant="secondary" onClick={() => setPlacingId(null)}>Cancel</Button> : vm.isAdmin && (
            <>{upload}<Button size="sm" variant="quiet" onClick={() => { if (confirm('Remove the map picture? The pins stay saved.')) vm.setMapPicture(null) }}>Remove picture</Button></>
          )}
        </span>
      </div>
      <div className="v4-mapedit">
        <AmenitiesMap url={vm.mapUrl} items={vm.scopeItems.filter(i => i.is_active)} onOpen={vm.open} selectedId={placingId}
          placing={placing} onPlace={(x, y) => { if (placing) { vm.setPin(placing, x, y); setPlacingId(null) } }} />
        <List>
          {mine.length === 0 && <ListRow title="Nothing you can place yet" meta="Add rooms, tools and spaces in Inventory." />}
          {mine.map(i => {
            const ci = CATEGORY_ICON[i.category]
            const on = i.map_x != null
            return (
              <ListRow key={i.id}
                lead={<IconTile name={ci.icon} tone={on ? ci.tone : 'grey'} off={!on} />}
                title={i.name}
                meta={on ? 'On the map' : 'Not on the map'}
                trail={<>
                  <Button size="sm" variant={placingId === i.id ? 'primary' : 'secondary'} onClick={() => setPlacingId(placingId === i.id ? null : i.id)}>{on ? 'Move' : 'Place'}</Button>
                  {on && <Button size="sm" variant="quiet" onClick={() => vm.setPin(i, null, null)}>Remove</Button>}
                </>}
              />
            )
          })}
        </List>
      </div>
    </>
  )
}
