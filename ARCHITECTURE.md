# MyCoNet v2 — Architecture & Database Schema

> Status: v3.45 LIVE | Updated: 2026-05-23 — see also [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) for visual language reference.

---

## 1. What We're Building

**MyCoNet** is a community operating system for regenerative neighborhoods. The current deployment is a **single-community portal** — one community, one URL, all users are members or prospective members of the same project.

The portal lets a community:
- Share a living community blueprint (planning document)
- Onboard new members through an application flow
- Manage active projects and post timeline updates
- Create and track collaboration agreements
- Browse member profiles and find collaborators

This is Phase 0. The codebase is designed to be cloned for multiple communities — each gets their own isolated portal at their own URL. When M02 is built in v2, communities will be able to opt in to listing themselves in a shared public Neighborhood Directory, creating network-level visibility across all portals.

---

## 2. Module Status

| # | Module | Status | Notes |
|---|---|---|---|
| 00 | MyCoNet Dashboard | ✅ Live | Personal home screen. Role-scoped panels. Guest-browsable. |
| 01 | Community Network | ✅ Live | Profiles, bio wizard, AI matching, tile/list view. Guest-browsable. |
| 02 | Neighborhood Directory | 🔗 v1 link | Links to v1 tribesplatform.app. v2 will be a cross-portal public directory. |
| 03 | Resources & Tools | 🔗 v1 link | Links to v1 tribesplatform.app. Building in v2 next. |
| 04 | Blueprint | ✅ Live | Shared community document. Admin edits. All members read. AI scanning. |
| 05 | Join | ✅ Live | Application form. Admin reviews. Accept sets role to `joining`. Guest-browsable. |
| 06 | Agreements | ✅ Live | Collaboration proposals on open projects. Admin reviews. Guest-browsable. |
| 07 | Operations | ✅ Live | Five-column Project Kanban (Ideas → Backlog → In progress → Review → Done) with drag-and-drop, gated by role + circle. Per-project Kanban: pending proposals appear in Ideas; accepting one spawns a deliverable. Guest-browsable. |
| 08 | Contribution Tracking | ✅ Live | Achievements catalog. Profile Pioneer badge at 100% profile. |
| 09 | Governance | ✅ Live | Proposals, consent/concern/object voting, discussion threads. |
| 10 | Genesis Bot | ⏳ Planned | Telegram bridge for DB change requests. |
| 11 | Quinn | ⏳ Planned | Personal AI per member. |
| 12 | MycoNet Agent | ⏳ Planned | Community brain. Coordinates all agents. |
| 13 | Hive | ⏳ Planned | Inter-community network layer. |

---

## 3. System Architecture

```
┌──────────────────────────────────────────┐
│           BROWSER / CLIENT               │
│   Next.js 16 App Router (React)          │
│   Deployed to Cloudflare Workers         │
│   via @opennextjs/cloudflare             │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│           SUPABASE                       │
│                                          │
│   Auth — magic link / email+password     │
│   PostgreSQL — all module data           │
│   Row Level Security — per-user access   │
│   Realtime — (planned for M12 agents)    │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│           AI LAYER                       │
│                                          │
│   MiniMax M2.7 — Blueprint doc scanning  │
│   Claude API — planned (Quinn, MycoNet,  │
│                 Governance, M01 match)   │
└──────────────────────────────────────────┘
```

**Routing:** All pages are Next.js App Router server components. Client components used only where interactivity is required (forms, wizards, real-time actions).

**Code organisation:** The `web/src/` directory has three layers:
- `app/` — Next.js route files only (thin re-exports). Do not add logic here.
- `core/` — Shared infrastructure: Supabase clients, UI primitives, shell layout, types.
- `modules/mXX-name/` — One folder per feature module. This is where contributors work. Each has its own README.

See `web/CONTRIBUTING.md` for the full contributor guide.

**Auth:** Supabase Auth with cookie-based sessions (`@supabase/ssr`). Server components read the session via `createClient()` from `@/core/lib/supabase/server`.

**RLS:** Every table has row-level security. A helper function `is_admin()` checks `user_profiles.role` to grant admin-level policies without exposing the service role key.

**Guest access:** All main pages are publicly browsable without an account. Pages check for a session and render a guest-appropriate view (no proposal buttons, no admin panels, join/sign-in CTAs instead of gated actions).

---

## 4. Actual Database Schema (Supabase)

### `user_profiles`
Extends Supabase auth users. Created by trigger on signup.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  first_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT DEFAULT 'explorer',
    -- explorer | joining | member | circle_lead | project_lead | admin
  bio TEXT,
  location TEXT,
  user_types TEXT[],           -- Community Member, Vision Holder, Service Provider, etc.
  personality_details JSONB,   -- { myersBriggs, ocean: { openness, conscientiousness, ... } }
  archetypes JSONB,            -- { primary, secondary, description }
  offers JSONB[],              -- [{ category, title, description }]
  seeks JSONB[],
  places_traveling TEXT,
  lead_circles TEXT[] DEFAULT '{}',
    -- Which pillar circles this user is responsible for (only meaningful for circle_lead role).
    -- Each entry is a circles.slug (checked by a trigger).
    -- Admins set this on /admin/users. Used by the M07 Kanban drag-permission check.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `blueprints`
One shared community document. Admin creates and edits; all members read.

```sql
CREATE TABLE blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  answers JSONB DEFAULT '{}',  -- all wizard field values, keyed by field id
  flags JSONB DEFAULT '{}',    -- step completion / gate-check flags
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key answers field:** `join_application_questions` (text, one question per line) — read by M05 Join to build the application form.

### `applications`
Join applications submitted by prospective members.

```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  answers JSONB DEFAULT '{}',  -- keyed q0, q1, q2... matching blueprint questions
  status TEXT DEFAULT 'pending',
    -- pending | reviewing | accepted | rejected
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Accept flow:** Admin sets `status = 'accepted'` → `user_profiles.role` updated to `'joining'` → member gains M06 access.

### `projects`
Community projects created and managed by admin (or proposed by members through M06) in M07 Operations.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
    -- pending | backlog | in_progress | review | done | paused
  open_for_collaborators BOOLEAN DEFAULT false,
  circle TEXT,
    -- references circles(slug)
    -- see @/core/lib/pillars
  needs TEXT[],
  deadline DATE,
  sprint_name TEXT,
  created_by UUID REFERENCES auth.users(id),
  lead_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

The Kanban is rendered from the status column. `paused` is an off-board state. `circle` drives both the visual badge and the circle-lead permission check.

### `project_updates`
Timeline updates posted by admin for each project.

```sql
CREATE TABLE project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `collaboration_agreements`
Proposals submitted by `joining+` members on open projects. Pending proposals appear in the **Ideas** column of the per-project Kanban (visible only to admin / project creator). Accepting one spawns a row in `deliverables` linked by `from_agreement_id`.

```sql
CREATE TABLE collaboration_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  work_description TEXT NOT NULL,    -- what the member will do
  expected_reward TEXT NOT NULL,     -- what they expect in return
  conditions TEXT,                   -- any timing / availability / dependency notes
  status TEXT DEFAULT 'pending',
    -- pending | accepted | active | rejected | completed
    -- Once 'accepted', the work itself is tracked as a row in `deliverables`.
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);
```

### `deliverables`
Project subtasks — the cards in columns Backlog / In progress / Review / Done on the per-project Kanban. Created either ad-hoc by project creator / admin, or automatically when a collaboration agreement is accepted.

```sql
CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'backlog',
    -- backlog | in_progress | review | done
  due_date DATE,
  assignee_id UUID REFERENCES auth.users(id),
  progress NUMERIC DEFAULT 0,
  from_agreement_id UUID REFERENCES collaboration_agreements(id) ON DELETE SET NULL,
    -- Set when this deliverable was spawned by accepting a collaboration proposal.
    -- Null for ad-hoc subtasks.
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `user_bio`
Extended profile fields (bio wizard steps 2–5).

```sql
CREATE TABLE user_bio (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  values_principles TEXT,
  skills TEXT[],
  goals TEXT,
  places_traveling JSONB[],   -- [{ location, from_date, to_date, notes }]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `user_offers` / `user_requests`
Offer and request items from the profile wizard (steps 6–7).

```sql
CREATE TABLE user_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  request_text TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `user_achievements`
Earned badges (M08 Contribution Tracking).

```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,    -- e.g. 'profile_pioneer'
  achievement_name TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);
```

### `proposals`
Governance proposals (M09).

```sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  decision_mode TEXT DEFAULT 'consent',
    -- consent | democracy | meritocracy | ai
  status TEXT DEFAULT 'open',
    -- open | closed | decided
  created_by UUID REFERENCES auth.users(id),
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `proposal_votes`
Individual votes on governance proposals.

```sql
CREATE TABLE proposal_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL,    -- consent | concern | object
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);
```

### `proposal_comments`
Discussion thread per governance proposal.

```sql
CREATE TABLE proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Role-Based Access Control

Access is enforced at two layers:

**1. Page level (server components)** — Every page calls `supabase.auth.getUser()`. Guests (no session) see public content; members see role-scoped panels. Redirects to `/auth/login` only for pages that have no public view.

**2. Database level (RLS)** — Row-level security policies enforce the same rules at the data layer. A helper function handles admin checks:

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'circle_lead', 'project_lead')
  );
$$;
```

| Role | Dashboard | Blueprint | Network | Agreements | Join | Admin panels |
|---|---|---|---|---|---|---|
| guest (no account) | ✅ public view | ✅ public view | ✅ public view | ✅ public view | ✅ public view | ✗ |
| `explorer` | ✅ | ✅ read-only | ✅ | ✅ | ✅ apply | ✗ |
| `joining` | ✅ | ✅ read-only | ✅ | ✅ propose | ✅ view status | ✗ |
| `member` | ✅ | ✅ read-only | ✅ | ✅ propose | ✅ view status | ✗ |
| `admin` | ✅ full | ✅ **edit** | ✅ | ✅ propose + review | ✅ review all | ✅ |

---

## 6. Key Pages

| Route | Component | Auth | Description |
|---|---|---|---|
| `/` | Server | public | Landing page — hero, module grid, join CTA |
| `/home` | Server + Client | public | Portal explainer — live DB content per module, module links |
| `/dashboard` | Server | public / member | M00 — Community overview for guests; personal home for members |
| `/members` | Server | public / member | M01 — Member directory, tile/list toggle |
| `/members/discover` | Server | public / member | M01 — Profile discovery (guests see all; members see matches) |
| `/members/matches` | Server | public / member | M01 — Guest sees teaser; logged-in sees AI matches |
| `/u/[username]` | Server | public | M01 — Public member profile page |
| `/blueprint` | Server + Client | public / admin | M04 — Read-only for all; edit mode for admin |
| `/join` | Server + Client | public / member / admin | M05 — Guest sees teaser; member applies; admin reviews |
| `/agreements` | Server + Client | public / member / admin | M06 — Open projects visible to all; proposals for joining+ |
| `/agreements/[id]` | Server + Client | member | M06 — Submit a collaboration proposal |
| `/operations` | Server | public / admin | M07 — Project list visible to all; admin controls |
| `/operations/new` | Server + Client | admin | M07 — Create a project |
| `/operations/[id]` | Server + Client | public / admin | M07 — Project detail, updates feed, proposals panel (admin) |
| `/achievements` | Server | member | M08 — Achievements catalog; Profile Pioneer badge |
| `/governance` | Server + Client | member | M09 — Proposals, voting, discussion threads |
| `/profile/edit` | Client | member | Edit profile (8-step wizard) |
| `/changelog` | Static | public | Release notes |

---

## 7. Shared Components

| File | Purpose |
|---|---|
| `src/components/AppShell.tsx` | Shell layout wrapping all non-auth pages. Provides `ProfileCompletionProvider` + `AppTopBar` + `AppSideNav` + main content. |
| `src/components/AppTopBar.tsx` | Top nav — logo + v3.01, search bar, bell, user pill (→ `/profile/edit`), profile completion bar. |
| `src/components/AppSideNav.tsx` | Left side nav — M00–M09 module links with module colors. |
| `src/contexts/ProfileCompletion.tsx` | React context sharing profile completion % between `AppTopBar` (seeds from DB) and profile wizard (pushes live updates). |
| `src/core/lib/nav.ts` | Sidebar module list and order (also used by the landing/home previews). Module colours are the `--mNN` tokens in `globals.css`. |
| `src/components/ModuleHeader.tsx` | Colored header band at the top of each module page. Hover/tap reveals module description. Imports from `module-meta.ts`. |
| `src/components/DashCardTooltip.tsx` | Client wrapper for dashboard module cards. Hover shows a popup with the module description and module-color accent border. |
| `src/app/members/MemberList.tsx` | Client component for the member grid. Holds tile/list view toggle state (server components can't hold UI state). |

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Auth | Supabase Auth (@supabase/ssr) |
| Database | Supabase PostgreSQL |
| Access control | Supabase Row Level Security |
| Hosting | Cloudflare Workers (@opennextjs/cloudflare) |
| AI — Blueprint scanning | MiniMax M2.7 (via /api/scan route) |
| AI — future (Quinn, M09) | Claude API (Anthropic) |
| UI components | shadcn/ui (Radix primitives + Tailwind) |
| Styling | CSS custom properties + Tailwind |
| Payments (planned) | Stripe |
| Telegram (planned) | node-telegram-bot-api |

---

## 9. Deployment

```bash
# Build + deploy to Cloudflare Workers
cd web && npm run deploy:cf
# Runs: opennextjs-cloudflare build && wrangler deploy
```

**Live URL:** each community's `appUrl` (`instance/config.jsonc`).

Public settings (Supabase URL + anon key, app URL, Worker name) come from `instance/config.jsonc`, which generates `web/wrangler.jsonc` at build time (see `INSTANCES.md`). Secrets are Cloudflare secrets. Locally, `.dev.vars` / `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `MINIMAX_API_KEY` (for blueprint document scanning)

**Cloning for a new community:** The codebase is designed to be cloned. Each community gets its own Supabase project and Cloudflare Workers deployment. Community-specific identity (name, colors if customized, blueprint content) lives in the database. No hardcoded community names in the codebase.

---

## 10. Module Color Order

All 14 modules follow a rainbow color order for consistent visual identity:

| # | Module | Color |
|---|---|---|
| 00 | Dashboard | Black `#18181b` |
| 01 | Community Network | Brown `#92400e` |
| 02 | Neighborhood Directory | Red `#b91c1c` |
| 03 | Resources & Tools | Orange `#ea580c` |
| 04 | Blueprint | Yellow `#92640a` |
| 05 | Join | Green `#15803d` |
| 06 | Agreements | Blue `#1d4ed8` |
| 07 | Operations | Indigo `#4338ca` |
| 08 | Contribution Tracking | Violet `#7c3aed` |
| 09 | Governance | Pink `#db2777` |
| 10 | Genesis Bot | Slate `#475569` |
| 11 | Quinn | Silver `#64748b` |
| 12 | MycoNet Agent | Gold `#b45309` |
| 13 | Hive | Brown-dark `#78350f` |

Source of truth: the `--mNN` tokens in `src/app/globals.css`. M02 and M03 were removed from MyCoNet on 2026-11-03; they'll be a separate platform.

---

## 11. Multi-Community Architecture (Phase 3)

> **Updated 2026-11-03:** communities now share one codebase with per-instance config rather than forks. See [`INSTANCES.md`](./INSTANCES.md).

The platform is built to be cloned. When a second community wants a portal:
1. Fork/clone the repo
2. Create a new Supabase project
3. Create a new Cloudflare Workers deployment
4. Set environment variables pointing to the new Supabase project
5. Run migrations — schema is identical across all portals

**M02 Neighborhood Directory (v2):** When built, M02 will be a cross-portal public directory. Each community portal will have an **opt-in toggle** in their admin settings to list themselves in the public directory. The directory will show community profiles, active projects, and milestones — giving network-level visibility across all portals without merging their databases.

**Community identity in M02:** Each community listing in the directory will show its Blueprint summary, open projects (from M07), and how to visit or join. This surfaces real work being done across communities without requiring any centralized infrastructure — just each community opting in to share their public data.

---

## 12. Planned: M10–M13 Agent Architecture

This section captures the design for the future agent layer (M10 Genesis, M11 Quinn, M12 MycoNet, M13 Hive). **None of this is built yet** — sections 1–11 describe reality; this section describes the target.

### Three agents per community

| Agent | Module | Instances | Role |
|---|---|---|---|
| Quinn | M11 | One per member | Personal AI — daily reminders, recommendations; routes member input upward to MycoNet |
| MycoNet | M00 + M12 | One per community | Community brain — subscribes to every module event, maintains memory, runs the approval queue, executes DB writes after leadership approval |
| Genesis | M10 | One per community | Telegram bridge — turns conversational requests in the Community Group into structured DB-change requests |

Direction of information flow:
- Quinn → MycoNet — bottom-up (member context aggregates)
- MycoNet → Quinn — top-down (community state propagates)
- Genesis ↔ MycoNet — bidirectional (chat requests → DB; DB confirmations → chat)

### Event bus

Every writable module (M01–M09, M11–M13) must fire an event when it writes. Two compatible transports:
- **Supabase Realtime** — preferred, matches the current Supabase stack
- **Postgres LISTEN/NOTIFY** — lower-level alternative if Realtime is insufficient

Event payload shape: `{ module, record_type, record_id, action, timestamp, actor }`

MycoNet subscribes to all events. Each Quinn instance subscribes to events scoped to its member.

#### Event types

| Event | Triggered by | Receivers |
|---|---|---|
| `member.joined` | M05 | MycoNet → Leadership Group; Quinn → new member |
| `agreement.signed` | M06 | MycoNet → Leadership Group |
| `deliverable.completed` | M07 | MycoNet → Leadership Group; Quinn → assignee |
| `governance.vote_started` | M09 | MycoNet → Leadership Group; Quinn → affected members |
| `genesis.request.pending` | Genesis (M10) | MycoNet Dashboard (pending queue) |
| `genesis.request.approved` | Leader (chat or dashboard) | Genesis → Community Group; MycoNet → Leadership Group |
| `genesis.request.rejected` | Leader (chat or dashboard) | Genesis → Community Group |

### MycoNet community memory

Two stores per community, both in the community's Supabase Postgres:
- **Structured state** (JSONB) — current tasks, members, decisions, calendar
- **Vector embeddings** (pgvector) — past decisions, patterns, community history

Leadership queries MycoNet in natural language; MycoNet synthesizes responses from both stores.

### MycoNet Pro (premium agentic tier)

- Pushes to the Telegram Leadership Group on **every** module write
- Cross-module synthesis (e.g. "your M09 governance decision affects the M07 budget")
- 30-minute heartbeat: "Pending decisions: N items awaiting your approval"
- Responds to leadership queries in natural language

### Two-group Telegram architecture

| Group | Members | What happens |
|---|---|---|
| Community Group | All members + Genesis | Members invoke `@Genesis` for DB-change requests; Genesis confirms outcomes; Genesis shares activity info |
| Leadership Group | `admin` + `circle_lead` + `project_lead` + MycoNet bot + Genesis | MycoNet Pro pushes updates; Genesis posts approval requests; leaders approve/reject in-chat |

Two bots:
- **MycoNet Bot** — Leadership Group only; pushes proactive updates, answers leadership queries
- **Genesis Bot** — both groups; receives requests, posts approvals, confirms outcomes

### Approval flow

```
1. Member in Community Group: "@Genesis record that we decided to postpone the garden meeting"
2. Genesis → MycoNet: POST /genesis-requests { request, member_id, timestamp }
3. MycoNet adds to pending queue (Dashboard); Genesis posts request in Leadership Group
4. Leader approves (in chat or on Dashboard)
5. MycoNet writes to DB → posts confirmation in Leadership Group → notifies Genesis
6. Genesis posts "✅ Recorded" in Community Group (or "❌ Request not approved")
```

All Genesis requests require human approval — no autonomous DB writes from chat.

### Open technical questions

1. **Event schema versioning** — who owns the schema and how do we evolve it without breaking subscribers?
2. **Transport** — Supabase Realtime vs Postgres LISTEN/NOTIFY at scale?
3. **Vector store** — pgvector in the community Postgres, or external (Pinecone/Milvus)?
4. **Genesis security** — rate limiting, member verification, spam prevention?
5. **Offline handling** — what happens when MycoNet goes down? Can the community still operate?
6. **MycoNet hosting** — single multi-tenant instance vs per-community deploys?
7. **Quinn hosting** — one inference instance per community serving all members, or per-member?

---

## 13. Relationship to Other Documents

| Document | Purpose |
|---|---|
| `EXECUTIVE-SUMMARY.md` | What the platform is, who it's for, what's live, the vision |
| `EXECUTION-PLAN.md` | Sprint-by-sprint build plan with module specs |
| `ARCHITECTURE.md` (this doc) | Actual DB schema, routes, tech stack, deployment |
| `instance/log/` | The community's log, one file per entry (`instance/log.md` holds the older entries) |
| `changes/` | One note per change waiting for the next core release (`changes/README.md`) |

---

*Document version: 3.01*
*Updated: 2026-05-21 — AppShell + ProfileCompletion context, M08 achievements, M09 governance, 4 new DB tables, new routes, deploy command fix*
