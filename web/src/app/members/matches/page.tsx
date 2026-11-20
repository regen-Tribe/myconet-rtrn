import { createClient } from '@/core/lib/supabase/server'
import Link from 'next/link'
import { computeMatch } from '@/modules/m01-network/lib/match-score'
import MatchesTabs from '@/modules/m01-network/MatchesTabs'

const SCORING_DIMENSIONS = [
  { label: 'Shared skills',       max: 25, note: 'fuzzy — tolerates typos' },
  { label: 'Shared interests',    max: 15, note: 'fuzzy' },
  { label: 'OCEAN similarity',    max: 20, note: '5 personality traits' },
  { label: 'MBTI compatibility',  max: 20, note: 'ideal pairs + temperament' },
  { label: 'Location proximity',  max:  5, note: 'city + country' },
  { label: 'Travel overlap',      max: 10, note: 'same place + dates' },
  { label: 'Aligned goals',       max:  5, note: 'regenerative keywords' },
]

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 28px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>
            M01 · Your Matches
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(24px, 3.5vw, 32px)', color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 8px' }}>
            Find your people.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
            Create a free profile to unlock match scores — we compare your values, skills, personality, location, and travel plans to surface the people most aligned with your vision.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          <Link href="/auth/signup" style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--m1)', padding: '9px 18px', borderRadius: 8, textDecoration: 'none' }}>
            Join free
          </Link>
          <Link href="/auth/login" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', padding: '9px 18px', border: '1px solid var(--rule)', borderRadius: 8, textDecoration: 'none', background: 'var(--surface)' }}>
            Sign in
          </Link>
        </div>

        <HowItWorksCard />
      </div>
    )
  }

  const [profilesRes, biosRes, myProfileRes, myBioRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, username, first_name, last_name, city, country, avatar_url, user_types')
      .neq('id', user.id),
    supabase.from('user_bio').select('*'),
    supabase.from('user_profiles').select('city, country').eq('id', user.id).maybeSingle(),
    supabase.from('user_bio').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const myBio = myBioRes.data
    ? { ...myBioRes.data, city: myProfileRes.data?.city, country: myProfileRes.data?.country }
    : null
  const profileLocById = new Map<string, { city?: string | null; country?: string | null }>()
  for (const p of profilesRes.data ?? []) profileLocById.set(p.id, { city: p.city, country: p.country })
  const bioMap: Record<string, any> = {}
  for (const b of biosRes.data ?? []) {
    const loc = profileLocById.get(b.user_id) ?? {}
    bioMap[b.user_id] = { ...b, city: loc.city, country: loc.country }
  }

  const matches = (profilesRes.data ?? [])
    .map(p => {
      const { score, reasons } = computeMatch(myBio, bioMap[p.id] ?? null)
      return { profile: p, bio: bioMap[p.id] ?? null, score, reasons }
    })
    .sort((a, b) => b.score - a.score)

  const topCount       = matches.filter(m => m.score >= 70).length
  const goodCount      = matches.filter(m => m.score >= 50 && m.score < 70).length
  const potentialCount = matches.filter(m => m.score < 50).length

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 28px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>
          M01 · Your Matches
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px, 3vw, 28px)', color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 6px' }}>
          Your matches
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          {matches.length > 0
            ? <>People in the network who share your values, interests, and goals — sorted by compatibility.</>
            : <>Once other members complete their profiles, they'll show up here ranked by compatibility.</>}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 22 }}>
        <StatCard label="Top matches" value={String(topCount)} delta="≥70% compatibility" deltaColor="var(--m5)" />
        <StatCard label="Good matches" value={String(goodCount)} delta="50–69%" deltaColor="var(--m4)" />
        <StatCard label="Potential" value={String(potentialCount)} delta="below 50%" />
      </div>

      {/* Profile-not-complete prompt */}
      {!myBio && (
        <div style={{
          background: 'color-mix(in srgb, var(--m1) 6%, var(--surface))',
          border: '1px dashed color-mix(in srgb, var(--m1) 30%, var(--rule))',
          borderRadius: 10, padding: '16px 18px', marginBottom: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--m1)', letterSpacing: '0.08em', marginBottom: 4 }}>
              UNLOCK SCORES
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>
              Complete your profile to unlock match scores
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              Add your values, skills, personality, and travel plans to find your best matches.
            </div>
          </div>
          <Link href="/profile/edit" style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--m1)', padding: '8px 16px', borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}>
            Complete profile →
          </Link>
        </div>
      )}

      {/* Matches list */}
      <MatchesTabs matches={matches} />

      {/* How matching works */}
      <div style={{ marginTop: 28 }}>
        <HowItWorksCard />
      </div>
    </div>
  )
}

function StatCard({ label, value, delta, deltaColor }: {
  label: string; value: string; delta: string; deltaColor?: string
}) {
  return (
    <div className="dash-stat-card">
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: deltaColor ?? 'var(--ink-4)' }}>
        {delta}
      </div>
    </div>
  )
}

function HowItWorksCard() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>How matching works</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>Max 100 pts</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SCORING_DIMENSIONS.map(d => (
          <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>{d.label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.4 }}>{d.note}</div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', flexShrink: 0 }}>
              {d.max} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
