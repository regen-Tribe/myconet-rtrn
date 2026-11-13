'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Pencil, MapPin, User, Heart, Brain, Star,
  Target, Gift, HelpCircle, Plane, Briefcase, Camera, Loader2,
} from 'lucide-react'
import { AvatarCropper } from '@/core/components/AvatarCropper'
import { uploadAvatarBlob } from '@/core/lib/avatar'

const OCEAN_LABELS = [
  { key: 'openness',          label: 'Openness' },
  { key: 'conscientiousness', label: 'Conscientiousness' },
  { key: 'extraversion',      label: 'Extraversion' },
  { key: 'agreeableness',     label: 'Agreeableness' },
  { key: 'neuroticism',       label: 'Neuroticism' },
]

const TABS = [
  { key: 'about',       label: 'About' },
  { key: 'personality', label: 'Personality' },
  { key: 'offers',      label: 'Offers' },
  { key: 'seeks',       label: 'Requests' },
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

function EmptyCard({ icon: Icon, label, href, linkLabel }: { icon: any; label: string; href: string; linkLabel: string }) {
  return (
    <SectionCard>
      <div style={{ textAlign: 'center', padding: '28px 0' }}>
        <Icon style={{ width: 32, height: 32, color: 'var(--ink-4)', margin: '0 auto 10px' }} />
        <div style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 12 }}>{label}</div>
        <Link href={href} style={{
          fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', padding: '7px 14px',
          border: '1px solid var(--rule)', borderRadius: 8, textDecoration: 'none',
          background: 'var(--surface)', display: 'inline-block',
        }}>
          {linkLabel}
        </Link>
      </div>
    </SectionCard>
  )
}

function UrgencyColor(urgency: string) {
  if (urgency === 'urgent') return 'var(--m9)'
  if (urgency === 'high')   return 'var(--m4)'
  return 'var(--ink-4)'
}

export default function NetworkProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [bio, setBio] = useState<any>(null)
  const [offers, setOffers] = useState<any[]>([])
  const [seeks, setSeeks] = useState<any[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [tab, setTab] = useState('about')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [p, b, o, s] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_bio').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_offers').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('user_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      setProfile(p.data)
      setAvatarUrl(p.data?.avatar_url ?? null)
      setBio(b.data)
      setOffers(o.data ?? [])
      setSeeks(s.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 28px 80px' }}>
        {[120, 48, 280].map((h, i) => (
          <div key={i} style={{
            height: h, borderRadius: 10, background: 'var(--rule)',
            marginBottom: 14, animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ))}
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 28px 80px' }}>
        <SectionCard>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <User style={{ width: 40, height: 40, color: 'var(--ink-4)', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, color: 'var(--ink-4)', marginBottom: 14 }}>Profile not found</div>
            <Link href="/profile/edit" style={{
              fontSize: 13, fontWeight: 500, padding: '8px 16px',
              background: 'var(--ink)', color: '#fff', borderRadius: 8, textDecoration: 'none',
            }}>
              Create Profile
            </Link>
          </div>
        </SectionCard>
      </div>
    )
  }

  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPendingPhoto(file)
    e.target.value = ''
  }

  async function handleAvatarCropped(blob: Blob) {
    if (!profile?.id) return
    setAvatarUploading(true)
    try {
      const url = await uploadAvatarBlob(supabase, profile.id, blob)
      setAvatarUrl(url)
      setPendingPhoto(null)
    } catch (err: any) {
      alert('Photo upload failed: ' + (err?.message ?? String(err)))
    } finally {
      setAvatarUploading(false)
    }
  }

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username
  const initial = displayName[0]?.toUpperCase() ?? '?'
  const location = [profile.city, profile.country].filter(Boolean).join(', ')
  const pd = bio?.personality_details as any
  const arc = bio?.archetypes as any
  const travels = (bio?.places_traveling ?? []) as any[]

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 28px 80px' }}>
      {pendingPhoto && (
        <AvatarCropper
          file={pendingPhoto}
          busy={avatarUploading}
          onCancel={() => setPendingPhoto(null)}
          onCropped={handleAvatarCropped}
        />
      )}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
          M01 · My Profile
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
          <label htmlFor="avatar-upload-profile" style={{ cursor: 'pointer', position: 'relative', flexShrink: 0, width: 72, height: 72 }} className="group">
            <div style={{
              width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
              background: 'color-mix(in srgb, var(--m1) 12%, var(--surface))',
              border: '2px solid var(--rule)', display: 'grid', placeItems: 'center',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--m1)' }}>{initial}</span>
              }
            </div>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: avatarUploading ? 1 : 0, transition: 'opacity 120ms',
            }} className="group-hover:opacity-100">
              {avatarUploading
                ? <Loader2 style={{ width: 18, height: 18, color: '#fff' }} className="animate-spin" />
                : <Camera style={{ width: 18, height: 18, color: '#fff' }} />}
            </div>
            <input id="avatar-upload-profile" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarPick} />
          </label>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px, 3vw, 26px)', color: 'var(--ink)', lineHeight: 1.15, margin: '0 0 2px' }}>
                  {displayName}
                </h1>
                <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>@{profile.username}</div>
              </div>
              <Link href="/profile/edit" style={{
                fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', padding: '7px 14px',
                border: '1px solid var(--rule)', borderRadius: 8, textDecoration: 'none',
                background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
              }}>
                <Pencil style={{ width: 14, height: 14 }} />
                Edit profile
              </Link>
            </div>

            {profile.headline && (
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5 }}>{profile.headline}</div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 10 }}>
              {location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--ink-4)' }}>
                  <MapPin style={{ width: 12, height: 12 }} />{location}
                </span>
              )}
              {(profile.user_types ?? []).map((t: string) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom tab bar */}
      <div style={{
        display: 'flex', gap: 4, padding: '4px', background: 'var(--bg-2)',
        borderRadius: 10, border: '1px solid var(--rule)', marginBottom: 20,
        overflowX: 'auto',
      }}>
        {TABS.map(t => {
          const isActive = tab === t.key
          const count = t.key === 'offers' ? offers.length : t.key === 'seeks' ? seeks.length : null
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
          {!bio ? (
            <EmptyCard icon={User} label="No bio details yet" href="/profile/edit" linkLabel="Complete Your Profile" />
          ) : (
            <>
              {bio.values_principles && (
                <SectionCard stripe="var(--m1)">
                  <SectionTitle icon={Heart}>Values & Principles</SectionTitle>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>{bio.values_principles}</p>
                </SectionCard>
              )}
              {((bio.skills?.length > 0) || (bio.interests?.length > 0)) && (
                <SectionCard stripe="var(--m1)">
                  <SectionTitle icon={Briefcase}>Skills & Interests</SectionTitle>
                  {bio.skills?.length > 0 && (
                    <div style={{ marginBottom: bio.interests?.length > 0 ? 14 : 0 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>Skills</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {bio.skills.map((s: string) => <Chip key={s} color="var(--m1)">{s}</Chip>)}
                      </div>
                    </div>
                  )}
                  {bio.interests?.length > 0 && (
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>Interests</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {bio.interests.map((i: string) => <Chip key={i}>{i}</Chip>)}
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
        </div>
      )}

      {/* Personality tab */}
      {tab === 'personality' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!pd?.myersBriggs && !pd?.ocean && !arc ? (
            <EmptyCard icon={Brain} label="No personality data yet" href="/profile/edit" linkLabel="Add Personality Info" />
          ) : (
            <>
              {pd?.myersBriggs && (
                <SectionCard stripe="var(--m1)">
                  <SectionTitle icon={Brain}>Myers-Briggs Type</SectionTitle>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 42, fontWeight: 700, color: 'var(--m1)', lineHeight: 1 }}>{pd.myersBriggs}</div>
                </SectionCard>
              )}
              {pd?.ocean && (
                <SectionCard stripe="var(--m1)">
                  <SectionTitle>OCEAN Personality Traits</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {OCEAN_LABELS.map(({ key, label }) => {
                      const val = pd.ocean?.[key] ?? 50
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
          <EmptyCard icon={Gift} label="No offers yet" href="/profile/edit" linkLabel="Add Offers" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {offers.map((o: any) => (
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

      {/* Seeks tab */}
      {tab === 'seeks' && (
        seeks.length === 0 ? (
          <EmptyCard icon={HelpCircle} label="No requests yet" href="/profile/edit" linkLabel="Add Requests" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {seeks.map((s: any) => {
              const urgency = s.urgency ?? 'normal'
              const stripeColor = UrgencyColor(urgency)
              return (
                <SectionCard key={s.id} stripe={stripeColor}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, flex: 1 }}>{s.request_text}</p>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      {s.category && <Chip>{s.category}</Chip>}
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
          <EmptyCard icon={Plane} label="No travel plans yet" href="/profile/edit" linkLabel="Add Travel Plans" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {travels.map((t: any, i: number) => (
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
    </div>
  )
}
