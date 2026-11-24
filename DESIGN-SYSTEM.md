# MyCoNet — Design System (v4)

> Status: v4, plus the design review layer | Last updated: 2026-11-22

**This is the only design guide.** The old look (v3.44: mono labels, module colours, 10px cards) moved to
`archive/DESIGN-SYSTEM-v3.md` and is only for communities without `"design": "v4"`. Never copy patterns from it.

Before any UI change, read **`design/decisions.md`** (what was decided, by whom, and why). If your change goes
against an entry there, add a new entry that replaces it, with the reason; never change it silently.
Words come from `LEXICON.md`. The full review behind the newest rules: `instance/design/ux-review-2026-11-22.html`.

Reference screens: My dashboard (`m00-dashboard/DashboardV4.tsx`) and Circles (`m17-org/CirclesV4.tsx`).
Shared parts: `web/src/core/components/v4` (shown on `/design`).

## v4: the redesign (switchable, from v4.39.0)

A community turns it on with `"design": "v4"` in `instance/config.jsonc`; everyone else keeps the look described
in the rest of this file until v4 is finished and becomes the default. Words follow `LEXICON.md`.

**Rules.** (1) One next step per screen, in the soft green action colour (`--action`, text `--action-ink`).
(2) Main buttons are dark green pills (Sonia, 20 Nov: "the action should be most prominent"; decisions #30); secondary buttons are white with a hairline. A selected chip, segment or tab is filled black (#31). (3) Colour shows status, never a
module: To do blue, In progress violet, Review yellow (waiting on an answer), Done green, Paused an outline pill, Ideas grey, Declined red (`--st-*`; decision #34). The module
colours (`--m*`) are black in v4. (4) Labels above headings (eyebrows) are light sans capitals, wide letter-spacing,
`--ink-4`; no mono font. (5) A faintly blue page (`--bg`, half the first v4 wash; hairlines neutral grey) with white cards, no shadows; three radii: pill, card 20px,
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

**Three visual layers, never mixed (v4.78.0–v4.79.0).** Each look means one thing:
- **Interface icons:** the marker-line set in ink (`Icon`, `InlineIcon` in a line of text). Never coloured, never
  an emoji. Older code that used lucide names gets the same icons through `v4/lucide-compat.tsx`; the
  `lucide-react` package is gone. `cd web && npm run icon-check` (also in the Lint workflow) fails on an emoji in
  `web/src` or a `lucide-react` import; its short allow list is at the top of `web/scripts/icon-check.mjs`.
- **Circles:** the circle seal (`CircleSeal`; `Seal` when you already have a colour and a glyph): the circle's
  colour as a hand-drawn round with its glyph stamped on it in cream (`v4/circle-glyphs.ts`, `circles.icon`; no
  glyph shows the initial). The glyphs are **stamps, not line icons**: solid cream shapes with details cut out in
  the circle's colour, so a seal never looks like an interface icon (v4.93.0). The only coloured icons in the app,
  so colour plus seal always means "a circle". Sizes 16 (pills, filters, cards), 24, 40 (circle cards), 64.
  Circle colours are evenly spaced and at least 3:1 against the page; the cream is at least 3:1 on every seal.
  The whole set, at every size, is on `/design`. Admins choose a circle's glyph with `GlyphPicker` (Blueprint ›
  Circles › Edit, and the circle's Edit window on the Circles page); a new circle gets a first guess from its name
  (`glyphFor`).
- **Status:** the pastel pills (`StatusPill`). Never a dot in a circle's colour.

Older screens without v4 components still get the look: the bridge in `globals.css` restyles their common inline
patterns everywhere inside the shell (`main.v4-main`). New screens use the components, not the bridge.

The prototype these come from: `design/redesign-prototype/app.html` (open it in a browser; sample data, with a "View as" role switch). `index.html` beside it has the rules, colours, icons and drawings.

---

## The design review layer (`"designReview": true`, from 2026-11-22)

On top of v4. Protopia tries it first; other communities turn it on once it's ready. Code: `DESIGN_REVIEW` in
`core/lib/instance.ts`, `data-review` on `<html>`, styles in `web/src/app/v4-review.css` (everything scoped under
`html[data-review]`). Every screen is checked against these:

1. **One title per screen, in the top bar** (decision #41): ‹ Back and the page name, on every page and screen
   size. A page heading that repeats it is hidden; an inner page's own title (a task, a person) stays.
2. **The line under the title says what the page is for**, in plain words. The first content is the thing the
   page is named after (people on Members, tasks on Operations).
3. **One next step**, in the action green, chosen per person (visitor → Create account, explorer → Start joining,
   joining → their next join step, member → profile under 70% / a vote / a task due, lead → oldest item waiting).
   The profile completion bar is not in the top bar; it is a next step when it matters.
4. **Content within the first third of a 390px phone screen.** Controls that don't fit go into a sheet.
5. **One toolbar row:** up to 3 view tabs, search, one "Filter" button (a bottom sheet on phones) with a count.
   Legends are never buttons. Tabs never sit above the title.
6. **Six text sizes, five roles** — Title 40 (phone 32) · Heading 24 · Card title 18 · Body 15 · Meta 13 ·
   Label 11 capitals. The same kind of text always looks the same. No other sizes.
7. **Four pill families, told apart by shape:** *Status* (round, leading dot; tasks only, the six `--st-*`
   colours) · *Result* (square corners, an icon; good / bad / attention / neutral: Approved, Not approved, late,
   Voting) · *Tag* (white outline chip; a circle carries its seal, nothing else is coloured) · *Filter & count*
   (selected = black; count = black number badge). Status colours never mean anything else.
8. **Icons at three sizes:** 16 in a line of text, 20 in controls and rows, 24 in tiles and headers.
9. **Show, don't explain.** A progress mark over "3 of 5 done", a lock with "Opens when you join" over a
   paragraph. Keep words short, and only where the interface can't say it.
10. **Hide empty values** ("No circle yet", "0 subcircles"); an empty screen gets an EmptyState that says what to do.
11. **Breakpoints:** 640 (phone), 960 (tablet), 1280 (wide). No others in new CSS.
12. **Every UI pull request** names the role and moment it serves and the decision it follows, and shows
    screenshots at 390px and 1280px.
13. **Every lock says how to unlock it** (decision #79). Before someone may use something, they see it with one
    line naming the way in: visitors → Create account (or Sign in), explorers → Start joining, joining members →
    their first agreement. Never an empty list, a silent redirect or a database error. What each person sees
    before joining is decided in #71–#77; the database enforces it, not only the screen.
