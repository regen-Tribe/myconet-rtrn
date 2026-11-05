'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { VERSION } from '@/core/lib/version'
import { LinkedEventsList } from '@/modules/m14-events/LinkedEventsList'
import type { CalendarEvent } from '@/modules/m14-events/types'
import { CommunityGlance } from '@/modules/home/CommunityGlance'
import { CirclesPreview, ResourcesPreview, StaysPreview, type CirclesPreviewData, type PreviewItem } from '@/modules/home/ModulePreviews'
import { CLUBHOUSE, MEMBER_MODULES } from '@/core/lib/nav'
import { COMMUNITY_NAME, DEFAULT_PURPOSE, FRAMEWORK_CREDIT } from '@/core/lib/instance'
import BannerImage from '@/core/components/BannerImage'
import ModuleOverview from '@/modules/home/ModuleOverview'
import AskSection from '@/modules/home/AskSection'
import type { GlanceTile } from '@/modules/home/lib/at-a-glance'
import './landing.css'

interface Props {
  firstName: string | null; communityPurpose?: string | null; upcomingEvents?: CalendarEvent[]; stats: LandingStats
  communityName: string; glance: GlanceTile[]
  previews: { items: PreviewItem[]; circles: CirclesPreviewData }
  /** The community's own values (Blueprint Step 1.4); example values are shown until there are some */
  values?: { title: string; description: string | null }[]
}

/* ── Tiny SVG icons ── */
const Check = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
    <polyline points="5 12 10 17 19 7" />
  </svg>
)
const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    style={{ width: 14, height: 14 }}>
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
)

const initials = (n: string) => n.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

/* ── Data ── */
export interface LandingStats { members: number; activeProjects: number; deliverables: number; openProposals: number }

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Clubhouse preview cards — counts are live, so visitors see the real community. */
function clubhouseCards(st: LandingStats) {
  return [
    { num: '01', name: 'Community Network',  desc: `Meet ${plural(st.members, 'member')} and explorers`,   color: 'var(--m1)', href: '/network' },
    { num: '04', name: 'Project Blueprint',  desc: 'Our neighborhood plan, phase by phase',                color: 'var(--m4)', href: '/blueprint' },
    { num: '05', name: 'Join the community', desc: 'A few steps · sign the values',                         color: 'var(--m5)', href: '/join', cta: true },
    { num: '06', name: 'Active projects',    desc: `${plural(st.activeProjects, 'project')} underway`,      color: 'var(--m6)', href: '/agreements' },
    { num: '07', name: 'Operations',         desc: plural(st.deliverables, 'deliverable'),                  color: 'var(--m7)', href: '/ops' },
    { num: '08', name: 'Your contributions', desc: 'Points and badges for showing up',                      color: 'var(--m8)', href: '/contributions' },
    { num: '09', name: 'Governance',         desc: `${plural(st.openProposals, 'proposal')} open for votes`, color: 'var(--m9)', href: '/governance' },
    { num: '14', name: 'Calendar',           desc: 'Events and tasks · open to everyone',                   color: 'var(--m14)', href: '/events' },
    { num: '15', name: 'Accommodation',      desc: 'Book a place to stay',                                  color: 'var(--m15)', href: '/stays' },
    { num: '16', name: 'Resources',          desc: 'Shared tools and spaces',                               color: 'var(--m16)', href: '/bookings' },
  ]
}

const MEMBERS = [
  { name: 'Ana Whitewater', where: 'San Cristóbal, MX',        av: 'var(--m1)', offers: ['Permaculture design', 'Mycology'],     seeks: ['Co-builders'],     match: 92 },
  { name: 'Eli Tanaka',     where: 'Visiting Tlaxcala, MAY',   av: 'var(--m4)', offers: ['Natural building', 'Cob'],             seeks: ['Land partner'],     match: 81 },
  { name: 'Priya Mahesh',   where: 'Berkeley, CA · Vision holder', av: 'var(--m9)', offers: ['NVC facilitation', 'Conflict mediation'], seeks: ['Resident circle'], match: 76 },
  { name: 'Diego Solá',     where: 'Oaxaca · Resident',        av: 'var(--m5)', offers: ['Investment capital'],                  seeks: ['Project leads'],    match: 68 },
]

const PILLARS = [
  { name: 'Ecology',    score: 4.2 },
  { name: 'Social',     score: 3.6 },
  { name: 'Economy',    score: 2.3 },
  { name: 'Hardware',   score: 2.8 },
  { name: 'Governance', score: 3.4 },
]

const VALUES = [
  { t: 'Care for the land before yield.',      d: 'Decisions are tested against ecological impact first, profit second.' },
  { t: 'Consent over consensus.',              d: 'We seek no objections, not unanimous applause. Move forward if good enough for now.' },
  { t: "Show up, don't just sign up.",         d: 'Logged contributions matter more than promises. Reputation is earned in the doing.' },
  { t: 'Disagree out loud, decide in writing.', d: 'Bring the hard things to the circle. What we decide goes in the Blueprint.' },
  { t: 'Leave it better.',                     d: 'Land, people, money — whatever you touch, leave it more alive than you found it.' },
]

const PROJECTS = [
  { name: 'Greywater wetlands install',  desc: 'Build the reed-bed wetland that handles all household greywater for Cluster A.', needs: ['Earthworks', 'Plumbing', '3 weekends'], open: true },
  { name: 'Funding circle, round 2',     desc: 'Find 4 more investor-members to close the BUILD-phase capital raise ($120k remaining).', needs: ['Network access', 'Pitch help', 'Legal review'] },
  { name: 'Onboarding new members (Q3)', desc: 'Run the application review, host two welcome calls, pair newcomers with mentors.', needs: ['Facilitation', 'Hospitality'] },
]

const DELIVERABLES = [
  { name: 'Soil tests at plots B, C, D',     who: '@ana',   due: 'May 28', done: true },
  { name: 'Greywater permit application',    who: '@diego', due: 'Jun 3',  done: true },
  { name: 'Reed-bed trench, Cluster A',      who: '@maya',  due: 'Jun 7',  done: false },
  { name: 'Founding circle agreement v3',    who: '@priya', due: 'Jun 12', done: false },
  { name: 'Funding circle — round 2 close', who: '@eli',   due: 'Jun 30', done: false, late: false },
]

const INITIAL_LOG = [
  { what: 'Reed-bed trench day 1 (6h)',          pts: 120, when: 'May 18' },
  { what: 'Hosted welcome call for 4 explorers', pts: 40,  when: 'May 14' },
  { what: 'Soil-test help, Plot C',              pts: 30,  when: 'May 11' },
  { what: 'Funding-circle pitch deck v2',        pts: 60,  when: 'May 06' },
  { what: 'Welcome dinner — cooked + hosted',    pts: 25,  when: 'May 02' },
]

const LAYERS = [
  { num: '01', name: 'Consent (Sociocracy)',       desc: 'Move forward if there are no principled objections — not unanimous applause.', mark: '☉' },
  { num: '02', name: 'Democracy (Majority)',        desc: 'Big shared choices. Open vote, simple majority, public results.',              mark: '☑' },
  { num: '03', name: 'Meritocracy (Domain expert)', desc: 'Technical calls go to the person with skin in the game.',                    mark: '△' },
  { num: '04', name: 'AI-mediated facilitation',   desc: 'When things stall, the AI surfaces blockers and finds the next move.',        mark: '◇' },
]

/* ── Section header (reused 7×) ── */
function SectionHead({ mod, label, color, h, lead }: { mod: string; label: string; color: string; h: string; lead: string }) {
  return (
    <div>
      <span className="lp-eyebrow" style={{ background: `color-mix(in srgb, ${color} 8%, transparent)`, color }}>
        <span className="lp-mod-dot" style={{ background: color }} />
        Module {mod} · {label}
      </span>
      <h2 className="lp-section-h">{h}</h2>
      <p className="lp-section-lead">{lead}</p>
    </div>
  )
}

/* ── Hero ── */
function Hero({ name, communityPurpose }: { name: string | null; communityPurpose: string | null }) {
  const displayName = name ?? 'you'
  return (
    <section className="lp-hero" id="welcome">
      <span className="lp-pill">{COMMUNITY_NAME} · Member portal</span>
      <h1>
        Welcome, {displayName}.<br />
        This is the <span className="underline">portal</span> for {COMMUNITY_NAME}, a{' '}
        <span className="keep-together">regenerative neighborhood</span> being formed — <span className="accent">together</span>.
      </h1>
      <p className="lp-lead">
        {communityPurpose
          ? communityPurpose
          : DEFAULT_PURPOSE}
      </p>
      <div className="lp-cta-row">
        <a className="lp-btn lp-btn-primary" href="#meet">Take the tour <Arrow /></a>
        <Link className="lp-btn lp-btn-secondary" href="/auth/signup">I&apos;m ready to join</Link>
      </div>
    </section>
  )
}

/* ── Clubhouse preview ── */
const PORTAL_STEPS = [
  { n: '1', title: 'Explore', text: 'Read the plan, meet the members, and browse the calendar — no account needed.' },
  { n: '2', title: 'Join', text: 'Apply, sign the community values, and become a joining member.' },
  { n: '3', title: 'Contribute', text: 'Book stays and resources, host events, join projects, and help decide what happens next.' },
]

function ClubhousePreview({ name, stats }: { name: string | null; stats: LandingStats }) {
  const displayName = name ?? 'Explorer'
  return (
    <>
    <section className="lp-section" id="how-it-works" style={{ paddingTop: 72, paddingBottom: 28 }}>
      <span className="lp-eyebrow" style={{ background: 'color-mix(in srgb, var(--ink) 8%, transparent)', color: 'var(--ink-2)' }}>
        <span className="lp-mod-dot" style={{ background: 'var(--ink-2)' }} />
        How this community portal works
      </span>
      <h2 className="lp-section-h">One portal for the whole neighborhood.</h2>
      <p className="lp-section-lead">
        MyCoNet is where this community organizes itself. Each module looks after one part of neighborhood life —
        members, the plan, joining, the calendar, places to stay, shared resources, projects, contributions and
        decisions. Below is a preview of the dashboard that ties them together once you sign in.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 24 }}>
        {PORTAL_STEPS.map(s => (
          <div key={s.n} style={{ display: 'flex', gap: 12, background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '14px 16px' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--accent-color)' }}>{s.n}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{s.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginTop: 28 }}>
        Preview · what members see
      </div>
    </section>
    <div className="lp-clubhouse">
      <div className="lp-clubhouse-inner">
        <div className="lp-chrome">
          <span className="lp-dot lp-dot-r" /><span className="lp-dot lp-dot-y" /><span className="lp-dot lp-dot-g" />
          <span className="lp-url"><span className="lp-lock">🔒</span>greenhollow.myco.net/dashboard</span>
        </div>
        <div className="lp-ch-body">
          <aside className="lp-ch-side">
            <div className="lp-ch-who">
              <div className="lp-av">{initials(displayName + ' R')}</div>
              <div>
                <div className="lp-name">{displayName} Reyes</div>
                <div className="lp-role">Explorer</div>
              </div>
            </div>
            <div className="lp-ch-nav">
              <div className="lp-ch-nav-label">Clubhouse</div>
              {CLUBHOUSE.map(m => (
                <div key={m.num} className={`lp-ch-nav-item${m.num === '00' ? ' is-active' : ''}`}>
                  <span className="lp-swatch" style={{ background: m.color }} />
                  <span className="lp-mnum">M{m.num}</span> {m.name}
                </div>
              ))}
              <div className="lp-ch-nav-label">Once you&apos;re in</div>
              {MEMBER_MODULES.map(m => (
                <div key={m.num} className="lp-ch-nav-item" style={{ opacity: 0.5 }}>
                  <span className="lp-swatch" style={{ background: m.color }} />
                  <span className="lp-mnum">M{m.num}</span> {m.name}
                </div>
              ))}
            </div>
          </aside>
          <main className="lp-ch-main">
            <h3 className="lp-ch-greet">Good morning, {displayName}.</h3>
            <p className="lp-ch-sub">
              You&apos;re an <strong>Explorer</strong> at {COMMUNITY_NAME}. Read, browse, and meet
              people — sign the values to unlock the full community.
            </p>
            <div className="lp-ch-grid">
              {clubhouseCards(stats).map((c, i) => (
                <Link href={c.href} key={i} style={{ textDecoration: 'none' }}>
                  <div className="lp-ch-card" style={{ cursor: 'pointer' }}>
                    <div className="lp-accent-bar" style={{ background: c.color }} />
                    <div className="lp-ch-card-row1">
                      <span className="lp-mtag" style={{ color: c.color }}>M{c.num}</span>
                      {c.cta
                        ? <span className="lp-badge" style={{ background: c.color }}>Start</span>
                        : <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>↗</span>}
                    </div>
                    <div className="lp-title">{c.name}</div>
                    <div className="lp-desc">{c.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
    </>
  )
}

/* ── M01 Meet members ── */
function MeetSection() {
  return (
    <section className="lp-section" id="meet">
      <div className="lp-split">
        <div>
          <SectionHead
            mod="01" label="Community Network" color="var(--m1)"
            h="Meet the people gathering around this idea."
            lead="Before anything is built, the right people have to find each other. Browse rich profiles of every member, vision-holder, and explorer — sorted by how well your offers, seeks, values, and skills line up."
          />
          <div className="lp-why">
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Real profiles, not posts.</strong> What you bring, what you need, where you&apos;re headed.</p>
            </div>
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>AI match score</strong> across values, skills, OCEAN personality, and goals — not just keywords.</p>
            </div>
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Travel plans</strong> so you can connect IRL — visit a community before you commit.</p>
            </div>
          </div>
        </div>
        <div className="lp-demo">
          <div className="lp-demo-head">
            <div className="lp-demo-title">
              <span className="lp-mod-pill" style={{ background: 'var(--m1)' }}>M01</span>
              <strong>Residents · Top matches for you</strong>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>Example profiles</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MEMBERS.map((r, i) => (
              <div className="lp-neighbor-card" key={i}>
                <div className="lp-av-48" style={{ background: r.av }}>{initials(r.name)}</div>
                <div className="lp-neighbor-meta">
                  <div className="lp-neighbor-name-row">
                    <span className="lp-nname">{r.name}</span>
                    <span className="lp-match">{r.match}% match</span>
                  </div>
                  <div className="lp-nwhere">{r.where}</div>
                  <div className="lp-chips">
                    {r.offers.map(o => <span className="lp-chip lp-chip-offer" key={o}>+ {o}</span>)}
                    {r.seeks.map(s => <span className="lp-chip lp-chip-seek" key={s}>? {s}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── M04 Blueprint ── */
function BlueprintSection() {
  const [animated, setAnimated] = useState(false)
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setAnimated(true)
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="lp-section" id="blueprint" ref={ref}>
      <div className="lp-split reverse">
        <div className="lp-demo">
          <div className="lp-demo-head">
            <div className="lp-demo-title">
              <span className="lp-mod-pill" style={{ background: 'var(--m4)' }}>M04</span>
              <strong>Blueprint · {COMMUNITY_NAME}</strong>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>v3.2 · Living doc</span>
          </div>
          <div className="lp-phases">
            <div className="lp-phase done"><div className="lp-pname">SPARK</div><div className="lp-ptag">✓ Passed</div></div>
            <div className="lp-phase active"><div className="lp-pname">PROVE</div><div className="lp-ptag">In progress</div></div>
            <div className="lp-phase"><div className="lp-pname">BUILD</div><div className="lp-ptag">Locked</div></div>
            <div className="lp-phase"><div className="lp-pname">LIVE</div><div className="lp-ptag">Locked</div></div>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, marginTop: 14 }}>
            5 Pillars · Readiness
          </div>
          <div className="lp-pillars">
            {PILLARS.map(p => (
              <div className="lp-pillar" key={p.name}>
                <span className="lp-pillar-name">{p.name}</span>
                <div className="lp-pbar">
                  <div className="lp-pbar-fill" style={{ width: animated ? `${(p.score / 5) * 100}%` : '0%' }} />
                </div>
                <span className="lp-pval">{p.score.toFixed(1)}<span style={{ color: 'var(--ink-4)' }}>/5</span></span>
              </div>
            ))}
          </div>
          <div className="lp-gate">
            <strong style={{ color: 'var(--m4)' }}>Next gate:</strong> Economy must reach 3.0 before BUILD phase unlocks.
            The team is looking for funding-strategy contributors.
          </div>
        </div>
        <div>
          <SectionHead
            mod="04" label="Blueprint" color="var(--m4)"
            h="Read the plan. The whole plan."
            lead="No pitch deck. No marketing site. The Blueprint is the community's living planning document — open, honest, and updated every week. See what's been decided, what's still being worked out, and exactly how ready the project is."
          />
          <div className="lp-why">
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Four phases</strong> — SPARK → PROVE → BUILD → LIVE. You see exactly where the project stands.</p>
            </div>
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Five pillars</strong> with honest readiness scores — Ecology, Social, Economy, Hardware, Governance.</p>
            </div>
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Gate checks</strong> between phases — so excitement never outruns reality.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── M05 Join ── */
function JoinSection({ values }: { values: { title: string; description: string | null }[] }) {
  // The community's real values when it has written them, else examples (labelled as such)
  const shown = values.length ? values.map(v => ({ t: v.title, d: v.description ?? '' })) : VALUES
  const [checked, setChecked] = useState(() => shown.map(() => false))
  const toggle = (i: number) => setChecked(c => c.map((v, j) => j === i ? !v : v))
  const allChecked = checked.every(Boolean)
  const count = checked.filter(Boolean).length

  return (
    <section className="lp-section" id="join">
      <div className="lp-split">
        <div>
          <SectionHead
            mod="05" label="Join" color="var(--m5)"
            h="Joining is signing the values — not paying a fee."
            lead="When you're ready to move from explorer to joining member, you read the community's values and best practices, and you mark each one you can stand behind. Skip one? Bring it to the circle. Everything is negotiated, nothing is hidden."
          />
          <div className="lp-why">
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>No NDAs, no hidden rules.</strong> What you sign is what&apos;s in the Blueprint.</p>
            </div>
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Application reviewed by a real human</strong> — the project leads, not an algorithm.</p>
            </div>
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Unlocks Agreements, Operations, Contributions, and Governance.</strong></p>
            </div>
          </div>
        </div>
        <div className="lp-demo">
          <div className="lp-demo-head">
            <div className="lp-demo-title">
              <span className="lp-mod-pill" style={{ background: 'var(--m5)' }}>M05</span>
              <strong>{values.length ? `${COMMUNITY_NAME}'s values` : 'Example values'}</strong>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: allChecked ? 'var(--m5)' : 'var(--ink-3)' }}>
              {count}/{shown.length} signed
            </span>
          </div>
          <div className="lp-values">
            {shown.map((v, i) => (
              <div key={i}
                className={`lp-value-row${checked[i] ? ' checked' : ''}`}
                onClick={() => toggle(i)}
                role="checkbox"
                aria-checked={checked[i]}
                tabIndex={0}
                onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && toggle(i)}>
                <div className="lp-vbox"><Check /></div>
                <div>
                  <div className="lp-vt">{v.t}</div>
                  <div className="lp-vd">{v.d}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="lp-value-cta" disabled={!allChecked}>
            {allChecked ? 'Submit application →' : `Sign ${shown.length - count} more to continue`}
          </button>
        </div>
      </div>
    </section>
  )
}

/* ── M06 Agreements ── */
function AgreementsSection() {
  const [picked, setPicked] = useState(0)
  const [what, setWhat] = useState('Lead the trench-digging weekend with my excavator and 2 helpers.')
  const [expect, setExpect] = useState('20 contribution points + lunch on site + future member priority.')
  const [submitted, setSubmitted] = useState(false)

  return (
    <section className="lp-section" id="agreements">
      <div className="lp-split reverse">
        <div className="lp-demo">
          <div className="lp-demo-head">
            <div className="lp-demo-title">
              <span className="lp-mod-pill" style={{ background: 'var(--m6)' }}>M06</span>
              <strong>Open projects · Propose how you&apos;ll help</strong>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>3 open</span>
          </div>
          <div className="lp-proj-list">
            {PROJECTS.map((p, i) => (
              <div key={i}
                className={`lp-proj-card${i === picked ? ' selected' : ''}`}
                onClick={() => { setPicked(i); setSubmitted(false) }}>
                <div className="lp-proj-title">
                  <h4>{p.name}</h4>
                  {p.open && <span className="lp-open-pill">● Open</span>}
                </div>
                <p className="lp-pdesc">{p.desc}</p>
                <div className="lp-pneeds">
                  {p.needs.map(n => <span className="lp-chip" key={n}>{n}</span>)}
                </div>
                {i === picked && (
                  <div className="lp-agreement">
                    <div className="lp-agreement-label">Your proposal</div>
                    {submitted ? (
                      <div className="lp-submitted-msg">
                        <Check size={14} /> Submitted for review. The project lead will respond in 48h.
                      </div>
                    ) : (
                      <>
                        <div className="lp-field">
                          <label>What I&apos;ll contribute</label>
                          <textarea rows={2} value={what} onChange={e => setWhat(e.target.value)} />
                        </div>
                        <div className="lp-field">
                          <label>What I expect in return</label>
                          <input type="text" value={expect} onChange={e => setExpect(e.target.value)} />
                        </div>
                        <button className="lp-submit-btn" onClick={e => { e.stopPropagation(); setSubmitted(true) }}>
                          Send proposal →
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHead
            mod="06" label="Agreements" color="var(--m6)"
            h="Make visible deals on how you'll support."
            lead="Browse every active project — the ones quietly building, the ones loudly hiring. Propose exactly what you'll contribute, exactly what you expect in return. The team reviews. If accepted, your agreement is live and tracked."
          />
          <div className="lp-why">
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Clear scope, clear exchange.</strong> Time, skill, goods, money — write it down.</p>
            </div>
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Every agreement is public</strong> — no side deals, no resentment.</p>
            </div>
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Auto-feeds Operations and Contributions</strong> — once accepted, the work shows up everywhere it should.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── M07 Operations ── */
function OpsSection() {
  return (
    <section className="lp-section" id="ops">
      <div className="lp-split">
        <div>
          <SectionHead
            mod="07" label="Operations" color="var(--m7)"
            h="See every promise. Watch every deliverable."
            lead="A community lives or dies by what gets done. Operations turns every active agreement into visible deliverables — who owns it, when it's due, and whether it's actually happening. No surprises at the next meeting."
          />
          <div className="lp-why">
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Live status of every project</strong> — pulled from agreements, not status meetings.</p>
            </div>
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Timeline updates</strong> from project leads, threaded into the dashboard.</p>
            </div>
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Drift detection</strong> — when something slips, the community sees it before it becomes a crisis.</p>
            </div>
          </div>
        </div>
        <div className="lp-demo">
          <div className="lp-demo-head">
            <div className="lp-demo-title">
              <span className="lp-mod-pill" style={{ background: 'var(--m7)' }}>M07</span>
              <strong>{COMMUNITY_NAME} · This sprint</strong>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>Sprint 12 · May→Jun</span>
          </div>
          <div className="lp-ops-stat">
            <div className="lp-stat"><div className="lp-sn">5</div><div className="lp-sl">Active projects</div></div>
            <div className="lp-stat"><div className="lp-sn">12</div><div className="lp-sl">Deliverables</div></div>
            <div className="lp-stat"><div className="lp-sn">40%</div><div className="lp-sl">Sprint complete</div></div>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6 }}>
            Deliverables — Reed-bed wetland
          </div>
          <div className="lp-deliverables">
            {DELIVERABLES.map((d, i) => (
              <div key={i} className={`lp-deliv${d.done ? ' done' : ''}`}>
                <div className="lp-di-box">{d.done && <Check />}</div>
                <span className="lp-dname">{d.name}</span>
                <span className="lp-dwho">{d.who}</span>
                <span className={`lp-ddue${d.late ? ' late' : ''}`}>{d.due}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── M08 Contributions ── */
function ContributionsSection() {
  const [draft, setDraft] = useState({ what: 'Reed-bed trench day 2', cat: 'Build', hours: '5' })
  const [log, setLog] = useState(INITIAL_LOG)
  const total = useMemo(() => log.reduce((s, r) => s + r.pts, 0), [log])

  const add = () => {
    const pts = Math.round((parseFloat(draft.hours) || 0) * 20)
    if (!draft.what.trim() || pts <= 0) return
    setLog(l => [{ what: draft.what, pts, when: 'Today' }, ...l])
    setDraft({ what: '', cat: 'Build', hours: '' })
  }

  return (
    <section className="lp-section" id="contributions">
      <div className="lp-split reverse">
        <div className="lp-demo">
          <div className="lp-demo-head">
            <div className="lp-demo-title">
              <span className="lp-mod-pill" style={{ background: 'var(--m8)' }}>M08</span>
              <strong>Your contribution log</strong>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>Top 25% · Sprint 12</span>
          </div>
          <div className="lp-points-hero">
            <div>
              <div className="lp-points-num">{total}</div>
              <div className="lp-points-label">Points this sprint</div>
            </div>
            <div className="lp-points-info">
              <div className="lp-points-rank">3 badges earned · Builder · Welcomer · Funder</div>
              <div className="lp-badge-row">
                <span className="lp-badge-circ">🪨</span>
                <span className="lp-badge-circ">🤝</span>
                <span className="lp-badge-circ">💰</span>
                <span className="lp-badge-circ locked">🌿</span>
                <span className="lp-badge-circ locked">⚖️</span>
                <span className="lp-badge-circ locked">✦</span>
              </div>
            </div>
          </div>
          <div className="lp-log-form">
            <input placeholder="What did you do?" value={draft.what}
              onChange={e => setDraft(d => ({ ...d, what: e.target.value }))} />
            <select value={draft.cat} onChange={e => setDraft(d => ({ ...d, cat: e.target.value }))}>
              <option>Build</option><option>Care</option><option>Decide</option>
              <option>Welcome</option><option>Fund</option>
            </select>
            <input type="number" placeholder="Hours" value={draft.hours}
              onChange={e => setDraft(d => ({ ...d, hours: e.target.value }))} />
            <button style={{ gridColumn: '1 / -1' }} onClick={add}>
              Log it · earn {Math.round((parseFloat(draft.hours) || 0) * 20)} pts
            </button>
          </div>
          <div className="lp-log-list">
            {log.slice(0, 5).map((r, i) => (
              <div className="lp-log-row" key={i}>
                <span>{r.what}</span>
                <span className="lp-lwhen">{r.when}</span>
                <span className="lp-lpts">+{r.pts}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHead
            mod="08" label="Contribution Tracking" color="var(--m8)"
            h="Log your effort. The community sees it. You're rewarded."
            lead="Volunteer work goes invisible. Not here. Log every hour, every batch of bread, every facilitated meeting. Earn points, unlock badges, build a reputation that means something beyond this project."
          />
          <div className="lp-why">
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Points</strong> for time, energy, and resources brought to community work.</p>
            </div>
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Badges</strong> for milestones — first build day, first funding round, first conflict mediated.</p>
            </div>
            <div className="lp-why-row"><div className="lp-check"><Check /></div>
              <p><strong>Reputation that travels</strong> — across the Hive, to future communities.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── M09 Governance ── */
function GovernanceSection() {
  const [layer, setLayer] = useState(0)
  const [vote, setVote] = useState<null | 'yes' | 'concern' | 'no'>(null)
  const yes = 14 + (vote === 'yes' ? 1 : 0)
  const con = 3  + (vote === 'concern' ? 1 : 0)
  const no  = 2  + (vote === 'no' ? 1 : 0)
  const total = yes + con + no

  return (
    <section className="lp-section" id="governance">
      <SectionHead
        mod="09" label="Governance" color="var(--m9)"
        h="Decide together. Four layers, one community."
        lead="Big questions, small calls, technical judgments, and impossible deadlocks — each deserves a different decision tool. The Governance module gives you four layered modes and one AI facilitator that knows when to use which."
      />
      <div className="lp-gov-layers" style={{ marginTop: 32 }}>
        {LAYERS.map((l, i) => (
          <div key={i} className={`lp-gov-layer${i === layer ? ' active' : ''}`} onClick={() => setLayer(i)}>
            <span className="lp-layer-mark">{l.mark}</span>
            <div className="lp-layer-num">LAYER {l.num}</div>
            <div className="lp-layer-name">{l.name}</div>
            <div className="lp-layer-desc">{l.desc}</div>
          </div>
        ))}
      </div>
      <div className="lp-proposal">
        <h4>Proposal · &ldquo;Approve $24k for reed-bed wetland materials&rdquo;</h4>
        <div className="lp-pmeta">
          Decision mode: <strong>{LAYERS[layer].name}</strong> · Opened by @priya · 2 days left · {total} of 19 members have voted
        </div>
        <div className="lp-vote-bar">
          <div className="lp-vote-seg yes"     style={{ flex: yes }}>{yes} consent</div>
          <div className="lp-vote-seg concern" style={{ flex: con }}>{con} concern</div>
          <div className="lp-vote-seg no"      style={{ flex: no  }}>{no} object</div>
        </div>
        <div className="lp-vote-buttons">
          <button className={`lp-vote-btn${vote === 'yes' ? ' cast' : ''}`} onClick={() => setVote('yes')}>✓ I consent</button>
          <button className={`lp-vote-btn${vote === 'concern' ? ' cast' : ''}`} onClick={() => setVote('concern')}>⚠ I have a concern</button>
          <button className={`lp-vote-btn${vote === 'no' ? ' cast' : ''}`} onClick={() => setVote('no')}>✗ I object</button>
        </div>
        {vote === 'concern' && (
          <div className="lp-concern-note">
            <strong>Concerns block nothing</strong> — they go on the record and trigger a 24h check-in
            before final tally. The AI facilitator will summarize concerns to the proposer.
          </div>
        )}
      </div>
    </section>
  )
}

/* ── M14 Events ── */
function EventsSection({ events }: { events: CalendarEvent[] }) {
  return (
    <section className="lp-section" id="events">
      <SectionHead
        mod="14" label="Calendar" color="var(--m14)"
        h="Show up. Gather. Celebrate."
        lead="Workdays, circle meetings, potlucks and celebrations all live on one community calendar. You can browse public events right now, no account needed."
      />
      <div style={{ marginTop: 28, maxWidth: 640, background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: 22 }}>
        <LinkedEventsList
          events={events}
          title="Coming up"
          viewAllHref="/events?view=list"
          addHref={null}
          limit={4}
          showKind
          emptyText="Nothing on the public calendar yet — check back soon."
        />
        <div className="lp-cta-row" style={{ marginTop: 18 }}>
          <Link className="lp-btn lp-btn-primary" href="/events">Open the calendar <Arrow /></Link>
        </div>
      </div>
    </section>
  )
}

/* ── M15 / M16 / M17 — live previews ── */
function PreviewSection({ id, mod, label, color, h, lead, children }: {
  id: string; mod: string; label: string; color: string; h: string; lead: string; children: React.ReactNode
}) {
  return (
    <section className="lp-section" id={id}>
      <SectionHead mod={mod} label={label} color={color} h={h} lead={lead} />
      <div style={{ marginTop: 28, maxWidth: 720 }}>{children}</div>
    </section>
  )
}

/* ── Closing ── */
function Closing({ name }: { name: string | null }) {
  return (
    <section className="lp-closing">
      <div className="lp-closing-box">
        <h2>Ready to step into the neighborhood{name ? `, ${name}` : ''}?</h2>
        <p>
          You don&apos;t have to decide today. Read the Blueprint. Meet a member. Visit. Talk.
          When you&apos;re ready, sign the values — and start showing up.
        </p>
        <div className="lp-cta-row" style={{ justifyContent: 'center' }}>
          <Link className="lp-btn lp-btn-primary" href="/auth/signup">Begin joining → <Arrow /></Link>
          <Link className="lp-btn lp-btn-secondary" href="/network">Just browse first</Link>
        </div>
        <div className="lp-footnote">{COMMUNITY_NAME} · MyCoNet · RNF · {VERSION}</div>
      </div>
    </section>
  )
}

/* ── Root ── */
export default function LandingClient({ firstName, communityPurpose, upcomingEvents = [], stats, communityName, glance, previews, values = [] }: Props) {
  return (
    <div className="lp">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 28px 0' }}><BannerImage height={260} /></div>
      <Hero name={firstName} communityPurpose={communityPurpose ?? null} />
      {glance.length > 0 && (
        <section className="lp-section" id="at-a-glance" style={{ paddingTop: 64 }}>
          <CommunityGlance name={communityName} tiles={glance} />
        </section>
      )}
      <section className="lp-section" id="all-modules" style={{ paddingTop: 64 }}>
        <ModuleOverview />
      </section>
      <ClubhousePreview name={firstName} stats={stats} />
      {/* Module sections follow the sidebar order */}
      <MeetSection />
      <EventsSection events={upcomingEvents} />
      <BlueprintSection />
      <JoinSection values={values} />
      <PreviewSection id="stays" mod="15" label="Accommodation" color="var(--m15)"
        h="Come stay with us."
        lead="Guest rooms, cabins and tent sites for visits, work weeks and trial stays. Joining members book by the night; some stays are approved by a lead first.">
        <StaysPreview items={previews.items} />
      </PreviewSection>
      <PreviewSection id="resources" mod="16" label="Resources" color="var(--m16)"
        h="Share more, own less."
        lead="Tools, vehicles, kitchens and spaces the community shares. Browse what's available, see when it's free, and book it by the hour."
      >
        <ResourcesPreview items={previews.items} />
      </PreviewSection>
      <AgreementsSection />
      <PreviewSection id="circles" mod="17" label="Circles" color="var(--m17)"
        h="Know who does what."
        lead="Every circle in the community, with its purpose, leads, members and roles. See who to talk to about anything, from the kitchen to the website."
      >
        <CirclesPreview data={previews.circles} />
      </PreviewSection>
      <OpsSection />
      <ContributionsSection />
      <GovernanceSection />
      <AskSection />
      <Closing name={firstName} />
      <footer className="lp-footer">
        {FRAMEWORK_CREDIT}
      </footer>
    </div>
  )
}
