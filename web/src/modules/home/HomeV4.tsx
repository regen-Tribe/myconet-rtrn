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
 *   4. What's here, grouped like the menu (Community, then Working together) with the menu's own names and
 *      icons, in one colour. The inviting pages come first and large, with what's live inside them: members'
 *      faces, the next events, projects under way, the open proposals. The rest follow as small rows.
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

// One line per page of the menu, saying what you do there (LEXICON words). The menu gives the name, icon and order.
const LINE: Record<string, string> = {
  members: 'Meet the people: who’s here, what they offer and what they’re looking for',
  calendar: 'Meals, workshops, work days and community meetings',
  circles: 'The working circles and who leads what',
  amenities: 'Rooms, cabins, tools and spaces to book and borrow',
  map: 'The land, with every place on it',
  operations: 'Every project and task, from idea to done',
  governance: 'Proposals, and the votes that settle them',
  agreements: 'Who has agreed to do what',
  meetings: 'Notes and decisions from our meetings',
}
// The pages shown large, most inviting first; the rest follow small, in the menu's order
const BIG = ['members', 'calendar', 'operations', 'governance']

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
      .order('closes_at', { ascending: true }).limit(2),
    // The live numbers on the tiles; each one RLS lets the viewer see (a zero just isn't shown)
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('user_profiles').select('id, first_name, avatar_url').not('avatar_url', 'is', null).limit(7),
    supabase.from('org_units').select('id', { count: 'exact', head: true }).eq('kind', 'circle'),
    supabase.from('events').select('id', { count: 'exact', head: true }).gte('starts_at', now).lte('starts_at', inMonth),
    supabase.from('projects').select('id, title', { count: 'exact' }).in('status', [...ACTIVE_PROJECT_STATUSES])
      .order('updated_at', { ascending: false }).limit(3),
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
  const proposals = (proposalsRes.data ?? []) as { id: string; title: string; closes_at: string | null }[]
  const openVotes = proposalsRes.count ?? 0
  const projects = (projectsRes.data ?? []) as { id: string; title: string }[]
  const faces = ((facesRes.data ?? []) as { id: string; first_name: string | null; avatar_url: string | null }[]).filter(f => f.avatar_url)

  // A live number per page, when there is one to show
  const meta: Record<string, string | null> = {
    members: peopleRes.count ? plural(peopleRes.count, 'person', 'people') : null,
    calendar: monthRes.count ? `${monthRes.count} in the next 30 days` : null,
    circles: circlesRes.count ? plural(circlesRes.count, 'circle') : null,
    operations: projectsRes.count ? `${plural(projectsRes.count, 'project')} under way` : null,
    governance: openVotes ? plural(openVotes, 'open proposal') : null,
  }

  // What's here, in the menu's own groups (Community, then Working together) and with its names and icons.
  // In each group the inviting pages come first and large; pages that open on joining say so.
  const groups = menuGroups(name)
    .filter(g => g.items.some(i => LINE[i.key]))
    .map(g => {
      const items = g.items.filter(i => LINE[i.key] && !i.admin).map(i => ({ ...i, text: LINE[i.key], locked: !!i.joiningUp && !joined, meta: meta[i.key] ?? null }))
      return {
        label: g.label,
        line: g.line,
        big: BIG.map(k => items.find(i => i.key === k)).filter((i): i is (typeof items)[number] => !!i),
        small: items.filter(i => !BIG.includes(i.key)),
      }
    })

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

      {/* Members' next step: the menu shows it on wide screens, so here only on phones */}
      {!steps && menu.next && <div className="hv4-phone-only"><NextStep title={menu.next.title} text={menu.next.line} href={menu.next.href} /></div>}

      {/* 4 · What's here, grouped like the menu */}
      {groups.map(g => (
        <section key={g.label} className="hv4-group" aria-label={g.label}>
          <div className="hv4-group__head">
            <h2 className="hv4-h">{g.label}</h2>
            {g.line && <span>{g.line}</span>}
          </div>
          <div className="hv4-big">
            {g.big.map(t => {
              const inner = (
                <>
                  <div className="hv4-tile__top">
                    <IconTile name={t.icon} tone="grey" />
                    <span className="hv4-tile__t"><b>{t.name}</b><small>{t.text}</small></span>
                    <Icon name={t.locked ? 'lock' : 'right'} size={16} />
                  </div>
                  {t.key === 'members' && faces.length > 0 && (
                    <span className="hv4-faces" aria-hidden="true">{faces.map(f => <img key={f.id} src={f.avatar_url!} alt="" />)}</span>
                  )}
                  {t.key === 'calendar' && events.length > 0 && (
                    <span className="hv4-list">
                      {events.map(e => (
                        <span key={e.id} className="hv4-li">
                          <span className="hv4-date" aria-hidden="true"><b>{fmt(e.starts_at, { day: 'numeric' })}</b><small>{fmt(e.starts_at, { month: 'short' })}</small></span>
                          <span><b>{e.title}</b><small>{when(e.starts_at, e.all_day)}{e.location ? ` · ${e.location}` : ''}</small></span>
                        </span>
                      ))}
                    </span>
                  )}
                  {t.key === 'operations' && projects.length > 0 && (
                    <span className="hv4-list">{projects.map(p => <span key={p.id} className="hv4-li hv4-li--dot"><span><b>{p.title}</b></span></span>)}</span>
                  )}
                  {t.key === 'governance' && proposals.length > 0 && (
                    <span className="hv4-list">
                      {proposals.map(p => <span key={p.id} className="hv4-li hv4-li--dot"><span><b>{p.title}</b><small>{closesIn(p.closes_at)}</small></span></span>)}
                    </span>
                  )}
                  <span className="hv4-tile__meta">{t.locked ? 'Opens when you join' : t.meta ?? `Open ${t.name}`}</span>
                </>
              )
              return t.locked
                ? <span key={t.key} className="hv4-tile hv4-tile--big hv4-tile--locked" aria-disabled="true">{inner}</span>
                : <Link key={t.key} href={t.href} className="hv4-tile hv4-tile--big">{inner}</Link>
            })}
          </div>
          {g.small.length > 0 && (
            <div className="hv4-smalls">
              {g.small.map(t => {
                const inner = (
                  <>
                    <IconTile name={t.icon} tone="grey" />
                    <span className="hv4-tile__t"><b>{t.name}</b><small>{t.locked ? 'Opens when you join' : t.text}</small></span>
                    {!t.locked && t.meta && <span className="hv4-tile__n">{t.meta}</span>}
                    <Icon name={t.locked ? 'lock' : 'right'} size={15} />
                  </>
                )
                return t.locked
                  ? <span key={t.key} className="hv4-tile hv4-tile--small hv4-tile--locked" aria-disabled="true">{inner}</span>
                  : <Link key={t.key} href={t.href} className="hv4-tile hv4-tile--small">{inner}</Link>
              })}
            </div>
          )}
        </section>
      ))}

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
