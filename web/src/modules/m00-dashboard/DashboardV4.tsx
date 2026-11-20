import type { SupabaseClient } from '@supabase/supabase-js'
import {
  Card, EmptyState, Icon, IconTile, List, ListRow, NextStep, SectionHead, StatusPill, Tag, statusFromDb,
} from '@/core/components/v4'
import { roleAtLeast } from '@/core/lib/roles'
import { ACTIVE_PROJECT_STATUSES } from '@/core/lib/project-status'
import { loadCircleRows } from '@/core/lib/circles-server'
import YourTasks, { type DashTask } from './YourTasks'

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
  application: { status: string } | null
  events: { id: string; title: string; starts_at: string; location: string | null; all_day?: boolean | null }[]
}) {
  const isJoining = roleAtLeast(role, 'joining')
  const isMember = roleAtLeast(role, 'member')
  const isLead = roleAtLeast(role, 'circle_lead') || role === 'admin'

  const [tasksRes, proposalsRes, votesRes, unitsRes, circles, pendingAppsRes, projectsRes] = await Promise.all([
    userId
      ? supabase.from('deliverables').select('id, title, status, due_date, project_id, circle, projects(id, title)')
          .eq('assignee_id', userId).order('due_date', { ascending: true, nullsFirst: false }).limit(60)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('proposals').select('id, title, closes_at').eq('status', 'open').order('closes_at', { ascending: true }).limit(4),
    userId ? supabase.from('proposal_votes').select('proposal_id').eq('user_id', userId) : Promise.resolve({ data: [] as any[] }),
    userId ? supabase.from('org_unit_members').select('org_units(kind, circle)').eq('user_id', userId) : Promise.resolve({ data: [] as any[] }),
    loadCircleRows(supabase),
    isLead ? supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'pending') : Promise.resolve({ count: 0 }),
    supabase.from('projects').select('id, title, status, circle, sprint_name').in('status', [...ACTIVE_PROJECT_STATUSES]).limit(60),
  ])

  const tasks: DashTask[] = ((tasksRes.data ?? []) as any[]).map(t => ({
    id: t.id, title: t.title, status: t.status, due: t.due_date, projectId: t.project_id,
    projectTitle: (Array.isArray(t.projects) ? t.projects[0] : t.projects)?.title ?? null, circle: t.circle,
  }))
  const open = tasks.filter(t => t.status !== 'done')
  const voted = new Set(((votesRes.data ?? []) as any[]).map(v => v.proposal_id))
  const proposals = (proposalsRes.data ?? []) as { id: string; title: string; closes_at: string | null }[]
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
  const next = !userId
    ? { title: 'Create account', text: `Join ${communityName} by invitation.`, href: '/auth/signup' }
    : !isJoining
      ? application
        ? { title: 'Your application is being read', text: 'A circle lead answers within a week.', href: '/join' }
        : { title: 'Start joining', text: 'Tell the community who you are. Three short steps.', href: '/join' }
      : !isMember
        ? { title: 'Your first agreement', text: 'One accepted agreement makes you a member.', href: '/operations' }
        : isLead && pendingApps > 0
          ? { title: `${pendingApps} join application${pendingApps > 1 ? 's' : ''}`, text: 'Accept or decline them this week.', href: '/join' }
          : toVote
            ? { title: `Vote on ${toVote.title}`, text: closesIn(toVote.closes_at), href: '/governance' }
            : open[0]
              ? { title: open[0].title, text: `Your task${open[0].projectTitle ? ` on ${open[0].projectTitle}` : ''}${open[0].due ? ` · due ${day(open[0].due)}` : ''}`, href: taskHref(open[0]) }
              : { title: 'Find a project to help on', text: 'Offer what you can give.', href: '/operations' }

  return (
    <div className="v4-page">
      <h1 className="v4-hello">Hey <em>{firstName},</em><br />welcome home</h1>

      <div className="v4-split">
        <div>
          <NextStep title={next.title} text={next.text} href={next.href} />

          {featured && (
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
                {mineByProject.get(featured.id) ? <Tag icon="check">{mineByProject.get(featured.id)} of your tasks</Tag> : null}
                {featured.sprint_name ? <Tag>Sprint · {featured.sprint_name}</Tag> : null}
              </div>
            </Card>
          )}

          {nextEvent && (
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
          )}

          {!isJoining && (
            <>
              <SectionHead title="Start here" />
              <List>
                <ListRow href="/blueprint" lead={<IconTile name="book" />} title={`About ${communityName}`} meta="What we're building and how we live" trail={<Icon name="right" />} />
                <ListRow href="/members" lead={<IconTile name="users" tone="red" />} title="Meet the members" meta="What people offer and look for" trail={<Icon name="right" />} />
                <ListRow href="/join" lead={<IconTile name="sprout" tone="yellow" />} title="Start joining" meta="Three short steps" trail={<Icon name="right" />} />
              </List>
            </>
          )}
        </div>

        <div>
          {userId && isJoining && <YourTasks tasks={tasks} />}

          <SectionHead title="Open proposals" action={{ href: '/governance', label: 'Open Governance →' }} />
          {proposals.length ? (
            <List>
              {proposals.map(p => (
                <ListRow key={p.id} href="/governance" lead={<IconTile name="scale" tone="yellow" />} title={p.title} meta={closesIn(p.closes_at)}
                  trail={voted.has(p.id) ? <StatusPill status="done" label="You voted" /> : <StatusPill status="doing" label="Open" />} />
              ))}
            </List>
          ) : <EmptyState title="No open proposals" text="When someone proposes something, you'll vote here." icon="scale" />}

          {myCircleSlugs.length > 0 && (
            <>
              <SectionHead title="Your circles" action={{ href: '/circles', label: 'See all circles →' }} />
              <List>
                {myCircleSlugs.map(slug => {
                  const c = circleByslug.get(slug)
                  return (
                    <ListRow key={slug} href="/circles"
                      lead={<span className="v4-dot" style={{ background: c?.color ?? 'var(--ink-4)' }} />}
                      title={c?.name ?? slug} trail={<Icon name="right" />} />
                  )
                })}
              </List>
            </>
          )}
        </div>
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
