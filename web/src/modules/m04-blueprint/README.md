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
| `lib/site-text.ts` | Server side of the website import (`/api/site-text`): `startSite` reads the home page and lists the site's pages (its links plus robots.txt/sitemap.xml, following sitemap indexes); `readPages` reads a batch of up to 8 (Cloudflare limits fetches per request). Public addresses only (no local names, IP literals or odd ports; redirects re-checked) |
| `lib/site-crawl.ts` | Browser side: keeps asking for batches, adding the links each finds, until the whole site is read (cap 300 pages or 1.2M characters, most useful pages first), with Stop here. Returns `[Page n]` text |
| `lib/pdf-images.ts` | Pulls images out of an imported PDF and suggests a logo and banner (rules, not AI) |
| `lib/branding-upload.ts` | Uploads/clears the logo or banner (`branding` bucket + `community_settings`) |
| `DocumentsStep.tsx` | Setup step "Documents": the library the portal assistant answers from (see `modules/assistant/README.md`) |
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

- **Admin / circle_lead**: read + write (the page via `isCircleAdmin`; the database via the `blueprints` update policy, `20261117000000_blueprint_leads_edit.sql`)
- **All other roles** (project leads included): read only

## AI scanning

The blueprint integrates with `/api/scan` to scan uploaded documents and suggest answers. The API route calls MiniMax M3 (`lib/doc-scan.ts` runs the two-pass scan: evidence with page quotes, then answers per phase with confidence and sources).

Sources: a PDF/.txt/.md file, pasted text, or a website address (`/api/site-text`, admins and circle leads only). Every source is saved to the library (`community_documents`, Setup › Documents) as shareable or sensitive; there is no "don't add it" choice.

Existing answers are never overwritten by default. For a written answer that already exists, `mergeAnswers` (lib/doc-scan.ts, M3, 12 questions per call) writes one answer combining the current and proposed text: every fact once, the community's facts preferred on conflict, nothing invented. The review offers Keep current / Combine (the default; shows the combined text) / Replace it; if combining fails for a question, Combine adds the new text after the old. Scores and yes/no answers that already exist are kept unless Replace it is chosen.

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
