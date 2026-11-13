# M17 — Circles (org chart)

Shown as **Circles** in the UI (sidebar, menus, dashboard); route `/org`, with `/circles` redirecting.

Who does what: the community stewards (admins), the community's circles, the teams (departments) inside each circle, and who leads each one. Route: `/org`. Public — logged-out visitors can see it too.

## Who can edit

| Who | Can edit |
|-----|----------|
| Admin | Everything |
| Circle lead | Their circles' purpose and members; add, edit and delete teams in those circles |
| Team lead | Their own team's name, description and people (including making others leads) |

Each circle has two kinds of lead. The **lead name** (`circles.leads_to_assign`) is a typed name, possibly someone not on the portal; admins edit it with `CircleLeadName` (`core/components/`), the same component Ops › Circles and Blueprint › Circles use, so all three always agree. **Account leads** come from `user_profiles.lead_circles` with role `circle_lead`, set by admins at `/admin/users` (that's what drives permissions everywhere). The chart links there for admins.

## Files

| File | Purpose |
|------|---------|
| `OrgChartClient.tsx` | Stewards node, one column per circle with leads, members and teams; save/delete |
| `UnitEditModal.tsx` | Edit a circle (purpose + members) or a team (name, description, leads/members, titles) |
| `lib/org.ts` | `canLeadCircle`, `canEditUnit` (mirror the DB), `MEMBER_SELECT`, normalizers |
| `app/org/page.tsx` | Loads units, members, the circle directory, and (for editors) everyone for the picker |

## Database

Migration: `supabase/migrations/20261103_m17_org_chart.sql`.

| Table | Notes |
|-------|-------|
| `org_units` | `kind` circle (one per pillar, seeded) or team; `circle`, `name`, `description`, `sort_order` |
| `org_unit_members` | `(unit_id, user_id)`, `role` lead/member, optional `title` |

Read is public. Writes go through `private.can_lead_circle(circle)` (admin or circle lead of that circle) and `private.can_edit_org_unit(unit)` (that, or a lead of the team). Teams can't be moved into a circle you don't lead.
