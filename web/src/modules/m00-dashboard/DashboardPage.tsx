import { createClient } from '@/core/lib/supabase/server'
import Link from 'next/link'
import { ACTIVE_PROJECT_STATUSES } from '@/core/lib/project-status'
import { ROLE_LABELS, roleAtLeast } from '@/core/lib/roles'
import { LinkedEventsList } from '@/modules/m14-events/LinkedEventsList'
import BannerImage from '@/core/components/BannerImage'
import { EVENT_SELECT, toEvent } from '@/modules/m14-events/lib/queries'
import { computeOverallReadiness, computeGatesPassed, computePhaseProgress, type Values } from '@/modules/m04-blueprint/lib/blueprint-compute'

const atLeast = roleAtLeast

type ModuleCard = {
  num: string
  name: string
  desc: string
  color: string
  href: string
  locked: boolean
  cta?: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const publicFetches = await Promise.all([
    supabase.from('blueprints').select('answers, flags, updated_at').eq('is_community', true).maybeSingle(),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('projects').select('id', { count: 'exact', head: true }).in('status', [...ACTIVE_PROJECT_STATUSES]),
    supabase.from('user_profiles')
      .select('id, first_name, last_name, username, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('projects')
      .select('id, title, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(2),
    supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('proposals')
      .select('id, title, decision_mode, created_at')
      .order('created_at', { ascending: false })
      .limit(2),
    supabase.from('project_updates')
      .select('id, content, created_at, project_id, projects(id, title), user_profiles(first_name, username)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('deliverables')
      .select('id, title, status, created_at, project_id, projects(id, title)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('user_offers')
      .select('id, title, created_at, user_profiles(first_name, last_name, username)')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('user_requests')
      .select('id, title, created_at, user_profiles(first_name, last_name, username)')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('projects').select('id', { count: 'exact', head: true })
      .in('status', [...ACTIVE_PROJECT_STATUSES]).eq('open_for_collaborators', true),
    // M14 — RLS limits visitors and explorers to public events
    supabase.from('events')
      .select(EVENT_SELECT)
      .gte('starts_at', new Date(Date.now() - 86400000).toISOString())
      .order('starts_at', { ascending: true })
      .limit(10),
  ])

  const [blueprintRes, memberCountRes, projectsRes, recentMembersRes, recentProjectsRes, openProposalsRes, recentProposalsRes, opsUpdatesRes, opsTasksRes, recentOffersRes, recentSeeksRes, newMembersRes, needHelpRes, upcomingEventsRes] = publicFetches
  const newMembersThisWeek = newMembersRes.count ?? 0
  const projectsNeedingHelp = needHelpRes.count ?? 0
  const upcomingEvents = (upcomingEventsRes.data ?? []).map(toEvent)

  let profile: any = null
  let application: any = null
  if (user) {
    const [profileRes, applicationRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
      supabase.from('applications').select('status, created_at').eq('user_id', user.id).maybeSingle(),
    ])
    profile = profileRes.data
    application = applicationRes.data
  }

  const blueprint = blueprintRes.data as { answers: unknown; flags: unknown; updated_at: string } | null
  const memberCount = memberCountRes.count ?? 0
  const activeProjects = projectsRes.count ?? 0
  const recentMembers = (recentMembersRes.data ?? []).filter((m: any) => m.id !== user?.id)
  const recentProjects = recentProjectsRes.data ?? []
  const openProposals = openProposalsRes.count ?? 0
  const recentProposals = recentProposalsRes.data ?? []

  const role = (profile as any)?.role ?? 'explorer'
  const displayName = profile?.first_name || 'Explorer'
  const roleLabel = ROLE_LABELS[role] ?? role

  const bpAnswers = (blueprint?.answers ?? {}) as Values
  const overall = blueprint ? computeOverallReadiness(bpAnswers) : null
  const gatesPassed = blueprint ? computeGatesPassed(bpAnswers) : null
  const phaseProgress = blueprint ? computePhaseProgress(bpAnswers) : null
  const currentPhase = phaseProgress?.find(p => p.ratio < 1)?.name ?? 'SPARK'
  const projectName = (bpAnswers.project_name as string) || 'Our Community'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const locked = (minRole: string) => !atLeast(role, minRole)

  const modules: ModuleCard[] = [
    {
      num: '01', name: 'Community Network',
      desc: `${memberCount} members · explore profiles and match`,
      color: 'var(--m1)', href: '/network', locked: false,
    },
    {
      num: '04', name: 'Our community & neighborhood plan at a glance',
      desc: overall !== null
        ? `${overall.toFixed(1)}/10 readiness · ${gatesPassed}/4 gates · ${currentPhase} phase`
        : 'Community blueprint not started',
      color: 'var(--m4)', href: '/blueprint', locked: false,
    },
    {
      num: '05', name: 'Join',
      desc: application
        ? `Application ${application.status}`
        : '3 steps · sign the values to become a member',
      color: 'var(--m5)', href: '/join', locked: false,
      cta: application ? undefined : 'Start',
    },
    {
      num: '06', name: 'Agreements',
      desc: `${activeProjects} open project${activeProjects !== 1 ? 's' : ''} · propose collaboration`,
      color: 'var(--m6)', href: '/agreements', locked: locked('joining'),
    },
    {
      num: '07', name: 'Operations',
      desc: `${activeProjects} active project${activeProjects !== 1 ? 's' : ''} · deliverables & sprints`,
      color: 'var(--m7)', href: '/ops', locked: locked('joining'),
    },
    {
      num: '08', name: 'Contributions',
      desc: 'Track points, badges, and logged effort',
      color: 'var(--m8)', href: '/contributions', locked: locked('member'),
    },
    {
      num: '09', name: 'Governance',
      desc: openProposals > 0
        ? `${openProposals} open proposal${openProposals !== 1 ? 's' : ''} · vote or comment`
        : 'No open proposals · submit one',
      color: 'var(--m9)', href: '/governance', locked: locked('member'),
    },
    {
      num: '14', name: 'Calendar',
      desc: upcomingEvents.length > 0
        ? `${upcomingEvents.length} upcoming · RSVP, help out or host`
        : 'Events and tasks · host or help out',
      color: 'var(--m14)', href: '/events', locked: false,
    },
    {
      num: '17', name: 'Circles',
      desc: 'Circles, teams and who leads them',
      color: 'var(--m17)', href: '/org', locked: false,
    },
    {
      num: '15', name: 'Accommodation',
      desc: atLeast(role, 'joining') ? 'Book a room, cabin or tent site' : 'See where you could stay',
      color: 'var(--m15)', href: '/stays', locked: false,
    },
    {
      num: '16', name: 'Resources',
      desc: atLeast(role, 'joining') ? 'Book shared tools and spaces' : 'Browse shared tools and spaces',
      color: 'var(--m16)', href: '/bookings', locked: false,
    },
  ]

  type FeedItem = { who: string; act: string; when: string; color: string; tag: string; href?: string; ts: number }
  const rawFeed: FeedItem[] = []

  for (const m of recentMembers) {
    const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.username || 'Member'
    rawFeed.push({ who: name, act: 'joined the community', when: '', color: 'var(--m1)', tag: 'M01', ts: new Date(m.created_at).getTime() })
  }
  for (const o of (recentOffersRes.data ?? []) as any[]) {
    const p = o.user_profiles as any
    const name = [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.username || 'Someone'
    const title = (o.title as string).length > 50 ? (o.title as string).slice(0, 48) + '…' : o.title
    rawFeed.push({ who: name, act: `posted an offer — "${title}"`, when: '', color: 'var(--m1)', tag: 'M01', href: p?.username ? `/u/${p.username}` : undefined, ts: new Date(o.created_at).getTime() })
  }
  for (const s of (recentSeeksRes.data ?? []) as any[]) {
    const p = s.user_profiles as any
    const name = [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.username || 'Someone'
    const title = (s.title as string).length > 50 ? (s.title as string).slice(0, 48) + '…' : s.title
    rawFeed.push({ who: name, act: `is looking for — "${title}"`, when: '', color: 'var(--m1)', tag: 'M01', href: p?.username ? `/u/${p.username}` : undefined, ts: new Date(s.created_at).getTime() })
  }
  for (const p of recentProjects) {
    rawFeed.push({ who: 'New project', act: `"${p.title}"`, when: '', color: 'var(--m7)', tag: 'M07', href: `/ops/${p.id}`, ts: new Date(p.created_at).getTime() })
  }
  for (const p of recentProposals) {
    rawFeed.push({ who: 'New proposal', act: `"${p.title}"`, when: '', color: 'var(--m9)', tag: 'M09', href: '/governance', ts: new Date(p.created_at).getTime() })
  }
  for (const u of (opsUpdatesRes.data ?? []) as any[]) {
    const author = u.user_profiles?.first_name ?? u.user_profiles?.username ?? 'Someone'
    const proj = u.projects?.title ?? 'a project'
    const body = (u.content as string).length > 60 ? (u.content as string).slice(0, 58) + '…' : u.content
    rawFeed.push({ who: author, act: `on "${proj}" — ${body}`, when: '', color: 'var(--m7)', tag: 'M07', href: `/ops/${u.project_id}`, ts: new Date(u.created_at).getTime() })
  }
  for (const d of (opsTasksRes.data ?? []) as any[]) {
    const proj = d.projects?.title ?? 'a project'
    const task = (d.title as string).length > 50 ? (d.title as string).slice(0, 48) + '…' : d.title
    rawFeed.push({ who: 'New task', act: `on "${proj}" — ${task}`, when: '', color: 'var(--m7)', tag: 'M07', href: `/ops/${d.project_id}`, ts: new Date(d.created_at).getTime() })
  }

  const feed = rawFeed
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 8)
    .map(item => ({ ...item, when: timeAgo(new Date(item.ts)) }))

  type MemberActivity = { id: string; who: string; act: string; href: string; ts: number }
  const memberActivity: MemberActivity[] = [
    ...(recentMembersRes.data ?? []).filter((m: any) => m.id !== user?.id).map((m: any) => {
      const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.username || 'Someone'
      return { id: 'join-' + m.id, who: name, act: 'joined the community', href: `/u/${m.username}`, ts: new Date(m.created_at).getTime() }
    }),
    ...(recentOffersRes.data ?? []).map((o: any) => {
      const p = o.user_profiles as any
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.username || 'Someone'
      const title = (o.title as string).length > 50 ? (o.title as string).slice(0, 48) + '…' : o.title
      return { id: 'offer-' + o.id, who: name, act: `posted an offer — "${title}"`, href: `/u/${p?.username}`, ts: new Date(o.created_at).getTime() }
    }),
    ...(recentSeeksRes.data ?? []).map((s: any) => {
      const p = s.user_profiles as any
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.username || 'Someone'
      const title = (s.title as string).length > 50 ? (s.title as string).slice(0, 48) + '…' : s.title
      return { id: 'seek-' + s.id, who: name, act: `is looking for — "${title}"`, href: `/u/${p?.username}`, ts: new Date(s.created_at).getTime() }
    }),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 10)

  const showNextStep = !!user && !atLeast(role, 'joining')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 28px 80px' }}>

      <BannerImage height={200} isAdmin={role === 'admin'} style={{ marginBottom: 22 }} />

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>
          M00 · Dashboard
        </div>
        {!user ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px, 3vw, 28px)', color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 6px' }}>
                Community Dashboard
              </h1>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
                {memberCount} member{memberCount !== 1 ? 's' : ''} · {activeProjects} active project{activeProjects !== 1 ? 's' : ''} · {projectName}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <Link href="/auth/signup" style={{ fontSize: 13, fontWeight: 700, color: '#fff', padding: '7px 16px', border: 'none', borderRadius: 8, textDecoration: 'none', background: 'var(--m9)' }}>
                Join the community →
              </Link>
              <Link href="/auth/login" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', padding: '7px 14px', border: '1px solid var(--rule)', borderRadius: 8, textDecoration: 'none', background: 'var(--surface)' }}>
                Sign in
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px, 3vw, 28px)', color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 6px' }}>
                {greeting}, {displayName}.
              </h1>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
                You're {roleLabel === 'Explorer' ? 'an' : 'a'} <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{roleLabel}</span>
                {' '}at <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{projectName}</span>
                {' '}· {memberCount} member{memberCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <Link href="/blueprint" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', padding: '7px 14px', border: '1px solid var(--rule)', borderRadius: 8, textDecoration: 'none', background: 'var(--surface)' }}>
                View blueprint
              </Link>
              {!atLeast(role, 'joining') && (
                <Link href="/join" style={{ fontSize: 13, fontWeight: 700, color: '#fff', padding: '7px 16px', border: 'none', borderRadius: 8, textDecoration: 'none', background: 'var(--m5)' }}>
                  Begin joining →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Members" value={String(memberCount)} delta={newMembersThisWeek > 0 ? `+${newMembersThisWeek} this week` : 'none new this week'} href="/network" />
        <StatCard
          label="Blueprint readiness"
          value={overall !== null ? `${overall.toFixed(1)}` : '—'}
          suffix={overall !== null ? '/10' : ''}
          delta={currentPhase + ' phase'}
          deltaColor="var(--m4)"
          href="/blueprint"
        />
        <StatCard label="Open projects" value={String(activeProjects)} delta={activeProjects === 0 ? 'None yet' : projectsNeedingHelp > 0 ? `${projectsNeedingHelp} open to collaborators` : 'none need help right now'} href="/ops" />
        <StatCard
          label="Open proposals"
          value={String(openProposals)}
          delta={openProposals > 0 ? 'awaiting votes' : 'none open'}
          deltaColor="var(--m9)"
          href="/governance"
        />
      </div>

      <div className="dash-two-col" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, alignItems: 'start' }}>

        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
            Jump into a module
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {modules.map(c => (
              <ModCard key={c.num + c.name} {...c} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: '16px 18px' }}>
            <LinkedEventsList
              events={upcomingEvents}
              title="M14 · Coming up on the calendar"
              viewAllHref="/events?view=list"
              addHref={atLeast(role, 'joining') ? '/events?new=1' : null}
              limit={4}
              showKind
              emptyText="Nothing scheduled yet."
            />
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Projects activity</div>
              <Link href="/ops" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--m7)', textDecoration: 'none', fontWeight: 600 }}>View ops →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feed.length > 0 ? feed.map((a, i) => (
                <FeedRow key={i} {...a} />
              )) : (
                <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: 0 }}>No recent activity yet.</p>
              )}
            </div>
          </div>

          {memberActivity.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 10px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                  M01 · Member activity
                </div>
                <Link href="/network" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--m1)', textDecoration: 'none', fontWeight: 600 }}>View network →</Link>
              </div>
              <div style={{ borderTop: '1px solid var(--rule)' }}>
                {memberActivity.map((item, i) => (
                  <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                      borderBottom: i < memberActivity.length - 1 ? '1px solid color-mix(in srgb, var(--rule) 60%, transparent)' : 'none',
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: 'color-mix(in srgb, var(--m1) 15%, var(--surface))',
                        display: 'grid', placeItems: 'center',
                        fontSize: 9, fontWeight: 700, color: 'var(--m1)',
                      }}>
                        {item.who[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: 'var(--ink)' }}>{item.who}</strong>{' '}{item.act}
                      </div>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', flexShrink: 0 }}>
                        {timeAgo(new Date(item.ts))}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {showNextStep && (
            <div style={{
              background: 'color-mix(in srgb, var(--m5) 6%, var(--surface))',
              border: '1px dashed color-mix(in srgb, var(--m5) 30%, var(--rule))',
              borderRadius: 10, padding: '16px 18px',
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--m5)', letterSpacing: '0.08em', marginBottom: 5 }}>
                NEXT STEP
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>
                {application ? 'Application under review' : 'Sign the community values'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: 12 }}>
                {application
                  ? 'Your application has been submitted. The admin team will review it and reach out.'
                  : '3 simple steps move you from Explorer to Joining. Unlocks Agreements, Operations, Contributions and Governance.'}
              </div>
              {!application && (
                <Link href="/join" style={{ display: 'inline-block', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--m5)', padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>
                  Start joining →
                </Link>
              )}
            </div>
          )}

          {!!user && atLeast(role, 'joining') && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                Welcome, {roleLabel}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                Agreements, Operations, and more are unlocked. Explore them in the left nav.
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}

function StatCard({ label, value, suffix, delta, deltaColor, href }: {
  label: string; value: string; suffix?: string; delta: string; deltaColor?: string; href?: string
}) {
  const inner = (
    <div className={href ? 'dash-stat-card dash-stat-card--link' : 'dash-stat-card'}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>
        {value}
        {suffix && <span style={{ fontSize: 16, color: 'var(--ink-4)' }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: deltaColor ?? 'var(--ink-4)' }}>
        {delta}
      </div>
    </div>
  )
  if (href) return <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
  return inner
}

function ModCard({ num, name, desc, color, href, locked, cta }: ModuleCard) {
  const inner = (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10,
      padding: '14px 16px', opacity: locked ? 0.55 : 1,
      transition: locked ? 'none' : 'box-shadow 140ms, transform 140ms',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 4 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color, letterSpacing: '0.06em' }}>
          M{num}
        </span>
        {cta && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: color, padding: '2px 8px', borderRadius: 20 }}>
            {cta}
          </span>
        )}
        {locked && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>🔒 Member</span>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>{name}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{desc}</div>
    </div>
  )

  if (locked) return <div style={{ cursor: 'default' }}>{inner}</div>

  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      {inner}
    </Link>
  )
}

function FeedRow({ who, act, when, color, tag, href }: { who: string; act: string; when: string; color: string; tag: string; href?: string; ts?: number }) {
  const initials = who.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
  const inner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: `color-mix(in srgb, ${color} 18%, var(--surface))`,
        display: 'grid', placeItems: 'center',
        color, fontSize: 9.5, fontWeight: 700,
      }}>
        {initials}
      </div>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
        color, background: `color-mix(in srgb, ${color} 12%, transparent)`,
        padding: '2px 6px', borderRadius: 4, flexShrink: 0,
      }}>
        {tag}
      </span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <strong style={{ color: 'var(--ink)' }}>{who}</strong>{' '}{act}
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', flexShrink: 0, marginLeft: 4 }}>{when}</span>
    </div>
  )
  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>
  return inner
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}
