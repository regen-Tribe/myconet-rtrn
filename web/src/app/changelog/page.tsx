import Link from 'next/link'

// MyCoNet core release notes. A community's own history before v4.0.0 is in its instance/log.md.
const ENTRIES = [
  {
    version: 'v4.16.2',
    date: '2026-11-13',
    title: 'Layout fixes, Achievements, and safer decisions',
    items: [
      'Blueprint › Import from a website now reads the whole site, not just 8 pages: every page it lists or links to, up to 300, with a running count and a Stop here button.',
      'Desktop: a new arrow in the top bar collapses the side menu for more room, and remembers your choice. (Thanks, Sonia.)',
      'Phones: pages with two columns no longer get cut off at the edge; they stack into one column. The Ask button no longer covers the end of the page. (Thanks, Sonia.)',
      'Profile photos: the Use photo button now looks clickable, and a new crop shows everywhere straight away, not only on the edit page. (Thanks, Sonia.)',
      'Contributions is now called Achievements in the menu and search. (Thanks, Sonia.)',
      'Join: only admins see Accept, Decline and Mark reviewing (they were the only ones who could use them), and the screen only changes when the decision is saved. (Thanks, Max.)',
      'Governance: whoever makes a proposal can withdraw it while it’s open, but can’t mark it passed or rejected. (Thanks, Max.)',
      'Agreements: new agreements always start as pending, and only admins and project leads can accept them. (Thanks, Max.)',
    ],
  },
  {
    version: 'v4.16.1',
    date: '2026-11-13',
    title: 'MyCoNet in the phone top bar',
    items: [
      'On phones, the top bar now shows MyCoNet above your community’s name, above the version.',
    ],
  },
  {
    version: 'v4.16.0',
    date: '2026-11-13',
    title: 'Fill the Blueprint from your website',
    items: [
      'Blueprint › Import now takes a website address too. It reads the page and up to 7 pages it links to (about, mission, governance…) and suggests answers, the same way it does for documents. Answers show which page they came from.',
      'Imports no longer overwrite what you have written. Where a question already has an answer, the new text is added after it; you can still choose Keep current or Replace it for each one.',
      'Every document or website you import is now saved in Setup › Documents, as shareable or sensitive, so the portal assistant can answer from it.',
    ],
  },
  {
    version: 'v4.15.8',
    date: '2026-11-13',
    title: 'Only admins and circle leads change the blueprint',
    items: [
      'The Blueprint can now be changed by any admin or circle lead, and only by them. Before, only the person who first set it up could save; other admins and circle leads could type in it but their changes were lost.',
      'If a change can’t be saved, the Blueprint now says so instead of losing it quietly.',
    ],
  },
  {
    version: 'v4.15.7',
    date: '2026-11-13',
    title: 'Find your personality type',
    items: [
      'Profile › Personality now invites you to find your Myers-Briggs type with the free test at 16personalities.com, then pick it.',
    ],
  },
  {
    version: 'v4.15.6',
    date: '2026-11-13',
    title: 'The calendar opens on today',
    items: [
      'A new Day view shows one day’s events in full, and the calendar now opens on it, on today. Use ‹ › to move a day at a time, or pick Week, Month or List.',
      'Tapping a day in Month opens that day. On a day with nothing on, it links to the next day that has something.',
    ],
  },
  {
    version: 'v4.15.5',
    date: '2026-11-13',
    title: 'Position your profile photo',
    items: [
      'When you choose a profile photo, you can drag and zoom it inside a circle. That exact crop is saved, so your photo looks the same everywhere. Thanks to Sonia.',
      'If a photo’s format can’t be opened (often iPhone HEIC photos), it tells you to use a JPG or PNG instead.',
    ],
  },
  {
    version: 'v4.15.4',
    date: '2026-11-13',
    title: 'Top bar fits on phones',
    items: [
      'On phones the top bar grows to fit, so the Modules button, the full-size logo and the version no longer spill below it. Your name there is shown as just your photo.',
    ],
  },
  {
    version: 'v4.15.1',
    date: '2026-11-13',
    title: 'One list of circle leads',
    items: [
      'The org chart, Ops › Circles and Blueprint › Circles now show the same lead for each circle. Change it in any of them and the others update straight away.',
      'Ops › Circles and the Blueprint also show the circle leads who have an account, and Ops marks the steward circle.',
    ],
  },
  {
    version: 'v4.15.0',
    date: '2026-11-13',
    title: 'Circle leads and the steward circle',
    items: [
      'Each circle on the org chart shows its lead’s name, even if they aren’t on the portal yet. Admins type or change it right on the card.',
      'A community can mark one circle as its stewards, the circle that looks after every circle. It sits at the top of the org chart, with the admins.',
    ],
  },
  {
    version: 'v4.14.1',
    date: '2026-11-13',
    title: 'You choose who sees your fears and healing journey',
    items: [
      'Profile › Edit › Goals & Growth now asks who can see your fears and healing journey: only you, full members, joining members and up, everyone signed up, or anyone. It starts at full members.',
      'Calendar events named like a circle find it even when the name is a little different, for example "Clean Circle" goes in the Cleaning circle.',
    ],
  },
  {
    version: 'v4.14.0',
    date: '2026-11-13',
    title: 'Public profiles and admin rights',
    items: [
      'Profiles have an “About you” bio and website, Instagram, LinkedIn and X links. Anyone can see your name, photo, headline, bio and links.',
      'Everything else on a profile (location, values, skills, personality, offers, requests, travel) is now only for people who have signed up. Visitors see those sections shaded, with an invitation to sign up.',
      'Only admins can edit other people’s profiles. Circle and project leads could before; project leads also no longer see every join application. Thanks to Max for finding and fixing both.',
    ],
  },
  {
    version: 'v4.13.2',
    date: '2026-11-12',
    title: 'A colour for each calendar',
    items: [
      'Daily events are green, Core events indigo, Community hosted pink and Tasks orange, on the calendar, the checkboxes and the legend. Categories like Food and Movement show as a small dot on each event.',
    ],
  },
  {
    version: 'v4.13.1',
    date: '2026-11-12',
    title: 'Event descriptions and comments',
    items: [
      'Every event has a comment thread. Everyone signed in can read it; full members can comment and delete their own comments, and admins can delete any.',
      'Full members can add a description to events from a linked Google calendar (+ Add a description in the event). Updates from Google never overwrite it.',
    ],
  },
  {
    version: 'v4.12.2',
    date: '2026-11-12',
    title: 'Passwords',
    items: [
      'Change your password any time from the menu › Change password, without an email.',
      'Password reset links work whichever way they were sent, and an expired link explains what to do next.',
      'If a reset email doesn\'t arrive, admins can now see why: every request is recorded for 30 days, including addresses typed slightly differently from the account (like a Gmail address without its dot).',
    ],
  },
  {
    version: 'v4.12.1',
    date: '2026-11-12',
    title: 'Show several calendars at once',
    items: [
      'The calendar\'s Daily events, Core events, Community hosted and Tasks are now checkboxes, so you can see any mix of them together. Categories like Food and Movement are checkboxes too.',
    ],
  },
  {
    version: 'v4.12.0',
    date: '2026-11-12',
    title: 'Daily events and categories',
    items: [
      'A new "Daily events" calendar for the community\'s rhythm, such as meals, movement and focus hours, alongside Core events, Community hosted and Tasks.',
      'Events can have a category ("Food", "Movement"…), with filter buttons and a colour for each.',
      'Linked calendars can sort their events: for example, everything titled Breakfast, Lunch or Dinner goes to Daily events › Food.',
    ],
  },
  {
    version: 'v4.11.0',
    date: '2026-11-11',
    title: 'Linked calendars',
    items: [
      'Admins can link the community\'s Google Calendar (or any calendar with an iCal link) from the Calendar page. Its events appear on the community calendar for the next three months and stay up to date: repeating events, changes and cancellations follow the original calendar.',
      'Events named after a circle, like "Farming Circle", are placed in that circle automatically.',
      'Linked events are marked as such and are edited in the original calendar.',
    ],
  },
  {
    version: 'v4.10.1',
    date: '2026-11-11',
    title: 'Working rules for contributors',
    items: [
      'The code now spells out how to contribute: every change goes on its own branch and in a pull request for review, never straight to the live version. The same rules are written for AI coding assistants.',
    ],
  },
  {
    version: 'v4.10.0',
    date: '2026-11-05',
    title: 'Home page: every module at a glance',
    items: [
      'The landing page and Home now open with "The portal at a glance": a card for every module with a one-line explanation, a jump to its preview further down, and a link to open it.',
      'A new section introduces the community assistant, with example questions that open the chat.',
      'The demo panels show the community\'s own name, and the Join preview shows the community\'s real values once they are written (until then, clearly labelled examples).',
    ],
  },
  {
    version: 'v4.9.0',
    date: '2026-11-05',
    title: 'Admin › Questions: what people ask the assistant',
    items: [
      'Every question asked to the community assistant is saved with its answer, who asked (or "Visitor") and when.',
      'Questions the community\'s material couldn\'t answer are flagged "No answer", in any language, so admins can see what to add to the Blueprint or the documents.',
      'New Admin › Questions tab next to Users: "Needs an answer" first, filters for All / Resolved / Dismissed, search, the full answer, notes, and Mark resolved / Dismiss / Reopen. The tab shows how many questions are waiting.',
      'The chat now says that questions are saved to improve the community\'s answers.',
    ],
  },
  {
    version: 'v4.8.0',
    date: '2026-11-05',
    title: 'The search bar works',
    items: [
      'Type in the top bar to find pages, members, projects, proposals, calendar events and circles. You only see what you are allowed to see.',
      'The last suggestion always asks the community assistant your question, so a search that finds nothing still gets an answer.',
      '⌘K (Ctrl+K on Windows) jumps to the search from anywhere; arrow keys and Enter pick a result.',
    ],
  },
  {
    version: 'v4.7.0',
    date: '2026-11-05',
    title: 'Bigger top bar, and a picture when the link is shared',
    items: [
      'The top bar is taller across the whole portal, with a bigger logo and community name.',
      'Sharing the portal\'s link (WhatsApp, Telegram, Slack, email, social media) now shows a preview picture, title and description. Admins set the picture in Blueprint › Look & feel (a screenshot of the home page works well); until then the banner is used. The logo also becomes the browser tab icon.',
    ],
  },
  {
    version: 'v4.6.0',
    date: '2026-11-05',
    title: 'Ask the community: a portal assistant',
    items: [
      'An "Ask <community>" button on every page opens a chat that answers questions from the community\'s Blueprint and documents, quoting where each answer comes from (for example "Handbook p. 12"). It answers in the language you write in, and says so when the material doesn\'t cover a question.',
      'Visitors can ask 2 questions before signing in; everyone signed in can keep asking.',
      'New Blueprint step, Documents: the community\'s library. Every upload asks what kind of document it is: Shareable (the assistant may use it for anyone) or Sensitive (only admins and circle leads get answers from it). The Blueprint import asks too, and adds the document.',
    ],
  },
  {
    version: 'v4.5.0',
    date: '2026-11-05',
    title: 'Blueprint import: faster, starts on its own, shows its progress',
    items: [
      'Dropping a document starts the import straight away: no separate "Scan" button.',
      'A live checklist shows what is happening: reading the PDF (page by page), finding what the document says about each question (per framework phase, with a running count), writing your answers, and looking for the logo and banner, with a timer.',
      'Much faster and more reliable on long, detailed documents: a fast model gathers the quotes, and the full model writes the answers. Before, a detailed 70-page handbook could take 30 minutes or fail.',
      'The logo and banner search runs at the same time as the text, and can be skipped.',
    ],
  },
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
