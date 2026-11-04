import Link from 'next/link'

// MyCoNet core release notes. A community's own history before v4.0.0 is in its instance/log.md.
const ENTRIES = [
  {
    version: 'v4.1.0',
    date: '2026-11-04',
    title: 'Join: application questions and community values set in the Blueprint',
    items: [
      'The application form now shows each question from the Blueprint (Step 1.4 · First Agreements) with its own answer box. Admins see every answer, under the wording the applicant saw, plus the "anything else" note.',
      'Community values are edited in the Blueprint too: Step 1.4 has a new Community values section to add, edit, reorder and remove the values members sign.',
      'The joining steps stay the same for every community. If the values or questions haven\'t been written yet, those steps say so and link to Step 1.4 instead of showing an empty list.',
      'Fixed: with no values, the first joining step showed "Sign 0 more to continue" and couldn\'t be passed.',
      'The Blueprint can open on a given step: /blueprint?step=s1.4.',
    ],
  },
  {
    version: 'v4.0.0',
    date: '2026-11-03',
    title: 'MyCoNet core: one codebase for every community',
    items: [
      'MyCoNet is now a core that each community runs from, with its own database, hosting and settings. RTRN (Regen Hood 0) is the first community; Protopia is next.',
      'Each community\'s settings live in one file (instance/config.jsonc): name, web address, Cloudflare and Supabase. The community name and the "open sourced by The Regen Tribe Collective" credit come from there.',
      'Circles are the community\'s own: set during setup in the Blueprint\'s new Circles step. The AI document scan suggests circles (each with a quote from the document), or start from the neighborhood org chart template, whose roles become teams on the Circles page. Admins can rename, retire and restore circles.',
      'The Blueprint shows a reminder until the community has at least one circle.',
      'The Neighborhood Directory (M02) and Resources & Tools (M03) links are gone; they become a separate platform.',
      'Fixed: choosing Advisor in Admin › Users failed to save.',
    ],
  },
]

export default function ChangelogPage() {
  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '56px 24px 80px' }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{
          display: 'inline-block', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--accent)', background: 'var(--accent-soft)',
          padding: '3px 10px', borderRadius: 20, marginBottom: 16,
        }}>
          Release notes
        </div>
        <h1 style={{
          fontFamily: 'var(--display)', fontSize: 40, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 12,
        }}>
          Changelog
        </h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.6 }}>
          What's new in MyCoNet, release by release.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {ENTRIES.map((entry, i) => (
          <div key={entry.version} className="changelog-timeline" style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr',
            gap: '0 28px',
            paddingBottom: 40,
          }}>
            {/* Left column — version + date */}
            <div className="changelog-meta" style={{ paddingTop: 3 }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                color: 'var(--accent)', letterSpacing: '0.04em',
              }}>
                {entry.version}
              </div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)',
                marginTop: 4, letterSpacing: '0.02em',
              }}>
                {entry.date}
              </div>
            </div>

            {/* Right column — content */}
            <div style={{
              borderLeft: '1px solid var(--rule)',
              paddingLeft: 28,
              position: 'relative',
            }}>
              {/* Timeline dot */}
              <div style={{
                position: 'absolute', left: -5, top: 6,
                width: 9, height: 9, borderRadius: '50%',
                background: i === 0 ? 'var(--accent)' : 'var(--rule)',
                border: '1.5px solid var(--surface)',
                boxShadow: `0 0 0 1.5px ${i === 0 ? 'var(--accent)' : 'var(--rule)'}`,
              }} />

              <div style={{
                fontFamily: 'var(--display)', fontSize: 20, marginBottom: 12,
                color: 'var(--ink)',
              }}>
                {entry.title}
              </div>

              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entry.items.map((item, j) => (
                  <li key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--ink-4)', flexShrink: 0, marginTop: 2, fontSize: 12 }}>—</span>
                    <span style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.65 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        borderTop: '1px solid var(--rule)', paddingTop: 32, marginTop: 8,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Link href="/" style={{
          fontSize: 13, color: 'var(--ink-3)', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ← Back to home
        </Link>
        <span style={{ color: 'var(--rule)', fontSize: 12 }}>|</span>
        <Link href="/blueprint" style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>
          Open Blueprint Wizard
        </Link>
      </div>
    </div>
  )
}
