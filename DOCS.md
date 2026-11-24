# Documentation Index

Every explainer / README file in this repo, with what it's for and who should read it. If you're looking for something specific, this is the map.

> Last updated: 2026-05-23 (v3.42) — M01 matching v2 (fuzzy + location + travel + goals); removed stale `AiNSP_RnDev.md` / `techstack_AiNSP_RnDev.md` (content merged into EXECUTIVE-SUMMARY + ARCHITECTURE §12); removed `archive/Modules/MycoNetv1.0/` v1 dump (matching enhancements ported to `web/src/modules/m01-network/lib/match-score.ts`).

---

## Root docs (read in this order if you're new)

| File | What it covers | Audience |
|------|----------------|----------|
| [`README.md`](./README.md) | Repo entry point — quick index, modules list, status. | Everyone, first read. |
| [`EXECUTIVE-SUMMARY.md`](./EXECUTIVE-SUMMARY.md) | Full platform overview — all 14 modules, 3 agents, user journey, SPARK/THRIVE service model, dev phases. | Strategic / non-technical. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Implementation blueprint — module specs, SQL schema, planned M10–M13 agent architecture (event bus, MycoNet memory, Telegram approval flow), deployment. | Engineers. |
| [`EXECUTION-PLAN.md`](./EXECUTION-PLAN.md) | Project execution plan — milestones, sequencing. | Project leads. |
| [`INSTANCES.md`](./INSTANCES.md) | Multi-instance plan — one core for every community (RTRN, Protopia, …); config, databases, CI deploys, shared chat agent. | Engineers, project leads. |
| [`CORE-EXTRACTION.md`](./CORE-EXTRACTION.md) | How MyCoNet core was extracted from RTRN's code: what stays in core, what moves to each community repo, step-by-step phases. | Engineers, project leads. |
| [`CLAUDE.md`](./CLAUDE.md) | Coding-agent context — current architecture, what NOT to do, common commands. | AI coding agents + new engineers. |
| [`CHANGELOG.md`](./CHANGELOG.md) | Core release notes (v4.0.0 on). |
| [`LEXICON.md`](./LEXICON.md) | The words MyCoNet uses: one term per idea, module names and addresses, button wording. |
| [`changes/`](./changes/README.md) | The notes of changes waiting for the next core release; how a change describes itself without picking a version. | Anyone changing core. |
| `instance/log/` | This community's log, one file per entry (deploys, core updates, migrations, decisions). Older entries: [`instance/log.md`](./instance/log.md). | Anyone wanting recent history. |
| [`DOCS.md`](./DOCS.md) | **This file.** | Everyone. |

---

## App-level docs

| File | What it covers |
|------|----------------|
| [`web/CONTRIBUTING.md`](./web/CONTRIBUTING.md) | How to contribute to a module without needing the whole codebase — quick start, project structure, role system, import conventions, deployment, PR style. |
| [`web/src/core/README.md`](./web/src/core/README.md) | Shared infrastructure — Supabase clients, role helpers, format helpers, pillars, project-status helpers, app shell. Imported by every module. |
| [`web/src/modules/README.md`](./web/src/modules/README.md) | Module folder index — one row per module with path, route, and one-liner. |

---

## Per-module READMEs

Each module is self-contained. Start with the module's README before touching its code.

| Module | Path | What it does |
|--------|------|-------------|
| **M00 Dashboard** | [`web/src/modules/m00-dashboard/README.md`](./web/src/modules/m00-dashboard/README.md) | Personal HUD — role badge, activity stats, quick links. |
| **M01 Network** | [`web/src/modules/m01-network/README.md`](./web/src/modules/m01-network/README.md) | Member directory with AI match scoring. |
| **M04 Blueprint** | [`web/src/modules/m04-blueprint/README.md`](./web/src/modules/m04-blueprint/README.md) | Community planning wizard grounded in RNF / Alchemy / RCOS / CLIPS, with AI scan. |
| **M05 Join** | [`web/src/modules/m05-join/README.md`](./web/src/modules/m05-join/README.md) | Onboarding flow, application, role roadmap. |
| **M06 Agreements** | [`web/src/modules/m06-agreements/README.md`](./web/src/modules/m06-agreements/README.md) | Collaboration proposals between members and projects. |
| **M07 Operations** | [`web/src/modules/m07-ops/README.md`](./web/src/modules/m07-ops/README.md) | Five-column Kanban for projects and deliverables, with drag-and-drop and the proposal-to-deliverable flow. |
| **M08 Contributions** | [`web/src/modules/m08-contributions/README.md`](./web/src/modules/m08-contributions/README.md) | Achievement badges and contribution history. |
| **M09 Governance** | [`web/src/modules/m09-governance/README.md`](./web/src/modules/m09-governance/README.md) | Proposals, voting, and decision layers. |
| **Home Portal** | [`web/src/modules/home/README.md`](./web/src/modules/home/README.md) | Public and member-facing community landing page. |
| **Admin** | [`web/src/modules/admin/README.md`](./web/src/modules/admin/README.md) | Admin-only user editor at `/admin/users` (role + lead_circles). |

---

## Archive (historical reference, not active code)

| File | What's there |
|------|--------------|
| [`archive/README.md`](./archive/README.md) | Maps old → new locations. |
| `archive/Modules/m1_comm_network/` | Original standalone Next.js v1 of the Community Network module (deployed to Vercel before the v2 consolidation). |
| `archive/Modules/m4_framework_wizard/` | Original standalone CDN-React framework wizard + the full source framework documents (RNF, RCOS, CLIPS, Community Alchemy Playbook). |
| `archive/Modules/design_handoff_portal_explainer/` | Design references for a future Welcome / Portal Explainer page. |

---

## Maintaining this index

Add a new row whenever you add a new top-level README or rename one. Keep entries one line — descriptions belong inside the file itself, not here.
