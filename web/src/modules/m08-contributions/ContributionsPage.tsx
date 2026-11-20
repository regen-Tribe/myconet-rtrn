import { PageHeader } from '@/core/components/v4'
import { DESIGN } from '@/core/lib/instance'
import { createClient } from '@/core/lib/supabase/server'
import Link from 'next/link'
import { moduleOn } from '@/core/lib/modules'

const CATALOG = [
  {
    key: 'profile_complete',
    title: 'Profile Pioneer',
    description: 'Completed your full member profile — all 11 sections filled in.',
    icon: '✦',
    color: 'var(--m1)',
    hint: 'Fill in every section of your profile to earn this badge.',
  },
  {
    key: 'community_joiner',
    title: 'Community Joiner',
    description: 'Signed the community values and joined as a member.',
    icon: '🏡',
    color: 'var(--m5)',
    hint: 'Finish joining and get accepted to earn this badge.',
  },
  {
    key: 'community_member',
    title: 'Community Member',
    description: 'Made an agreement to help on a task, or suggested a task in Operations — a full contributing member of the community.',
    icon: '⊕',
    color: 'var(--m9)',
    hint: 'Make an agreement to help on a task, or suggest a task in Operations. Once one is accepted you earn this badge.',
  },
]

export default async function ContributionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let earnedKeys = new Set<string>()
  let earnedAt: Record<string, string> = {}
  let points: number | null = null

  if (user) {
    const { data: earned } = await supabase
      .from('user_achievements')
      .select('achievement_key, earned_at')
      .eq('user_id', user.id)

    if (moduleOn('points')) {
      const { data: total } = await supabase.rpc('points_total', { p_user: user.id })
      points = typeof total === 'number' ? total : 0
    }

    earnedKeys = new Set((earned ?? []).map((r: { achievement_key: string }) => r.achievement_key))
    earnedAt = Object.fromEntries(
      (earned ?? []).map((r: { achievement_key: string; earned_at: string }) => [r.achievement_key, r.earned_at])
    )
  }

  return (
    <div className={DESIGN === 'v4' ? 'v4-page' : undefined} style={DESIGN === 'v4' ? { maxWidth: 820 } : { padding: '32px 28px', maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        {DESIGN === 'v4' ? (
          <PageHeader eyebrow="You" title="Achievements" subtitle="Badges earned by showing up, contributing and building this community." />
        ) : (<>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span className="mod-num" style={{
            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--m8)', background: 'color-mix(in srgb, var(--m8) 10%, transparent)',
            padding: '2px 8px', borderRadius: 4,
          }}>M08</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>Achievements</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Achievements</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
          Badges earned by showing up, contributing, and building this community.
        </p>
        </>)}
        {points !== null && (
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 10, fontWeight: 600 }}>
            Your points: <span style={{ color: 'var(--m8)' }}>{points}</span>
          </p>
        )}
      </div>

      {!user && (
        <div style={{
          marginBottom: 24, padding: '14px 18px', borderRadius: 10,
          background: 'color-mix(in srgb, var(--m8) 6%, var(--surface))',
          border: '1px solid color-mix(in srgb, var(--m8) 25%, var(--rule))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', margin: '0 0 2px' }}>
              You're previewing Achievements.
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>
              Create a free account to track your earned badges and contributions.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href="/auth/signup" style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'var(--m8)', padding: '6px 14px', borderRadius: 7, textDecoration: 'none' }}>Create account</Link>
            <Link href="/auth/login" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--m8)', padding: '6px 4px', textDecoration: 'none' }}>Sign in</Link>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {CATALOG.map(a => {
          const unlocked = user ? earnedKeys.has(a.key) : false
          const date = earnedAt[a.key]
          return (
            <div key={a.key} style={{
              display: 'flex', alignItems: 'center', gap: 18,
              padding: '18px 20px', borderRadius: 12,
              border: `1px solid ${unlocked ? `color-mix(in srgb, ${a.color} 30%, var(--rule))` : 'var(--rule)'}`,
              background: unlocked
                ? `color-mix(in srgb, ${a.color} 6%, var(--surface))`
                : 'var(--bg-2)',
              opacity: unlocked ? 1 : (user ? 0.55 : 0.45),
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                display: 'grid', placeItems: 'center', fontSize: 26,
                background: unlocked
                  ? `linear-gradient(135deg, ${a.color}, color-mix(in srgb, ${a.color} 60%, var(--accent-color)))`
                  : 'var(--rule)',
                boxShadow: unlocked ? `0 4px 14px color-mix(in srgb, ${a.color} 30%, transparent)` : 'none',
                color: unlocked ? '#fff' : 'var(--ink-4)',
                filter: unlocked ? 'none' : 'grayscale(1)',
              }}>
                {unlocked ? a.icon : '🔒'}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 3 }}>{a.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  {unlocked ? a.description : a.hint}
                </div>
                {unlocked && date && (
                  <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
                    Earned {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>

              {!unlocked && (
                user
                  ? <Link href={a.key === 'community_joiner' ? '/join' : a.key === 'community_member' ? '/agreements' : '/profile/edit'} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--rule)' }}>
                      {a.key === 'community_joiner' ? 'Open Join →' : a.key === 'community_member' ? 'Open Agreements →' : 'Complete profile →'}
                    </Link>
                  : <Link href="/auth/signup" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--rule)' }}>
                      Create account
                    </Link>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 24, padding: '14px 18px', borderRadius: 10, border: '1px dashed var(--rule)', background: 'var(--bg-2)', fontSize: 12, color: 'var(--ink-4)', textAlign: 'center' }}>
        More achievements coming as the community grows.
      </div>
    </div>
  )
}
