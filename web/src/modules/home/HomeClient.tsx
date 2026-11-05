'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { isFullMember as checkFullMember, isJoiningOrAbove, ROLE_LABELS } from '@/core/lib/roles'
import { LinkedEventsList } from '@/modules/m14-events/LinkedEventsList'
import type { CalendarEvent } from '@/modules/m14-events/types'
import { CommunityGlance } from './CommunityGlance'
import { CirclesPreview, ResourcesPreview, StaysPreview, type CirclesPreviewData, type PreviewItem } from './ModulePreviews'
import { CLUBHOUSE, MEMBER_MODULES } from '@/core/lib/nav'
import { COMMUNITY_NAME, DEFAULT_PURPOSE, FRAMEWORK_CREDIT } from '@/core/lib/instance'
import BannerImage from '@/core/components/BannerImage'
import type { GlanceTile } from './lib/at-a-glance'

type PhaseP = { id: string; name: string; answered: number; total: number; ratio: number }
type Member = { id: string; first_name: string | null; last_name: string | null; headline: string | null; city: string | null; country: string | null; avatar_url: string | null; username: string | null }
type Value  = { id: string; title: string; description: string; sort_order: number }
type Project = { id: string; title: string; description: string | null; needs: string[] | null; open_for_collaborators: boolean }
type Deliverable = { id: string; title: string; status: string; due_date: string | null; user_profiles?: { username: string | null } | null }

interface Props {
  firstName: string | null
  communityName: string
  communityPurpose: string | null
  phaseProgress: PhaseP[]
  overall: number | null
  gatesPassed: number | null
  landSize: string | null
  plannedHomes: string | null
  projectCountry: string | null
  memberCount: number
  members: Member[]
  communityValues: Value[]
  projects: Project[]
  activeProjectCount: number
  deliverables: Deliverable[]
  isLoggedIn: boolean
  hasApplied: boolean
  isFullMember: boolean
  role?: string
  applicationStatus?: string | null
  joiningRewardNew?: boolean
  matchScores?: Record<string, { score: number; reasons: string[] }>
  upcomingEvents?: CalendarEvent[]
  glance?: GlanceTile[]
  previews?: { items: PreviewItem[]; circles: CirclesPreviewData } | null
}

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
    <polyline points="5 12 10 17 19 7" />
  </svg>
)

const GOV_LAYERS = [
  { num: '01', name: 'Sociocracy (Circle Leads)', mark: '☉', desc: 'Circle Leads decide. Move forward if there are no principled objections from any Circle Lead.' },
  { num: '02', name: 'Democracy (Majority)', mark: '☑', desc: 'Big shared choices that affect everyone. Open vote, simple majority, public results.' },
  { num: '03', name: 'Meritocracy (Domain expert)', mark: '△', desc: 'Technical calls go to the person with skin in the game — soil tests, money, contracts.' },
  { num: '04', name: 'AI-mediated facilitation', mark: '◇', desc: 'When things stall, the AI surfaces blockers, suggests reframes, and finds the next move.' },
]

const PHASE_COLORS = ['#22c55e', '#ca8a04', '#3b82f6', '#8b5cf6']

function smoothScrollTo(targetId: string) {
  const el = document.getElementById(targetId)
  const container = document.querySelector('main') as HTMLElement | null
  if (!el || !container) return
  const start = container.scrollTop
  const target = start + el.getBoundingClientRect().top - container.getBoundingClientRect().top
  const duration = 1600
  const startTime = performance.now()
  const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  const step = (now: number) => {
    const t = Math.min((now - startTime) / duration, 1)
    container.scrollTo(0, start + (target - start) * ease(t))
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function ModulePill({ mod, icon, text, target, color }: {
  mod: string; icon: string; text: string; target: string; color: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      className="no-min-height"
      onClick={() => smoothScrollTo(target)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        fontSize: 13, fontWeight: hovered ? 600 : 500,
        color: hovered ? color : 'var(--ink-2)',
        background: hovered ? `color-mix(in srgb, ${color} 8%, var(--surface))` : 'var(--surface)',
        border: hovered ? `1px solid color-mix(in srgb, ${color} 30%, var(--rule))` : '1px solid var(--rule)',
        borderRadius: 9, padding: '7px 13px',
        cursor: 'pointer', transition: 'all 140ms ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? `0 4px 12px color-mix(in srgb, ${color} 15%, transparent)` : 'none',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: hovered ? color : 'var(--ink-4)', letterSpacing: '0.04em', flexShrink: 0 }}>M{mod}</span>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span>{text}</span>
    </button>
  )
}

function initials(name: string) {
  return name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
}

function ModTag({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
      background: `color-mix(in srgb, ${color} 14%, transparent)`,
      color, padding: '2px 8px', borderRadius: 20,
    }}>{label}</span>
  )
}

function DemoCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--rule)',
      borderRadius: 12, padding: 22,
      boxShadow: '0 4px 16px rgba(0,0,0,.06), 0 2px 4px rgba(0,0,0,.04)',
    }}>
      {children}
    </div>
  )
}

function DemoHead({ color, modLabel, title, meta, href }: { color: string; modLabel: string; title: string; meta?: string; href: string }) {
  return (
    <Link href={href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, textDecoration: 'none', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <ModTag color={color} label={modLabel} />
        <strong style={{ fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'underline', textDecorationColor: 'var(--rule)', textUnderlineOffset: 3 }}>{title}</strong>
      </div>
      {meta && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>{meta}</span>}
    </Link>
  )
}

function parseStrong(text: string): React.ReactNode {
  const parts = text.split(/(<strong>.*?<\/strong>)/g)
  return parts.map((part, i) => {
    const match = part.match(/^<strong>(.*?)<\/strong>$/)
    return match ? <strong key={i}>{match[1]}</strong> : part
  })
}

function SectionHead({ color, mod, label, h, lead, why, href }: {
  color: string; mod: string; label: string; h: string; lead: string; why: string[]; href: string
}) {
  return (
    <div>
      <Link href={href} style={{ textDecoration: 'none' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
          background: `color-mix(in srgb, ${color} 10%, transparent)`,
          color, padding: '4px 12px', borderRadius: 20, marginBottom: 16,
          cursor: 'pointer',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
          Module {mod} · {label} ↗
        </span>
      </Link>
      <h2 style={{
        fontFamily: 'var(--display)', fontSize: 'clamp(24px, 3.2vw, 36px)',
        color: 'var(--ink)', lineHeight: 1.15, letterSpacing: '-0.015em',
        margin: '0 0 16px', maxWidth: '22ch',
      }}>{h}</h2>
      <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.75, marginBottom: 24, maxWidth: '58ch' }}>{lead}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {why.map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              display: 'grid', placeItems: 'center', color, marginTop: 1,
            }}>
              {CHECK_ICON}
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{parseStrong(w)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Split({ children, reverse = false }: { children: React.ReactNode; reverse?: boolean }) {
  return (
    <div className="home-split" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: 52,
      alignItems: 'start',
      direction: reverse ? 'rtl' : undefined,
    }}>
      {reverse
        ? (Array.isArray(children) ? children.map((c, i) => <div key={i} style={{ direction: 'ltr' }}>{c}</div>) : children)
        : children}
    </div>
  )
}

export default function HomeClient({
  firstName, communityName, communityPurpose,
  phaseProgress, overall, gatesPassed,
  landSize, plannedHomes, projectCountry,
  memberCount, members, communityValues,
  projects, activeProjectCount, deliverables,
  isLoggedIn, hasApplied, isFullMember,
  role = 'explorer', applicationStatus, joiningRewardNew = false,
  matchScores = {}, upcomingEvents = [], glance = [], previews = null,
}: Props) {
  const name = firstName || (isLoggedIn ? 'there' : 'you')
  const roleLabel = ROLE_LABELS[role] ?? 'Explorer'
  const isJoiningPlus = isJoiningOrAbove(role)

  // M05 - values
  const [checked, setChecked] = useState<boolean[]>(() => communityValues.map(() => hasApplied))
  const toggle = (i: number) => setChecked(c => c.map((v, j) => j === i ? !v : v))
  const signedCount = checked.filter(Boolean).length
  const allSigned = communityValues.length > 0 && signedCount === communityValues.length

  // M06 - agreements
  const [pickedProject, setPickedProject] = useState(0)
  const [contribution, setContribution] = useState('')
  const [expectation, setExpectation] = useState('')
  const [agreementSubmitted, setAgreementSubmitted] = useState(false)

  // M09 - governance
  const [consentVote, setConsentVote] = useState<null | 'consent' | 'concern' | 'object'>(null)
  const [democVote, setDemocVote] = useState<null | 'yes' | 'concern' | 'no'>(null)
  const consentPassed = consentVote !== null && consentVote !== 'object'
  const democYes = 9 + (democVote === 'yes' ? 1 : 0)
  const democConcern = 3 + (democVote === 'concern' ? 1 : 0)
  const democNo = 2 + (democVote === 'no' ? 1 : 0)
  const democPassed = democYes >= 10
  const layersPassed = [consentPassed, democPassed, true, true].filter(Boolean).length
  const proposalLive = layersPassed >= 3

  // M04 - animate bars on scroll into view
  const bpRef = useRef<HTMLDivElement>(null)
  const [bpAnimated, setBpAnimated] = useState(false)
  useEffect(() => {
    const el = bpRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setBpAnimated(true) }, { threshold: 0.2 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const currentPhaseIdx = phaseProgress.findIndex(p => p.ratio < 1)
  const sectionW: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '72px 28px 0' }
  const sectionCls = 'home-section'

  return (
    <div style={{ paddingBottom: 80, overflowX: 'hidden' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 28px 0' }}><BannerImage height={240} isAdmin={role === 'admin'} /></div>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className={sectionCls} style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 28px 0' }} id="welcome">
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600,
          letterSpacing: '0.08em', color: 'var(--accent-color)',
          marginBottom: 22,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-color)',
            boxShadow: '0 0 0 3px color-mix(in srgb, var(--accent-color) 25%, transparent)',
            animation: 'ping 1.6s ease-out infinite',
          }} />
          {communityName} · Member portal
        </span>
        <h1 style={{
          fontFamily: 'var(--display)',
          fontSize: 'clamp(32px, 4.6vw, 52px)',
          lineHeight: 1.05, letterSpacing: '-0.025em', fontWeight: 700,
          color: 'var(--ink)', marginBottom: 22, maxWidth: '20ch',
        }}>
          Welcome, {name}.<br />
          This is the{' '}
          <span style={{
            background: 'linear-gradient(to bottom, transparent 65%, color-mix(in srgb, var(--accent-color) 28%, transparent) 65%)',
          }}>
            portal
          </span>
          {' '}for {COMMUNITY_NAME}, our <span className="keep-together">regenerative neighborhood</span> being formed — <span style={{ color: 'var(--accent-color)' }}>together</span>.
        </h1>
        <p style={{
          fontSize: 17, color: 'var(--ink-2)', lineHeight: 1.75,
          maxWidth: '56ch', marginBottom: 28,
        }}>
          {communityPurpose
            ? communityPurpose
            : DEFAULT_PURPOSE}
        </p>
        {/* Module pills */}
        <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--mono)', letterSpacing: '0.04em', marginBottom: 10 }}>
          Scroll to explore what you can do in the {COMMUNITY_NAME} portal ↓
        </div>
        <div className="home-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
          {[
            { mod: '00', icon: '⊞', text: 'See how the portal works',          target: 'clubhouse', color: 'var(--ink)' },
            { mod: '01', icon: '👋', text: 'Meet the community & invite others', target: 'meet',   color: 'var(--m1)' },
            { mod: '14', icon: '🗓', text: 'Gather and pitch in on the calendar', target: 'events',  color: 'var(--m14)' },
            { mod: '04', icon: '📋', text: 'Read the community plan',           target: 'blueprint', color: 'var(--m4)' },
            { mod: '05', icon: '🌱', text: 'Join if you align with the values', target: 'join',    color: 'var(--m5)' },
            { mod: '15', icon: '🏡', text: 'Book a place to stay',              target: 'stays',   color: 'var(--m15)' },
            { mod: '16', icon: '🔑', text: 'Borrow shared tools & spaces',      target: 'resources', color: 'var(--m16)' },
            { mod: '06', icon: '🤝', text: "Make agreements on how you'll collaborate", target: 'agreements', color: 'var(--m6)' },
            { mod: '17', icon: '🧭', text: 'See who leads what',                target: 'circles', color: 'var(--m17)' },
            { mod: '07', icon: '⚙️', text: 'Contribute to goals & projects',  target: 'ops',        color: 'var(--m7)' },
            { mod: '08', icon: '✦',  text: 'Get rewards for your contributions', target: 'contributions', color: 'var(--m8)' },
            { mod: '09', icon: '☉',  text: 'Make decisions together',          target: 'governance', color: 'var(--m9)' },
          ].map(({ mod, icon, text, target, color }) => (
            <ModulePill key={mod} mod={mod} icon={icon} text={text} target={target} color={color} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => smoothScrollTo('clubhouse')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 700, color: 'var(--bg)',
              background: 'var(--ink)', padding: '11px 22px', borderRadius: 9,
              border: 'none', cursor: 'pointer',
            }}
          >
            Take the tour →
          </button>
          {!isFullMember && (
            <Link href="/join" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 600, color: 'var(--ink)',
              background: 'var(--surface)', border: '1px solid var(--rule)',
              padding: '11px 22px', borderRadius: 9, textDecoration: 'none',
            }}>
              I'm ready to join
            </Link>
          )}
        </div>
      </section>

      {/* ── Access tiers explainer ──────────────────────────── */}
      <div className="home-clubhouse-section" style={{ maxWidth: 1100, margin: '52px auto 0', padding: '0 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>
            How your access grows
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--rule)' }}>
          {([
            {
              step: '01', icon: '👁', label: 'Browse',
              sublabel: 'No account needed',
              color: 'var(--ink-4)',
              items: ['Read all proposals', 'View member profiles', 'See the Blueprint', 'Explore projects'],
              cta: null, ctaHref: null,
              tier: null,
            },
            {
              step: '02', icon: '✦', label: 'Create an account',
              sublabel: 'Free · Takes 2 minutes',
              color: 'var(--m1)',
              items: ['Your own profile', 'AI match scores', 'Apply to join', 'Save your place'],
              cta: 'Sign up free', ctaHref: '/auth/signup',
              tier: 'explorer',
            },
            {
              step: '03', icon: '🏡', label: 'Join the community',
              sublabel: 'Sign the values · M05',
              color: 'var(--m5)',
              items: ['Vote on proposals', 'Submit proposals', 'Collaborate on projects', 'Earn badges'],
              cta: 'Apply to join', ctaHref: '/join',
              tier: 'joining',
            },
            {
              step: '04', icon: '⊕', label: 'Member',
              sublabel: 'Full member',
              color: 'var(--m9)',
              items: ['All modules active', 'Lead projects', 'Governance rights', 'Build together'],
              cta: null, ctaHref: null,
              tier: 'member',
            },
          ] as const).map((t, i) => {
            const tierOrder = ['explorer', 'joining', 'member']
            const currentTierIdx = tierOrder.indexOf(role ?? 'explorer')
            const thisTierIdx = t.tier ? tierOrder.indexOf(t.tier) : -1
            const isCurrent = isLoggedIn
              ? (t.tier === null && !isJoiningPlus && role === 'explorer' && i === 1)
                || (t.tier === 'joining' && isJoiningPlus && !checkFullMember(role ?? ''))
                || (t.tier === 'member' && checkFullMember(role ?? ''))
              : i === 0
            const isActive = isCurrent || (i === 0) || (isLoggedIn && thisTierIdx !== -1 && thisTierIdx < currentTierIdx)
            return (
              <div key={i} style={{
                padding: '22px 20px',
                background: isCurrent ? 'var(--ink)' : 'var(--surface)',
                borderRight: i < 3 ? '1px solid var(--rule)' : 'none',
                position: 'relative',
              }}>
                {isCurrent && (
                  <div style={{ position: 'absolute', top: 10, right: 10, fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', color: '#fff', background: 'rgba(255,255,255,.2)', padding: '2px 7px', borderRadius: 20 }}>
                    YOU ARE HERE
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 22 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: isCurrent ? 'rgba(255,255,255,.5)' : 'var(--ink-4)', letterSpacing: '0.08em' }}>STEP {t.step}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: isCurrent ? '#fff' : 'var(--ink)', lineHeight: 1.2 }}>{t.label}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: isCurrent ? 'rgba(255,255,255,.6)' : 'var(--ink-4)', fontFamily: 'var(--mono)', marginBottom: 12 }}>{t.sublabel}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: t.cta && !isCurrent ? 14 : 0 }}>
                  {t.items.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isCurrent ? 'rgba(255,255,255,.8)' : isActive ? 'var(--ink-2)' : 'var(--ink-4)' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isCurrent ? 'rgba(255,255,255,.5)' : isActive ? t.color : 'var(--rule)', flexShrink: 0 }} />
                      {item}
                    </div>
                  ))}
                </div>
                {t.cta && !isCurrent && (
                  <a href={t.ctaHref!} style={{
                    display: 'inline-block', marginTop: 14,
                    fontSize: 12, fontWeight: 700, color: '#fff',
                    background: t.color, padding: '6px 14px', borderRadius: 7, textDecoration: 'none',
                  }}>{t.cta} →</a>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Joining reward banner ───────────────────────────── */}
      {isJoiningPlus && (
        <div className="home-clubhouse-section" style={{ maxWidth: 1100, margin: '28px auto 0', padding: '0 28px' }}>
          <div style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, #f59e0b 12%, var(--surface)), color-mix(in srgb, var(--m5) 8%, var(--surface)))',
            border: '1px solid color-mix(in srgb, #f59e0b 35%, var(--rule))',
            borderRadius: 14, padding: '18px 24px',
            display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 32, flexShrink: 0 }}>🎉</div>
            <div className="joining-banner-text" style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>
                Welcome to {communityName}, {firstName || 'Member'}! You're now a <span style={{ color: '#d97706' }}>{roleLabel}</span>.
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                You've earned the <strong>Community Joiner</strong> badge 🏡 — Agreements, Operations, Contributions, and Governance are now unlocked.
              </div>
            </div>
            <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--ink)', padding: '9px 18px', borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}>
              Go to Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* ── The community at a glance ───────────────────────── */}
      {glance.length > 0 && (
        <section className={sectionCls} style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 28px 0' }} id="at-a-glance">
          <CommunityGlance name={communityName} tiles={glance} />
        </section>
      )}

      {/* ── Dashboard label ─────────────────────────────────── */}
      <div id="clubhouse" className="home-clubhouse-section" style={{ maxWidth: 1100, margin: '60px auto 0', padding: '0 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                background: 'color-mix(in srgb, var(--ink) 8%, transparent)',
                color: 'var(--ink-2)', padding: '4px 12px', borderRadius: 20, marginBottom: 14,
                cursor: 'pointer',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-2)' }} />
                Module 00 · Dashboard ↗
              </span>
            </Link>
            <h2 style={{
              fontFamily: 'var(--display)', fontSize: 'clamp(22px, 2.8vw, 32px)',
              color: 'var(--ink)', lineHeight: 1.15, letterSpacing: '-0.015em',
              margin: '0 0 12px', maxWidth: '26ch',
            }}>How this community portal works.</h2>
            <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.7, maxWidth: '56ch', margin: 0 }}>
              Each module looks after one part of neighborhood life — members, the plan, joining, the calendar, places to stay, shared resources, projects, contributions and decisions. The dashboard ties them together: who's here, what's being built, and what needs your attention, updated live.
            </p>
          </div>
          <Link href="/dashboard" style={{
            fontSize: 13, fontWeight: 600, color: 'var(--ink)',
            background: 'var(--surface)', border: '1px solid var(--rule)',
            padding: '9px 18px', borderRadius: 9, textDecoration: 'none',
            whiteSpace: 'nowrap', alignSelf: 'flex-end',
          }}>
            Open dashboard →
          </Link>
        </div>
      </div>

      {/* ── Clubhouse Preview ───────────────────────────────── */}
      <div className="home-clubhouse-section" style={{ maxWidth: 1100, margin: '0 auto 0', padding: '0 28px' }}>
        <div style={{
          borderRadius: 18, overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0,0,0,.09), 0 4px 10px rgba(0,0,0,.05)',
          border: '1px solid var(--rule)',
          background: 'radial-gradient(ellipse at 50% -20%, color-mix(in srgb, var(--accent-color) 8%, transparent), transparent 60%)',
        }}>
          {/* Browser chrome */}
          <div style={{ padding: '11px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#ef5f57', '#f7bd2e', '#28c93f'].map(c => <span key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
            </div>
            <div style={{
              flex: 1, maxWidth: 340, margin: '0 auto',
              background: 'var(--surface)', border: '1px solid var(--rule)',
              borderRadius: 6, padding: '4px 12px',
              fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--mono)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>🔒</span> {communityName.toLowerCase().replace(/\s+/g, '')}.myco.net/dashboard
            </div>
          </div>
          {/* Body: sidebar + main */}
          <div className="home-clubhouse-body" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', background: 'var(--bg)' }}>
            {/* Sidebar */}
            <div className="home-clubhouse-sidenav" style={{ background: 'var(--bg-2)', borderRight: '1px solid var(--rule)', padding: '18px 12px', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16, padding: '0 4px' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--m1), var(--m4))',
                  display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700,
                }}>
                  {name[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{firstName || 'Explorer'}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)' }}>{roleLabel}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', padding: '8px 6px 4px' }}>Clubhouse</div>
              {CLUBHOUSE.map(m => ({ ...m, active: m.num === '00' })).map(m => (
                <div key={m.num} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px',
                  borderRadius: 6, background: m.active ? 'var(--surface)' : 'transparent',
                  marginBottom: 1, color: m.active ? 'var(--ink)' : 'var(--ink-2)',
                  fontWeight: m.active ? 600 : 400,
                }}>
                  <span style={{ width: 3, height: 14, borderRadius: 2, background: m.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: m.active ? 'var(--ink-3)' : 'var(--ink-4)', width: 22 }}>M{m.num}</span>
                  <span style={{ fontSize: 11.5 }}>{m.name}</span>
                </div>
              ))}
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', padding: '10px 6px 4px' }}>Once you're in</div>
              {MEMBER_MODULES.map(m => (
                <div key={m.num} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px',
                  borderRadius: 6, marginBottom: 1, opacity: 0.45,
                  color: 'var(--ink-2)', fontSize: 11.5,
                }}>
                  <span style={{ width: 3, height: 14, borderRadius: 2, background: m.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', width: 22 }}>M{m.num}</span>
                  <span>{m.name}</span>
                </div>
              ))}
            </div>
            {/* Main content */}
            <div style={{ padding: '20px 22px', overflowY: 'auto' }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>
                Good morning, {firstName || 'Explorer'}.
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 14 }}>
                <strong style={{ color: 'var(--ink-2)' }}>{roleLabel}</strong> · {communityName}
              </p>

              {/* Stat row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Members', value: memberCount, color: 'var(--m1)', href: '/network' },
                  { label: 'Active projects', value: activeProjectCount, color: 'var(--m7)', href: '/ops' },
                  { label: 'Deliverables', value: deliverables.length, color: 'var(--m8)', href: '/ops' },
                ].map(s => (
                  <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '10px 12px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, background: s.color }} />
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, marginBottom: 3, marginTop: 2 }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>{s.label}</div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Blueprint readiness */}
              {overall !== null && (
                <Link href="/blueprint" style={{ textDecoration: 'none', display: 'block', marginBottom: 14 }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, color: 'var(--m4)' }}>M04 · Blueprint</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>{overall.toFixed(1)} / 10</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: 'var(--bg-3)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(overall / 10 * 100, 100)}%`, background: 'var(--m4)', borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 5 }}>
                      {currentPhaseIdx >= 0 ? `Current phase: ${phaseProgress[currentPhaseIdx].name}` : 'All phases complete'}
                    </div>
                  </div>
                </Link>
              )}

              {/* Active projects */}
              {projects.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>Active projects</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {projects.slice(0, 2).map(p => (
                      <Link key={p.id} href={`/ops/${p.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 7, padding: '8px 10px' }}>
                          <span style={{ width: 3, height: 28, borderRadius: 2, background: 'var(--m7)', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                            {p.description && <div style={{ fontSize: 10, color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent deliverables */}
              {deliverables.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>Recent deliverables</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {deliverables.slice(0, 3).map(d => {
                      const statusColors: Record<string, string> = { done: '#22c55e', in_progress: '#3b82f6', review: '#f59e0b', backlog: 'var(--ink-4)' }
                      const color = statusColors[d.status] ?? 'var(--ink-4)'
                      return (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 7 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: 'var(--ink-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
                          {d.user_profiles?.username && <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', flexShrink: 0 }}>@{d.user_profiles.username}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── M01 — Community Network ──────────────────────────── */}
      <section className={sectionCls} style={sectionW} id="meet">
        <Split>
          <SectionHead
            mod="01" label="Community Network" color="var(--m1)"
            h="Meet the people gathering around this idea."
            lead="Before anything is built, the right people have to find each other. Browse rich profiles of every member and explorer — sorted by how well your offers, seeks, values, and skills line up."
            href="/network"
            why={[
              '<strong>Real profiles, not posts.</strong> What you bring, what you need, where you\'re headed.',
              '<strong>AI match score</strong> across values, skills, personality, and goals — not just keywords.',
              '<strong>Travel plans</strong> so you can connect IRL — visit a community before you commit.',
            ]}
          />
          <DemoCard>
            <DemoHead color="var(--m1)" modLabel="M01" title="Residents · Top matches" meta={`${memberCount} members`} href="/network" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {members.length > 0 ? members.map((m, i) => {
                const fullName = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.username || 'Member'
                const location = [m.city, m.country].filter(Boolean).join(', ')
                const avatarColors = ['var(--m1)', 'var(--m4)', 'var(--m9)', 'var(--m5)']
                const matchData = matchScores[m.id]
                const card = (
                  <div style={{
                    display: 'flex', gap: 10, padding: '10px 12px',
                    background: 'var(--bg-2)', borderRadius: 8, alignItems: 'flex-start',
                    transition: 'background 120ms',
                  }} className="sh-nav-item">
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: m.avatar_url ? 'transparent' : avatarColors[i % avatarColors.length],
                      display: 'grid', placeItems: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 700, overflow: 'hidden',
                    }}>
                      {m.avatar_url ? <img src={m.avatar_url} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(fullName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{fullName}</span>
                        {isLoggedIn && matchData ? (
                          <span style={{
                            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                            background: 'color-mix(in srgb, var(--m1) 12%, transparent)',
                            color: 'var(--m1)', padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                          }}>{matchData.score}% match</span>
                        ) : isLoggedIn ? (
                          <span style={{
                            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                            background: 'var(--bg-2)', color: 'var(--ink-4)',
                            padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                          }}>no overlap yet</span>
                        ) : null}
                      </div>
                      {m.headline && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 2 }}>{m.headline}</div>}
                      {location && <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>📍 {location}</div>}
                    </div>
                  </div>
                )
                return m.username
                  ? <Link key={m.id} href={`/u/${m.username}`} style={{ textDecoration: 'none', display: 'block' }}>{card}</Link>
                  : <div key={m.id}>{card}</div>
              }) : (
                <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: 0, textAlign: 'center', padding: '12px 0' }}>
                  No members yet — be the first to join.
                </p>
              )}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--rule)', textAlign: 'right' }}>
              <Link href="/network" style={{ fontSize: 12.5, color: 'var(--m1)', fontWeight: 600, textDecoration: 'none' }}>View all members →</Link>
            </div>
          </DemoCard>
        </Split>
      </section>

      {/* ── M14 — Events ────────────────────────────────────── */}
      <section className={sectionCls} style={sectionW} id="events">
        <Split>
          <SectionHead
            mod="14" label="Calendar" color="var(--m14)"
            h="Show up. Gather. Celebrate."
            lead="Workdays, circle meetings, potlucks and celebrations all live on one community calendar. Anyone can browse public events. Joining members host their own, and RSVPs show who's coming."
            href="/events"
            why={[
              '<strong>Core events</strong> — official gatherings posted by members, circle leads and project leads.',
              '<strong>Community hosted</strong> — anyone joining the community can put an event on the calendar.',
              '<strong>Tasks</strong> — things the community needs done. Sign up to help.',
              '<strong>Linked to the work</strong> — tag a circle, an Ops project or a governance proposal.',
            ]}
          />
          <DemoCard>
            <LinkedEventsList
              events={upcomingEvents}
              title="Coming up"
              viewAllHref="/events?view=list"
              addHref={isJoiningPlus ? '/events?new=1' : null}
              limit={4}
              showKind
              emptyText="Nothing on the calendar yet — check back soon."
            />
            <Link href="/events" style={{
              display: 'inline-block', marginTop: 16, fontSize: 13, fontWeight: 700, color: '#fff',
              background: 'var(--m14)', padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
            }}>
              Open the calendar →
            </Link>
          </DemoCard>
        </Split>
      </section>

      {/* ── M04 — Blueprint ─────────────────────────────────── */}
      <section className={sectionCls} style={sectionW} id="blueprint">
        <Split reverse>
          <DemoCard>
            <div ref={bpRef}>
              <DemoHead color="var(--m4)" modLabel="M04" title={`Blueprint · ${communityName}`} meta={overall !== null ? `${overall.toFixed(1)}/10` : 'In progress'} href="/blueprint" />
              {/* Land stats */}
              {(landSize || plannedHomes || projectCountry) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { icon: '🏡', label: 'Homes planned', value: plannedHomes },
                    { icon: '🌍', label: 'Land size',     value: landSize },
                    { icon: '📍', label: 'Country',       value: projectCountry },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: 'var(--bg-2)', border: '1px solid var(--rule)',
                      borderRadius: 8, padding: '10px 12px',
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                      <span style={{ fontSize: 18 }}>{s.icon}</span>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>{s.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: s.value ? 'var(--ink)' : 'var(--ink-4)', lineHeight: 1.3 }}>
                        {s.value ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Phase tracker */}
              {phaseProgress.length > 0 ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: 6, marginBottom: 16 }}>
                    {phaseProgress.map((ph, i) => {
                      const isDone = ph.ratio >= 1
                      const isActive = !isDone && ph.ratio > 0
                      const isFirst = i === 0
                      return (
                        <div key={ph.id} style={{
                          padding: '8px 10px', borderRadius: 7, textAlign: 'center',
                          background: isDone ? 'color-mix(in srgb, var(--m4) 12%, var(--surface))' :
                                      isActive ? 'var(--m4)' : 'var(--bg-2)',
                          border: `1px solid ${isDone ? 'color-mix(in srgb, var(--m4) 30%, var(--rule))' : isActive ? 'var(--m4)' : 'var(--rule)'}`,
                          boxShadow: isActive ? '0 2px 8px rgba(0,0,0,.1)' : 'none',
                        }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, color: isDone ? 'var(--m4)' : isActive ? '#fff' : 'var(--ink-4)', marginBottom: 2 }}>
                            {ph.name}
                          </div>
                          <div style={{ fontSize: 9.5, color: isDone ? 'var(--m4)' : isActive ? 'rgba(255,255,255,.8)' : 'var(--ink-4)' }}>
                            {isDone ? '✓ Done' : isActive ? 'Active' : 'Locked'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>
                    Phase completion
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {phaseProgress.map((ph, i) => (
                      <div key={ph.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: 'var(--ink-2)', width: 50, flexShrink: 0 }}>{ph.name}</span>
                        <div style={{ flex: 1, height: 6, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            background: PHASE_COLORS[i] ?? 'var(--m4)',
                            width: bpAnimated ? `${ph.ratio * 100}%` : '0%',
                            transition: 'width 1.2s cubic-bezier(.4,1,.4,1)',
                          }} />
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', width: 40, textAlign: 'right' }}>
                          {ph.answered}<span style={{ color: 'var(--ink-4)' }}>/{ph.total}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  {gatesPassed !== null && currentPhaseIdx >= 0 && (
                    <div style={{
                      padding: '10px 12px', borderRadius: 8, fontSize: 12,
                      background: 'color-mix(in srgb, var(--m4) 8%, transparent)',
                      color: 'var(--ink-2)', lineHeight: 1.55,
                    }}>
                      <strong style={{ color: 'var(--m4)' }}>Next gate:</strong> Complete the {phaseProgress[currentPhaseIdx]?.name} phase — {phaseProgress[currentPhaseIdx]?.total - phaseProgress[currentPhaseIdx]?.answered} questions remaining.
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0 }}>Blueprint not yet started.</p>
              )}
            </div>
          </DemoCard>
          <SectionHead
            mod="04" label="Blueprint" color="var(--m4)"
            h="Read the plan. The whole plan."
            lead="No pitch deck. No marketing site. The Blueprint is the community's living planning document — open, honest, and updated every week. See what's been decided, what's still being worked out, and exactly how ready the project is."
            href="/blueprint"
            why={[
              '<strong>Four phases</strong> — SPARK → PROVE → BUILD → LIVE. You see exactly where the project stands.',
              '<strong>Five pillars</strong> with honest readiness scores — Ecology, Social, Economy, Hardware, Governance.',
              '<strong>Gate checks</strong> between phases — so excitement never outruns reality.',
            ]}
          />
        </Split>
      </section>

      {/* ── M05 — Join + values ─────────────────────────────── */}
      <section className={sectionCls} style={sectionW} id="join">
        <Split>
          <SectionHead
            mod="05" label="Join" color="var(--m5)"
            h="Joining is signing the values — not paying a fee."
            lead="When you're ready to move from explorer to joining member, you read the community's values and best practices, and mark each one you can stand behind. Skip one? Bring it to the circle. Everything is negotiated, nothing is hidden."
            href="/join"
            why={[
              '<strong>No NDAs, no hidden rules.</strong> What you sign is what\'s in the Blueprint.',
              '<strong>Application reviewed by a real human</strong> — the project leads, not an algorithm.',
              '<strong>Unlocks Agreements, Operations, Contributions, and Governance.</strong>',
            ]}
          />
          <DemoCard>
            <DemoHead color="var(--m5)" modLabel="M05" title="Values & best practices" meta={`${signedCount}/${communityValues.length || 5} signed`} href="/join" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {(communityValues.length > 0 ? communityValues : [
                { id: '1', title: 'Care for the land before yield.', description: 'Decisions are tested against ecological impact first, profit second.', sort_order: 1 },
                { id: '2', title: 'Consent over consensus.', description: 'We seek no objections, not unanimous applause. Move forward if good enough for now.', sort_order: 2 },
                { id: '3', title: "Show up, don't just sign up.", description: 'Logged contributions matter more than promises. Reputation is earned in the doing.', sort_order: 3 },
                { id: '4', title: 'Disagree out loud, decide in writing.', description: 'Bring the hard things to the circle. What we decide goes in the Blueprint.', sort_order: 4 },
                { id: '5', title: 'Leave it better.', description: 'Land, people, money — whatever you touch, leave it more alive than you found it.', sort_order: 5 },
              ]).map((v, i) => (
                <div
                  key={v.id}
                  onClick={() => toggle(i)}
                  role="checkbox"
                  aria-checked={checked[i]}
                  tabIndex={0}
                  onKeyDown={e => e.key === ' ' && toggle(i)}
                  style={{
                    display: 'grid', gridTemplateColumns: '22px 1fr', gap: 12,
                    padding: '12px 14px', borderRadius: 9, cursor: 'pointer',
                    border: `1px solid ${checked[i] ? 'color-mix(in srgb, var(--m5) 40%, var(--rule))' : 'var(--rule)'}`,
                    background: checked[i] ? 'color-mix(in srgb, var(--m5) 6%, var(--surface))' : 'var(--surface)',
                    transition: 'background 120ms, border-color 120ms',
                  }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, marginTop: 1,
                    border: `1.5px solid ${checked[i] ? 'var(--m5)' : 'var(--rule)'}`,
                    background: checked[i] ? 'var(--m5)' : 'transparent',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    transition: 'background 120ms',
                  }}>
                    {checked[i] && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}><polyline points="5 12 10 17 19 7" /></svg>}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{v.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{v.description}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href={isLoggedIn ? '/join' : '/auth/login'}
              style={{
                display: 'block', width: '100%', textAlign: 'center',
                fontSize: 13, fontWeight: 700, padding: '11px 0',
                borderRadius: 8, textDecoration: 'none',
                background: allSigned ? 'var(--m5)' : 'var(--bg-2)',
                color: allSigned ? '#fff' : 'var(--ink-3)',
                border: `1px solid ${allSigned ? 'var(--m5)' : 'var(--rule)'}`,
                cursor: 'pointer',
                transition: 'background 150ms',
              }}>
              {allSigned ? 'Submit application →' : `Sign ${(communityValues.length || 5) - signedCount} more to continue`}
            </Link>
          </DemoCard>
        </Split>
      </section>

      {/* ── M15 — Accommodation (live preview) ─────────────────── */}
      {previews && (
        <section className={sectionCls} style={sectionW} id="stays">
          <Split>
            <SectionHead
              mod="15" label="Accommodation" color="var(--m15)"
              h="Come stay with us."
              lead="Guest rooms, cabins and tent sites for visits, work weeks and trial stays. Joining members book by the night; some stays are approved by a lead first."
              href="/stays"
              why={[
                '<strong>See what’s free</strong> — every stay shows its booked nights.',
                '<strong>Instant or approved</strong> — leads choose which stays need a yes first.',
                '<strong>No double bookings</strong> — two stays can’t overlap.',
              ]}
            />
            <StaysPreview items={previews.items} />
          </Split>
        </section>
      )}

      {/* ── M16 — Resources (live preview) ─────────────────── */}
      {previews && (
        <section className={sectionCls} style={sectionW} id="resources">
          <Split>
            <SectionHead
              mod="16" label="Resources" color="var(--m16)"
              h="Share more, own less."
              lead="Tools, vehicles, kitchens and spaces the community shares. Browse what's available, see when it's free, and book it by the hour."
              href="/bookings"
              why={[
                '<strong>Tagged and searchable</strong> — find the drill, the van or the great hall fast.',
                '<strong>Live availability</strong> — see who has it and until when.',
                '<strong>Looked after</strong> — circle leads manage the inventory and approvals.',
              ]}
            />
            <ResourcesPreview items={previews.items} />
          </Split>
        </section>
      )}

      {/* ── M06 — Agreements ────────────────────────────────── */}
      <section className={sectionCls} style={sectionW} id="agreements">
        <Split reverse>
          <DemoCard>
            <DemoHead color="var(--m6)" modLabel="M06" title="Open projects · Propose help" meta={`${projects.length || 3} open`} href="/agreements" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(projects.length > 0 ? projects : [
                { id: 'demo1', title: 'Greywater wetlands install', description: 'Build the reed-bed wetland that handles all household greywater for Cluster A.', needs: ['Earthworks', 'Plumbing', '3 weekends'], open_for_collaborators: true },
                { id: 'demo2', title: 'Funding circle, round 2', description: 'Find 4 more investor-members to close the BUILD-phase capital raise.', needs: ['Network access', 'Pitch help'], open_for_collaborators: false },
                { id: 'demo3', title: 'Onboarding new members', description: 'Run the application review, host welcome calls, pair newcomers with mentors.', needs: ['Facilitation', 'Hospitality'], open_for_collaborators: true },
              ] as Project[]).map((p, i) => (
                <div
                  key={p.id}
                  onClick={() => { setPickedProject(i); setAgreementSubmitted(false) }}
                  style={{
                    padding: '12px 14px', borderRadius: 9, cursor: 'pointer',
                    border: `1px solid ${pickedProject === i ? 'var(--m6)' : 'var(--rule)'}`,
                    background: 'var(--surface)',
                    boxShadow: pickedProject === i ? '0 0 0 3px color-mix(in srgb, var(--m6) 12%, transparent)' : 'none',
                    transition: 'border-color 120ms, box-shadow 120ms',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{p.title}</div>
                    {p.open_for_collaborators && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--m5)', flexShrink: 0, marginLeft: 8 }}>● Open</span>
                    )}
                  </div>
                  {p.description && <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '0 0 8px', lineHeight: 1.5 }}>{p.description}</p>}
                  {(p.needs ?? []).length > 0 && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {(p.needs ?? []).map(n => (
                        <span key={n} style={{ fontSize: 10.5, color: 'var(--ink-3)', background: 'var(--bg-2)', border: '1px solid var(--rule)', padding: '2px 8px', borderRadius: 20 }}>{n}</span>
                      ))}
                    </div>
                  )}
                  {pickedProject === i && (
                    <div style={{ marginTop: 12, padding: '12px 14px', background: 'color-mix(in srgb, var(--m6) 5%, var(--surface))', borderRadius: 8, border: '1px dashed color-mix(in srgb, var(--m6) 30%, var(--rule))' }}>
                      {agreementSubmitted ? (
                        <div style={{ fontSize: 13, color: 'var(--m5)', fontWeight: 600 }}>✓ Submitted for review. The project lead will respond in 48h.</div>
                      ) : (
                        <>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--m6)', letterSpacing: '0.08em', marginBottom: 8 }}>YOUR PROPOSAL</div>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ fontSize: 11.5, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>What I'll contribute</label>
                            <textarea
                              rows={2}
                              value={contribution}
                              onChange={e => setContribution(e.target.value)}
                              placeholder="Describe your contribution..."
                              style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                            />
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <label style={{ fontSize: 11.5, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>What I expect in return</label>
                            <input
                              type="text"
                              value={expectation}
                              onChange={e => setExpectation(e.target.value)}
                              placeholder="Points, skills exchange, future residency..."
                              style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', outline: 'none', fontFamily: 'inherit' }}
                            />
                          </div>
                          <button
                            onClick={() => setAgreementSubmitted(true)}
                            style={{ width: '100%', fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'var(--m6)', padding: '9px 0', borderRadius: 7, border: 'none', cursor: 'pointer' }}>
                            Send proposal →
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DemoCard>
          <SectionHead
            mod="06" label="Agreements" color="var(--m6)"
            h="Make visible deals on how you'll support."
            lead="Browse every active project — the ones quietly building, the ones loudly hiring. Propose exactly what you'll contribute and exactly what you expect in return. The team reviews it. If accepted, your agreement is live and tracked."
            href="/agreements"
            why={[
              '<strong>Clear scope, clear exchange.</strong> Time, skill, goods, money — write it down.',
              '<strong>Every agreement is public</strong> — no side deals, no resentment.',
              '<strong>Auto-feeds Operations and Contributions</strong> — once accepted, the work shows up everywhere it should.',
            ]}
          />
        </Split>
      </section>

      {/* ── M17 — Circles (live preview) ─────────────────── */}
      {previews && (
        <section className={sectionCls} style={sectionW} id="circles">
          <Split>
            <SectionHead
              mod="17" label="Circles" color="var(--m17)"
              h="Know who does what."
              lead="Every circle in the community, with its purpose, leads, members and roles. See who to talk to about anything, from the kitchen to the website."
              href="/org"
              why={[
                '<strong>Leads at a glance</strong> — every circle shows who’s responsible.',
                '<strong>Teams inside circles</strong> — departments with their own leads and members.',
                '<strong>Kept current</strong> — circle and team leads edit their own part.',
              ]}
            />
            <CirclesPreview data={previews.circles} />
          </Split>
        </section>
      )}

      {/* ── M07 — Operations ────────────────────────────────── */}
      <section className={sectionCls} style={sectionW} id="ops">
        <Split>
          <SectionHead
            mod="07" label="Operations" color="var(--m7)"
            h="See every promise. Watch every deliverable."
            lead="A community lives or dies by what gets done. Operations turns every active agreement into visible deliverables — who owns it, when it's due, and whether it's actually happening. No surprises at the next meeting."
            href="/ops"
            why={[
              '<strong>Live status of every project</strong> — pulled from agreements, not status meetings.',
              '<strong>Timeline updates</strong> from project leads, threaded into the dashboard.',
              '<strong>Drift detection</strong> — when something slips, the community sees it before it becomes a crisis.',
            ]}
          />
          <DemoCard>
            <DemoHead color="var(--m7)" modLabel="M07" title={`${communityName} · This sprint`} meta="Operations" href="/ops" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { n: activeProjectCount, l: 'Active projects' },
                { n: deliverables.length, l: 'Deliverables' },
                { n: deliverables.filter(d => d.status === 'done').length, l: 'Completed' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--bg-2)', borderRadius: 8 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--m7)', lineHeight: 1 }}>{s.n}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>
              Latest deliverables
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {(deliverables.length > 0 ? deliverables : [
                { id: '1', title: 'Soil tests at plots B, C, D', status: 'done', due_date: null },
                { id: '2', title: 'Greywater permit application', status: 'done', due_date: null },
                { id: '3', title: 'Reed-bed trench, Cluster A', status: 'in_progress', due_date: 'Jun 7' },
                { id: '4', title: 'Founding circle agreement v3', status: 'todo', due_date: 'Jun 12' },
                { id: '5', title: 'Funding circle — round 2 close', status: 'todo', due_date: 'Jun 30' },
              ] as Deliverable[]).slice(0, 5).map((d, i) => {
                const done = d.status === 'done'
                const owner = (d as any).user_profiles?.username
                return (
                  <div key={d.id} style={{
                    display: 'grid', gridTemplateColumns: '20px 1fr auto',
                    gap: 10, padding: '7px 0',
                    borderBottom: i < 4 ? '1px solid var(--rule)' : 'none',
                    alignItems: 'center',
                    opacity: done ? 0.6 : 1,
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${done ? 'var(--m7)' : 'var(--rule)'}`,
                      background: done ? 'var(--m7)' : 'transparent',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                    }}>
                      {done && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" style={{ width: 9, height: 9 }}><polyline points="5 12 10 17 19 7" /></svg>}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.4 }}>{d.title}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: d.due_date && new Date(d.due_date) < new Date() && !done ? '#dc2626' : 'var(--ink-4)' }}>
                      {owner ? `@${owner}` : d.due_date ?? ''}
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Link href="/ops" style={{ fontSize: 12.5, color: 'var(--m7)', fontWeight: 600, textDecoration: 'none' }}>View all operations →</Link>
            </div>
          </DemoCard>
        </Split>
      </section>

      {/* ── M08 — Contributions ─────────────────────────────── */}
      <section className={sectionCls} style={sectionW} id="contributions">
        <Split reverse>
          <DemoCard>
            <DemoHead color="var(--m8)" modLabel="M08" title="Your contribution log" meta="Top 25% · Sprint" href="/dashboard" />
            <div style={{
              background: 'linear-gradient(135deg, var(--m8), color-mix(in srgb, var(--m8) 60%, #000))',
              borderRadius: 10, padding: '18px 20px', marginBottom: 14, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1 }}>275</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 3, marginBottom: 10 }}>Points this sprint</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 8 }}>
                {isJoiningPlus ? '1 badge earned · Community Joiner' : '3 badges earned · Builder · Welcomer · Funder'}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {isJoiningPlus ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,.18)', borderRadius: 20,
                    padding: '4px 12px 4px 6px',
                  }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'grid', placeItems: 'center', fontSize: 13, flexShrink: 0 }}>🏡</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff' }}>Community Joiner</span>
                  </span>
                ) : (
                  ['🪨', '🤝', '💰', '🌿', '⚖️', '✦'].map((b, i) => (
                    <span key={i} style={{
                      width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.15)',
                      display: 'grid', placeItems: 'center', fontSize: 14, opacity: i < 3 ? 1 : 0.3,
                    }}>{b}</span>
                  ))
                )}
              </div>
            </div>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6 }}>Recent log</div>
            {[
              { what: 'Reed-bed trench day 1', pts: 120, when: 'May 18' },
              { what: 'Welcome call for 4 explorers', pts: 40, when: 'May 14' },
              { what: 'Soil-test help, Plot C', pts: 30, when: 'May 11' },
              { what: 'Funding-circle pitch deck', pts: 60, when: 'May 06' },
            ].map((r, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', borderBottom: i < 3 ? '1px solid var(--rule)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-2) 50%, transparent)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{r.what}</span>
                <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>{r.when}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--m8)' }}>+{r.pts}</span>
                </div>
              </div>
            ))}
          </DemoCard>
          <SectionHead
            mod="08" label="Contributions" color="var(--m8)"
            h="Log your effort. The community sees it. You're rewarded."
            lead="Volunteer work goes invisible. Not here. Log every hour, every facilitated meeting, every batch of bread. Earn points, unlock badges, build a reputation that means something beyond this project."
            href="/dashboard"
            why={[
              '<strong>Points</strong> for time, energy, and resources brought to community work.',
              '<strong>Badges</strong> for milestones — first build day, first funding round, first conflict mediated.',
              '<strong>Reputation that travels</strong> — across the Hive, to future communities.',
            ]}
          />
        </Split>
      </section>

      {/* ── M09 — Governance ────────────────────────────────── */}
      <section className={sectionCls} style={sectionW} id="governance">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionHead
            mod="09" label="Governance" color="var(--m9)"
            h="Decide together. Four layers, one community."
            lead="Every proposal runs through all four governance layers simultaneously. Once 3 of 4 layers approve, the proposal is live — work can begin, agreements are created automatically."
            href="/dashboard"
            why={[
              '<strong>All four layers run in parallel</strong> — no waiting for one mode to finish before the next starts.',
              '<strong>3 of 4 threshold</strong> — consent, majority, expert, and AI must collectively approve.',
              '<strong>AI facilitator</strong> flags blockers and summarizes concerns in real time.',
            ]}
          />

          {/* Proposal evaluation card */}
          <div style={{ marginTop: 28, background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 14, overflow: 'hidden' }}>

            {/* Proposal header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--m9)', marginBottom: 5 }}>Active Proposal</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>
                  "Approve $24k for reed-bed wetland materials"
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Opened by @priya · 2 days left · 17 of 19 members notified</div>
              </div>
              {proposalLive ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb, #22c55e 10%, var(--surface))', border: '1px solid color-mix(in srgb, #22c55e 35%, var(--rule))', borderRadius: 20, padding: '5px 14px', flexShrink: 0 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0, animation: 'ping 1.6s ease-out infinite' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>PROPOSAL LIVE</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb, var(--m9) 8%, var(--surface))', border: '1px solid color-mix(in srgb, var(--m9) 25%, var(--rule))', borderRadius: 20, padding: '5px 14px', flexShrink: 0 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--m9)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--m9)' }}>Evaluating</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ padding: '12px 22px', background: 'var(--bg-2)', borderBottom: '1px solid var(--rule)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: proposalLive ? '#16a34a' : 'var(--ink-3)' }}>
                  {layersPassed} / 4 layers approved
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                  {proposalLive ? '✓ threshold reached — proposal is live' : 'needs 3 of 4 to go live'}
                </span>
              </div>
              <div style={{ position: 'relative', height: 8, background: 'var(--rule)', borderRadius: 4, overflow: 'visible' }}>
                <div style={{
                  height: '100%', borderRadius: 4, transition: 'width 600ms ease, background 400ms',
                  background: proposalLive ? '#22c55e' : 'var(--m9)',
                  width: `${(layersPassed / 4) * 100}%`,
                }} />
                <div style={{ position: 'absolute', top: -3, left: 'calc(75% - 1px)', width: 2, height: 14, background: '#22c55e', borderRadius: 1, opacity: 0.7 }} />
                <div style={{ position: 'absolute', top: 14, left: 'calc(75% - 18px)', fontFamily: 'var(--mono)', fontSize: 9, color: '#16a34a', whiteSpace: 'nowrap' }}>3/4 live ↑</div>
              </div>
            </div>

            {/* 4 layer evaluation panels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>

              {/* L1 — Consent */}
              <div style={{ padding: '16px 18px', borderRight: '1px solid var(--rule)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 20, marginBottom: 3 }}>☉</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Layer 01</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginTop: 1 }}>Consent</div>
                  </div>
                  {consentPassed
                    ? <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: 'color-mix(in srgb, #22c55e 12%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>✓ Passed</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--m9)', background: 'color-mix(in srgb, var(--m9) 10%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>Voting</span>
                  }
                </div>
                {!consentPassed ? (
                  <>
                    <p style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8, lineHeight: 1.4 }}>No principled objections = passes. Cast your vote:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {([['consent', '✓ I consent', '#22c55e'], ['concern', '⚠ Concern', '#f59e0b'], ['object', '✗ I object', '#ef4444']] as const).map(([v, label, c]) => (
                        <button key={v} onClick={() => setConsentVote(prev => prev === v ? null : v)}
                          style={{
                            padding: '6px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 100ms', textAlign: 'left',
                            border: `1px solid ${consentVote === v ? c : 'var(--rule)'}`,
                            background: consentVote === v ? c : 'var(--surface)',
                            color: consentVote === v ? '#fff' : 'var(--ink-2)',
                          }}>{label}</button>
                      ))}
                    </div>
                    {consentVote === 'object' && (
                      <div style={{ marginTop: 8, fontSize: 11.5, color: '#ef4444', fontWeight: 600 }}>Objection logged — circle review auto-scheduled.</div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                    14 consents · {consentVote === 'concern' ? '4' : '3'} concerns<br />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#16a34a' }}>No blocking objections → passed</span>
                  </div>
                )}
              </div>

              {/* L2 — Democracy */}
              <div style={{ padding: '16px 18px', borderRight: '1px solid var(--rule)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 20, marginBottom: 3 }}>☑</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Layer 02</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginTop: 1 }}>Democracy</div>
                  </div>
                  {democPassed
                    ? <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: 'color-mix(in srgb, #22c55e 12%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>✓ Passed</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'color-mix(in srgb, #f59e0b 12%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>Voting</span>
                  }
                </div>
                <div style={{ display: 'flex', height: 18, borderRadius: 4, overflow: 'hidden', gap: 1, marginBottom: 8 }}>
                  <div style={{ flex: democYes, background: '#22c55e', display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 700, color: '#fff', transition: 'flex 500ms ease' }}>{democYes}</div>
                  <div style={{ flex: democConcern, background: '#f59e0b', display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 700, color: '#fff', transition: 'flex 500ms ease' }}>{democConcern}</div>
                  <div style={{ flex: democNo, background: '#ef4444', display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 700, color: '#fff', transition: 'flex 500ms ease' }}>{democNo}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.4, marginBottom: 8 }}>
                  {democYes} yes · {democConcern} concern · {democNo} no<br />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: democPassed ? '#16a34a' : 'var(--ink-4)' }}>
                    {democPassed ? `Majority reached (${Math.round(democYes / 19 * 100)}%)` : `${10 - democYes} more yes vote${10 - democYes !== 1 ? 's' : ''} needed`}
                  </span>
                </div>
                {!democVote && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {([['yes', '✓', '#22c55e'], ['concern', '⚠', '#f59e0b'], ['no', '✗', '#ef4444']] as const).map(([v, label, c]) => (
                      <button key={v} onClick={() => setDemocVote(v)}
                        style={{ flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${c}`, background: 'var(--surface)', color: c }}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {democVote && <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-4)' }}>Your vote: {democVote}</div>}
              </div>

              {/* L3 — Meritocracy */}
              <div style={{ padding: '16px 18px', borderRight: '1px solid var(--rule)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 20, marginBottom: 3 }}>△</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Layer 03</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginTop: 1 }}>Meritocracy</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: 'color-mix(in srgb, #22c55e 12%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>✓ Approved</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--m4)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>EG</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>@eli_green</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>Land + Water domain</div>
                  </div>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5, margin: 0 }}>
                  "Specs are solid. Budget aligns with similar wetland installs."
                </p>
              </div>

              {/* L4 — AI Facilitation */}
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 20, marginBottom: 3 }}>◇</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Layer 04</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginTop: 1 }}>AI Facilitation</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: 'color-mix(in srgb, #22c55e 12%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>✓ Cleared</span>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.55, margin: '0 0 8px' }}>
                  No blockers detected. Proposal is well-scoped and consistent with Blueprint Phase 2 goals.
                </p>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>Confidence: 91%</div>
              </div>
            </div>

            {/* Live banner */}
            {proposalLive && (
              <div style={{
                padding: '13px 22px',
                background: 'color-mix(in srgb, #22c55e 7%, var(--surface))',
                borderTop: '1px solid color-mix(in srgb, #22c55e 25%, var(--rule))',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'block', animation: 'ping 1.6s ease-out infinite' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                    Proposal approved — work can begin. Agreement auto-created in M06.
                  </span>
                </div>
                <Link href="/dashboard" style={{ fontSize: 12, fontWeight: 600, color: '#15803d', textDecoration: 'none' }}>
                  View in Governance →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ─────────────────────────────────────── */}
      <section style={{ maxWidth: 880, margin: '80px auto 0', padding: '0 28px' }}>
        <div style={{
          padding: '56px 40px', borderRadius: 18, textAlign: 'center',
          background: 'var(--bg-2)',
          border: '1px solid var(--rule)',
          backgroundImage: 'radial-gradient(ellipse at 50% -30%, color-mix(in srgb, var(--accent-color) 10%, transparent), transparent 70%)',
        }}>
          <h2 style={{
            fontFamily: 'var(--display)', fontSize: 'clamp(26px, 4vw, 40px)',
            color: 'var(--ink)', lineHeight: 1.15, letterSpacing: '-0.015em', marginBottom: 16,
          }}>
            Ready to step into the neighborhood, {name}?
          </h2>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.7, maxWidth: '48ch', margin: '0 auto 28px' }}>
            You don't have to decide today. Read the Blueprint. Meet a member. Visit. Talk.
            When you're ready, sign the values — and start showing up.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
            <Link href={isLoggedIn ? '/join' : '/auth/login'} style={{
              fontSize: 14, fontWeight: 700, color: '#fff',
              background: 'var(--ink)', padding: '12px 26px', borderRadius: 9, textDecoration: 'none',
            }}>
              Begin joining →
            </Link>
            <Link href="/network" style={{
              fontSize: 14, fontWeight: 600, color: 'var(--ink)',
              background: 'var(--surface)', border: '1px solid var(--rule)',
              padding: '12px 26px', borderRadius: 9, textDecoration: 'none',
            }}>
              Just browse first
            </Link>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
            {FRAMEWORK_CREDIT}
          </div>
        </div>
      </section>

    </div>
  )
}
