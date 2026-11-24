'use client'
import { COMMUNITY_NAME, DESIGN_REVIEW } from '@/core/lib/instance'
import { CircleSeal } from '@/core/components/v4/CircleSeal'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import { CircleLeadName } from '@/core/components/CircleLeadName'
import { AddCircleButton } from '@/modules/m04-blueprint/AddCircleButton'
import { PmLink } from '@/modules/m07-ops/PmLink'
import { Button, Chip, Icon, PageHeader, SectionHead, StatusPill, Tag, statusFromDb } from '@/core/components/v4'
import type { CircleSlug } from '@/core/lib/circles'
import type { CircleDirectory, PersonRef } from '@/core/lib/ops-permissions'
import type { OrgMember, OrgPerson, OrgUnit } from './types'
import type { JoinRequest } from './JoinRequests'
import type { CircleExtras, CircleTask } from './lib/circle-extras'
import { AddCircleMember } from './AddCircleMember'
import { canEditUnit, canLeadCircle } from './lib/org'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { isActiveProject } from '@/core/lib/project-status'
import './circles-v4.css'

export type CircleProject = { id: string; title: string; status: string; circle: string | null }

type Props = {
  units: OrgUnit[]
  members: OrgMember[]
  directory: CircleDirectory
  people: OrgPerson[]
  userId: string | null
  role: string
  leadCircles: string[]
  meetingCounts?: Record<string, number> | null
  pmCounts?: Record<string, number>
  requests: JoinRequest[]
  teamProjects: { id: string; title: string; team_id: string }[]
  projects: CircleProject[]
  extras?: CircleExtras
  onEdit: (unit: OrgUnit | null, circle: CircleSlug) => void
  onMemberAdded: (m: OrgMember, circleLabel: string) => void
  onDecided: (id: string, approved: boolean) => void
}

type Person = { id: string; name: string; username: string | null; lead: boolean; title: string | null }

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'guides', label: 'Manuals & guides' },
  { key: 'people', label: 'People' },
  { key: 'subcircles', label: 'Subcircles' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'meetings', label: 'Meetings' },
] as const
type TabKey = typeof TABS[number]['key']

const initial = (name: string) => name.trim().slice(0, 1).toUpperCase() || '?'
const first = (name: string) => name.split(' ')[0]
/** The first sentence of a purpose, for the card */
const firstSentence = (s: string) => {
  const t = s.replace(/\s+/g, ' ').trim()
  const m = t.match(/^.+?[.!?](?=\s|$)/)
  const out = m ? m[0] : t
  return out.length > 160 ? `${out.slice(0, 157).trimEnd()}…` : out
}
const day = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Where you are, and the way back (v4.108.0): Circles › a circle › a subcircle. The last is where you are. */
function Crumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  const router = useRouter()
  return (
    <nav className="cv4-crumbs" aria-label="Breadcrumb">
      {trail.map((x, i) => (
        <span key={i} className="cv4-crumbs__item">
          {i > 0 && <Icon name="right" size={12} className="cv4-crumbs__sep" />}
          {x.href ? <Link href={x.href} onClick={e => { if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); router.push(x.href!) } }}>{x.label}</Link> : <b aria-current="page">{x.label}</b>}
        </span>
      ))}
    </nav>
  )
}
/** A subcircle's page */
const subHref = (c: string, teamId: string) => `/circles?c=${encodeURIComponent(c)}&t=${teamId}`

function Av({ name, url, color, size }: { name: string; url?: string; color?: string; size?: 'lg' }) {
  const cls = `v4-avatar cv4-av${size === 'lg' ? ' cv4-av--lg' : ''}`
  if (url) return <img className={cls} src={url} alt="" title={name} loading="lazy" />
  return <span className={cls} title={name} style={color ? { background: `color-mix(in srgb, ${color} 22%, #fff)`, color: 'var(--ink, #111317)' } : undefined}>{initial(name)}</span>
}

/**
 * Circles in the v4 look (Sonia's prototype, pCircles / pCircle; restructured in v4.63.0). /circles shows every
 * circle at a glance: its purpose in one sentence, its lead, its members' photos, its open tasks and meetings.
 * A circle's page (/circles?c=slug, ?tab=…) has tabs: Overview, Manuals & guides, People, Tasks, Meetings.
 * Everything the classic org chart lets people do is still here: Edit, + Add subcircle, + Add member, ask to join,
 * accept or decline, the lead name, meeting notes and the project manager.
 */
export default function CirclesV4(p: Props) {
  const circles = useCircles()
  const params = useSearchParams()
  const open = params.get('c')
  // A subcircle's own page (v4.108.0): /circles?c=<circle>&t=<subcircle>
  const sub = params.get('t')
  if (open && circles.has(open) && sub && p.units.some(u => u.id === sub && u.kind === 'team' && u.circle === open)) return <SubcirclePage key={sub} {...p} slug={open} teamId={sub} />
  if (open && circles.has(open)) return <CirclePage key={open} {...p} slug={open} />
  return <CircleCards {...p} />
}

function useCircleFacts(p: Props) {
  const ex = p.extras
  const circleUnit = (c: string) => p.units.find(u => u.kind === 'circle' && u.circle === c)
  const teamsOf = (c: string) => p.units.filter(u => u.kind === 'team' && u.circle === c).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  const membersOf = (unitId: string) => p.members.filter(m => m.unit_id === unitId && m.person)
    .sort((a, b) => (a.role === b.role ? (a.person?.name ?? '').localeCompare(b.person?.name ?? '') : a.role === 'lead' ? -1 : 1))
  /** Leads first (from the directory), then the circle's members, each person once. */
  const peopleOf = (c: string): Person[] => {
    const cu = circleUnit(c)
    const leads: PersonRef[] = p.directory.leads[c] ?? []
    const out: Person[] = leads.map(l => ({ ...l, lead: true, title: null }))
    for (const m of cu ? membersOf(cu.id) : []) {
      if (!out.some(o => o.id === m.user_id)) out.push({ ...m.person!, lead: m.role === 'lead', title: m.title })
    }
    return out
  }
  const inCircle = (c: string) => !!p.userId && (canLeadCircle(c, p.role, p.leadCircles) && p.role !== 'admin' || peopleOf(c).some(x => x.id === p.userId)
    || teamsOf(c).some(t => p.members.some(m => m.unit_id === t.id && m.user_id === p.userId)))
  const avatar = (id: string) => ex?.avatars[id]
  const tasksOf = (c: string) => (ex?.tasks ?? []).filter(t => t.circle === c)
  const upcomingOf = (c: string) => (ex?.upcoming ?? []).filter(e => e.circle === c)
  const meetingsOf = (c: string) => (ex?.meetings ?? []).filter(m => m.circle === c)
  return { circleUnit, teamsOf, membersOf, peopleOf, inCircle, avatar, tasksOf, upcomingOf, meetingsOf }
}

/* ─── /circles: every circle at a glance ──────────────────────────────────── */

function CircleCards(p: Props) {
  const circles = useCircles()
  const router = useRouter()
  const f = useCircleFacts(p)
  // The subcircles bubble on a card, open (v4.104.0): pick one to go to it, or add one
  const [subsOf, setSubsOf] = useState<string | null>(null)
  useEffect(() => {
    if (!subsOf) return
    const close = (e: Event) => { if (!(e.target as HTMLElement).closest?.('.cv4-subpick')) setSubsOf(null) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSubsOf(null) }
    document.addEventListener('click', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', esc) }
  }, [subsOf])
  const steward = circles.list.find(c => c.is_steward) ?? null
  const order = [...(steward ? [steward.slug] : []), ...circles.slugs.filter(c => c !== steward?.slug)]
  const mine = order.filter(f.inCircle)
  const signedIn = !!p.userId

  return (
    <div className="v4-page v4-page--wide cv4">
      <PageHeader
        eyebrow="Community"
        title="Circles"
        subtitle={<>A circle looks after one area of community life. Subcircles are smaller groups inside a circle.{!DESIGN_REVIEW && mine.length > 0 && <> You’re in <b>{mine.map(c => circles.meta(c).label).join(', ')}</b>.</>}</>}
        actions={p.role === 'admin' ? <AddCircleButton /> : undefined}
      />

      <div className="cv4-cards">
        {order.map(c => {
          const meta = circles.meta(c)
          const cu = f.circleUnit(c)
          const ppl = f.peopleOf(c)
          const leads = ppl.filter(x => x.lead)
          const others = ppl.filter(x => !x.lead)
          const leadName = circles.get(c)?.leads_to_assign
          const teams = f.teamsOf(c)
          const asking = p.requests.filter(r => r.circle === c).length
          const tasks = p.projects.filter(x => x.circle === c && isActiveProject(x.status)).length + f.tasksOf(c).filter(t => !t.project_id).length
          const next = f.upcomingOf(c)[0]
          const notes = p.meetingCounts?.[c] ?? f.meetingsOf(c).length
          return (
            <Link key={c} href={`/circles?c=${encodeURIComponent(c)}`} className="v4-card v4-card--link cv4-card" style={{ ['--c' as string]: meta.color }}>
              <div className="cv4-card__top">
                <CircleSeal slug={c} size={40} className="cv4-seal" />
                <div className="cv4-card__name">
                  <b>{meta.label}</b>
                  <small>{c === steward?.slug ? 'Looks after every circle' : 'Circle'}</small>
                </div>
                <span className="v4-tags cv4-card__tags">
                  {asking > 0 && <Tag icon="hand">{asking} asking</Tag>}
                  {f.inCircle(c) && <Tag icon="check">You’re in it</Tag>}
                </span>
              </div>

              {cu?.description ? <p className="cv4-about">{firstSentence(cu.description)}</p> : <p className="cv4-about v4-hint">No purpose written yet.</p>}

              <div className="cv4-facts">
                <div className="cv4-fact">
                  <small>Lead</small>
                  {leads.length ? (
                    <span className="cv4-lead">
                      <span className="cv4-avs">{leads.slice(0, 3).map(x => <Av key={x.id} name={x.name} url={f.avatar(x.id)} color={meta.color} />)}</span>
                      <span>{leads.map(l => first(l.name)).join(', ')}</span>
                    </span>
                  ) : <span className="cv4-muted">{leadName ? `${leadName} (not on MyCoNet yet)` : 'No lead yet'}</span>}
                </div>
                <div className="cv4-fact">
                  <small>Members</small>
                  {ppl.length ? (
                    <span className="cv4-lead">
                      <span className="cv4-avs">
                        {ppl.slice(0, 8).map(x => <Av key={x.id} name={x.name} url={f.avatar(x.id)} color={meta.color} />)}
                        {ppl.length > 8 && <span className="v4-avatar cv4-av cv4-more">+{ppl.length - 8}</span>}
                      </span>
                      <span className="cv4-muted">{ppl.length}{others.length ? '' : ppl.length === 1 ? ' · the lead' : ' · all leads'}</span>
                    </span>
                  ) : <span className="cv4-muted">No one yet</span>}
                </div>
              </div>

              {/* How many subcircles, for everyone (v4.104.0: Oscar wanted the number on each circle); tasks and meetings when signed in */}
              <div className="cv4-stats">
                {(() => {
                  const label = <><Icon name="circles" size={15} /><b>{teams.length}</b> {teams.length === 1 ? 'subcircle' : 'subcircles'}</>
                  const mayAdd = canLeadCircle(c, p.role, p.leadCircles)
                  // Design review: "0 subcircles" on every card says nothing; leave it out
                  if (!teams.length && !mayAdd) return DESIGN_REVIEW ? null : <span className="cv4-stat">{label}</span>
                  // Inside the card's link: these are buttons that stop the card from opening, and go where they say
                  const goTo = (e: React.MouseEvent, href: string) => { e.preventDefault(); e.stopPropagation(); setSubsOf(null); router.push(href) }
                  const base = `/circles?c=${encodeURIComponent(c)}&tab=subcircles`
                  return (
                    <span className="cv4-subpick">
                      <button type="button" className="cv4-stat cv4-stat--btn" aria-expanded={subsOf === c} aria-haspopup="menu"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setSubsOf(subsOf === c ? null : c) }}>
                        {label}<Icon name="down" size={13} />
                      </button>
                      {subsOf === c && (
                        <span className="cv4-subpick__menu" role="menu">
                          {teams.map(t => (
                            <button key={t.id} type="button" role="menuitem" className="cv4-subpick__item" onClick={e => goTo(e, subHref(c, t.id))}>
                              <span>{t.name}</span><small>{plural(f.membersOf(t.id).length, 'person', 'people')}</small>
                            </button>
                          ))}
                          {!teams.length && <span className="cv4-subpick__empty">No subcircles yet</span>}
                          {mayAdd && (
                            <button type="button" role="menuitem" className="cv4-subpick__item cv4-subpick__add" onClick={e => goTo(e, `${base}&add=1`)}>
                              <Icon name="plus" size={14} /><span>Add a subcircle</span>
                            </button>
                          )}
                        </span>
                      )}
                    </span>
                  )
                })()}
                {signedIn && <>
                  <span className="cv4-stat"><Icon name="tasks" size={15} /><b>{tasks}</b> open {tasks === 1 ? 'task' : 'tasks'}</span>
                  <span className="cv4-stat"><Icon name="calendar" size={15} /><b>{notes}</b> {notes === 1 ? 'meeting' : 'meetings'}{next && <em suppressHydrationWarning> · next {day(next.starts_at)}</em>}</span>
                </>}
              </div>
            </Link>
          )
        })}
      </div>

      {p.directory.admins.length > 0 && (
        <>
          <SectionHead title="Admins" />
          <div className="v4-list cv4-admins">
            {p.directory.admins.map(a => (
              <Link key={a.id} href={a.username ? `/u/${a.username}` : '#'} className="v4-row v4-row--click">
                <span className="v4-row__lead"><Av name={a.name} url={f.avatar(a.id)} /></span>
                <span className="v4-row__main"><b>{a.name}{a.id === p.userId ? ' (you)' : ''}</b><small>Admin · looks after every circle</small></span>
              </Link>
            ))}
          </div>
        </>
      )}

      <p className="v4-hint v4-mt">
        Admins edit everything. Circle leads edit their circle and its subcircles; subcircle leads edit their own subcircle.
        {!p.userId && <> <Link href="/auth/login">Sign in</Link> if you lead something.</>}
      </p>
    </div>
  )
}

/* ─── /circles?c=slug: one circle, in tabs ────────────────────────────────── */

function CirclePage(p: Props & { slug: string }) {
  const circles = useCircles()
  const params = useSearchParams()
  const f = useCircleFacts(p)
  const c = p.slug
  const meta = circles.meta(c)
  const cu = f.circleUnit(c)
  const ppl = f.peopleOf(c)
  const leads = ppl.filter(x => x.lead)
  const teams = f.teamsOf(c)
  const manage = canLeadCircle(c, p.role, p.leadCircles)
  const inIt = f.inCircle(c)
  const reqs = p.requests.filter(r => r.circle === c)
  const projects = p.projects.filter(x => x.circle === c)
  // Words (LEXICON, 20 Nov): what the database calls a project is a *task* on screen, and its deliverables are
  // its *subtasks*; a deliverable with no project is a task of its own.
  const tasks = f.tasksOf(c)
  const ownTasks = tasks.filter(t => !t.project_id)
  const subtasks = tasks.filter(t => t.project_id)
  const projectsSorted = [...projects].sort((a, b) => Number(isActiveProject(b.status)) - Number(isActiveProject(a.status)))
  const openCount = projects.filter(x => isActiveProject(x.status)).length + ownTasks.length
  const taskItems = [...projectsSorted.map(x => ({ kind: 'p' as const, x })), ...ownTasks.map(t => ({ kind: 't' as const, t }))]
  const upcoming = f.upcomingOf(c)
  const notes = f.meetingsOf(c)
  const notesCount = p.meetingCounts?.[c] ?? notes.length
  const steward = circles.list.find(x => x.is_steward)
  const leadName = circles.get(c)?.leads_to_assign
  const signedIn = !!p.userId

  const asked0 = params.get('tab')
  const [tab, setTab] = useState<TabKey>(TABS.some(t => t.key === asked0) ? asked0 as TabKey : 'overview')
  // Each tab has its own address (?c=…&tab=…) without asking the server again
  function go(t: TabKey) {
    setTab(t)
    const q = new URLSearchParams(window.location.search)
    if (t === 'overview') q.delete('tab'); else q.set('tab', t)
    window.history.replaceState(null, '', `/circles?${q.toString()}`)
  }

  // From a card's subcircles bubble (v4.104.0): ?sub=<id> scrolls to that subcircle and marks it; ?add=1 opens
  // "Add subcircle" for those who may. Both leave the address once used.
  const picked = params.get('sub')
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('add') === '1') {
      if (manage) p.onEdit(null, c)
      q.delete('add'); window.history.replaceState(null, '', `/circles?${q.toString()}`)
    }
    if (picked) document.getElementById(`sub-${picked}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  // Once, when the page opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Your own request to join this circle (members ask; leads answer)
  const [asked, setAsked] = useState<boolean | null>(null)
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!p.userId || inIt) return
    let live = true
    createClient().from('circle_join_requests').select('id').eq('user_id', p.userId).eq('circle', c).eq('status', 'pending')
      .then(({ data }) => { if (live) setAsked(!!data?.length) })
    return () => { live = false }
  }, [p.userId, c, inIt])

  async function ask() {
    if (!p.userId) return
    setBusy('ask'); setError('')
    const { error: e } = await createClient().from('circle_join_requests').insert({ circle: c, user_id: p.userId, note: note.trim() || null })
    setBusy(null)
    if (e) { setError(e.message); return }
    setAsked(true); setAsking(false); setNote('')
  }
  async function withdraw() {
    if (!p.userId) return
    setBusy('ask')
    await createClient().from('circle_join_requests').delete().eq('user_id', p.userId).eq('circle', c).eq('status', 'pending')
    setBusy(null); setAsked(false)
  }
  async function decide(r: JoinRequest, approve: boolean) {
    setBusy(r.id); setError('')
    const { error: e } = await createClient().rpc('decide_circle_join', { p_request: r.id, p_approve: approve })
    setBusy(null)
    if (e) { setError(e.message); return }
    p.onDecided(r.id, approve)
  }

  const joinAction = !p.userId ? null
    : inIt ? <Tag icon="check">You’re a member</Tag>
    // Asking to join a circle opens at joining member (decision #77)
    : !isJoiningOrAbove(p.role) ? <p className="v4-hint">Ask to join once you’ve joined {COMMUNITY_NAME}. <Link href="/join">Start joining</Link></p>
    : asked ? <Button variant="secondary" onClick={withdraw} disabled={busy === 'ask'}>Asked · withdraw</Button>
    : asked === false ? <Button onClick={() => setAsking(a => !a)}>Ask to join</Button>
    : null

  const counts: Partial<Record<TabKey, number>> = {
    guides: p.extras?.guides?.length, people: ppl.length, subcircles: teams.length, tasks: signedIn ? openCount : undefined, meetings: signedIn ? notesCount + upcoming.length : upcoming.length,
  }

  /* ── pieces shared by tabs ── */
  const taskRow = (t: CircleTask) => (
    <Link key={t.id} href={t.project_id ? `/operations/${t.project_id}` : `/operations?circle=${encodeURIComponent(c)}`} className="v4-row v4-row--click">
      <span className="v4-row__main">
        <b>{t.title}</b>
        <small suppressHydrationWarning>{[t.project_title ? `in ${t.project_title}` : null, t.assignee_id === p.userId ? 'you' : t.assignee_name, t.due_date ? `due ${day(t.due_date)}` : null].filter(Boolean).join(' · ') || 'Not assigned yet'}</small>
      </span>
      <span className="v4-row__trail"><StatusPill status={statusFromDb(t.status)} /></span>
    </Link>
  )
  const projectRow = (x: CircleProject) => (
    <Link key={x.id} href={`/operations/${x.id}`} className="v4-row v4-row--click">
      <span className="v4-row__main"><b>{x.title}</b>{signedIn && <small>{plural(subtasks.filter(t => t.project_id === x.id).length, 'open subtask')}</small>}</span>
      <span className="v4-row__trail"><StatusPill status={statusFromDb(x.status)} /></span>
    </Link>
  )
  const itemRow = (i: typeof taskItems[number]) => i.kind === 'p' ? projectRow(i.x) : taskRow(i.t)
  const eventRow = (e: typeof upcoming[number]) => (
    <Link key={e.id} href={`/calendar?event=${e.id}`} className="v4-row v4-row--click">
      <span className="v4-row__lead"><span className="cv4-date" suppressHydrationWarning><b suppressHydrationWarning>{new Date(e.starts_at).getDate()}</b><small suppressHydrationWarning>{new Date(e.starts_at).toLocaleDateString('en-GB', { month: 'short' })}</small></span></span>
      <span className="v4-row__main"><b>{e.title}</b><small suppressHydrationWarning>{[day(e.starts_at), e.all_day ? 'all day' : time(e.starts_at), e.location].filter(Boolean).join(' · ')}</small></span>
    </Link>
  )
  const subsOf = (id: string) => teams.filter(t => f.membersOf(t.id).some(m => m.user_id === id))
  const personCard = (x: Person) => {
    const subs = subsOf(x.id)
    return (
      <Link key={x.id} href={x.username ? `/u/${x.username}` : '#'} className="v4-card v4-card--link cv4-person">
        <Av name={x.name} url={f.avatar(x.id)} color={meta.color} size="lg" />
        <span className="cv4-person__main">
          <b>{x.name}{x.id === p.userId ? ' (you)' : ''}</b>
          <small>{x.lead ? 'Circle lead' : x.title || 'Member'}</small>
          {subs.length > 0 && <span className="cv4-person__subs">{subs.map(t => <span key={t.id} className="cv4-pill">{t.name}</span>)}</span>}
        </span>
      </Link>
    )
  }

  return (
    <div className="v4-page v4-page--wide cv4" style={{ ['--c' as string]: meta.color }}>
      <Crumbs trail={[{ label: 'Circles', href: '/circles' }, { label: meta.label }]} />
      <header className="v4-ph cv4-head">
        <div className="v4-ph__row">
          <div className="cv4-head__main">
            <CircleSeal slug={c} size={56} className="cv4-seal" />
            <div>
              <div className="v4-tags cv4-gap">
                <span className="v4-tag"><i className="cv4-dot" />{c === steward?.slug ? 'Stewards circle' : 'Circle'}</span>
                {manage && <Tag icon="shield">You can manage it</Tag>}
              </div>
              <h1 className="v4-ph__title">{meta.label}</h1>
              {cu?.description ? <p className="v4-ph__sub">{firstSentence(cu.description)}</p> : manage && <p className="v4-ph__sub">Add this circle’s purpose with Edit.</p>}
            </div>
          </div>
          <div className="v4-ph__actions">
            {manage && cu && <Button variant="secondary" icon="pencil" onClick={() => p.onEdit(cu, c)}>Edit</Button>}
            {joinAction}
          </div>
        </div>
      </header>

      {asking && (
        <div className="v4-card cv4-ask">
          <label className="v4-hint" htmlFor="cv4-note">A line for the {meta.label} leads (optional)</label>
          <div className="cv4-askrow">
            <input id="cv4-note" className="v4-input" value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Why you’d like to join" />
            <Button onClick={ask} disabled={busy === 'ask'}>{busy === 'ask' ? 'Sending…' : 'Send'}</Button>
          </div>
        </div>
      )}
      {error && <p className="cv4-err" role="alert">{error}</p>}

      <div className="v4-chiprow cv4-tabs" role="tablist">
        {TABS.map(t => <Chip key={t.key} on={tab === t.key} onClick={() => go(t.key)} count={counts[t.key] || undefined}>{t.label}</Chip>)}
      </div>

      {tab === 'overview' && (
        <>
          <div className="cv4-strip">
            <button type="button" className="v4-card cv4-tile" onClick={() => go('people')}>
              <small>Lead</small>
              {leads.length ? <span className="cv4-lead"><span className="cv4-avs">{leads.slice(0, 3).map(x => <Av key={x.id} name={x.name} url={f.avatar(x.id)} color={meta.color} />)}</span><b>{leads.map(l => first(l.name)).join(', ')}</b></span>
                : <b className="cv4-muted">{leadName ? `${leadName} (not on MyCoNet yet)` : 'No lead yet'}</b>}
            </button>
            <button type="button" className="v4-card cv4-tile" onClick={() => go('people')}>
              <small>Members</small>
              <span className="cv4-lead"><b className="cv4-num">{ppl.length}</b><span className="cv4-avs">{ppl.slice(0, 6).map(x => <Av key={x.id} name={x.name} url={f.avatar(x.id)} color={meta.color} />)}</span></span>
            </button>
            {signedIn && (
              <button type="button" className="v4-card cv4-tile" onClick={() => go('tasks')}>
                <small>Open tasks</small><b className="cv4-num">{openCount}</b>
              </button>
            )}
            <button type="button" className="v4-card cv4-tile" onClick={() => go('meetings')}>
              <small>Next meeting</small>
              {upcoming[0] ? <b suppressHydrationWarning>{day(upcoming[0].starts_at)}{!upcoming[0].all_day && <span className="cv4-muted" suppressHydrationWarning> · {time(upcoming[0].starts_at)}</span>}</b> : <b className="cv4-muted">None planned</b>}
            </button>
          </div>

          {manage && reqs.length > 0 && (
            <button type="button" className="v4-card cv4-notice" onClick={() => go('people')}>
              <Icon name="hand" size={16} /><span><b>{plural(reqs.length, 'person', 'people')} asking to join</b> · answer them in People</span><Icon name="right" size={14} />
            </button>
          )}

          <div className="cv4-split">
            <div>
              <div className="v4-sec"><h2>Tasks</h2><button type="button" className="cv4-link no-min-height" onClick={() => go('tasks')}>All tasks →</button></div>
              {!signedIn ? <p className="v4-hint"><Link href="/auth/login">Sign in</Link> to see this circle’s tasks.</p>
                : taskItems.length ? <div className="v4-list">{taskItems.slice(0, 4).map(itemRow)}</div> : <p className="v4-hint">No open tasks.</p>}
            </div>
            <div>
              <div className="v4-sec"><h2>Coming up</h2><button type="button" className="cv4-link no-min-height" onClick={() => go('meetings')}>All meetings →</button></div>
              {upcoming.length ? <div className="v4-list">{upcoming.slice(0, 4).map(eventRow)}</div> : <p className="v4-hint">Nothing on the calendar for this circle.</p>}
            </div>
          </div>

          {cu?.description && cu.description.replace(/\s+/g, ' ').trim() !== firstSentence(cu.description) && (
            <>
              <SectionHead title="Purpose" />
              <div className="v4-card cv4-purpose"><p className="cv4-pre">{cu.description}</p></div>
            </>
          )}
          {teams.length > 0 && (
            <>
              <div className="v4-sec"><h2>Subcircles · {teams.length}</h2><button type="button" className="cv4-link no-min-height" onClick={() => go('subcircles')}>All subcircles →</button></div>
              <div className="cv4-minis">
                {teams.map(t => (
                  <Link key={t.id} href={subHref(c, t.id)} className="v4-card v4-card--link cv4-mini">
                    <b>{t.name}</b><small>{plural(f.membersOf(t.id).length, 'person', 'people')}</small>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'guides' && (
        <>
          <SectionHead title="Manuals & guides" />
          {!signedIn ? <p className="v4-hint">{DESIGN_REVIEW ? <>Guides open once you’ve joined {COMMUNITY_NAME}. <Link href="/auth/signup">Create account</Link></> : <><Link href="/auth/login">Sign in</Link> to read this circle’s guides.</>}</p>
            : !isJoiningOrAbove(p.role) ? <p className="v4-hint">Guides open once you’ve joined {COMMUNITY_NAME}. <Link href="/join">Start joining</Link></p>
            : p.extras?.guides == null ? <p className="v4-hint">This community hasn’t connected its second brain yet, so there are no guides to show.</p>
            : p.extras.guides.length ? (
              <>
                <p className="v4-hint cv4-gap">What the {meta.label} circle keeps in the second brain (folder <code>{p.extras.guideFolder}/</code>): how it works, plans and references. Edit them there; they show here for everyone who has joined.</p>
                {[...new Set(p.extras.guides.map(g => g.group))].map(grp => (
                  <div key={grp ?? ''}>
                    {grp && <h3 className="cv4-gtitle">{grp}</h3>}
                    <div className="v4-list">
                      {p.extras!.guides!.filter(g => g.group === grp).map(g => (
                        <Link key={g.path} href={`/circles/guide?c=${encodeURIComponent(c)}&path=${encodeURIComponent(g.path)}`} className="v4-row v4-row--click">
                          <span className="v4-row__lead"><span className="v4-tile v4-tile--grey"><Icon name="book" /></span></span>
                          <span className="v4-row__main"><b>{g.name}</b>{g.sub && <small>{g.sub}</small>}</span>
                          <span className="v4-row__trail"><Icon name="right" size={14} /></span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : <p className="v4-hint">No guides yet. Notes kept in the circle’s folder of the second brain (<code>{p.extras.guideFolder}/</code>) show here: how-tos, manuals, checklists.</p>}
        </>
      )}

      {tab === 'people' && (
        <>
          {manage && reqs.length > 0 && (
            <section className="v4-card cv4-reqs">
              <h2 className="cv4-h"><Icon name="hand" size={16} />Asking to join · {reqs.length}</h2>
              {reqs.map(r => (
                <div key={r.id} className="cv4-req">
                  <Av name={r.name} url={f.avatar(r.user_id)} color={meta.color} />
                  <span className="cv4-req__main"><b>{r.name}</b>{r.note && <small>“{r.note}”</small>}</span>
                  <span className="cv4-acts">
                    <Button size="sm" onClick={() => decide(r, true)} disabled={!!busy}>{busy === r.id ? '…' : 'Accept'}</Button>
                    <Button size="sm" variant="secondary" onClick={() => decide(r, false)} disabled={!!busy}>Decline</Button>
                  </span>
                </div>
              ))}
            </section>
          )}

          <div className="v4-sec"><h2>{leads.length === 1 ? 'Lead' : 'Leads'}</h2>{p.role === 'admin' && <Link href="/admin/users" className="cv4-small">Manage leads →</Link>}</div>
          <div className="cv4-leadname"><CircleLeadName slug={c} canEdit={p.role === 'admin'} color={meta.color} /></div>
          {leads.length ? <div className="cv4-people">{leads.map(personCard)}</div> : <p className="v4-hint">No lead on MyCoNet yet.</p>}

          <SectionHead title={`Members · ${ppl.length - leads.length}`} />
          {ppl.length - leads.length > 0 ? (
            <div className="cv4-people">{ppl.filter(x => !x.lead).map(personCard)}</div>
          ) : (
            <p className="v4-hint">No members yet beside its {leads.length === 1 ? 'lead' : 'leads'}. {steward && steward.slug !== c && !leads.length ? `${circles.meta(steward.slug).label} looks after it.` : ''}</p>
          )}
          {manage && cu && (
            <div className="cv4-add">
              <AddCircleMember unitId={cu.id} color={meta.color} people={p.people}
                existing={[...f.membersOf(cu.id).map(m => m.user_id), ...(p.directory.leads[c] ?? []).map(l => l.id)]}
                onAdded={m => p.onMemberAdded(m, meta.label)} />
            </div>
          )}
        </>
      )}

      {tab === 'subcircles' && (
        <>
          <div className="v4-sec">
            <h2>Subcircles · {teams.length}</h2>
            {manage && <Button size="sm" variant="secondary" icon="plus" onClick={() => p.onEdit(null, c)}>Add subcircle</Button>}
          </div>
          <p className="v4-hint cv4-intro">A subcircle is a small circle inside {meta.label}: its own purpose, people and tasks.</p>
          {teams.length ? (
            <div className="cv4-subs">
              {teams.map(t => {
                const tm = f.membersOf(t.id)
                const tLeads = tm.filter(m => m.role === 'lead')
                const tp = p.teamProjects.filter(x => x.team_id === t.id)
                const tt = tasks.filter(x => x.team_id === t.id)
                return (
                  <article key={t.id} id={`sub-${t.id}`} className={`v4-card cv4-sub${picked === t.id ? ' cv4-sub--picked' : ''}`}>
                    <div className="cv4-card__top">
                      <span className="cv4-ico cv4-ico--sm" aria-hidden="true"><Icon name="users" size={18} /></span>
                      <Link href={subHref(c, t.id)} className="cv4-card__name cv4-sub__link"><b>{t.name}</b><small>Subcircle of {meta.label} · open it →</small></Link>
                      {canEditUnit(t, p.members, p.userId, p.role, p.leadCircles) && <Button size="sm" variant="secondary" icon="pencil" onClick={() => p.onEdit(t, c)}>Edit</Button>}
                    </div>
                    {t.description ? <p className="cv4-sub__about cv4-pre">{t.description}</p> : <p className="cv4-sub__about v4-hint">No purpose written yet.</p>}
                    <div className="cv4-facts">
                      <div className="cv4-fact">
                        <small>Lead</small>
                        {tLeads.length ? <span className="cv4-lead"><span className="cv4-avs">{tLeads.map(m => <Av key={m.user_id} name={m.person!.name} url={f.avatar(m.user_id)} color={meta.color} />)}</span><span>{tLeads.map(m => m.user_id === p.userId ? 'you' : first(m.person!.name)).join(', ')}</span></span>
                          : <span className="cv4-muted">No lead yet</span>}
                      </div>
                      <div className="cv4-fact">
                        <small>People</small>
                        {tm.length ? <span className="cv4-lead"><span className="cv4-avs">{tm.slice(0, 8).map(m => <Av key={m.user_id} name={m.person!.name} url={f.avatar(m.user_id)} color={meta.color} />)}</span><span className="cv4-muted">{tm.map(m => `${m.user_id === p.userId ? 'you' : first(m.person!.name)}${m.title ? ` (${m.title})` : ''}`).join(', ')}</span></span>
                          : <span className="cv4-muted">No one in this subcircle yet</span>}
                      </div>
                    </div>
                    {(tp.length > 0 || tt.length > 0) && (
                      <div className="cv4-sub__tasks">
                        <small>Tasks</small>
                        {tp.map(x => <Link key={x.id} href={`/operations/${x.id}`} className="cv4-sub__task"><Icon name="tasks" size={14} />{x.title}</Link>)}
                        {tt.map(x => <Link key={x.id} href={x.project_id ? `/operations/${x.project_id}` : `/operations?circle=${encodeURIComponent(c)}`} className="cv4-sub__task"><Icon name="check" size={14} />{x.title}{x.project_title && <em> · in {x.project_title}</em>}</Link>)}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          ) : <p className="v4-hint">No subcircles yet.{manage && ' Add one when a few people take care of one part of this circle together.'}</p>}
        </>
      )}

      {tab === 'tasks' && (
        <div className="cv4-split">
          <div>
            <SectionHead title={signedIn ? `Tasks · ${openCount} open` : 'Tasks'} action={{ href: `/operations?circle=${encodeURIComponent(c)}`, label: 'Open the board →' }} />
            {taskItems.length ? <div className="v4-list">{taskItems.map(itemRow)}</div> : <p className="v4-hint">No open tasks.</p>}
            {!signedIn && <p className="v4-hint v4-mt"><Link href="/auth/login">Sign in</Link> to see every task and subtask.</p>}
            {p.pmCounts?.[c] ? <div className="v4-tags cv4-links cv4-mt"><PmLink circle={c} count={p.pmCounts[c]} color={meta.color} /></div> : null}
          </div>
          {signedIn && (
            <div>
              <SectionHead title={`Subtasks due first · ${subtasks.length}`} />
              {subtasks.length ? <div className="v4-list">{subtasks.map(taskRow)}</div> : <p className="v4-hint">No open subtasks.</p>}
            </div>
          )}
        </div>
      )}

      {tab === 'meetings' && (
        <div className="cv4-split">
          <div>
            <SectionHead title="Coming up" action={{ href: `/calendar?circle=${encodeURIComponent(c)}`, label: 'Calendar →' }} />
            {upcoming.length ? <div className="v4-list">{upcoming.slice(0, 12).map(eventRow)}</div> : <p className="v4-hint">Nothing on the calendar for this circle.</p>}
          </div>
          <div>
            <SectionHead title={signedIn && isJoiningOrAbove(p.role) ? `Meeting notes · ${notesCount}` : 'Meeting notes'} action={p.meetingCounts ? { href: `/meetings?circle=${encodeURIComponent(c)}`, label: 'All notes →' } : undefined} />
            {/* Meetings open at joining member: say so instead of an empty list (decision #75) */}
            {!signedIn ? <p className="v4-hint">{DESIGN_REVIEW ? <>Meeting notes open when you join {COMMUNITY_NAME}. <Link href="/auth/signup">Create account</Link></> : <><Link href="/auth/login">Sign in</Link> to read meeting notes.</>}</p>
              : !isJoiningOrAbove(p.role) ? <p className="v4-hint">Meeting notes open when you join {COMMUNITY_NAME}. <Link href="/join">Start joining</Link></p>
              : notes.length ? (
                <div className="v4-list">
                  {notes.slice(0, 12).map(m => (
                    <Link key={m.id} href={`/meetings/${m.id}`} className="v4-row v4-row--click">
                      <span className="v4-row__lead"><span className="v4-tile v4-tile--grey"><Icon name="file" /></span></span>
                      <span className="v4-row__main"><b>{m.title || 'Meeting'}</b>{m.meeting_date && <small suppressHydrationWarning>{day(m.meeting_date)}</small>}</span>
                    </Link>
                  ))}
                </div>
              ) : <p className="v4-hint">No meeting notes yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── /circles?c=slug&t=id: one subcircle, in tabs, like its circle (v4.108.0) ─────── */

const SUB_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'people', label: 'People' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'meetings', label: 'Meetings' },
] as const
type SubTabKey = typeof SUB_TABS[number]['key']

/**
 * A subcircle's page (v4.108.0: Oscar, "sub circles should have a subpage the same abilities as a circle subpage… like a
 * russian doll effect so it's familiar… and a bread crumb on top so users can see their way back"). The circle's page,
 * one level in: its purpose, its people (leads add people here), its tasks (given to the subcircle) and its meeting
 * notes (meetings set to the subcircle). The breadcrumb leads back to the circle and to Circles.
 */
function SubcirclePage(p: Props & { slug: string; teamId: string }) {
  const circles = useCircles()
  const params = useSearchParams()
  const f = useCircleFacts(p)
  const c = p.slug
  const meta = circles.meta(c)
  const team = p.units.find(u => u.id === p.teamId)!
  const members = f.membersOf(team.id)
  const leads = members.filter(m => m.role === 'lead')
  const others = members.filter(m => m.role !== 'lead')
  const manage = canEditUnit(team, p.members, p.userId, p.role, p.leadCircles)
  const inIt = !!p.userId && members.some(m => m.user_id === p.userId)
  const signedIn = !!p.userId
  const tasks = f.tasksOf(c).filter(t => t.team_id === team.id)
  const projects = p.teamProjects.filter(x => x.team_id === team.id)
  const notes = f.meetingsOf(c).filter(m => m.team_id === team.id)
  const openCount = projects.length + tasks.filter(t => !t.project_id).length

  const asked0 = params.get('tab')
  const [tab, setTab] = useState<SubTabKey>(SUB_TABS.some(t => t.key === asked0) ? asked0 as SubTabKey : 'overview')
  function go(t: SubTabKey) {
    setTab(t)
    const q = new URLSearchParams(window.location.search)
    if (t === 'overview') q.delete('tab'); else q.set('tab', t)
    window.history.replaceState(null, '', `/circles?${q.toString()}`)
  }
  const counts: Partial<Record<SubTabKey, number>> = { people: members.length, tasks: signedIn ? openCount : undefined, meetings: signedIn ? notes.length : undefined }

  const personCard = (m: OrgMember) => (
    <Link key={m.user_id} href={m.person?.username ? `/u/${m.person.username}` : '#'} className="v4-card v4-card--link cv4-person">
      <Av name={m.person!.name} url={f.avatar(m.user_id)} color={meta.color} size="lg" />
      <span className="cv4-person__main">
        <b>{m.person!.name}{m.user_id === p.userId ? ' (you)' : ''}</b>
        <small>{m.role === 'lead' ? 'Subcircle lead' : m.title || 'Member'}</small>
      </span>
    </Link>
  )
  const taskRow = (t: CircleTask) => (
    <Link key={t.id} href={t.project_id ? `/operations/${t.project_id}` : `/operations?task=${t.id}`} className="v4-row v4-row--click">
      <span className="v4-row__main">
        <b>{t.title}</b>
        <small suppressHydrationWarning>{[t.project_title ? `in ${t.project_title}` : null, t.assignee_id === p.userId ? 'you' : t.assignee_name, t.due_date ? `due ${day(t.due_date)}` : null].filter(Boolean).join(' · ') || 'Not assigned yet'}</small>
      </span>
      <span className="v4-row__trail"><StatusPill status={statusFromDb(t.status)} /></span>
    </Link>
  )
  const projectRow = (x: { id: string; title: string }) => (
    <Link key={x.id} href={`/operations/${x.id}`} className="v4-row v4-row--click">
      <span className="v4-row__main"><b>{x.title}</b>{signedIn && <small>{plural(tasks.filter(t => t.project_id === x.id).length, 'open subtask')}</small>}</span>
      <span className="v4-row__trail"><Icon name="right" size={14} /></span>
    </Link>
  )
  const noteRow = (m: typeof notes[number]) => (
    <Link key={m.id} href={`/meetings/${m.id}`} className="v4-row v4-row--click">
      <span className="v4-row__lead"><span className="v4-tile v4-tile--grey"><Icon name="file" /></span></span>
      <span className="v4-row__main"><b>{m.title || 'Meeting'}</b>{m.meeting_date && <small suppressHydrationWarning>{day(m.meeting_date)}</small>}</span>
    </Link>
  )
  const taskList = (n?: number) => {
    const rows = [...projects.map(projectRow), ...tasks.filter(t => !t.project_id).map(taskRow)]
    return rows.length ? <div className="v4-list">{n ? rows.slice(0, n) : rows}</div> : <p className="v4-hint">No open tasks given to this subcircle.</p>
  }
  const noteList = (n?: number) => !signedIn ? <p className="v4-hint">{DESIGN_REVIEW ? <>Meeting notes open when you join {COMMUNITY_NAME}. <Link href="/auth/signup">Create account</Link></> : <><Link href="/auth/login">Sign in</Link> to read meeting notes.</>}</p>
    : !isJoiningOrAbove(p.role) ? <p className="v4-hint">Meeting notes open when you join {COMMUNITY_NAME}. <Link href="/join">Start joining</Link></p>
    : notes.length ? <div className="v4-list">{(n ? notes.slice(0, n) : notes).map(noteRow)}</div>
    : <p className="v4-hint">No meetings set to this subcircle yet. A lead sets a meeting’s subcircle on its page, under Review this meeting.</p>

  return (
    <div className="v4-page v4-page--wide cv4" style={{ ['--c' as string]: meta.color }}>
      <Crumbs trail={[{ label: 'Circles', href: '/circles' }, { label: meta.label, href: `/circles?c=${encodeURIComponent(c)}&tab=subcircles` }, { label: team.name }]} />
      <header className="v4-ph cv4-head">
        <div className="v4-ph__row">
          <div className="cv4-head__main">
            <span className="cv4-ico cv4-ico--lg" aria-hidden="true"><Icon name="users" size={26} /></span>
            <div>
              <div className="v4-tags cv4-gap">
                <span className="v4-tag"><i className="cv4-dot" />Subcircle of {meta.label}</span>
                {inIt && <Tag icon="check">You’re in it</Tag>}
                {manage && <Tag icon="shield">You can manage it</Tag>}
              </div>
              <h1 className="v4-ph__title">{team.name}</h1>
              {team.description ? <p className="v4-ph__sub">{firstSentence(team.description)}</p> : manage && <p className="v4-ph__sub">Add this subcircle’s purpose with Edit.</p>}
            </div>
          </div>
          <div className="v4-ph__actions">
            {manage && <Button variant="secondary" icon="pencil" onClick={() => p.onEdit(team, c)}>Edit</Button>}
          </div>
        </div>
      </header>

      <div className="v4-chiprow cv4-tabs" role="tablist">
        {SUB_TABS.map(t => <Chip key={t.key} on={tab === t.key} onClick={() => go(t.key)} count={counts[t.key] || undefined}>{t.label}</Chip>)}
      </div>

      {tab === 'overview' && (
        <>
          <div className="cv4-strip">
            <button type="button" className="v4-card cv4-tile" onClick={() => go('people')}>
              <small>Lead</small>
              {leads.length ? <span className="cv4-lead"><span className="cv4-avs">{leads.slice(0, 3).map(m => <Av key={m.user_id} name={m.person!.name} url={f.avatar(m.user_id)} color={meta.color} />)}</span><b>{leads.map(m => first(m.person!.name)).join(', ')}</b></span>
                : <b className="cv4-muted">No lead yet</b>}
            </button>
            <button type="button" className="v4-card cv4-tile" onClick={() => go('people')}>
              <small>People</small>
              <span className="cv4-lead"><b className="cv4-num">{members.length}</b><span className="cv4-avs">{members.slice(0, 6).map(m => <Av key={m.user_id} name={m.person!.name} url={f.avatar(m.user_id)} color={meta.color} />)}</span></span>
            </button>
            {signedIn && (
              <button type="button" className="v4-card cv4-tile" onClick={() => go('tasks')}>
                <small>Open tasks</small><b className="cv4-num">{openCount}</b>
              </button>
            )}
            {signedIn && (
              <button type="button" className="v4-card cv4-tile" onClick={() => go('meetings')}>
                <small>Meeting notes</small><b className="cv4-num">{notes.length}</b>
              </button>
            )}
          </div>
          <div className="cv4-split">
            <div>
              <div className="v4-sec"><h2>Tasks</h2><button type="button" className="cv4-link no-min-height" onClick={() => go('tasks')}>All tasks →</button></div>
              {signedIn ? taskList(4) : <p className="v4-hint"><Link href="/auth/login">Sign in</Link> to see this subcircle’s tasks.</p>}
            </div>
            <div>
              <div className="v4-sec"><h2>Meeting notes</h2><button type="button" className="cv4-link no-min-height" onClick={() => go('meetings')}>All notes →</button></div>
              {noteList(4)}
            </div>
          </div>
          {team.description && team.description.replace(/\s+/g, ' ').trim() !== firstSentence(team.description) && (
            <>
              <SectionHead title="Purpose" />
              <div className="v4-card cv4-purpose"><p className="cv4-pre">{team.description}</p></div>
            </>
          )}
          <SectionHead title={`Part of ${meta.label}`} action={{ href: `/circles?c=${encodeURIComponent(c)}`, label: `Open ${meta.label} →` }} />
        </>
      )}

      {tab === 'people' && (
        <>
          <SectionHead title={leads.length === 1 ? 'Lead' : 'Leads'} />
          {leads.length ? <div className="cv4-people">{leads.map(personCard)}</div> : <p className="v4-hint">No lead yet{manage ? ': choose one with Edit.' : '.'}</p>}
          <SectionHead title={`Members · ${others.length}`} />
          {others.length ? <div className="cv4-people">{others.map(personCard)}</div> : <p className="v4-hint">No members yet beside its {leads.length === 1 ? 'lead' : 'leads'}.</p>}
          {manage ? (
            <div className="cv4-add">
              <AddCircleMember unitId={team.id} color={meta.color} people={p.people} existing={members.map(m => m.user_id)} onAdded={m => p.onMemberAdded(m, team.name)} />
            </div>
          ) : signedIn && !inIt && <p className="v4-hint">To join, ask a lead of {team.name} or of {meta.label} to add you.</p>}
        </>
      )}

      {tab === 'tasks' && (
        <>
          <SectionHead title={`Open tasks · ${openCount}`} action={{ href: `/operations?circle=${encodeURIComponent(c)}`, label: 'On the board →' }} />
          {signedIn ? taskList() : <p className="v4-hint"><Link href="/auth/login">Sign in</Link> to see this subcircle’s tasks.</p>}
        </>
      )}

      {tab === 'meetings' && (
        <>
          <SectionHead title={signedIn && isJoiningOrAbove(p.role) ? `Meeting notes · ${notes.length}` : 'Meeting notes'} action={p.meetingCounts ? { href: `/meetings?circle=${encodeURIComponent(c)}`, label: `All ${meta.label} notes →` } : undefined} />
          {noteList()}
        </>
      )}
    </div>
  )
}
