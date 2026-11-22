# Admin

Admin-only management surfaces. Currently houses the user editor at `/admin/users`.

## Routes

| Route | File |
|-------|------|
| `/admin/users` | `app/admin/users/page.tsx` → `UsersAdminClient` |

## Files

| File | Purpose |
|------|---------|
| `UsersAdminClient.tsx` | Inline editor — lists every user with a role dropdown and (when role is `circle_lead`) a pillar pill picker for `lead_circles`. Per-row save button with optimistic feedback. Search filters by name, username, or role. |

## Database tables

| Table | Access |
|-------|--------|
| `user_profiles` | Read — full list of users. Write — `role`, `lead_circles` and `approved` (false = an admin added the profile and it waits: left out of Members, search and counts until Approve; v4.118.0). |

## Role gating

Only `admin` users can reach this page. The page itself redirects to `/dashboard` otherwise. The sidenav "Admin" section only renders when `isAdmin(role)` is true.

Role check uses `isAdmin(role)` from `@/core/lib/roles`.

## What admins can change

| Field | Effect |
|-------|--------|
| `role` | Promotes / demotes the user. Sets one of: `explorer`, `joining`, `member`, `project_lead`, `circle_lead`, `admin`. |
| `lead_circles` | Which pillar circles this user leads (only meaningful when role is `circle_lead`). Used by the M07 Kanban to allow them to drag projects in their circles. |

## How to work on this module

```bash
cd web && npm run dev
# Visit http://localhost:3000/admin/users as an admin
```

To add another admin field (e.g., `is_internal`):
1. Add the column to `user_profiles` via Supabase migration.
2. Extend the `AdminUserRow` interface in `UsersAdminClient.tsx`.
3. Add the new editor control inline in the row.
4. Include it in the `saveUser()` update payload.
