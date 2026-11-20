# M07 — Operations

The community's project management system. Built around a unified five-column Kanban — the same mental model on both the main board (where the cards are *projects*) and on each project's detail page (where the cards are *deliverables*, with pending collaboration proposals occupying the leftmost column as Ideas).

```
Ideas  →  Backlog  →  In progress  →  Review  →  Done
```

## Routes

| Route | File |
|-------|------|
| `/operations` | `app/operations/page.tsx` → `OpsClient` (Project Kanban) |
| `/operations/new` | `app/operations/new/page.tsx` → `NewProjectClient` (admin direct-create) |
| `/operations/[id]` | `app/operations/[id]/page.tsx` → `ProjectDetailClient` (per-project Kanban) |

## Files

| File | Purpose |
|------|---------|
| `OpsClient.tsx` | Main board with three tabs: **Board** (project Kanban), **Deliverables** (table across all projects), **Updates** (timeline). |
| `ProjectDetailClient.tsx` | Per-project page — header + circle badge + settings (admin) + 5-column Kanban + updates feed. |
| `NewProjectClient.tsx` | Admin direct-create form (sets initial status to `pending`). |
| `DeliverablesTab.tsx` | Table view of all deliverables across all projects. |
| `NewTaskModal.tsx` | **+ Task** on the board: a one-off task for a circle, saved into that circle's Chores project (`chores_project()`). |
| `UpdatesTab.tsx` | Timeline of all project updates across all projects. |
| `types.ts` | Shared types — `Project`, `ProjectSummary`, `Deliverable`, `ProjectUpdate`, `CollaborationAgreement`, `MyProposal`. |

## The project manager (v4.25.0)

When a meeting adds tasks to a circle, the pipeline queues that circle (`board_reviews`). Every 10 minutes
the database (`private.board_review_sweep()`, pg_cron + pg_net, the meetings sweep's Vault secrets) calls
`/api/ops/board-review` once per waiting circle, and the agent (`lib/board-review.ts`, MiniMax Flash, one call)
reviews the circle's whole board like a project manager:

| It finds | It does |
|---|---|
| Duplicates, both its own drafts (`needs_review`, `source='meeting'`), when sure | **Merges them itself** (keeps the clearer one, takes the other's person/date, relinks the meeting links, deletes the other) |
| A board (Chores) task or a draft that belongs to a project of the circle, when sure, with a reason | **Files it itself** |
| Any other duplicate or move; 3+ tasks that make a project nobody made; who could take a task nobody has | **Suggests** it (`agent_suggestions`) |
| The circle's state | Keeps the circle's **space in the second brain** (`lib/circle-space.ts`, v4.30.0): its folder (`circles.brain_folder`, else the slug) with `README.md` (the circle's index; the agent writes only its own part, between the `myconet:circle` markers, in a README people wrote) and `board.md` (status, projects with their tasks, the board, open suggestions). A new folder gets a line in the second brain's README map. A new, renamed, retired or moved circle asks for a review itself (trigger `circles_request_brain_update`), so it gets its space within 10 minutes. |

Its own changes are logged in `agent_actions` (`pm_merge`, `pm_move`, `pm_assign`) with what's needed to undo
them. A review replaces the circle's open suggestions; dismissed ones (60 days) aren't suggested again.

**On the board:** the **🧭 Project manager** panel (`ProjectManagerPanel.tsx`, `#pm`, follows the circle filter; starts collapsed since v4.33.1 unless opened at `#pm`):
suggestions with **Accept** / **Dismiss** and the agent's changes of the last two weeks with **Undo**, for
admins and that circle's leads (`lib/pm-access.ts`; routes `/api/ops/suggestions/[id]`,
`/api/ops/agent-actions/[id]`); everyone else sees them read-only. **On the circles** (Operations › Circles and
`/circles`): a **🧭 Project manager (N)** button for its leads opens `/operations?circle=<slug>#pm`.

## The unified Kanban model

Both the main board and project detail share the same five columns, defined once in `@/core/lib/project-status`:

| Column | What lives there |
|--------|------------------|
| **Ideas** | On main board: projects in `pending` status (newly proposed via M06, not yet activated).<br>On project detail: pending collaboration proposals (visible to admin / project creator only). |
| **Backlog** | Active work that hasn't started yet. |
| **In progress** | Work underway. |
| **Review** | Done by the contributor, awaiting sign-off. |
| **Done** | Finished. |

A sixth state `paused` exists in the schema but does not appear on the board.

## Project status flow

```
pending  →  backlog  →  in_progress  →  review  →  done
   ↑           ↓
   └── (paused — off-board)
```

- A project starts in `pending` when proposed via M06's "Propose a new project" modal or when an admin creates it via `/operations/new`.
- Dragging a project from **Ideas → Backlog** on the main board accepts it (or the agreement flow handles activation).
- From there, anyone with permission to move it drags it rightward as it advances.

## Database tables

| Table | Notes |
|-------|-------|
| `projects` | `status` ∈ `pending | backlog | in_progress | review | done | paused`. `circle` text (one of the 5 pillars from `@/core/lib/pillars`). `created_by`, `lead_user_id` used for permission checks. |
| `deliverables` | Since v4.34.0: `project_id` is nullable (null: on the main board, opened in `TaskModal.tsx` at `/operations?task=<id>`), and `team_id` → `org_units` (a team of its circle; trigger `deliverables_team_circle`). Since v4.32.0: `priority` (`none | low | medium | high`, default `none`; the pop-up's slider, `Priority.tsx`) and `assignee_name` (someone not on MyCoNet yet, a name tag only; cleared by trigger when `assignee_id` is set; meetings use it instead of "(for …)" in the title). Since v4.31.0: `notes` (free text; under the task in the circle's `board.md`); the assignee updates status and notes through `update_my_task()`, the pop-up's Status / Assigned to / Notes. `status` ∈ `backlog | in_progress | review | done`. `assignee_id` is the contributor. `from_agreement_id` (nullable) links back to the proposal that spawned this deliverable, if any. Since v4.20.0: `due_time` (local time, only with `due_date`), `circle` (defaults to the project's, by trigger), `source` (`person` · `agent` · `meeting`), `source_meeting_id` + `source_item`, `needs_review` (a draft; saving the task pop-up clears it, and since v4.33.0 a lead can slide its Draft pill right to approve or left to decline, `DraftSwipe.tsx`), `created_by`. Dates are local: format them with `core/lib/tasks.ts`, never `new Date('YYYY-MM-DD')`. |
| `projects.team_id` | v4.37.0: a team of the project's circle (`org_units`, kind team), or null for the whole circle. Trigger `projects_team_circle` keeps circle and team together; new tasks in the project start on its team (`deliverables_default_team`). Picked with `TeamPicker.tsx`. |
| `projects.is_chores` | Retired in v4.34.0: tasks need no project, so the per-circle chores projects were deleted (their tasks moved onto the board) and `chores_project()` / `chores_project_for_server()` dropped. The column stays, always false. |
| `project_updates` | Freeform timeline posts per project. |
| `collaboration_agreements` | Proposals. `status='pending'` rows appear in the Ideas column on project detail. |

## Permissions (drag-and-drop)

The same gate applies on both Kanban surfaces, defined as `canMoveProject()` / `canManage`:

| Role | Main board (project cards) | Project detail (proposals + deliverables) |
|------|---------------------------|------------------------------------------|
| `admin` | Any project | Any card |
| `project_lead` | Projects they `created_by` or `lead_user_id` | Their own projects' cards |
| `circle_lead` | Projects whose `circle` is in their `lead_circles` | Their circle's projects' cards |
| `member` and below | Read only — cards are still clickable links | Read only |

## The proposal-to-deliverable flow

When an admin / project creator drags a card from **Ideas → Backlog** (or clicks the **Accept →** button on the proposal card), `acceptProposal()` in `ProjectDetailClient.tsx`:

1. Flips the agreement's `status` to `'accepted'`.
2. Inserts a new row in `deliverables` with `title` derived from the agreement's `work_description`, `assignee_id` set to the proposer, and `from_agreement_id` linking back.
3. Optimistically removes the proposal card from Ideas and adds the new deliverable card to the target column.

Existing accepted / active / completed agreements from before this flow was added were backfilled into `deliverables` by migration, so they appear in the Kanban automatically.

## Circles

Every project belongs to one of the community's circles (or none), from the `circles` table via `useCircles()`. The circle drives:

- The badge shown on the project card and header.
- The colored left-border accent on Kanban cards (when set).
- The circle-lead permission check above.

Admins set lead-circle assignments at `/admin/users`.

## Server-side data fetching

`app/operations/page.tsx` fetches projects (with `circle`, `created_by`, `lead_user_id`), all deliverables (for the Deliverables tab and the per-card subtask progress counter), recent updates, the current user's role, and their `lead_circles`. Counts (active, deliverables, done, at-risk) are derived server-side.

`app/operations/[id]/page.tsx` fetches the single project, its updates, its pending proposals (only used by admin / project creator), its deliverables joined to the assignee's `user_profiles`, and the current user's own proposal (if any) for the inline propose-collaboration form.

## How to work on this module

```bash
cd web && npm run dev
# http://localhost:3000/ops             — Project Kanban (everyone)
# http://localhost:3000/ops/[id]        — Per-project Kanban + Ideas column
# http://localhost:3000/ops/new         — Admin direct-create
```

To add a new deliverable field (e.g., `priority`):
1. Migrate the `deliverables` table via Supabase.
2. Extend the `Deliverable` interface in `types.ts`.
3. Update the add-subtask form in `ProjectDetailClient.tsx` and the table in `DeliverablesTab.tsx`.

To add a new project status:
1. Update the `projects_status_check` constraint via Supabase migration.
2. Add the new key to `PROJECT_KANBAN_COLUMNS` / `PROJECT_STATUS_META` in `@/core/lib/project-status`.
3. The Kanban renders dynamically from those constants — no further UI changes needed.
