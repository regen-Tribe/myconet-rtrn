# M04 — Blueprint

Guided community planning wizard. Takes a community through four phases — SPARK → PROVE → BUILD → LIVE — across five pillars (Ecology, Governance, Economy, Culture, Infrastructure). Admins fill in the blueprint; all members can read it.

## Conceptual grounding

The wizard structure is derived from four research-backed frameworks. Each step and field traces back to one or more of these — keep this in mind when editing `lib/wizard-data.ts`.

| Framework | What it contributes |
|-----------|---------------------|
| **RNF** — Regenerative Neighborhood Framework | The 5 pillars and the 5-spiral timeline (what to include and when) |
| **Alchemy** — Community Alchemy Playbook | The 11 sequential areas (steps and order) |
| **RCOS** — Regenerative Community Operating System | The 7 governance layers (how the community governs itself) |
| **CLIPS** — Community Learning Incubator Programme | Concentric health check (coherence between intention, structure, practice) |

**Four phases · 13 steps:**
- **01 SPARK** — Finding Your Why · Founding Group · Clarifying Purpose · First Agreements
- **02 PROVE** — Business Model · Site Selection · Funding Strategy
- **03 BUILD** — Securing Capital · Master Planning · Infrastructure · Community Activation
- **04 LIVE** — Operations Go Live · Culture & Governance · Learning & Evolution

## Routes

| Route | File |
|-------|------|
| `/blueprint` | `app/blueprint/page.tsx` → `BlueprintClient` |

## Files

| File | Purpose |
|------|---------|
| `BlueprintClient.tsx` | Full wizard UI — pillar tabs, step fields, AI scan, scoring panels |
| `BrandingStep.tsx` | Setup step "Look & feel": logo and banner image (`community_settings`, `branding` bucket). Admins only |
| `lib/pdf-images.ts` | Pulls images out of an imported PDF and suggests a logo and banner (rules, not AI) |
| `lib/branding-upload.ts` | Uploads/clears the logo or banner (`branding` bucket + `community_settings`) |
| `CommunityValuesEditor.tsx` | Step 1.4's Community values section: the values members sign when joining (`community_values`) |
| `CirclesStep.tsx` | Setup's last step: confirm circles found by the scan, or ask for them (templates), and save / rename / retire them. Admins only (`circles` is admin-write) |
| `lib/circle-setup.ts` | Scan prompt rule for circles, merging found circles, templates, slug / emoji / colour pickers |
| `lib/blueprint-compute.ts` | Pure scoring functions — readiness, gates, phase progress |
| `lib/wizard-data.ts` | Static wizard structure — all phases, pillars, steps, and field definitions |
| `wizard.css` | Wizard-specific styles (scoped to blueprint, not global) |

## Scoring functions (`lib/blueprint-compute.ts`)

These are pure functions with no side effects — great for testing.

| Function | Returns |
|----------|---------|
| `computeOverallReadiness(answers)` | `number` 0–10 readiness score |
| `computeGatesPassed(answers)` | `number` 0–4 milestone gates cleared |
| `computePhaseProgress(answers)` | `PhaseProgress[]` per-phase completion ratios |
| `computePillarScores(answers)` | `PillarScore[]` per-pillar score objects |

These functions are also imported by `m00-dashboard` and `modules/home` to display community status.

## Database tables

| Table | Access |
|-------|--------|
| `blueprints` | Read/write — single community blueprint row (`is_community = true`) |

## Role gating

- **Admin / circle_lead / project_lead**: read + write
- **All other roles**: read only

## AI scanning

The blueprint integrates with `/api/scan` to scan uploaded documents and suggest answers. The API route calls MiniMax M2.7 via the Cloudflare Worker.

Full scans (and the Circles step's own scan) also ask for a `circles` array, following `INSTANCES.md` §6.2: standing groups only, each with a `source` quote; any without one is dropped. They are not saved as circles. They wait in the answers under `_circles_found` until an admin confirms them in the Circles step.

## How to work on this module

```bash
cd web && npm run dev
# Navigate to http://localhost:3000/blueprint
# (You'll need an admin account to edit)
```

To add a new blueprint field:
1. Add the field definition to `lib/wizard-data.ts`
2. Add scoring logic to `lib/blueprint-compute.ts` if it should affect readiness
3. `BlueprintClient.tsx` auto-renders fields from the wizard data structure
