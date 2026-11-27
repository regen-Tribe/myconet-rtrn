import type { SupabaseClient } from '@supabase/supabase-js'
import {
  Card, EmptyState, Icon, IconTile, List, ListRow, NextStep, PageHeader, Result, SectionHead, StatusPill, Tag, statusFromDb,
} from '@/core/components/v4'
import { roleAtLeast } from '@/core/lib/roles'
import { evalLayers, type Vote } from '@/core/lib/proposal-checks'
import { ACTIVE_PROJECT_STATUSES } from '@/core/lib/project-status'
import { loadCircleRows } from '@/core/lib/circles-server'
import { DESIGN_REVIEW } from '@/core/lib/instance'
import { CircleSeal } from '@/core/components/v4/CircleSeal'
import YourTasks, { type DashTask } from './YourTasks'
import { loadMenuState } from '@/core/lib/menu-server'
import { loadJoinPath, JOIN_REVIEWER } from '@/core/lib/join-path'
import { JoinPathView } from '@/modules/m05-join/JoinPathView'
import Link from 'next/link'

/**
 * My dashboard in the v4 look (DESIGN-SYSTEM.md › v4; Sonia's prototype, 19 Nov). Shown instead of the
 * old dashboard when the community turns v4 on. One next step on top, then what's yours: your tasks
 * (My tasks lives here now), your project, the next event, open proposals, your circles.
 */
export default async function DashboardV4({ supabase, userId, role, firstName, communityName, application, events }: {
  supabase: SupabaseClient
  userId: string | null
  role: string
  firstName: string
  communityName: string
  application: { status: string; created_at?: string | null } | null
  events: { id: string; title: string; starts_at: string; location: string | null; all_day?: boolean | null }[]
}) {
  const isJoining = roleAtLeast(role, 'joining')
  const isMember = roleAtLeast(role, 'member')
  const isLead = roleAtLeast(role, 'circle_lead') || role === 'admin'

  const [tasksRes, proposalsRes, votesRes, unitsRes, circles, pendingAppsRes, projectsRes, voterRolesRes] = await Promise.all([
    userId
      ? supabase.from('deliverables').select('id, title, status, due_date, project_id, circle, projects(id, title)')
          .eq('assignee_id', userId).order('due_date', { ascending: true, nullsFirst: false }).limit(60)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('proposals').select('id, title, closes_at, votes:proposal_votes(vote, user_id, layer)').eq('status', 'open').order('closes_at', { ascending: true }).limit(20),
    userId ? supabase.from('proposal_votes').select('proposal_id').eq('user_id', userId) : Promise.resolve({ data: [] as any[] }),
    userId ? supabase.from('org_unit_members').select('org_units(kind, circle)').eq('user_id', userId) : Promise.resolve({ data: [] as any[] }),
    loadCircleRows(supabase),
    isLead ? supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'pending') : Promise.resolve({ count: 0 }),
    supabase.from('projects').select('id, title, status, circle, sprint_name').in('status', [...ACTIVE_PROJECT_STATUSES]).limit(60),
    // Each voter's role, as Governance reads it (app/governance/page.tsx): the checks count circle leads and advisors
    supabase.rpc('open_proposal_voter_roles'),
  ])

  const tasks: DashTask[] = ((tasksRes.data ?? []) as any[]).map(t => ({
    id: t.id, title: t.title, status: t.status, due: t.due_date, projectId: t.project_id,
    projectTitle: (Array.isArray(t.projects) ? t.projects[0] : t.projects)?.title ?? null, circle: t.circle,
  }))
  const open = tasks.filter(t => t.status !== 'done')
  const voted = new Set(((votesRes.data ?? []) as any[]).map(v => v.proposal_id))
  const voterRole = new Map(((voterRolesRes.data ?? []) as { proposal_id: string; user_id: string; role: string }[])
    .map(r => [`${r.proposal_id}:${r.user_id}`, r.role]))
  // The same rule as Governance's Voting list: not yet approved by its checks, voting time not over. Before, the
  // dashboard listed four "Voting" proposals while Governance showed one (newcomer check, 23 Nov).
  const now = Date.now()
  const proposals = ((proposalsRes.data ?? []) as { id: string; title: string; closes_at: string | null; votes: Vote[] | null }[])
    .filter(p => {
      if (p.closes_at && new Date(p.closes_at).getTime() < now) return false
      const votes = (p.votes ?? []).map(v => ({ ...v, voter: { role: voterRole.get(`${p.id}:${v.user_id}`) ?? '' } }))
      return !evalLayers({ votes }).isLive
    })
    .slice(0, 4)
  const toVote = proposals.find(p => !voted.has(p.id))
  const circleByslug = new Map(circles.map(c => [c.slug, c]))
  const myCircleSlugs = [...new Set(((unitsRes.data ?? []) as any[])
    .map(r => (Array.isArray(r.org_units) ? r.org_units[0] : r.org_units))
    .filter(u => u?.kind === 'circle' && u.circle).map(u => u.circle as string))]
  const pendingApps = (pendingAppsRes as { count: number | null }).count ?? 0

  // The project to show: the one with most of your open tasks, else one in progress
  const projects = (projectsRes.data ?? []) as { id: string; title: string; status: string; circle: string | null; sprint_name: string | null }[]
  const mineByProject = new Map<string, number>()
  for (const t of open) if (t.projectId) mineByProject.set(t.projectId, (mineByProject.get(t.projectId) ?? 0) + 1)
  const featuredId = [...mineByProject.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const featured = projects.find(p => p.id === featuredId) ?? projects.find(p => p.status === 'in_progress') ?? null
  const nextEvent = events[0] ?? null

  // The one next step, by role (the green box). Words: LEXICON.md
  let next = !userId
    ? { title: 'Create account', text: DESIGN_REVIEW ? `Join ${communityName} in two steps.` : `Join ${communityName} by invitation.`, href: '/auth/signup' }
    : !isJoining
      ? application
        ? { title: 'Your application is being read', text: 'A circle lead answers within a week.', href: '/join' }
        : { title: 'Start joining', text: `Tell the community who you are. ${DESIGN_REVIEW ? 'Two' : 'Three'} short steps.`, href: '/join' }
      : !isMember
        ? { title: 'Your first agreement', text: 'One accepted agreement makes you a member.', href: '/operations' }
        : isLead && pendingApps > 0
          ? { title: `${pendingApps} join application${pendingApps > 1 ? 's' : ''}`, text: 'Accept or decline them this week.', href: '/join' }
          : toVote
            ? { title: `Vote on ${toVote.title}`, text: closesIn(toVote.closes_at), href: '/governance' }
            : open[0]
              ? { title: open[0].title, text: `Your task${open[0].projectTitle ? ` on ${open[0].projectTitle}` : ''}${open[0].due ? ` · due ${day(open[0].due)}` : ''}`, href: taskHref(open[0]) }
              : { title: 'Find a task to help on', text: 'Offer what you can give.', href: '/operations' }

  // Design review: the page is named as in the menu, the greeting says where you stand, and the next step is the
  // menu's own (core/lib/menu-server.ts), so the two never disagree. Explorers see their three join steps first.
  const review = DESIGN_REVIEW && userId
    ? await Promise.all([loadMenuState(supabase, userId, role), !isJoining ? loadJoinPath(supabase, userId, role) : null])
    : null
  if (review?.[0].next) next = { title: review[0].next.title, text: review[0].next.line, href: review[0].next.href }
  const joinPath = review?.[1] ?? null
  const standing = !isJoining ? `You’re exploring ${communityName}.` : !isMember ? 'You’re a joining member.' : null
  // The newcomer path (design/decisions.md #80, #81): one checklist while exploring, a calm yellow card while the
  // stewards read the application, and a welcome on the first days as a joining member (until they're in a circle)
  const waiting = !!application && (application.status === 'pending' || application.status === 'reviewing')
  const newcomerView = !DESIGN_REVIEW || !userId ? null
    : !isJoining && waiting ? 'waiting'
    : !isJoining && joinPath ? 'checklist'
    : isJoining && !isMember && myCircleSlugs.length === 0 ? 'welcome-in'
    : null
  // Before joining (Sonia, 25 Nov; decision #94): only the way in, nothing of the community's work below it
  const onlyWayIn = newcomerView === 'checklist' || newcomerView === 'waiting'
  const stepHref = (key: string) => `/join?step=${key}`
  const sentOn = application?.created_at ? new Date(application.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null
  const startHere = !isJoining && (
    <>
      <SectionHead title="Start here" />
      <List>
        <ListRow href={DESIGN_REVIEW ? '/about' : '/blueprint'} lead={<IconTile name="book" tone={DESIGN_REVIEW ? 'grey' : undefined} />} title={`About ${communityName}`} meta="What we're building and how we live" trail={<Icon name="right" />} />
        <ListRow href="/members" lead={<IconTile name="users" tone={DESIGN_REVIEW ? 'grey' : 'red'} />} title="Meet the members" meta="What people offer and look for" trail={<Icon name="right" />} />
        {!DESIGN_REVIEW && <ListRow href="/join" lead={<IconTile name="sprout" tone="yellow" />} title="Start joining" meta="Three short steps" trail={<Icon name="right" />} />}
      </List>
    </>
  )

  return (
    <div className="v4-page">
      {DESIGN_REVIEW
        ? <PageHeader title={DESIGN_REVIEW ? 'Dashboard' : 'My dashboard'} subtitle={<>Welcome, {firstName}.{standing ? ` ${standing}` : ''}</>} />
        : <h1 className="v4-hello">Hey <em>{firstName},</em><br />welcome home</h1>}

      <div className={onlyWayIn ? 'nc-only' : 'v4-split'}>
        <div>
          {newcomerView === 'checklist' && joinPath ? (
            <section className="v4-card nc-check" aria-labelledby="nc-check-h">
              <h2 id="nc-check-h" className="nc-h">{joinPath.doneCount === 0 ? `Welcome to ${communityName}` : 'Start joining'}</h2>
              <p className="nc-sub">{joinPath.doneCount === 0
                ? `Joining takes ${joinPath.steps.length === 2 ? 'two' : 'three'} short steps. ${JOIN_REVIEWER.charAt(0).toUpperCase() + JOIN_REVIEWER.slice(1)} answers within a week.`
                : `${joinPath.doneCount} of ${joinPath.steps.length} done. ${JOIN_REVIEWER.charAt(0).toUpperCase() + JOIN_REVIEWER.slice(1)} welcomes you within a week of joining.`}</p>
              <ol className="nc-steps">
                {joinPath.steps.map((st, i) => {
                  const now = joinPath.next?.key === st.key
                  return (
                    <li key={st.key} className={`${st.done ? 'done' : ''}${now ? ' now' : ''}`}>
                      <a href={stepHref(st.key)} aria-current={now ? 'step' : undefined}>
                        <span className="nc-n" aria-hidden="true">{st.done ? <Icon name="check" size={16} /> : i + 1}</span>
                        <span className="nc-t"><b>{st.title}</b><small>{[
                          'Who we are and the values we live by',
                          joinPath.steps.length === 2 ? 'A few short questions, then Join the community' : 'A photo, a line, what you’d like to offer',
                          `${JOIN_REVIEWER.charAt(0).toUpperCase() + JOIN_REVIEWER.slice(1)} answers within a week`,
                        ][i]}</small></span>
                        <span className="nc-min">{st.done ? 'Done' : `${st.minutes} min`}</span>
                      </a>
                    </li>
                  )
                })}
              </ol>
              {joinPath.next && (
                <a className="v4-btn v4-btn--primary nc-go" href={stepHref(joinPath.next.key)}>
                  {joinPath.doneCount === 0 ? 'Start with step 1' : `Go to step ${joinPath.steps.indexOf(joinPath.next) + 1}`}
                </a>
              )}
              <p className="nc-foot">Or look around first: <a href="/members">Members</a>, <a href="/calendar">Calendar</a> and <a href="/amenities">The space</a> are open to you.</p>
            </section>
          ) : newcomerView === 'waiting' ? (
            <>
              <section className="nc-wait" aria-labelledby="nc-wait-h">
                <small>Joining</small>
                <h2 id="nc-wait-h">With the stewards</h2>
                <p>{sentOn ? `Asked on ${sentOn}. ` : ''}{JOIN_REVIEWER.charAt(0).toUpperCase() + JOIN_REVIEWER.slice(1)} welcomes you within a week.</p>
              </section>
              <div className="v4-eyebrow rv-cardlabel">Meanwhile</div>
              <List>
                <ListRow href="/members" lead={<IconTile name="users" tone="grey" />} title="Meet the members" meta="What people offer and look for" trail={<Icon name="right" />} />
                <ListRow href="/calendar" lead={<IconTile name="calendar" tone="grey" />} title="What’s on" meta="Events you can come to" trail={<Icon name="right" />} />
                <ListRow href="/amenities" lead={<IconTile name="home" tone="grey" />} title="The space" meta="Where people live and work" trail={<Icon name="right" />} />
              </List>
            </>
          ) : newcomerView === 'welcome-in' ? (
            <>
              <section className="nc-in" aria-labelledby="nc-in-h">
                <h2 id="nc-in-h">Welcome in, {firstName}</h2>
                <p>The stewards said yes. You’re a joining member of {communityName}.</p>
              </section>
              <NextStep title="Join a circle" text="Pick the part of community life you’d like to help with." href="/circles" />
              <div className="v4-eyebrow rv-cardlabel">Now open to you</div>
              <div className="v4-tags nc-open">
                <Tag icon="handshake">Offer help on tasks</Tag><Tag icon="chat">Meeting notes</Tag><Tag icon="calendar">Post events</Tag><Tag icon="bed">Book a bed</Tag>
              </div>
            </>
          ) : (
            <>
              <NextStep title={next.title} text={next.text} href={next.href} />
              {joinPath && (
                <div className="v4-card jr-dash">
                  <JoinPathView path={joinPath} hrefs={{ values: stepHref('values'), profile: stepHref('profile'), application: stepHref('application') }} />
                </div>
              )}
              {DESIGN_REVIEW && startHere}
            </>
          )}

          {featured && !onlyWayIn && (<>
            {/* Design review (#47): a small label says what each card is; shown only with the switch on (rv-only) */}
            <div className="v4-eyebrow rv-only rv-cardlabel">{mineByProject.get(featured.id) ? 'Your main task' : 'In progress now'}</div>
            <Card href={`/operations/${featured.id}`}>
              <div className="v4-card-head">
                <IconTile name="board" />
                <div>
                  <b>{featured.title}</b>
                  <small>{featured.circle ? `${circleByslug.get(featured.circle)?.name ?? featured.circle} circle` : 'Whole community'}</small>
                </div>
              </div>
              <div className="v4-tags">
                <StatusPill status={statusFromDb(featured.status)} />
                {mineByProject.get(featured.id) ? <Tag icon="check">{mineByProject.get(featured.id)} of your subtasks</Tag> : null}
                {featured.sprint_name ? <Tag>Sprint · {featured.sprint_name}</Tag> : null}
              </div>
            </Card>
          </>)}

          {nextEvent && !onlyWayIn && (<>
            <div className="v4-eyebrow rv-only rv-cardlabel">Next event</div>
            <Card href="/calendar" className="v4-mt">
              <div className="v4-card-head">
                <IconTile name="calendar" tone="red" />
                <div>
                  <b>{nextEvent.title}</b>
                  <small>{when(nextEvent.starts_at, nextEvent.all_day)}{nextEvent.location ? ` · ${nextEvent.location}` : ''}</small>
                </div>
              </div>
              <div className="v4-tags"><Tag icon="right">Open Calendar</Tag></div>
            </Card>
          </>)}

          {!DESIGN_REVIEW && startHere}
        </div>

        {!onlyWayIn && <div>
          {userId && isJoining && <YourTasks tasks={tasks} />}

          <SectionHead title="Open proposals" action={{ href: '/governance', label: 'Open Governance →' }} />
          {/* Before membership: say when you vote, never "you'll vote here" (decisions #74, #78) */}
          {DESIGN_REVIEW && !userId ? (
            <p className="v4-hint"><Link href="/auth/login">Sign in</Link> to read proposals · <Link href="/auth/signup">Create account</Link></p>
          ) : <>
          {DESIGN_REVIEW && !isMember && <p className="v4-hint">You’ll vote once you’re a member.</p>}
          {proposals.length ? (
            <List>
              {proposals.map(p => (
                <ListRow key={p.id} href="/governance" lead={<IconTile name="scale" tone="yellow" />} title={p.title} meta={closesIn(p.closes_at)}
                  trail={voted.has(p.id) ? <StatusPill status="done" label="You voted" /> : <><span className="rv-hide"><StatusPill status="doing" label="Open" /></span><span className="rv-only"><Result tone="attention" icon="clock">Voting</Result></span></>} />
              ))}
            </List>
          ) : <EmptyState title="No open proposals" text={DESIGN_REVIEW && !isMember ? 'When someone proposes something, it shows here.' : "When someone proposes something, you'll vote here."} icon="scale" />}
          </>}

          {myCircleSlugs.length > 0 && (
            <>
              <SectionHead title="Your circles" action={{ href: '/circles', label: 'See all circles →' }} />
              <List>
                {myCircleSlugs.map(slug => {
                  const c = circleByslug.get(slug)
                  return (
                    <ListRow key={slug} href="/circles"
                      lead={DESIGN_REVIEW ? <CircleSeal slug={slug} size={20} /> : <span className="v4-dot" style={{ background: c?.color ?? 'var(--ink-4)' }} />}
                      title={c?.name ?? slug} trail={<Icon name="right" />} />
                  )
                })}
              </List>
            </>
          )}
        </div>}
      </div>
    </div>
  )
}

const TZ = process.env.COMMUNITY_TIME_ZONE || 'UTC'
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...o }).format(new Date(iso))
function day(iso: string) { return fmt(iso.length === 10 ? iso + 'T12:00:00Z' : iso, { weekday: 'short', day: 'numeric', month: 'short' }) }
function when(iso: string, allDay?: boolean | null) { return allDay ? day(iso) : `${day(iso)} · ${fmt(iso, { hour: '2-digit', minute: '2-digit', hour12: false })}` }
function closesIn(iso: string | null) {
  if (!iso) return 'Open'
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)
  return d <= 0 ? 'Closes today' : d === 1 ? 'Closes tomorrow' : `${d} days left`
}
export function taskHref(t: { id: string; projectId: string | null }) {
  return t.projectId ? `/operations/${t.projectId}` : `/operations?task=${t.id}`
}
