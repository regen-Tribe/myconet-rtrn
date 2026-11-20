# Modules

Each module is an independently workable feature of the MyCoNet platform. You can contribute to any module without touching the others.

## Module list

| Folder | Number | Route | What it does | Status |
|--------|--------|-------|-------------|--------|
| `m00-dashboard/` | M00 | `/dashboard` | Personal HUD — role badge, activity stats, quick links | Live |
| `m01-network/` | M01 | `/members` | Member directory with AI match scoring | Live |
| `m04-blueprint/` | M04 | `/blueprint` | Community planning wizard with AI scan | Live |
| `m05-join/` | M05 | `/join` | Onboarding flow, application, role roadmap | Live |
| `m06-agreements/` | M06 | `/agreements` | Collaboration proposals between members and projects | Live |
| `m07-ops/` | M07 | `/operations` | Five-column Project Kanban with drag-and-drop and proposal-to-deliverable flow | Live |
| `m08-contributions/` | M08 | `/achievements` | Achievement badges and contribution history | Live |
| `m09-governance/` | M09 | `/governance` | Proposals, voting, and decision layers | Live |
| `m14-events/` | M14 | `/calendar` | Calendar — core events, community hosted events, tasks; RSVPs; links to circles/projects/proposals | Live |
| `m15-bookings/` | M15 | `/accommodation` | Accommodation — book rooms, cabins, tent sites; admins/circle leads manage, joining+ book | Live |
| `m16-resources/` | M16 | `/resources` | Resources — book tools, spaces and other shared things (same code as M15, `scope='resources'`) | Live |
| `m17-org/` | M17 | `/circles` | Circles (org chart) — circles, teams and their leads; public; leads/admins edit | Live |
| `home/` | — | `/home` | Public and member-facing community landing page | Live |
| `admin/` | — | `/admin/users` | Admin-only user editor (role + lead_circles) | Live |

M02 (Neighborhood Directory) and M03 (Resources & Tools) are not part of MyCoNet; they'll be a separate platform. M10–M13 (agents, Hive) are planned.

Each module has its own `README.md` — start there before touching any code in that folder.

## Module conventions

Each module folder contains:
- Component files (`.tsx`) — the UI and logic
- `lib/` — module-local utilities and algorithms (no side effects, easy to test)
- `README.md` — what the module does, which DB tables it touches, how to work on it

Route files live in `src/app/[route]/page.tsx` (Next.js requirement) and simply re-export from the module:

```ts
// src/app/governance/page.tsx
export { default } from '@/modules/m09-governance/GovernanceClient'
```

See `CONTRIBUTING.md` at the root of `web/` for the full contribution guide.
