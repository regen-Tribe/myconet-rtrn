# MyCoNet — Multi-Instance Plan

How one MyCoNet codebase runs several community portals (RTRN today, Protopia next), and how changes flow between them.

> Status: **proposed** (2026-11-03). Nothing in here is built yet. Supersedes the "fork/clone the repo" steps in `EXECUTION-PLAN.md` Phase 0.5 and `ARCHITECTURE.md` §11.

---

## 1. The rule: one core, a repo per community, no drift

> Updated 2026-11-03: each community gets **its own repo** that pulls from the core repo. How the core gets carved out of today's RTRN code is in [`CORE-EXTRACTION.md`](./CORE-EXTRACTION.md).

```
regen-Tribe/myconet                 ← MyCoNet CORE (the master version)
 ├─ web/  agent/  supabase/migrations/
 └─ instance.example/               default config a new community starts from
        │   core releases (tags v4.x) flow down ▼
        ├──────────────────────────────┐
regen-Tribe/myconet-rtrn          <protopia>/myconet-protopia
 = core + instance/ (RTRN)          = core + instance/ (Protopia)
```

| Kind of change | Where it's made | Who gets it |
|---|---|---|
| Shared improvement or bug fix | **Core repo**, released as a tag | Every community, when its repo pulls the release |
| Feature one community wants now, others maybe later | **Core repo**, behind a config switch, off by default | Only communities that switch it on |
| Truly one community only | That community's repo, **inside `instance/` only** | That community |
| Started in one community, now wanted by all | Move it from `instance/` into core with a PR to the core repo | Everyone, from the next release |

**The rule that keeps it working:** a community repo never edits core files (`web/`, `agent/`, `supabase/migrations/`). It changes only `instance/`. That's what makes pulling a core update a clean merge instead of a fight. A fix found in RTRN or Protopia gets made in core, then pulled down.

---

## 2. Instance config

`instance/config.jsonc`, in each community's repo, holds everything that differs between communities:

```jsonc
{
  "id": "protopia",
  "displayName": "Protopia",
  "cloudflare": { "accountId": "…", "workerName": "myconet-protopia" },
  "appUrl": "https://…",
  "supabase": { "url": "https://<ref>.supabase.co", "anonKey": "…" },   // anon key is public by design
  "modules": { "m15": true, "m16": true, "m17": true },          // modules on/off
  "roleLabels": { "explorer": "Visitor" },                       // rename roles; the ladder stays
  "governance": { "layers": ["sociocracy", "democracy", "merit"] },
  "theme": { "logo": "instance/logo.svg", "accent": "#0d9488", "fonts": {} },
  "agent": { "channel": "whatsapp" }
}
```

- **Secrets never go in this file.** Service-role keys, AI API keys and chat tokens live as Cloudflare secrets / GitHub environment secrets.
- `NEXT_PUBLIC_*` values are **inlined at build time**, so each instance needs its own build. The community repo's build reads `instance/config.jsonc` and generates its wrangler config.
- Community **content** (name, purpose, Blueprint, join questions, **circles**) lives in the database, not in this file. Circles are set during setup (§6).

### Hard-coded RTRN values to move into config

Full list and what happens to each: [`CORE-EXTRACTION.md`](./CORE-EXTRACTION.md) §3. Main ones:

- `web/wrangler.jsonc` — Worker name `myconet`, Supabase URL + anon key, `NEXT_PUBLIC_APP_URL`.
- `web/src/app/LandingClient.tsx` — footer "Open sourced by The Regen Tribe Collective".
- `web/src/modules/m04-blueprint/BlueprintClient.tsx` — "The Regen Tribe Regenerative Neighborhood — Regen Hood 0 — Plan" title and the export footer.
- `web/src/core/lib/pillars.ts` + three database check constraints — the five circles. These move to a `circles` table (§6.3).
- `web/src/modules/home/README.md` — docs wording (cosmetic).

---

## 3. Databases: separate projects, one schema

- **Each community gets its own Supabase project**, in its own account (Protopia: protopiaRegenHood@gmail.com). Member data never mixes.
- **The schema lives once**, in core's `supabase/migrations/`. Each community repo's deploy applies them to its own database (`supabase db push`). A community that needs an extra table adds it in `instance/migrations/`, numbered with the hour 90–99 (core uses 00–89), so the two never take the same number: see `supabase/migrations/README.md`.
- **Gap to close first:** the repo only has the five November migrations (M14, M15, M14 tasks, security hardening, M17). The base schema (~25 older tables, RLS, functions, triggers, storage buckets) was created by hand and isn't in the repo. Step 2 below exports it as a baseline migration (schema only, no member data).
- **Seed data per instance** (Blueprint starter, first admin; circles come from the setup flow in §6) goes in `instance/seed.sql`, not in migrations.

---

## 4. Deploys: GitHub Actions in each community repo

- The core repo only runs checks (lint, build, tests against a throwaway database). It deploys nothing.
- Each **community repo** deploys itself from CI. Its GitHub secrets hold:
  - `CLOUDFLARE_API_TOKEN` + account ID
  - `SUPABASE_ACCESS_TOKEN` + project ref
  - app secrets (AI key, chat tokens)
- The two accounts stay completely separate; a token for one can't touch the other.
- **Flow:**

```
core: PR ─► main ─► checks ─► tag v4.3.0
                                  │  bot opens "Update core to v4.3.0" PR in each community repo
                                  ▼
protopia repo: merge PR ─► migrate + deploy Protopia
rtrn repo:     merge PR ─► migrate + deploy RTRN      (each community chooses when)
```

- Each community merges core updates when it's ready, so one goes first and the other follows.

- **Tokens are created by the account owner**, not by an agent: log into protopiaRegenHood@gmail.com's Cloudflare and Supabase, create API tokens, paste them into the GitHub environment.

---

## 5. Chat agent: one brain, many mouths — each on its own VM

Protopia's WhatsApp agent and RTRN's Telegram agent are the same agent with different adapters. This is the M10 Genesis design in `ARCHITECTURE.md` §12, generalised beyond Telegram.

**Each community runs its own agent infrastructure:** its own virtual machine with its own agent harness, owned by that community's account. No agent, VM, memory or chat history is shared between communities. What *is* shared is the code: the agent core, tools and adapters live in this repo (`agent/`) and every VM runs the same version.

```
┌─ Protopia VM (Protopia's account) ─────────────┐
│ harness ─► agent core ─► WhatsApp adapter      │ ◄──► Protopia WhatsApp group
│               │                                │
└───────────────┼────────────────────────────────┘
                ▼
        Protopia Supabase DB  ◄── Protopia portal (Cloudflare)

┌─ RTRN VM (RTRN's account) ─────────────────────┐
│ harness ─► agent core ─► Telegram adapter      │ ◄──► RTRN Telegram group
│               │                                │
└───────────────┼────────────────────────────────┘
                ▼
          RTRN Supabase DB    ◄── RTRN portal (Cloudflare)
```

**What lives where:**

| Shared (in this repo, same on every VM) | Per community (on that community's VM only) |
|---|---|
| Agent core: identity linking, intent → tool, approval queue, audit log | The VM itself and its cloud account |
| Tool definitions (`create_event`, `book_item`, …) | Harness config: persona, prompts, schedules/heartbeats |
| WhatsApp and Telegram adapters | Which adapter is on, chat group IDs, bot tokens / WhatsApp session |
| Install + update script | Supabase keys, LLM API key |
| | Agent memory, logs and chat history |

**Adapters (thin, per channel):** turn incoming chat messages into one common shape `{ channel, chatId, senderId, text, replyTo }` and send replies back. Switched on per instance in config.

**Agent core (shared, all the real logic):**

1. **Who's speaking** — link the WhatsApp number / Telegram ID to a `user_profiles` row (one-time "link your account" flow from the portal). Unknown senders get read-only answers or nothing.
2. **What they want** — LLM turns the message into an intent.
3. **A fixed toolset**, not raw SQL: `create_event`, `book_item`, `create_task`, `update_deliverable`, `rsvp`, `list_upcoming`, …
4. **Same permissions as the portal** — every tool runs as the linked user, so RLS and role rules apply unchanged. A joining member can't do in chat what they can't do in the app.
5. **Approval queue** for bigger or ambiguous changes — leads approve in chat or on the dashboard (`genesis.request.pending` / `approved` / `rejected` in §12).
6. **Audit log** of every write the agent makes, with the original message.

**Hosting:** one VM per community, running the harness as a long-lived process. A VM (rather than a serverless Worker) gives the agent persistent memory, scheduled jobs, and an always-on chat connection, and keeps the agent fully separate from the portal: if the agent goes down, the portal keeps working.

**Talking to the database:** the VM never connects to Postgres directly. It calls that community's Supabase API, and each tool call runs **as the linked member** (a short-lived token for that user), so RLS enforces the same rules as the portal. The service-role key stays off the VM unless a specific admin-only job needs it.

**Updates to the agent:** the VM pulls a tagged release of `agent/` from this repo (install/update script, or a CI job that SSHes in). Same flow as the portal: Protopia's VM first, then RTRN's after approval. Each VM's own config and memory are never overwritten by an update.

**Securing each VM:** SSH keys only, no open ports except what the chat channel needs, secrets in an env file readable only by the harness user, automatic security updates, and backups of the agent's memory.

**WhatsApp caveat — check before building:** Meta's official WhatsApp Business Cloud API has historically had limited support for bots in group chats. Running on a VM makes unofficial libraries (whatsapp-web.js / Baileys) possible, since they need an always-on session, but they risk the number being banned. Telegram bots support groups natively. Confirm the WhatsApp group setup before committing to the Protopia adapter.

---

## 6. Setting up a new community

The setup run for a new instance (e.g. Protopia), whether an admin does it in the portal or an agent does it on their behalf.

1. **Upload the community's documents** into the Blueprint wizard (AI scan). The scan fills in Blueprint answers.
2. **Review the Blueprint** with the community admin: confirm, edit, fill gaps.
3. **Establish the circles** (§6.1–6.2). This step is **required**. Setup isn't finished until the community has at least one circle.
4. Set join questions, invite the first members, then assign circle leads in Admin › Users once those people have accounts.

### 6.1 Circles: what they are

Circles are the community's working groups or departments. Projects (M07), events (M14), bookable items (M15/M16) and the org chart (M17) all belong to a circle, and circle leads get edit rights over their circle.

> **Not the same as the Blueprint's five framework pillars** (Ecology, Social, Economy, …), which are fixed scoring axes in the wizard. A community's circles can match those, but don't have to. Never copy the pillars into circles without asking.

### 6.2 Circles: instructions for the setup process

**Step A — look for them in the uploaded documents.** The AI scan also extracts circles. Ask for:

```json
"circles": [
  { "name": "Land & Food", "purpose": "One sentence on what this circle takes care of",
    "lead_names": ["…"], "source": "short quote from the document it came from" }
]
```

Count something as a circle only if the documents describe it as a standing group, team, department, guild or circle with an area of responsibility. Don't count one-off projects, committees for a single event, or the values/pillars list. Every circle must carry a `source` quote; drop any that doesn't.

**Step B — if circles were found, confirm them.** Show the list to the admin:

> "Your documents describe these circles: **[name — purpose]**, … Are these right? You can rename, merge, remove or add circles."

Save only what the admin confirms.

**Step C — if none were found (or the admin rejects the list), ask.** Ask exactly this, without guessing:

> "What are your community's circles? These are the standing groups that look after an area of community life, like land and food, building, finances, or care and wellbeing. For each one, give a **name** and a **one-line purpose**. If you already know who leads it, add their name. Most communities start with 3 to 7."
>
> "Not sure yet? You can start from a template and change it any time:
> - **Neighborhood org chart** (the default): Community Management · Venue Management · Space Maintenance · Kitchen Management · Marketing & Outreach · Sustainable Systems · Operations · Strategy, each with its roles (created as teams on the Circles page)
> - **Start small:** Land & Food · Building · Community & Care · Finance"

Keep asking until there's at least one circle. Don't continue setup on a default the admin didn't choose.

**Step D — save.**
- One row per circle in `circles`: slug (from the name), name, purpose, emoji, colour, sort order. Pick emoji and colours from the palette, and the admin can change them.
- One matching `org_units` circle row so it shows on the Circles page.
- Lead names go in a "to assign" note on the circle, not into permissions. An admin assigns real leads in Admin › Users once those people have accounts.
- Admins can add, rename or retire circles later on the Circles page. Retiring a circle hides it and keeps its old projects and events.

### 6.3 Engineering needed first

Circles are fixed in code and in the database today. That has to change before any community other than RTRN can have different circles:

- **New table `circles`:** slug, name, purpose, emoji, color, sort_order, archived_at. Readable by everyone, writable by admins.
- **The three check constraints** (`events_circle_check`, `booking_items_circle_check`, `org_units_circle_check`) become foreign keys to `circles(slug)`. `user_profiles.lead_circles` and `projects.circle` are validated against the table too.
- **`core/lib/pillars.ts`** (`PILLARS`, `PILLAR_META`, `isPillar`, used by about 20 files) is replaced by a list loaded from `circles` once per request and passed down.
- **The scan prompt** gains the `circles` field above. The Blueprint wizard gets a final **Circles** step that runs Steps B–D. ✅ Built 2026-11-03. A circle's purpose is stored as its org unit's description (the text the Circles page already shows), not in `circles`; lead names go in `circles.leads_to_assign`.
- **RTRN's migration** seeds its existing five circles with the same slugs, so nothing changes for RTRN. (Update 2026-11-03: RTRN then moved to the eight neighborhood org chart circles with their roles, `instance/seed/switch-to-neighborhood-circles.sql`; the five are retired.)

---

## 7. Order of work

The step-by-step plan, from carving the core out of today's RTRN code to standing up Protopia, is in [`CORE-EXTRACTION.md`](./CORE-EXTRACTION.md) §5.

---

## 8. Open decisions

- **Domain:** Protopia on a `*.workers.dev` URL or its own domain?
- **WhatsApp route:** official Business API (if groups work) vs a different chat setup.
- **VM provider and size** for each community's agent (e.g. Hetzner, DigitalOcean, a cloud free tier), and which account pays.
- **Harness:** which agent harness runs on the VMs, and whether both communities use the same one (recommended, so the shared `agent/` code plugs into one interface).
