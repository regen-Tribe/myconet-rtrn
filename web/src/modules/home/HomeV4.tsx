import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/server'
import { loadBranding } from '@/core/lib/branding-server'
import { loadMenuState } from '@/core/lib/menu-server'
import { menuGroups } from '@/core/lib/nav'
import { isFullMember, isJoiningOrAbove } from '@/core/lib/roles'
import { ACTIVE_PROJECT_STATUSES } from '@/core/lib/project-status'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import { Icon, IconTile, NextStep } from '@/core/components/v4'
import { glanceText } from './lib/at-a-glance'
import './home-v4.css'

/**
 * Home in the v4 look (Sonia, 20 Nov: "it's overwhelming… shouldn't be long", then "too flat", and "say
 * this is your portal, so it presents MyCoNet as well as Protopia itself"). Short, with two voices:
 *   1. A photo hero: welcome to the community, what it is in one line, two ways in
 *   2. Your way in: Start here as a journey of three steps, set on the hero's edge so it's the first thing
 *      to do (people still finding their feet only; members get their next step instead)
 *   3. Two cards side by side: About {community} (the Blueprint's words) and "Your portal" (what MyCoNet is
 *      and how to find your way: the cobalt-and-cream of the v4 drawings)
 *   4. What happens on MyCoNet: the menu's own pages as tiles, told as what people do, with live numbers
 *   5. Happening now: what's on and what needs a vote
 * The long module-by-module tour stays at /home?tour=1 (HomeClient), linked at the foot.
 */

type Step = { title: string; text: string; href: string; done: boolean }

const BRAND_MARK = process.env.NEXT_PUBLIC_BRAND_MARK || ''
const TZ = process.env.COMMUNITY_TIME_ZONE || 'UTC'
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...o }).format(new Date(iso))
const when = (iso: string, allDay?: boolean | null) =>
  fmt(iso, { weekday: 'short' }) + (allDay ? ' · all day' : ` · ${fmt(iso, { hour: '2-digit', minute: '2-digit', hour12: false })}`)
function closesIn(iso: string | null) {
  if (!iso) return 'Open for votes'
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)
  return d <= 0 ? 'Closes today' : d === 1 ? 'Closes tomorrow' : `${d} days left to vote`
}
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`

type Tone = 'blue' | 'red' | 'yellow' | 'green' | 'violet' | 'grey'
type IconKey = 'users' | 'calendar' | 'circles' | 'pin' | 'board' | 'chat' | 'scale'

// What people do here, one line each, linked to the page (LEXICON words, sentence case)
const HAPPENS: { key: string; icon: IconKey; tone: Tone; title: string; text: string }[] = [
  { key: 'members', icon: 'users', tone: 'red', title: 'Meet the people', text: 'Who’s here, what they offer and what they’re looking for' },
  { key: 'calendar', icon: 'calendar', tone: 'red', title: 'Gather', text: 'Meals, workshops, work days and community meetings' },
  { key: 'circles', icon: 'circles', tone: 'violet', title: 'Find your circle', text: 'The working circles and who leads what' },
  { key: 'amenities', icon: 'pin', tone: 'yellow', title: 'Book and borrow', text: 'Rooms, cabins, tools and spaces, on the Map' },
  { key: 'operations', icon: 'board', tone: 'blue', title: 'Work together', text: 'Every task, from idea to done' },
  { key: 'meetings', icon: 'chat', tone: 'violet', title: 'Keep track', text: 'Notes and decisions from our meetings' },
  { key: 'governance', icon: 'scale', tone: 'yellow', title: 'Decide together', text: 'Proposals, and the votes that settle them' },
]

export default async function HomeV4() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const uid = user?.id ?? null
  const now = new Date().toISOString()
  const inMonth = new Date(Date.now() + 30 * 864e5).toISOString()

  const [{ data: bp }, branding, profileRes, appRes, unitsRes, eventsRes, proposalsRes, peopleRes, facesRes, circlesRes, monthRes, projectsRes] = await Promise.all([
    supabase.from('blueprints').select('answers').eq('is_community', true).maybeSingle(),
    loadBranding(supabase),
    uid ? supabase.from('user_profiles').select('first_name, role, avatar_url, headline').eq('id', uid).maybeSingle() : Promise.resolve({ data: null }),
    uid ? supabase.from('applications').select('status').eq('user_id', uid).maybeSingle() : Promise.resolve({ data: null }),
    uid ? supabase.from('org_unit_members').select('org_units(kind)').eq('user_id', uid) : Promise.resolve({ data: [] }),
    // RLS shows visitors and explorers public events only
    supabase.from('events').select('id, title, starts_at, all_day, location')
      .gte('starts_at', now).order('starts_at', { ascending: true }).limit(3),
    supabase.from('proposals').select('id, title, closes_at', { count: 'exact' }).eq('status', 'open')
      .order('closes_at', { ascending: true }).limit(1),
    // The live numbers on the tiles; each one RLS lets the viewer see (a zero just isn't shown)
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('user_profiles').select('id, first_name, avatar_url').not('avatar_url', 'is', null).limit(5),
    supabase.from('org_units').select('id', { count: 'exact', head: true }).eq('kind', 'circle'),
    supabase.from('events').select('id', { count: 'exact', head: true }).gte('starts_at', now).lte('starts_at', inMonth),
    supabase.from('projects').select('id', { count: 'exact', head: true }).in('status', [...ACTIVE_PROJECT_STATUSES]),
  ])

  const answers = ((bp as { answers?: Record<string, unknown> } | null)?.answers ?? {}) as Record<string, unknown>
  const name = COMMUNITY_NAME
  const profile = profileRes.data as { first_name: string | null; role: string | null; avatar_url: string | null; headline: string | null } | null
  const role = profile?.role ?? 'explorer'
  const firstName = profile?.first_name || null
  const menu = await loadMenuState(supabase, uid, role)

  // What the community is and why, in its own words: the Blueprint's first sentences
  const pick = (keys: string[], max: number) => keys.map(k => glanceText(answers[k], max)).find(Boolean) ?? null
  const what = pick(['community_type', 'mission_statement', 'vision_statement'], 420)
  const why = pick(['purpose', 'why_world', 'dream_origin'], 420)
  // The hero's short line: the first clause, without "We are" ("A regenerative farm and co-living laboratory in the hills of La Cabanga")
  const tagline = what ? what.replace(/^we are\s+/i, '').split(/[,:;]\s/)[0].replace(/\.$/, '').replace(/^./, c => c.toUpperCase()) : null

  const joined = !!uid && isJoiningOrAbove(role)
  const member = !!uid && isFullMember(role)
  const hasProfile = !!(profile?.avatar_url || profile?.headline)
  const inCircle = ((unitsRes.data ?? []) as any[]).some(r => (Array.isArray(r.org_units) ? r.org_units[0] : r.org_units)?.kind === 'circle')

  // Start here: three steps for where you are on the way in (LEXICON words)
  const steps: Step[] | null = !uid
    ? [
        { title: `Read about ${name}`, text: 'What we’re building and how we live', href: '/about', done: false },
        { title: 'Meet the members', text: 'Who’s here and what they offer', href: '/members', done: false },
        { title: 'Create your account', text: 'Then tell us who you are, in three short steps', href: '/auth/signup', done: false },
      ]
    : !joined
      ? [
          { title: `Read about ${name}`, text: 'What we’re building and how we live', href: '/about', done: false },
          { title: 'Fill in your profile', text: 'A photo and a line about you', href: '/profile/edit', done: hasProfile },
          { title: appRes.data ? 'Your application is in' : 'Start joining', text: appRes.data ? 'A circle lead answers within a week' : 'Tell the community who you are', href: '/join', done: !!appRes.data },
        ]
      : !member
        ? [
            { title: 'Fill in your profile', text: 'A photo and a line about you', href: '/profile/edit', done: hasProfile },
            { title: 'Ask to join a circle', text: 'Find where you’d like to help', href: '/circles', done: inCircle },
            { title: 'Your first agreement', text: 'One accepted agreement makes you a member', href: '/operations', done: false },
          ]
        : null
  const current = steps?.findIndex(s => !s.done) ?? -1

  const events = (eventsRes.data ?? []) as { id: string; title: string; starts_at: string; all_day: boolean | null; location: string | null }[]
  const proposal = ((proposalsRes.data ?? []) as { id: string; title: string; closes_at: string | null }[])[0] ?? null
  const openVotes = proposalsRes.count ?? 0
  const faces = ((facesRes.data ?? []) as { id: string; first_name: string | null; avatar_url: string | null }[]).filter(f => f.avatar_url)

  // A live number per tile, when there is one to show
  const meta: Record<string, string | null> = {
    members: peopleRes.count ? plural(peopleRes.count, 'person', 'people') : null,
    calendar: monthRes.count ? `${monthRes.count} in the next 30 days` : null,
    circles: circlesRes.count ? plural(circlesRes.count, 'circle') : null,
    operations: projectsRes.count ? `${plural(projectsRes.count, 'project')} under way` : null,
    governance: openVotes ? `${plural(openVotes, 'open proposal')}` : null,
  }

  // What happens on MyCoNet: the menu's pages, told as what people do here (locked ones say when they open)
  const pages = new Map(menuGroups(name).flatMap(g => g.items).map(i => [i.key, i]))
  const happens = HAPPENS.filter(h => pages.has(h.key))
    .map(h => ({ ...h, href: pages.get(h.key)!.href, locked: !!pages.get(h.key)!.joiningUp && !joined, meta: meta[h.key] ?? null }))

  const heroLinks = uid
    ? [{ href: '/dashboard', label: 'My dashboard' }, { href: '/about', label: `About ${name}` }]
    : [{ href: '/about', label: `Read about ${name}` }, { href: '/members', label: 'Meet the members' }]

  return (
    <div className="v4-page hv4">
      {/* 1 · Welcome */}
      <header className={`hv4-hero${steps ? ' hv4-hero--journey' : ''}`} style={branding.banner_url ? { backgroundImage: `url(${branding.banner_url})` } : undefined}>
        <span className="hv4-hero__chip">
          {BRAND_MARK ? <img src={BRAND_MARK} alt="" aria-hidden="true" /> : null}
          {name} <i>on MyCoNet</i>
        </span>
        <div className="hv4-hero__in">
          <h1>{firstName ? <>Welcome, <em>{firstName}</em></> : <>Welcome to <em>{name}</em></>}</h1>
          {tagline && <p>{tagline}</p>}
          <div className="hv4-hero__acts">
            <Link href={heroLinks[0].href} className="hv4-pill hv4-pill--white">{heroLinks[0].label} <Icon name="right" size={15} /></Link>
            <Link href={heroLinks[1].href} className="hv4-pill hv4-pill--glass">{heroLinks[1].label}</Link>
          </div>
        </div>
      </header>

      {/* 2 · Your way in: the journey, set on the hero's edge (members get their next step instead) */}
      {steps && (
        <section className="hv4-journey" aria-labelledby="hv4-start">
          <div className="hv4-journey__head">
            <span className="hv4-eyebrow">Your way in</span>
            <h2 id="hv4-start" className="hv4-h hv4-h--sm">Start here</h2>
            <small>{steps.filter(s => s.done).length} of {steps.length} done</small>
            {!uid && <small className="hv4-journey__signin">Have an account? <Link href="/auth/login">Sign in</Link></small>}
          </div>
          <ol className="hv4-path">
            {steps.map((s, i) => (
              <li key={s.title} className={`${s.done ? 'done' : ''}${i === current ? ' now' : ''}`}>
                <Link href={s.href}>
                  <span className="hv4-path__n">{s.done ? <Icon name="check" size={15} /> : i + 1}</span>
                  <span className="hv4-path__t"><b>{s.title}</b><small>{s.text}</small></span>
                  <Icon name="right" size={15} />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 3 · The community, and the portal */}
      <section className="hv4-pair" aria-label={`About ${name} and MyCoNet`}>
        <div className="hv4-card hv4-about">
          <span className="hv4-eyebrow">The community</span>
          <h2 className="hv4-h">About {name}</h2>
          {what && <p className="hv4-lead">{what}</p>}
          {why && <blockquote className="hv4-why">{why}</blockquote>}
          <Link href="/about" className="hv4-more">Read about {name} <Icon name="right" size={14} /></Link>
        </div>

        <div className="hv4-portal">
          <MyceliumDrawing />
          <span className="hv4-eyebrow">Your portal</span>
          <h2 className="hv4-h">This is MyCoNet, your way into {name}</h2>
          <p>
            Everything {name} does together lives here: who’s here and what they offer, what’s on, the work we share,
            our agreements and the decisions we take. What you add keeps the community’s second brain up to date,
            so nothing gets lost between meetings.
          </p>
          <ul className="hv4-how">
            <li><Icon name="search" size={16} /><span><b>Ask anything</b> in the bar at the top: a person, an event, a question</span></li>
            <li><Icon name="menu" size={16} /><span><b>Every page is in the menu</b>, grouped as Community and Working together</span></li>
            <li><Icon name="spark" size={16} /><span><b>Look around freely</b>: nothing you open here breaks anything</span></li>
          </ul>
        </div>
      </section>

      {/* 4 · What happens on MyCoNet */}
      <section aria-labelledby="hv4-happens" className="hv4-happens">
        <div className="hv4-head">
          <span className="hv4-eyebrow">What happens here</span>
          <h2 id="hv4-happens" className="hv4-h">What we do on MyCoNet</h2>
        </div>
        <div className="hv4-tiles">
          {happens.map((h, i) => {
            const inner = (
              <>
                <div className="hv4-tile__top">
                  <IconTile name={h.icon} tone={h.tone} />
                  {i === 0 && faces.length > 0 && (
                    <span className="hv4-faces" aria-hidden="true">
                      {faces.map(f => <img key={f.id} src={f.avatar_url!} alt="" />)}
                    </span>
                  )}
                </div>
                <b>{h.title}</b>
                <small>{h.text}</small>
                <span className="hv4-tile__meta">
                  {h.locked ? <><Icon name="lock" size={13} /> Opens when you join</> : h.meta ?? <>Open <Icon name="right" size={13} /></>}
                </span>
              </>
            )
            return h.locked
              ? <span key={h.key} className={`hv4-tile hv4-tile--locked${i === 0 ? ' hv4-tile--wide' : ''}`} aria-disabled="true">{inner}</span>
              : <Link key={h.key} href={h.href} className={`hv4-tile${i === 0 ? ' hv4-tile--wide' : ''}`}>{inner}</Link>
          })}
        </div>
      </section>

      {/* Members' next step: the menu shows it on wide screens, so here only on phones */}
      {!steps && menu.next && <div className="hv4-phone-only"><NextStep title={menu.next.title} text={menu.next.line} href={menu.next.href} /></div>}

      {/* 5 · What's on */}
      <div className="hv4-now-wrap">
        <section className="hv4-card" aria-labelledby="hv4-now">
          <span className="hv4-eyebrow">This week</span>
          <h2 id="hv4-now" className="hv4-h hv4-h--sm">Happening now</h2>
          <div className="hv4-rows hv4-rows--now">
            {events.map(e => (
              <Link key={e.id} href="/calendar" className="hv4-row">
                <span className="hv4-date" aria-hidden="true">
                  <b>{fmt(e.starts_at, { day: 'numeric' })}</b>
                  <small>{fmt(e.starts_at, { month: 'short' })}</small>
                </span>
                <span><b>{e.title}</b><small>{when(e.starts_at, e.all_day)}{e.location ? ` · ${e.location}` : ''}</small></span>
              </Link>
            ))}
            {proposal && (
              <Link href="/governance" className="hv4-row">
                <span className="hv4-date hv4-date--vote" aria-hidden="true"><Icon name="vote" size={20} /></span>
                <span><b>{proposal.title}</b><small>{closesIn(proposal.closes_at)}{openVotes > 1 ? ` · ${openVotes} open proposals` : ''}</small></span>
              </Link>
            )}
            {!events.length && !proposal && <p className="hv4-small">Nothing on the calendar yet. <Link href="/calendar">Open Calendar</Link></p>}
          </div>
        </section>
      </div>

      <p className="hv4-tour">New here and want the long version? <Link href="/home?tour=1">Take the full tour →</Link></p>
    </div>
  )
}

/** The portal card's drawing: a mycelium network (MyCoNet), cream on cobalt like the v4 drawings */
function MyceliumDrawing() {
  const nodes: [number, number, number][] = [
    [250, 40, 5], [300, 90, 7], [220, 120, 4], [330, 160, 5], [270, 190, 9], [190, 200, 4], [320, 240, 4], [240, 260, 6], [170, 150, 3], [350, 60, 3],
  ]
  const links: [number, number][] = [[0, 1], [1, 2], [1, 3], [3, 4], [2, 4], [4, 5], [4, 6], [4, 7], [2, 8], [5, 8], [1, 9], [6, 7], [5, 7]]
  return (
    <svg className="hv4-portal__art" viewBox="140 20 230 260" aria-hidden="true">
      {links.map(([a, b], i) => {
        const [x1, y1] = nodes[a], [x2, y2] = nodes[b]
        const mx = (x1 + x2) / 2 + (i % 2 ? 10 : -10), my = (y1 + y2) / 2 + (i % 3 ? -8 : 8)
        return <path key={i} d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} />
      })}
      {nodes.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
    </svg>
  )
}
