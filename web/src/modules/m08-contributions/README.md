# M08 — Contributions

Achievement and badge system. Tracks visible contributions across the community. Currently shows earned badges; future versions will add logged hours, contribution points, and reputation scores.

## Routes

| Route | File |
|-------|------|
| `/achievements` | `app/achievements/page.tsx` → `ContributionsPage` |

## Files

| File | Purpose |
|------|---------|
| `ContributionsPage.tsx` | Server Component — renders the badge catalog, showing earned vs locked state per badge |

## Database tables

| Table | Access |
|-------|--------|
| `user_achievements` | Read — list of achievements earned by the current user |

Schema: `(id, user_id, achievement_key, earned_at)`

## Badge catalog

Badges are defined in `ContributionsPage.tsx` as a static `CATALOG` array. To add a new badge:
1. Add an entry to `CATALOG` with `key`, `title`, `description`, `icon`, `color`, `hint`
2. Add the corresponding upsert wherever the badge should be awarded (e.g., in `modules/home/HomePage.tsx` for role-based badges)

## Current badges

| Key | Awarded when |
|-----|--------------|
| `profile_complete` | Profile completion context reaches 100% (auto-awarded in `AppTopBar`) |
| `community_joiner` | User's role is `joining` or above (awarded in `modules/home/HomePage.tsx`) |

## Role gating

Open to all — guests see the catalog in locked state with a sign-up CTA.

## How to work on this module

```bash
cd web && npm run dev
# http://localhost:3000/contributions
```
