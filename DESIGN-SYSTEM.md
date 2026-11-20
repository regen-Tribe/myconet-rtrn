# MyCoNet — Design System

> Status: v3.44, plus the switchable v4 below | Last updated: 2026-11-19

The visual language used across MyCoNet v2. Modern, sleek, white + grey neutrals with module colors used as accents — think Google Material 3 / Stripe / Linear.

The **canonical reference implementation is `/dashboard`** (M00) — `web/src/modules/m00-dashboard/DashboardPage.tsx`. When in doubt, open that file and match what it does. The **second canonical reference is `/members`** (M01 — "members dashboard") which mirrors M00's pattern with member-specific content.

---

## v4: the redesign (switchable, from v4.39.0)

A community turns it on with `"design": "v4"` in `instance/config.jsonc`; everyone else keeps the look described
in the rest of this file until v4 is finished and becomes the default. Words follow `LEXICON.md`.

**Rules.** (1) One next step per screen, in the soft green action colour (`--action`, text `--action-ink`).
(2) Main buttons are black pills; secondary buttons are white with a hairline. (3) Colour shows status, never a
module: To do blue, In progress violet, Review red, Done green, Paused yellow, Ideas grey (`--st-*`). The module
colours (`--m*`) are black in v4. (4) Labels above headings (eyebrows) are light sans capitals, wide letter-spacing,
`--ink-4`; no mono font. (5) A pale blue page (`--bg`) with white cards, no shadows; three radii: pill, card 20px,
inner 12px; six text sizes 11/13/15/18/24/40. (6) One hand-drawn icon set (marker line); no emoji in the interface.
(7) Drawings (cream on cobalt) only for empty screens and page headers. (8) The board keeps its Paused column
(Oscar, 2026-11-19), for projects only, after Done.

**How it ships.** Release 1 (v4.39.0) re-points the tokens, so everything that uses them changes at once. Then,
one release each, behind the same switch:
1. Shared components (done in v4.41.0, `core/components/v4`, see `/design`): Button, StatusPill, Chip, Card, ListRow, Icon, PageHeader, NextStep,
   EmptyState, and `ModalShell` restyled (light blurred backdrop, a bottom sheet on phones).
2. The shell and menu: You (My dashboard) · Community (About {community}, Members, Calendar, Circles, Amenities &
   tools) · Working together (Operations, Agreements, Meetings, Governance) · Admin (Applications, Bookings,
   Permissions). Needs the lexicon's new addresses first. My tasks moves into My dashboard; Achievements into profiles.
   **Done in v4.42.0** (`core/components/shell/MenuV4.tsx`, `TabBarV4.tsx`, `core/lib/nav.ts › menuGroups`), with the
   orientation review's O3, O5, O7, O8 and O9.
3. My dashboard (done in v4.41.0, `m00-dashboard/DashboardV4.tsx`); 4. About {community} (the Blueprint as a page); 5. Amenities & tools (Accommodation and Resources
   together, with a map); 6. Admin: Bookings calendar (who stays where) and Permissions; 7. the remaining modules.
Each release replaces that module's hard-coded colours and sizes with tokens and components.

The prototype these come from: `design/redesign-prototype/app.html` (open it in a browser; sample data, with a "View as" role switch). `index.html` beside it has the rules, colours, icons and drawings.

---

## 1. Design principles

0. **Minimal and modern, like Apple** (Oscar, 2026-11-18: "lets keep with the styling of everything minimal modern
   like apple"). Every screen: calm, quiet, plenty of space, one clear action; nothing that doesn't help the person.
   Pop-ups never run off the screen (the middle scrolls, the buttons stay), backdrops are light and blurred.
1. **White surfaces with thin grey borders.** No drop shadows except on hover/active.
2. **Four-step grey hierarchy** for text — `--ink` (titles) → `--ink-2` (body strong) → `--ink-3` (body) → `--ink-4` (labels / metadata).
3. **Module colors are accents, not backgrounds.** Reserve color for: 3px top stripes on cards, 2px left stripes on nav items, badge tints, primary CTA fills, status indicators. Body content stays neutral.
4. **Mono font for structure, display font for voice.** Eyebrows / labels / timestamps / metric numbers use `var(--mono)`. Headings use `var(--display)`.
5. **Generous whitespace, compact info density.** Lots of breathing room around sections, but the data inside cards is dense and scannable.
6. **One radius per element class.** Cards: 10px. Buttons/chips/inputs: 8px. Pills: 20px (or fully rounded).
7. **No visual decoration without meaning.** Every color, border, and shape signals something the user can act on.

---

## 2. Design tokens (from `web/src/app/globals.css`)

### Color — neutrals (the spine of the design)

| Token | Light mode | Use for |
|---|---|---|
| `--ink` | `hsl(0 0% 9%)` | Titles, primary text, metric values |
| `--ink-2` | `hsl(0 0% 22%)` | Body strong, bolded values inline |
| `--ink-3` | `hsl(0 0% 45%)` | Body / descriptions |
| `--ink-4` | `hsl(0 0% 65%)` | Labels, timestamps, hints |
| `--surface` | `hsl(0 0% 100%)` | Card backgrounds |
| `--bg` | `hsl(0 0% 100%)` | Page background |
| `--bg-2` | `hsl(0 0% 97%)` | Subtle inset / sidebar background |
| `--rule` | `hsl(0 0% 89%)` | All borders, dividers |
| `--rule-soft` | `hsl(0 0% 93%)` | Softer dividers (rare) |

### Color — module accents (use sparingly)

| Token | Hex | Module |
|---|---|---|
| `--m1` | `#92400e` (brown) | Community Network |
| `--m4` | `#92640a` (yellow) | Blueprint |
| `--m5` | `#15803d` (green) | Join |
| `--m6` | `#1d4ed8` (blue) | Agreements |
| `--m7` | `#4338ca` (indigo) | Operations |
| `--m8` | `#7c3aed` (violet) | Contributions |
| `--m9` | `#db2777` (pink) | Governance |
| `--accent-color` | `hsl(142 76% 36%)` (green) | Generic success / primary CTA on neutral pages |
| `--accent-soft` | `hsl(142 50% 93%)` | Accent backgrounds, badge tints |

### Typography

| Token | Stack |
|---|---|
| `--display` | `'Open Sans', sans-serif` — for h1, h2, hero text |
| `--mono` | `Menlo, monospace` — for eyebrows, labels, timestamps, metric numbers |
| (default body) | `'Geist', sans-serif` (from `next/font`) |

### Radii

| Token | Value | Use for |
|---|---|---|
| `--radius` | `8px` | Buttons, inputs, chips, pills |
| `--radius-lg` | `12px` | (legacy — prefer plain `10` for cards) |
| `--radius-xl` | `18px` | Hero / extra-large containers |
| `20` (inline) | 20px | Status pills, badges |
| `50%` | full | Avatars, circular indicators |

### Spacing scale (rough convention)

| Use | Value |
|---|---|
| Card padding | `14-18px` (compact) or `16-20px` (roomy) |
| Section gap (vertical) | `14-22px` |
| Grid gap | `10-12px` (tight grids), `18-20px` (column splits) |
| Page padding (outer) | `28px` horizontal, `28px` top, `80px` bottom |
| Max content width | `1100px` (single column), unconstrained inside split shells |

---

## 3. Component patterns

These are the reusable patterns that show up on every page. Match them exactly when building new pages.

### 3.1 Page header

Three lines stacked, action buttons aligned right.

```tsx
<div style={{ marginBottom: 22 }}>
  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--ink-4)', marginBottom: 8 }}>
    M00 · Dashboard
  </div>
  <div style={{ display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
    <div>
      <h1 style={{ fontFamily: 'var(--display)',
                   fontSize: 'clamp(20px, 3vw, 28px)',
                   color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 6px' }}>
        Good morning, Oscar.
      </h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
        You're a <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>Member</span> at …
      </p>
    </div>
    <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
      {/* Secondary button */}
      <Link href="…" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)',
                              padding: '7px 14px', border: '1px solid var(--rule)',
                              borderRadius: 8, textDecoration: 'none',
                              background: 'var(--surface)' }}>
        View …
      </Link>
      {/* Primary button — color is the module color of the action */}
      <Link href="…" style={{ fontSize: 13, fontWeight: 700, color: '#fff',
                              padding: '7px 16px', borderRadius: 8,
                              textDecoration: 'none', background: 'var(--m5)' }}>
        Begin joining →
      </Link>
    </div>
  </div>
</div>
```

Three rules:
1. **The eyebrow shows the module identity** — `M00 · Dashboard`, `M01 · Community Network`, etc.
2. **The h1 is grammatical and warm**, not abstract — "Good morning, Oscar" beats "Dashboard".
3. **The subtitle uses bolded inline data** (member counts, role) — not separate metric pills above the heading.

### 3.2 StatCard

A single mono number on a white surface. Clickable when there's a relevant destination.

```tsx
<Link href="/members" style={{ textDecoration: 'none', display: 'block' }}>
  <div className="dash-stat-card dash-stat-card--link">
    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: 'var(--ink-4)', marginBottom: 6 }}>
      Members
    </div>
    <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700,
                  color: 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>
      38
    </div>
    <div style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>
      +4 this week
    </div>
  </div>
</Link>
```

Grid them with `gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12`. The `.dash-stat-card` class lives in `globals.css` and handles the white-surface / border / radius / padding / hover treatment — use it instead of re-inlining.

### 3.3 ModCard (module / link card)

A clickable card with a colored top stripe. Use for any "jump into X" tile.

```tsx
<div style={{
  position: 'relative', overflow: 'hidden',
  background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10,
  padding: '14px 16px', opacity: locked ? 0.55 : 1,
  transition: locked ? 'none' : 'box-shadow 140ms, transform 140ms',
}}>
  {/* The 3px colored stripe */}
  <div style={{ position: 'absolute', top: 0, left: 0, right: 0,
                height: 3, background: color }} />
  <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 6, marginTop: 4 }}>
    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                   color, letterSpacing: '0.06em' }}>M01</span>
    {/* Optional CTA pill or 🔒 badge on the right */}
  </div>
  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)',
                marginBottom: 3 }}>Community Network</div>
  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
    38 members · explore profiles and match
  </div>
</div>
```

### 3.4 Activity / list card

A roomy white card with a header row and stacked rows. Used for activity feeds, notification queues, recent items.

```tsx
<div style={{ background: 'var(--surface)', border: '1px solid var(--rule)',
              borderRadius: 10, padding: '16px 18px' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 14 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Activity</div>
    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
      Last 7 days
    </div>
  </div>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {/* …rows… */}
  </div>
</div>
```

### 3.5 Eyebrow / section label

For subdivisions within a column. Always mono, always uppercase, always letter-spaced, always `--ink-3` or `--ink-4`.

```tsx
<div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--ink-3)', marginBottom: 10 }}>
  Jump into a module
</div>
```

### 3.6 Tinted "Next step" / call-out card

A soft, dashed-border card tinted by the relevant module color. Use to surface "the one thing the user should do next."

```tsx
<div style={{
  background: 'color-mix(in srgb, var(--m5) 6%, var(--surface))',
  border: '1px dashed color-mix(in srgb, var(--m5) 30%, var(--rule))',
  borderRadius: 10, padding: '16px 18px',
}}>
  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                color: 'var(--m5)', letterSpacing: '0.08em', marginBottom: 5 }}>
    NEXT STEP
  </div>
  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)',
                marginBottom: 5 }}>
    Sign the community values
  </div>
  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55,
                marginBottom: 12 }}>
    3 simple steps move you from Explorer to Joining.
  </div>
  <Link href="/join" style={{ display: 'inline-block', fontSize: 13, fontWeight: 700,
                              color: '#fff', background: 'var(--m5)',
                              padding: '8px 16px', borderRadius: 8,
                              textDecoration: 'none' }}>
    Start joining →
  </Link>
</div>
```

### 3.7 Avatar with initial fallback

```tsx
<div style={{
  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
  background: color, display: 'grid', placeItems: 'center',
  color: '#fff', fontSize: 9.5, fontWeight: 700,
}}>
  {initials}
</div>
```

For larger avatars: same shape, scaled up; if it has a real image, render the `<img>` inside with `objectFit: 'cover'`.

### 3.8 Tag chip

For user-type / role / category tags.

```tsx
<span style={{
  fontSize: 10, padding: '2px 7px', borderRadius: 20,
  background: 'var(--bg-2)', color: 'var(--ink-3)',
  border: '1px solid var(--rule)',
}}>
  Community Member
</span>
```

For a colored-status pill (active, accepted, etc.), tint with the module color:

```tsx
<span style={{
  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
  color: '#fff', background: 'var(--m5)',
}}>
  Live
</span>
```

---

## 4. Page composition

The standard top-down structure of any module page:

```
┌──────────────────────────────────────────────────────┐
│ [Eyebrow]  M01 · Community Network                   │
│ [Heading]  Welcome back, Oscar.                      │
│ [Subtitle] You're a Member at Greenhollow · 38 …     │
│ [Actions →]                          [View blueprint] │
│                                      [Begin joining]  │
│                                                       │
├──────────────────────────────────────────────────────┤
│ [4 StatCards in auto-fit minmax(130px, 1fr) grid]     │
├──────────────────────────────────────────────────────┤
│ [Two-column 1.4fr / 1fr — or single column inside    │
│  a /network shell where horizontal space is scarce]   │
│                                                       │
│  [Eyebrow]  JUMP INTO A MODULE                        │
│  [Grid of ModCards]              [Activity card]     │
│                                  [Next step card]    │
│                                  [Welcome card]      │
└──────────────────────────────────────────────────────┘
```

**Inside the M01 shell** (`/members/*` and `/u/*`): the inner sidebar and right panel already eat ~440px, so the middle column should be **single-column with sections stacked vertically**, not the two-column split.

---

## 5. What NOT to do

| Don't | Why |
|---|---|
| Use shadcn `<Card>` `<CardContent>` for layout cards. | Adds extra DOM, baked-in styles that fight the design tokens, and inconsistency with the dashboard. **Use plain `<div>` with the design tokens instead.** |
| Use Tailwind utility classes (`p-4`, `text-3xl`, `bg-primary/5`) on top-level page chrome. | Bypasses the token system. Acceptable inside shadcn primitives (button, input, badge) but not for page layout. |
| Use shadcn `<Button variant="default">` for module-color CTAs. | Variants don't map to the M0X palette. Roll an inline `<Link>` with `background: var(--m5)` etc. |
| Mix font families on the same line. | Body sans + mono should be on adjacent lines (heading + eyebrow), never inside the same paragraph. |
| Use icon-only buttons without an aria-label or visible tooltip. | Accessibility. The dashboard's view-toggle buttons in MemberList do this correctly. |
| Add new colors outside the M0X / ink-N / accent palette. | If you think you need one, you probably need to use an existing token differently. |
| Use `<h1>` for sub-sections. | Eyebrows are not headings. Pages have exactly one `<h1>` (the page title). Sub-sections use the mono eyebrow pattern. |

---

## 6. Module-color usage map

What each `--mNN` color means and when to use it:

| Color | When to use as accent | When NOT to use |
|---|---|---|
| `--m1` brown | Anywhere on `/members/*` or `/u/*` | Inside other modules' chrome |
| `--m4` yellow | Blueprint progress bars, "phase" indicators | As a primary CTA — too pale for white text |
| `--m5` green | Join CTAs, "live" status, accepted state, success | Generic neutrals — use `--accent-color` |
| `--m6` blue | Agreements, collaboration flow, "submitted" state | Links inside body text |
| `--m7` indigo | Operations, project Kanban, deliverable status | Stat-card backgrounds |
| `--m8` violet | Contributions, badges, points | Buttons (low contrast) |
| `--m9` pink | Governance, voting, proposal status | Body text |

The outer module sidebar in `AppSideNav` automatically highlights the active module — your page chrome doesn't need to repeat that. Use the module color sparingly as accents (eyebrow tag, CTA fill, progress bar).

---

## 7. Where to look in the codebase

| For an example of | Open this file |
|---|---|
| The full page layout pattern | `web/src/modules/m00-dashboard/DashboardPage.tsx` |
| StatCard, ModCard, FeedRow helpers (inline) | same file |
| Inner module sidebar + right panel | `web/src/modules/m01-network/NetworkSidebar.tsx`, `NetworkRightPanel.tsx` |
| App shell (top bar + side nav + main) | `web/src/core/components/shell/AppShell.tsx` + `AppTopBar.tsx` + `AppSideNav.tsx` |
| The design tokens themselves | `web/src/app/globals.css` |
| The portal-explainer design spec (extra detail on copy, hero, mockups) | `archive/Modules/design_handoff_portal_explainer/README.md` |
