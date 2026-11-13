'use client'
import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Heart, Brain, Star, Target, Gift, HelpCircle, Plane, Briefcase, Pencil, Sparkles, Lock, Globe, AtSign } from 'lucide-react'
import { socialLinks } from '@/core/lib/public-profile'

interface ProfileData {
  id: string; username: string; first_name: string | null; last_name: string | null
  headline: string | null; country?: string | null; city?: string | null
  avatar_url: string | null; user_types?: string[] | null
  // Public card: visitors see these too
  public_bio?: string | null; website_url?: string | null
  instagram?: string | null; linkedin?: string | null; twitter?: string | null
}
interface BioData {
  values_principles: string | null; what_creating: string | null
  personality_details: { myersBriggs?: string | null; ocean?: { openness?: number; conscientiousness?: number; extraversion?: number; agreeableness?: number; neuroticism?: number } | null } | null
  archetypes: { astrology?: { sun?: string | null; moon?: string | null; rising?: string | null } | null; humanDesign?: string | null; geneKey?: string | null; mayan?: string | null } | null
  goals: string | null
  skills: string[] | null; interests: string[] | null
  places_traveling: Array<{ location: string; startDate?: string; endDate?: string; notes?: string }> | null
}
interface OfferData { id: string; category: string | null; title: string; description: string | null; compensation_model: string | null; price: string | null }
interface RequestData { id: string; category: string | null; request_text: string; urgency: string | null }

interface Props {
  profile: ProfileData; bio: BioData | null
  offers: OfferData[]; requests: RequestData[]
  isOwn: boolean
  /** Visitors see the public card and shaded sections inviting them to join */
  signedIn: boolean
  /** Fears and traumas, when this person shares them with the viewer */
  growth: { fears: string | null; traumas: string | null; visibility: string } | null
  match?: { score: number; reasons: string[] } | null
}

const OCEAN_TRAITS = [
  { key: 'openness',          label: 'Openness' },
  { key: 'conscientiousness', label: 'Conscientiousness' },
  { key: 'extraversion',      label: 'Extraversion' },
  { key: 'agreeableness',     label: 'Agreeableness' },
  { key: 'neuroticism',       label: 'Neuroticism' },
] as const

const TABS = [
  { key: 'about',       label: 'About' },
  { key: 'personality', label: 'Personality' },
  { key: 'offers',      label: 'Offers' },
  { key: 'requests',    label: 'Requests' },
  { key: 'travel',      label: 'Travel' },
]

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 20,
      background: color ? `color-mix(in srgb, ${color} 12%, var(--surface))` : 'var(--bg-2)',
      color: color ?? 'var(--ink-3)',
      border: `1px solid ${color ? `color-mix(in srgb, ${color} 25%, transparent)` : 'var(--rule)'}`,
      fontWeight: 500,
    }}>
      {children}
    </span>
  )
}

function SectionCard({ stripe, children, style }: { stripe?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10,
      padding: '16px 18px', ...style,
    }}>
      {stripe && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: stripe }} />}
      {children}
    </div>
  )
}

function SectionTitle({ icon: Icon, children }: { icon?: any; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      {Icon && <Icon style={{ width: 15, height: 15, color: 'var(--m1)', flexShrink: 0 }} />}
      <span style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{children}</span>
    </div>
  )
}

function EmptyCard({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <SectionCard>
      <div style={{ textAlign: 'center', padding: '28px 0' }}>
        <Icon style={{ width: 32, height: 32, color: 'var(--ink-4)', margin: '0 auto 10px' }} />
        <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>{label}</div>
      </div>
    </SectionCard>
  )
}

const GROWTH_AUDIENCE: Record<string, string> = {
  anyone: 'Anyone', explorers: 'Everyone signed up', joining: 'Joining members and up', full_members: 'Full members', only_me: 'Only you',
}

function GrowthCard({ growth, isOwn }: { growth: { fears: string | null; traumas: string | null; visibility: string }; isOwn: boolean }) {
  if (!growth.fears && !growth.traumas) return null
  return (
    <SectionCard stripe="var(--m1)">
      <SectionTitle icon={Heart}>Growth & Healing</SectionTitle>
      {growth.fears && (
        <div style={{ marginBottom: growth.traumas ? 14 : 0 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 5 }}>Fears & Challenges</div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{growth.fears}</p>
        </div>
      )}
      {growth.traumas && (
        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 5 }}>Healing Journey</div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{growth.traumas}</p>
        </div>
      )}
      {isOwn && (
        <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 12 }}>
          Shared with: {GROWTH_AUDIENCE[growth.visibility] ?? growth.visibility} · <Link href="/profile/edit" style={{ color: 'var(--m1)' }}>change</Link>
        </div>
      )}
    </SectionCard>
  )
}

function UrgencyColor(urgency: string) {
  if (urgency === 'urgent') return 'var(--m9)'
  if (urgency === 'high')   return 'var(--m4)'
  return 'var(--ink-4)'
}

const LINK_ICONS: Record<string, any> = { website: Globe, instagram: AtSign, linkedin: AtSign, twitter: AtSign }

export default function UserProfileClient({ profile: p, bio, offers, requests, isOwn, signedIn, growth, match }: Props) {
  const [tab, setTab] = useState('about')

  const displayName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username
  const initial = displayName[0]?.toUpperCase() ?? '?'
  const location = [p.city, p.country].filter(Boolean).join(', ')
  const pd = bio?.personality_details
  const arc = bio?.archetypes
  const travels = bio?.places_traveling ?? []
  const hasOcean = pd?.ocean && Object.values(pd.ocean).some(v => v != null)
  const links = socialLinks(p)

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 28px 80px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
          M01 · Member Profile
        </div>
      </div>

      {/* Profile header card */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10,
        padding: '18px 18px 16px', marginBottom: 18,
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--m1)' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>

          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
            background: 'color-mix(in srgb, var(--m1) 12%, var(--surface))',
            border: '2px solid var(--rule)', display: 'grid', placeItems: 'center',
          }}>
            {p.avatar_url
              ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--m1)' }}>{initial}</span>
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px, 3vw, 26px)', color: 'var(--ink)', lineHeight: 1.15, margin: '0 0 2px' }}>
                  {displayName}
                </h1>
                <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>@{p.username}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {/* Match score badge */}
                {!isOwn && match && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: match.score >= 70
                      ? 'color-mix(in srgb, var(--m5) 10%, var(--surface))'
                      : match.score >= 40
                      ? 'color-mix(in srgb, #f59e0b 10%, var(--surface))'
                      : 'var(--bg-2)',
                    border: `1px solid ${match.score >= 70 ? 'color-mix(in srgb, var(--m5) 35%, var(--rule))' : match.score >= 40 ? 'color-mix(in srgb, #f59e0b 35%, var(--rule))' : 'var(--rule)'}`,
                    borderRadius: 10, padding: '8px 14px', gap: 2, minWidth: 80,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Sparkles style={{
                        width: 12, height: 12,
                        color: match.score >= 70 ? 'var(--m5)' : match.score >= 40 ? '#f59e0b' : 'var(--ink-4)',
                      }} />
                      <span style={{
                        fontSize: 20, fontWeight: 800, lineHeight: 1,
                        color: match.score >= 70 ? 'var(--m5)' : match.score >= 40 ? '#f59e0b' : 'var(--ink-3)',
                      }}>{match.score}%</span>
                    </div>
                    <span style={{ fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--ink-4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      match
                    </span>
                    {match.reasons.length > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.4, marginTop: 2 }}>
                        {match.reasons[0]}
                      </span>
                    )}
                  </div>
                )}

                {/* Edit button (own profile) */}
                {isOwn && (
                  <Link href="/profile/edit" style={{
                    fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', padding: '7px 14px',
                    border: '1px solid var(--rule)', borderRadius: 8, textDecoration: 'none',
                    background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <Pencil style={{ width: 14, height: 14 }} />
                    Edit profile
                  </Link>
                )}
              </div>
            </div>

            {p.headline && (
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5 }}>{p.headline}</div>
            )}

            {p.public_bio && (
              <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: '10px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{p.public_bio}</p>
            )}

            {links.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {links.map(l => {
                  const Icon = LINK_ICONS[l.key]
                  return (
                    <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer nofollow" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--ink-2)',
                      textDecoration: 'none', border: '1px solid var(--rule)', borderRadius: 20, padding: '4px 10px', background: 'var(--bg-2)',
                    }}>
                      <Icon style={{ width: 13, height: 13, color: 'var(--m1)' }} />{l.label}
                    </a>
                  )
                })}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 10 }}>
              {location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--ink-4)' }}>
                  <MapPin style={{ width: 12, height: 12 }} />{location}
                </span>
              )}
              {(p.user_types ?? []).map(t => <Chip key={t}>{t}</Chip>)}
            </div>
          </div>
        </div>
      </div>

      {!signedIn && growth && <div style={{ marginBottom: 14 }}><GrowthCard growth={growth} isOwn={false} /></div>}
      {!signedIn ? (
        <div style={{ position: 'relative' }}>
          <div aria-hidden style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, filter: 'blur(1.5px)', opacity: 0.45, pointerEvents: 'none', userSelect: 'none' }}>
            {[
              { icon: Heart, label: 'Values & purpose' }, { icon: Briefcase, label: 'Skills & interests' },
              { icon: Brain, label: 'Personality' }, { icon: Gift, label: 'Offers' },
              { icon: HelpCircle, label: 'Requests' }, { icon: Plane, label: 'Travel plans' },
            ].map(sec => (
              <SectionCard key={sec.label} stripe="var(--m1)">
                <SectionTitle icon={sec.icon}>{sec.label}</SectionTitle>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-2)', marginBottom: 8, width: '90%' }} />
                <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-2)', marginBottom: 8, width: '70%' }} />
                <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-2)', width: '50%' }} />
              </SectionCard>
            ))}
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 16 }}>
            <div style={{ textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', maxWidth: 360, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
              <Lock style={{ width: 22, height: 22, color: 'var(--m1)', margin: '0 auto 8px' }} />
              <div style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                See more of {p.first_name || 'this member'}’s profile
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55, margin: '0 0 14px' }}>
                Sign up to see their values, skills, personality, offers, requests and travel plans, and find people you match with.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/auth/login?mode=register" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--m1)', borderRadius: 8, padding: '8px 16px', textDecoration: 'none' }}>Sign up</Link>
                <Link href="/auth/login" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', border: '1px solid var(--rule)', borderRadius: 8, padding: '8px 16px', textDecoration: 'none' }}>Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      ) : (<>
      {/* Custom tab bar */}
      <div style={{
        display: 'flex', gap: 4, padding: '4px', background: 'var(--bg-2)',
        borderRadius: 10, border: '1px solid var(--rule)', marginBottom: 20,
        overflowX: 'auto',
      }}>
        {TABS.map(t => {
          const isActive = tab === t.key
          const count = t.key === 'offers' ? offers.length : t.key === 'requests' ? requests.length : null
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: '1 1 auto', padding: '7px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 12.5, fontWeight: isActive ? 600 : 400,
              background: isActive ? 'var(--surface)' : 'transparent',
              color: isActive ? 'var(--ink)' : 'var(--ink-3)',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 100ms', whiteSpace: 'nowrap',
            }}>
              {t.label}{count !== null ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {/* About tab */}
      {tab === 'about' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!bio || (!bio.values_principles && !bio.what_creating && !(bio.skills ?? []).length && !(bio.interests ?? []).length && !bio.goals) ? (
            <EmptyCard icon={Heart} label="No bio information added yet" />
          ) : (
            <>
              {bio.values_principles && (
                <SectionCard stripe="var(--m1)">
                  <SectionTitle icon={Heart}>Values & Principles</SectionTitle>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>{bio.values_principles}</p>
                </SectionCard>
              )}
              {((bio.skills ?? []).length > 0 || (bio.interests ?? []).length > 0) && (
                <SectionCard stripe="var(--m1)">
                  <SectionTitle icon={Briefcase}>Skills & Interests</SectionTitle>
                  {(bio.skills ?? []).length > 0 && (
                    <div style={{ marginBottom: (bio.interests ?? []).length > 0 ? 14 : 0 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>Skills</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {(bio.skills ?? []).map(s => <Chip key={s} color="var(--m1)">{s}</Chip>)}
                      </div>
                    </div>
                  )}
                  {(bio.interests ?? []).length > 0 && (
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>Interests</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {(bio.interests ?? []).map(i => <Chip key={i}>{i}</Chip>)}
                      </div>
                    </div>
                  )}
                </SectionCard>
              )}
              {(bio.goals || bio.what_creating) && (
                <SectionCard stripe="var(--m1)">
                  <SectionTitle icon={Target}>Goals & Projects</SectionTitle>
                  {bio.goals && (
                    <div style={{ marginBottom: bio.what_creating ? 14 : 0 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 4 }}>Goals</div>
                      <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{bio.goals}</p>
                    </div>
                  )}
                  {bio.what_creating && (
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 4 }}>Currently Creating</div>
                      <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{bio.what_creating}</p>
                    </div>
                  )}
                </SectionCard>
              )}

            </>
          )}
          {growth && <GrowthCard growth={growth} isOwn={isOwn} />}
        </div>
      )}

      {/* Personality tab */}
      {tab === 'personality' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!pd?.myersBriggs && !hasOcean && !arc ? (
            <EmptyCard icon={Brain} label="No personality data added yet" />
          ) : (
            <>
              {pd?.myersBriggs && (
                <SectionCard stripe="var(--m1)">
                  <SectionTitle icon={Brain}>Myers-Briggs Type</SectionTitle>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 42, fontWeight: 700, color: 'var(--m1)', lineHeight: 1 }}>{pd.myersBriggs}</div>
                </SectionCard>
              )}
              {hasOcean && (
                <SectionCard stripe="var(--m1)">
                  <SectionTitle>OCEAN Personality Traits</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {OCEAN_TRAITS.map(({ key, label }) => {
                      const val = (pd!.ocean as any)?.[key] ?? 50
                      return (
                        <div key={key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{label}</span>
                            <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>{val}%</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 3, background: 'var(--rule)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${val}%`, background: 'var(--m1)', borderRadius: 3 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </SectionCard>
              )}
              {arc && (arc.astrology?.sun || arc.astrology?.moon || arc.astrology?.rising || arc.humanDesign || arc.geneKey || arc.mayan) && (
                <SectionCard stripe="var(--m1)">
                  <SectionTitle icon={Star}>Archetypes</SectionTitle>
                  {(arc.astrology?.sun || arc.astrology?.moon || arc.astrology?.rising) && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>Astrology</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        {arc.astrology?.sun && (
                          <div style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--rule)' }}>
                            <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 3 }}>Sun</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{arc.astrology.sun}</div>
                          </div>
                        )}
                        {arc.astrology?.moon && (
                          <div style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--rule)' }}>
                            <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 3 }}>Moon</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{arc.astrology.moon}</div>
                          </div>
                        )}
                        {arc.astrology?.rising && (
                          <div style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--rule)' }}>
                            <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 3 }}>Rising</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{arc.astrology.rising}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {arc.humanDesign && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Human Design</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{arc.humanDesign}</div>
                      </div>
                    )}
                    {arc.geneKey && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gene Key</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{arc.geneKey}</div>
                      </div>
                    )}
                    {arc.mayan && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mayan Sign</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{arc.mayan}</div>
                      </div>
                    )}
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </div>
      )}

      {/* Offers tab */}
      {tab === 'offers' && (
        offers.length === 0 ? (
          <EmptyCard icon={Gift} label="No offers yet" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {offers.map(o => (
              <SectionCard key={o.id} stripe="var(--m1)">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{o.title}</div>
                  {o.category && <Chip color="var(--m1)">{o.category}</Chip>}
                </div>
                {o.description && (
                  <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55, margin: '0 0 10px' }}>{o.description}</p>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {o.compensation_model && <Chip>{o.compensation_model}</Chip>}
                  {o.price && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{o.price}</span>}
                </div>
              </SectionCard>
            ))}
          </div>
        )
      )}

      {/* Requests tab */}
      {tab === 'requests' && (
        requests.length === 0 ? (
          <EmptyCard icon={HelpCircle} label="No requests yet" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {requests.map(r => {
              const urgency = r.urgency ?? 'normal'
              const stripeColor = UrgencyColor(urgency)
              return (
                <SectionCard key={r.id} stripe={stripeColor}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, flex: 1 }}>{r.request_text}</p>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      {r.category && <Chip>{r.category}</Chip>}
                      {urgency !== 'normal' && <Chip color={stripeColor}>{urgency}</Chip>}
                    </div>
                  </div>
                </SectionCard>
              )
            })}
          </div>
        )
      )}

      {/* Travel tab */}
      {tab === 'travel' && (
        !travels.length ? (
          <EmptyCard icon={Plane} label="No travel plans shared" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {travels.map((t, i) => (
              <SectionCard key={i} stripe="var(--m1)">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                    background: 'color-mix(in srgb, var(--m1) 12%, var(--surface))',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <MapPin style={{ width: 18, height: 18, color: 'var(--m1)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>{t.location}</div>
                    {(t.startDate || t.endDate) && (
                      <div style={{ fontSize: 12.5, color: 'var(--ink-4)', marginBottom: t.notes ? 4 : 0 }}>
                        {t.startDate && new Date(t.startDate).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                        {t.startDate && t.endDate && ' – '}
                        {t.endDate && new Date(t.endDate).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                      </div>
                    )}
                    {t.notes && <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>{t.notes}</p>}
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        )
      )}
      </>)}
    </div>
  )
}
