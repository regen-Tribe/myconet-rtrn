import Link from 'next/link'

// MyCoNet core release notes. A community's own history before v4.0.0 is in its instance/log.md.
const ENTRIES = [
  {
    version: 'v4.4.0',
    date: '2026-11-05',
    title: 'Blueprint import: reads the whole document, answers with sources',
    items: [
      'The document import now uses MiniMax M3. It reads up to about 400 pages, in one go for most documents (it used to cut documents into many small pieces, and big files failed with "Prompt too long").',
      'It works in two steps: first it collects quotes for every Blueprint question from the whole document, then it writes each answer from all of them. Answers that combine several pages come out as one answer instead of fragments.',
      'Each proposed answer shows how sure the AI is, the pages it came from, and a warning when the document contradicts itself or your current answer. Answers the AI isn\'t sure about start unticked.',
      'The review lists the questions the document doesn\'t cover, so you know what\'s left to write.',
      'Logo and banner: the AI now looks at the images from your PDF and marks its picks. Big image-heavy PDFs are handled safely, with a Skip button.',
      'If part of the scan fails, the rest of the answers are kept and the review says what was missing.',
    ],
  },
  {
    version: 'v4.3.0',
    date: '2026-11-04',
    title: 'Blueprint import finds your logo and banner',
    items: [
      'When an admin imports a PDF into the Blueprint, the wizard also looks through its images and suggests a logo (an image repeated across pages, or a small one on the cover) and a banner (a wide, high-resolution photo).',
      'The review screen shows them as thumbnails next to the proposed answers, with the best guesses selected where the community has none yet. Pick another, or None; they are saved together with the answers.',
    ],
  },
  {
    version: 'v4.2.1',
    date: '2026-11-04',
    title: 'Database hardening',
    items: [
      'Two internal database functions (the signup hook and the automatic security switch for new tables) can no longer be called from outside, and six functions now use a fixed search path. Nothing changes for members.',
    ],
  },
  {
    version: 'v4.2.0',
    date: '2026-11-04',
    title: "Each community's own look, and core updates by pull request",
    items: [
      'The top bar now reads "MyCoNet · <community name>", with the community\'s logo. The name also appears in the browser tab, the sign-in page, the landing page, Home and the footer.',
      'A banner image can run across the top of the landing page, Home and the Dashboard.',
      'New Blueprint setup step, "Look & feel": admins upload the logo and banner. Until they do, the Blueprint dashboard lists them as open setup items and admins see a prompt where the banner goes.',
      'For each community repo: a daily check opens a pull request when MyCoNet core has a new release, a drift check flags changes to core files, and `npm run upstream` sends an improvement back to core.',
    ],
  },
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
