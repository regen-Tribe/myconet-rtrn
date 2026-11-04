# M05 — Join

The community onboarding flow. Guides an `explorer` through three steps — sign community values, get matched with a buddy, submit application — then waits for admin review. Full members see a role roadmap instead of the form. Guests see a journey explanation. Admins see a separate review panel.

## Routes

| Route | File |
|-------|------|
| `/join` | `app/join/page.tsx` → `JoinClient` or `JoinAdminClient` |

## Files

| File | Purpose |
|------|---------|
| `JoinClient.tsx` | Multi-view join page — guest journey, member role roadmap, application form, status view |
| `JoinAdminClient.tsx` | Admin review panel — list of applications with accept/reject/notes |

**Where the content comes from:** the application questions are the Blueprint's `join_application_questions` answer and the values are the `community_values` table, both edited in **Blueprint › Step 1.4 First Agreements**. The steps are the same with or without them; when either is missing, the step says so and links to `/blueprint?step=s1.4`. Answers are saved as `q0…qN`, `_questions` (the wording shown) and `extra`.

## Views rendered by `JoinClient`

The component renders one of four views depending on the user's state:

| Condition | View shown |
|-----------|-----------|
| Not logged in | **Journey explanation** — 3 steps (Explorer → Joining → Member) with bullets for what each stage unlocks and a CTA to sign up |
| `member`, `circle_lead`, `project_lead`, or `admin` | **Role roadmap** — all 6 roles shown with how to reach each one and what access it grants |
| Logged in with an existing application | **Application status** — current status pill, description, and reapply option if rejected |
| Logged in, no application yet | **Multi-step form** — values signing → buddy matching → submit |

## Database tables

| Table | Access |
|-------|--------|
| `applications` | Read/write — user's application (status, answers) |
| `community_values` | Read — values list for the signing step |
| `value_signatures` | Read/write — which values a user has signed |
| `user_profiles` | Read — role check; Write — role promotion on acceptance |

## Role gating

- **Not logged in**: sees the journey explanation page with sign-up CTA
- **Explorer**: sees the multi-step join form (or existing application status)
- **Joining**: sees their existing application status
- **Member / circle_lead / project_lead / admin**: sees the full role roadmap
- **Admin / circle_lead**: routed to `JoinAdminClient` by `page.tsx` before `JoinClient` is reached

## Application flow

```
Guest visits /join
        ↓
Sees 3-step journey page → creates account → returns as explorer
        ↓
Step 1: Signs all community values (recorded in value_signatures)
        ↓
Step 2: Gets matched with a buddy (optional intro request)
        ↓
Step 3: Submits application (applications table, status = 'pending')
        ↓
Admin reviews in JoinAdminClient
        ↓
Accept → role = 'joining'    |    Reject → status = 'rejected'
```

When an admin accepts, the user's `role` in `user_profiles` is updated from `explorer` to `joining`. The `community_joiner` achievement badge is awarded automatically in `modules/home/HomePage.tsx` the next time the user visits `/home`.

## Role roadmap (`RoleRoadmap` component)

Defined inline in `JoinClient.tsx`. Renders all 6 roles with how to reach each one and what access it grants:

| Role | How to reach it |
|------|----------------|
| Explorer | Sign up for a free account |
| Joining Member | Submit the M05 application and get accepted |
| Full Member | Application accepted + first active agreement or project |
| Project Lead | Appointed by admin based on project contributions |
| Circle Lead | Appointed by admin to steward a community area |
| Admin | Appointed by existing admins |

The current user's role is highlighted; past roles show a checkmark; future roles are dimmed.

## Props passed from `page.tsx`

```ts
<JoinClient
  userId={string | null}
  userRole={string}             // controls which of the 4 views to render
  existingApplication={...}
  userProfile={...}
  communityValues={CommunityValue[]}
  initialSignedValueIds={string[]}
  buddyProfiles={BuddyProfile[]}
/>
```

## How to work on this module

```bash
cd web && npm run dev
# As guest:    http://localhost:3000/join  — see journey explanation
# As explorer: log in as explorer — see the 3-step form
# As member:   log in as full member — see role roadmap
# As admin:    log in with admin account — see JoinAdminClient
```

Application questions are driven by the community blueprint (`blueprints.answers.join_application_questions`), so they're configurable without code changes.
