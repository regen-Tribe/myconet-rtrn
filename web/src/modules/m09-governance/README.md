# M09 — Governance

Four-layer community decision-making. Members submit proposals; the system evaluates them through Sociocracy, Democracy, Meritocracy, and AI facilitation layers simultaneously. Each layer has its own vote type and eligibility rule.

## What users see here

- **Proposal list** — all open proposals with proposer, closing date, and live vote summary per layer
- **Layer vote panels** — each proposal expands to show four layers with vote buttons gated by role
- **AI check** — clicking a proposal auto-runs an MiniMax M3 alignment check against the community blueprint; shows a confidence score and reasoning
- **New proposal form** — any Member+ can submit a proposal with title, description, and decision mode

## Routes

| Route | File |
|-------|------|
| `/governance` | `app/governance/page.tsx` → `GovernanceClient` |
| `/api/governance/ai-check` | `app/api/governance/ai-check/route.ts` — POST endpoint, calls MiniMax |

## Files

| File | Purpose |
|------|---------|
| `GovernanceClient.tsx` | Full governance UI — proposal list, layer vote panels, AI check display, new proposal modal |

## Database tables

| Table | Access |
|-------|--------|
| `proposals` | Read/write — proposal records (title, description, decision_mode, status, closes_at) |
| `proposal_votes` | Read/write — one row per (proposal_id, user_id, layer); unique on that triple |
| `blueprints` | Read — community blueprint fetched by the AI-check API for context |

## The four governance layers

| Layer | Name | Who votes | Vote options | Passes when |
|-------|------|-----------|--------------|-------------|
| L1 | Sociocracy | `circle_lead` role only | consent / concern / object | At least one vote; zero objections |
| L2 | Democracy | All `member`+ roles | yes / no | Yes > No |
| L3 | Meritocracy | `admin` and `advisor` roles | approve / reject | At least one approval; zero rejections |
| L4 | AI facilitation | Automatic (no human vote) | — | Always shows; confidence score guides humans |

## Role gating

| Role | Can do |
|------|--------|
| Guest / Explorer | View proposals and layer breakdowns (read-only) |
| Joining | View only |
| Member | Vote on L2 (Democracy); submit new proposals |
| circle_lead | Vote on L1 (Sociocracy) + L2; submit proposals |
| advisor | Vote on L3 (Meritocracy) + L2; submit proposals |
| admin | Vote on L3 + L2; submit proposals; manage proposals |

The `advisor` role is assigned by an admin via `/admin/users`.

## DB schema — proposal_votes

```sql
proposal_votes (
  id uuid,
  proposal_id uuid references proposals,
  user_id uuid references auth.users,
  vote text CHECK (vote IN ('consent','concern','object','yes','no','approve','reject')),
  layer text NOT NULL DEFAULT 'sociocracy',
  created_at timestamptz,
  UNIQUE (proposal_id, user_id, layer)
)
```

Each user can vote once per layer per proposal. Votes are upserted on conflict.

## AI check endpoint

`POST /api/governance/ai-check` accepts `{ title, description }`, fetches the community blueprint from Supabase, and calls MiniMax M2.7 with a structured prompt asking for JSON `{ confidence: number, reasoning: string }`. The confidence is 0–100 (how well the proposal aligns with the blueprint). Displayed inline on proposal select.

## Proposal lifecycle

```
open → closed  (when closes_at is reached or admin manually closes)
```

## How to work on this module

```bash
cd web && npm run dev
# http://localhost:3000/governance
```

To add a new vote type, add it to the `proposal_votes` CHECK constraint (via migration) and update `castVote()` and `layerVotes()` in `GovernanceClient.tsx`.

To add proposal comments, the `proposal_comments` table exists in the DB — the UI is the next feature to build here.
