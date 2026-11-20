# MyCoNet v2 — Execution Plan

> Version: 2.2 | Date: 2026-05-21 | Status: v3.01 LIVE — M00–M09 deployed

---

## Current State — What's Built

| Module | Status | Notes |
|---|---|---|
| M00 — Dashboard | ✅ Live | Personal home screen. Role-scoped panels. Live counts from M05/M06/M07. Guest-browsable with community overview. Module hover tooltips. |
| M01 — Community Network | ✅ Live | Profiles, bio wizard (8 steps), avatar upload, discover, AI match scoring (values + skills + OCEAN + MBTI), dark mode, offers/seeks. Tile/list view toggle. Member thumbnails (72px). |
| M04 — Blueprint | ✅ Live | Shared community document. Admin edits; all members read-only. AI document scanning (MiniMax M2.7) fills wizard fields from uploaded PDFs. Join questions at step 1.4. Conflict-aware AI review panel. Full-screen fixed layout (no nav overlap). |
| M05 — Join | ✅ Live | Application form pulled from Blueprint step 1.4 questions. Explorer gate. Admin review panel. Accept sets user role to `joining`. Guest-browsable (teaser view for non-members). |
| M06 — Agreements | ✅ Live | Joining+ members submit collaboration proposals. Admin review panel. Status flow: pending → accepted → active → completed. Live count on dashboard. Guest-browsable (open projects visible). |
| M07 — Operations | ✅ Live | Admin creates projects, posts timeline updates, toggles open-for-collaborators. Project detail shows collaboration proposals inline. Guest-browsable. |
| M08 — Contribution Tracking | ✅ Live | Achievements catalog at `/achievements`. Profile Pioneer badge at 100% profile. `user_achievements` table with RLS. |
| M09 — Governance | ✅ Live | Proposals with 4 decision modes. Consent/concern/object voting. Discussion threads. 3 new tables: `proposals`, `proposal_votes`, `proposal_comments`. |
| M02 — Neighborhood Directory | 🔗 v1 link | Dashboard links out to v1 tribesplatform.app. v2 will be cross-portal opt-in directory. |
| M03 — Resources & Tools | 🔗 v1 link | Dashboard links out to v1 tribesplatform.app. Building in v2 next. |

### AppShell + Profile Completion System (2026-05-21)
- `src/components/AppShell.tsx` — wraps all non-auth pages; provides ProfileCompletionProvider
- `src/components/AppTopBar.tsx` — top nav with profile completion bar (22px, disappears at 100%)
- `src/components/AppSideNav.tsx` — left side nav M00–M09
- `src/contexts/ProfileCompletion.tsx` — shared context so wizard pushes live % to top bar
- Profile completion: 11-check scoring (avatar, name, headline, city, types, values, skills, goals, 1+ offer, 1+ request, 1+ travel plan)

### /home Portal Explainer (2026-05-21)
- Server component fetching live DB data per module
- Interactive M01 member cards (link to `/u/[username]`), M04 animated phases, M05 values checkboxes, M06 proposal form, M07 deliverables, M08/M09 demo

### Visual Identity System (2026-05-15)
- `src/lib/module-meta.ts` — single source of truth for all 14 module colors, labels, descriptions
- `src/components/ModuleHeader.tsx` — colored header band on every module page
- `src/components/DashCardTooltip.tsx` — hover tooltip on dashboard module cards
- `src/app/members/MemberList.tsx` — tile/list view toggle (client component)

---

## Tech Stack (Locked)

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL + RLS |
| Hosting | Cloudflare Workers (@opennextjs/cloudflare) |
| AI — Blueprint scanning | MiniMax M2.7 |
| AI — future | Claude API (Anthropic) — Quinn, MycoNet, M09 Governance, M01 matching |
| Telegram — future | node-telegram-bot-api (Genesis Bot) |
| Payments — future | Stripe |

Deploy command: `cd web && npm run deploy:cf`

---

## Phase 0 — Single Community Portal ✅ LIVE

The core loop is proven:
1. Admin uploads governing documents → Blueprint AI-scans and fills fields
2. Admin sets join questions in Blueprint step 1.4
3. Admin creates projects in Operations (M07)
4. New visitor lands on Dashboard or Network → reads Blueprint → applies to join
5. Admin reviews application → accepts → member gets `joining` role
6. Joining member browses open projects → submits collaboration proposal
7. Admin reviews proposals → accepts → active → completed

---

## Phase 0.5 — Clone for Second Community 🔜 NEXT

**Goal:** Deploy a second independent portal for a new community, proving the cloning process works end-to-end.

> **Updated 2026-11-03:** the second community is **Protopia**, and the approach is now one shared codebase with per-instance config instead of forking. See [`INSTANCES.md`](./INSTANCES.md); the steps below are kept for history.

**What cloning means:**
1. Fork/clone the repo
2. Create a new Supabase project (separate DB, separate auth)
3. Set new environment variables (Supabase URL + anon key)
4. Deploy to a new Cloudflare Worker (separate URL)
5. Admin fills in their community Blueprint, sets join questions, creates projects

**Things to verify before cloning:**
- No hardcoded community names in the codebase (check nav, landing page, dashboard header)
- Landing page copy is generic enough to be adapted, or parameterized from the DB
- Avatar bucket policy works on fresh Supabase projects
- MiniMax API key works independently per deployment

**Nice-to-have before cloning:**
- A community name field in the Blueprint (or a simple `.env` variable) so the nav/landing page shows the right community name without code changes
- A basic "community settings" page in the admin panel

---

## Phase 1 — Member Depth

*Deepen the experience for existing members. No new infra.*

### M08 — Contribution Tracking
**What:** Points and badges that make regenerative action visible.

**Earning events:**
- Collaboration agreement completed → points based on work scope
- Join application accepted → onboarding badge
- Resource submitted (when M03 is built) → curation points
- Governance vote cast → participation points

**Pages:**
- `/achievements` — Community leaderboard, badge showcase
- `/dashboard` — Personal points summary added to M00 panel

**DB tables:**
- `rewards` — user_id, points, badge_type, badge_name, reason, created_at

**Trigger pattern:** Supabase Database Webhooks on agreement/application status changes → Edge Function calculates points → inserts into `rewards`.

---

### M01 — Direct Messaging
**What:** Add direct messaging between matched members.

**DB tables:**
- `messages` — sender_id, recipient_id, content, read_at, created_at

**Implementation:** Supabase Realtime subscription for live inbox updates.

---

### M04 — Blueprint PDF Export
**What:** Export the filled Blueprint as a formatted PDF for sharing with investors, partners, or governance processes.

**Implementation:** Server-side PDF generation (Puppeteer or react-pdf) triggered from the Blueprint sidebar.

---

## Phase 2 — Governance

### M09 — Governance
**What:** AI-facilitated decision-making for the community.

**Pages:**
- `/governance` — Active proposals + decision history
- `/governance/new` — Submit a situation for collective decision
- `/governance/[id]` — AI reasoning, community vote, outcome log

**Flow:**
1. Member submits a situation (e.g. "Should we accept 3 new members next month?")
2. Claude API reasons from community values (M04), current membership (M05), active agreements (M06)
3. AI presents a recommendation with reasoning
4. Community votes — mode configurable: democracy / sociocracy / meritocracy
5. Outcome logged

**DB tables:**
- `governance_decisions` — title, situation, context_docs (JSONB), ai_reasoning, governance_mode, status, vote_counts, decided_at

---

## Phase 3 — Multi-Community & M02 v2

*The codebase is already structured for this. Each community is an independent deployment.*

**What multi-community means:**
- Each group clones the repo and gets their own URL + database
- No shared database infrastructure — each community is fully isolated
- Admin of each portal only has access to their own community's data

**M02 — Neighborhood Directory (v2):**

This is the network layer that connects independent community portals into a visible ecosystem. Each community portal will have an **opt-in toggle** in their admin settings: "List our community in the public Neighborhood Directory."

When opted in, the community's public profile appears in M02 on every portal — showing:
- Community name + description (from Blueprint)
- Active open projects (from M07)
- Member count
- Location / focus area
- A link to visit their portal

This gives network-level visibility without merging databases or requiring any central server. The directory is built by each community choosing to share.

**Implementation options:**
- **Federated pull:** Each portal exposes a public API endpoint (`/api/community-profile`) and M02 aggregates on request. No central DB needed.
- **Central registry:** A lightweight registry service stores opted-in communities (just name + URL + summary). Simpler to build.
- **Manual curation (start here):** Initial v2 of M02 is a manually maintained list while we validate the design. Automate later.

---

## Phase 4 — Agent Stack

*The three agents that make the platform feel alive.*

Agents are long-running processes — **not** Cloudflare Workers. Host on **Railway** or **Fly.io** as Node.js workers that subscribe to Supabase Realtime.

### M12 — MycoNet Agent (build first)
```
Supabase Realtime listener
  → on any table insert/update
  → write to community_memory (JSONB + pgvector embedding)
  → if MycoNet Pro: push to Leadership Telegram group
  → if pending decision threshold: 30-min heartbeat reminder
  → if Genesis approval requested: route to pending queue
```

### M10 — Genesis Bot (depends on M12)
```
@Genesis "record that I finished the garden task"
  → parses intent → creates genesis_request record
  → posts to Leadership Group for approval
  → on approval → MycoNet executes DB write
  → confirms outcome in Community Group
```

### M11 — Quinn (depends on M12)
```
Per-member AI instance
  → reads personal_ai_memories + user activity across M01–M09
  → Claude API: compose personalized daily message
  → deliver via in-app notification or Telegram DM
```

---

## Phase 5 — Hive (Inter-Community Layer)

Once multiple communities are live and M02 v2 is running, Module 13 opens a shared layer:
- Network-wide feed of opportunities and needs
- Cross-community project collaboration
- Shared resource libraries
- Mutual aid requests
- Inter-community events

The opt-in M02 directory is the foundation for Hive — communities that share their profile in M02 can optionally participate in the wider Hive network.

---

## Milestone Gates

| Gate | Condition | Unlocks |
|---|---|---|
| **Phase 0** | ✅ M00, M01, M04, M05, M06, M07 live | Core loop proven |
| **Member depth** | ✅ M08 live (Profile Pioneer badge) | Achievements system running |
| **Governance** | ✅ M09 live | Community can decide together formally |
| **Clone proven** | Second community portal live end-to-end | Cloning playbook locked |
| **M01 messaging** | Direct member-to-member messaging | Community is sticky |
| **M02 v2** | 2+ communities opted in to directory | Network visibility begins |
| **Agent ready** | Multi-community live + DB tables stable | M12 → M10 → M11 |
| **Hive** | 3+ communities live in M02 directory | M13 build starts |

---

## Immediate Next Steps

1. **Clone preparation** — audit for hardcoded community names; add community name to `.env` or Blueprint config
2. **Clone for second community** — prove the end-to-end deployment process
3. **M08 expand** — reward completed agreements and onboarding milestones (beyond profile completion)
4. **M01 Direct Messaging** — let matched members talk to each other
5. **M04 PDF Export** — let the community share their Blueprint externally
6. **M09 AI facilitation** — add Claude API reasoning from Blueprint values when proposals are submitted
7. **M02 v2 design** — spec the opt-in directory system and how community profiles are structured

---

*Document version: 2.2*
*Authors: Oz + Claude*
*Last updated: 2026-05-21 — M08 live (Profile Pioneer), M09 live (governance), AppShell + ProfileCompletion system, /home portal explainer, v3.01 deploy*
