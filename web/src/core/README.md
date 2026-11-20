# Core

Shared infrastructure used by every module. Contributors building a module should import from here but rarely need to edit it.

## Structure

```
core/
├── components/
│   ├── shell/          App layout: top bar, side nav, shell wrapper
│   │   ├── AppTopBar.tsx      Top navigation bar with version badge and search
│   │   ├── AppSideNav.tsx     Left sidebar — module links gated by role
│   │   └── AppShell.tsx       Root layout wrapper that receives role from server
│   ├── ui/             shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── Nav.tsx           Legacy nav bar (used on landing page)
│   └── ThemeToggle.tsx   Light/dark mode switch
├── contexts/
│   └── ProfileCompletion.tsx  React context for the profile completion bar
├── lib/
│   ├── supabase/
│   │   ├── client.ts   Browser Supabase client (use in 'use client' files)
│   │   └── server.ts   Server Supabase client (use in Server Components / route handlers)
│   ├── roles.ts          Role authority helpers — isFullMember, isCircleAdmin, isOpsAdmin, isAdmin, etc.
│   ├── promotions.ts     Member promotion logic — promoteToMemberIfEligible()
│   ├── format.ts         Shared display helpers — fmtDate, formatDeadline, colorForId, initialForName
│   ├── circles.ts        The community's circles (from the `circles` table): CircleSet helpers
│   ├── circles-server.ts loadCircles(supabase), cached per request
│   ├── project-status.ts M07 Kanban model — PROJECT_KANBAN_COLUMNS, PROJECT_STATUS_META, isActiveProject, isOpenForProposals
│   └── utils.ts          Tailwind class merge helper (cn)
└── types/
    └── database.ts     TypeScript types generated from the Supabase schema
```

## Import alias

Everything under `core/` is available via `@/core/`:

```ts
import { createClient } from '@/core/lib/supabase/server'
import { Button } from '@/core/components/ui/button'
import type { Database } from '@/core/types/database'
import { isFullMember, isCircleAdmin, isOpsAdmin } from '@/core/lib/roles'
import { promoteToMemberIfEligible } from '@/core/lib/promotions'
import { fmtDate, formatDeadline, colorForId, initialForName } from '@/core/lib/format'
import { useCircles } from '@/core/components/CirclesProvider'   // client: circles.list / .meta(slug) / .has(slug)
import { loadCircles } from '@/core/lib/circles-server'          // server
import { PROJECT_KANBAN_COLUMNS, PROJECT_STATUS_META, isActiveProject } from '@/core/lib/project-status'
```

## Supabase clients

| File | When to use |
|------|-------------|
| `core/lib/supabase/server.ts` | Server Components, route handlers (`async` functions without `'use client'`) |
| `core/lib/supabase/client.ts` | Client Components (`'use client'` files, `useEffect`, event handlers) |

## Role helpers (`core/lib/roles.ts`)

All role checks in the app go through this file. Never hard-code role arrays in page files.

| Helper | Returns true when |
|--------|------------------|
| `isFullMember(role)` | `member`, `circle_lead`, `project_lead`, or `admin` |
| `isJoiningOrAbove(role)` | `joining` or any full member role |
| `isCircleAdmin(role)` | `circle_lead` or `admin` — gates Blueprint, Join admin, Agreements admin |
| `isOpsAdmin(role)` | `circle_lead`, `project_lead`, or `admin` — gates Ops management |
| `isAdmin(role)` | `admin` only — gates destructive edit actions |

Constants `MEMBER_ROLES` and `JOINING_OR_ABOVE` are also exported for use in `.filter()` calls.

## Member promotion (`core/lib/promotions.ts`)

`promoteToMemberIfEligible(supabase, userId, currentRole)` — called in server pages for `joining` users. Calls the `promote_to_member_if_eligible()` database function, which checks for an accepted agreement **or** a project of theirs that's on the board, sets `role = 'member'` and awards `community_member`, then returns the new role string. It runs in the database because a trigger (`guard_profile_privileges`) stops users changing their own role.

```ts
role = await promoteToMemberIfEligible(supabase, user.id, role)
```

This runs at the top of `app/agreements/page.tsx` and `app/operations/page.tsx`.

## Circles (`core/lib/circles.ts`)

Circles are the community's standing groups, rows in the `circles` table, set during setup (Blueprint › Circles; `INSTANCES.md` §6). Projects, events, bookable items and the org chart belong to a circle. Client code reads them with `useCircles()`, server code with `loadCircles()`; `meta(slug)` returns `{ label, color, emoji }` and `has(slug)` is a type guard. The default set is the neighborhood org chart (`modules/m04-blueprint/lib/circle-setup.ts`). `user_profiles.lead_circles: text[]` records which circles a `circle_lead` is responsible for — see `/admin/users` for assignment.

## Project status (`core/lib/project-status.ts`)

The M07 Kanban is a five-column board shared by both the main `/operations` page (cards = projects) and the per-project `/operations/[id]` page (cards = deliverables, plus pending proposals in the leftmost Ideas column):

```
pending (Ideas) → backlog → in_progress → review → done
```

`paused` is an off-board status. Helpers exported:

| Helper | What it does |
|--------|--------------|
| `PROJECT_KANBAN_COLUMNS` | Ordered list of `{ key, label, color }` — drive the Kanban grid. |
| `PROJECT_STATUS_META` | Label / color for the project header status pill. |
| `isActiveProject(status)` | True for `backlog`, `in_progress`, or `review`. |
| `isOpenForProposals(status)` | True for any active project plus `pending`. |

## App shell and role delivery

The sidebar (`AppSideNav`) receives the user's role as a prop from `AppShell`, which receives it from `app/layout.tsx`. The role is fetched once server-side on every request — no client-side fetch, no flash of wrong state.

```
layout.tsx (server) → fetches role → AppShell → AppSideNav (initialRole prop)
```

## Adding to core

Only add things here if they are genuinely shared across 3+ modules. Module-specific helpers belong in the module's own `lib/` folder.
