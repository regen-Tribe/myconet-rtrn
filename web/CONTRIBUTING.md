# Contributing to MyCoNet

MyCoNet is an open-source community platform built with Next.js and Supabase. This guide explains how to contribute to a specific module without needing to understand the whole codebase.

## Quick start

```bash
git clone https://github.com/your-org/tribesplatform-v2
cd tribesplatform-v2/web
cp .env.example .env.local   # fill in Supabase credentials
npm install
npm run dev
```

Open `http://localhost:3000`.

## Project structure

```
web/src/
├── app/          Next.js routes (thin entry points — mostly re-exports)
├── core/         Shared infrastructure (DB client, UI components, role helpers, types)
└── modules/      Feature modules — one folder per module
    ├── m00-dashboard/
    ├── m01-network/
    ├── m04-blueprint/
    ├── m05-join/
    ├── m06-agreements/
    ├── m07-ops/
    ├── m08-contributions/
    ├── m09-governance/
    └── home/
```

## Working on a module

Each module is self-contained. Pick the one you want to contribute to and read its `README.md`:

| Module | Path | Route | What it does |
|--------|------|-------|-------------|
| M00 Dashboard | `src/modules/m00-dashboard/` | `/dashboard` | Personal HUD — role, stats, activity |
| M01 Network | `src/modules/m01-network/` | `/network` | Member directory with AI match scoring |
| M04 Blueprint | `src/modules/m04-blueprint/` | `/blueprint` | Community planning wizard with AI scan |
| M05 Join | `src/modules/m05-join/` | `/join` | Onboarding flow + role roadmap |
| M06 Agreements | `src/modules/m06-agreements/` | `/agreements` | Collaboration proposals between members and projects |
| M07 Operations | `src/modules/m07-ops/` | `/ops` | Project board with subtasks and sprint tracking |
| M08 Contributions | `src/modules/m08-contributions/` | `/contributions` | Achievement badges and contribution history |
| M09 Governance | `src/modules/m09-governance/` | `/governance` | Proposals, voting, and decision layers |
| Home Portal | `src/modules/home/` | `/home` | Public and member-facing community landing page |

M02 (Neighborhood Directory) and M03 (Resources) are hosted externally and not in this codebase.

## Role system

Every user has one of these roles in `user_profiles.role`. Role determines what they can see and do across every module.

| Role | How they get it | What they can do |
|------|----------------|-----------------|
| `explorer` | Sign up | Browse platform, read Blueprint, explore network |
| `joining` | M05 application accepted | + Submit collaboration proposals, view Ops board |
| `member` | First active agreement or active project | + Vote in Governance, earn contribution points, full network matching |
| `project_lead` | Appointed by admin | + Full Ops panel management, create projects |
| `circle_lead` | Appointed by admin | + Manage Blueprint, Join applications, Agreements |
| `admin` | Appointed by existing admin | Full edit access everywhere |

**Never hard-code role strings.** Use helpers from `@/core/lib/roles`:

```ts
import { isFullMember, isCircleAdmin, isOpsAdmin, isAdmin } from '@/core/lib/roles'

// In a server page:
const isAdmin = isOpsAdmin(profileRes.data?.role ?? '')
```

| Helper | Who it covers | Gates |
|--------|--------------|-------|
| `isFullMember(role)` | member, circle_lead, project_lead, admin | Governance voting, network matching |
| `isCircleAdmin(role)` | circle_lead, admin | Blueprint, Join admin, Agreements admin |
| `isOpsAdmin(role)` | circle_lead, project_lead, admin | Ops management, project settings |
| `isAdmin(role)` | admin only | Destructive edits |

## Import conventions

| What you need | Import from |
|--------------|-------------|
| Supabase client (server) | `@/core/lib/supabase/server` |
| Supabase client (browser) | `@/core/lib/supabase/client` |
| UI primitives (Button, Card…) | `@/core/components/ui/...` |
| Database types | `@/core/types/database` |
| Role helpers | `@/core/lib/roles` |
| Member promotion | `@/core/lib/promotions` |
| Date / color / initial helpers | `@/core/lib/format` |
| Circles (the 5 pillars) | `@/core/lib/pillars` |
| Project status / Kanban model | `@/core/lib/project-status` |
| Sidebar module list | `@/core/lib/nav` |
| Match scoring | `@/modules/m01-network/lib/match-score` |
| Blueprint compute | `@/modules/m04-blueprint/lib/blueprint-compute` |
| Agreement form fields | `@/modules/m06-agreements/AgreementFormFields` |

Do **not** import from `@/lib/`, `@/components/`, `@/contexts/`, or `@/types/` — those paths are legacy stubs and will not resolve.

## Route files

Files under `src/app/` are thin entry points. If you need to change page logic, edit the component in `src/modules/`, not the `page.tsx` in `src/app/`.

```ts
// src/app/governance/page.tsx — just a re-export, don't edit
export { default } from '@/modules/m09-governance/GovernanceClient'
```

More complex pages pass props from server-fetched data down to the client component:

```ts
// src/app/ops/page.tsx — server component
export default async function OpsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase.from('projects').select('*')
  return <OpsClient projects={projects ?? []} />
}
```

## Permission model in practice

Page-level gating happens in `app/*/page.tsx`. A typical pattern:

```ts
const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
const role = profile?.role ?? 'explorer'
const isAdmin = isOpsAdmin(role)

return <MyModuleClient isAdmin={isAdmin} />
```

Client components receive `isAdmin` (and sometimes `isProjectCreator`) as props — they never fetch the role themselves.

## Database migrations

We use Supabase for the database. If your contribution requires a schema change:

1. Write the SQL migration
2. Apply it: `supabase db push` or use the Supabase dashboard
3. Regenerate types: `npm run cf-typegen` (or update `src/core/types/database.ts` manually)
4. Include the migration SQL in your PR description

## Deployment

The app deploys to **Cloudflare Workers** via OpenNext:

```bash
npm run deploy:cf   # build + deploy to Cloudflare
npm run build       # build only (Next.js)
```

There is no Vercel deployment. The Cloudflare Worker uses bindings for assets, images, and environment variables defined in `.dev.vars`.

## Submitting a PR

1. Fork the repo and create a feature branch: `git checkout -b feature/m07-deliverable-tags`
2. Make your changes inside the relevant `src/modules/mXX-*/` folder
3. Run `npx tsc --noEmit` to check for TypeScript errors
4. Run `npm run dev` and test the relevant route manually
5. Add a note for the release: `changes/<slug>.md` with `bump`, `title`, `public` and the CHANGELOG text
   (`changes/README.md`). Don't edit `src/core/lib/version.ts`, `CHANGELOG.md` or the `ENTRIES` list in
   `src/app/changelog/page.tsx`: the release gives your change its version when it ships
6. Open a PR tagged with the module number (e.g., `[M07] Add deliverable tags`). From a community repo:
   `npm run upstream`. A maintainer ships it with `npm run ship -- <PR number>`

## Code style

- **No comments** unless the *why* is non-obvious (a hidden constraint, a DB quirk, a workaround)
- No error handling for impossible scenarios — trust the DB schema and Next.js guarantees
- **Inline styles** for component-specific layout. **A module's CSS lives in the module's folder**, in a file the
  module imports itself (`src/modules/m07-ops/ops-v4.css`, `import './ops-v4.css'`), with class names prefixed by
  the module. `src/app/globals.css` is only for design tokens and the shared v4 blocks, so people working on
  different modules never edit the same file (see `DESIGN-SYSTEM.md` › Where styles live). Rules already in
  `globals.css` move when their module is next worked on, not before
- **Server Components** for all data fetching; Client Components (`'use client'`) only when you need state or browser events
- **Optimistic updates** for interactive actions (status changes, toggles) — update local state immediately, then fire the DB write

## Questions

Open an issue or start a discussion in the repo. Tag the relevant module number (e.g., `[M07]`) in your issue title.
