# instance.example

The starting point for a new MyCoNet community. Copy this folder to `instance/`
(in that community's repo) and fill in `config.jsonc`.

What lives in `instance/`, and only there: this community's settings, theme, seed
content, extra migrations and history. Everything else is MyCoNet core: don't edit
it in a community repo; make the change in core and pull the release.
See `INSTANCES.md` and `CORE-EXTRACTION.md` at the repo root.

The build reads `instance/config.jsonc` (or the folder in `MYCONET_INSTANCE_DIR`)
via `web/scripts/instance.mjs`, which writes `web/wrangler.jsonc` and
`web/.env.production.local`. Both are generated: don't edit them.

## Setting up a new community

Everything a new community needs, in order. Each community has its own Supabase
project and Cloudflare account; nothing is shared with other communities.

**1. Accounts and tokens** (the community's own; keep tokens in the password manager)
- Cloudflare: the account ID, and an API token from the "Edit Cloudflare Workers" template.
- Supabase: a new project (note the project ref, URL and anon key) and an access token.
- An AI key for the Blueprint scan (`MINIMAX_API_KEY`).

**2. Repo**
- Create the community repo from a core release, add core as the `upstream` remote.
- Copy `instance.example/` to `instance/` and fill in `config.jsonc`.

**3. Database** (empty Supabase project)
- Run every file in `supabase/migrations/` in order (`supabase db push`, or each file
  through the SQL editor). Only `supabase/migrations/`; nothing else.
- Supabase › Authentication › URL Configuration: Site URL = `appUrl`, and add
  `<appUrl>/**` to the redirect URLs.

**4. Deploy**
- `cd web && npm ci`
- `CLOUDFLARE_API_TOKEN=… npx wrangler secret put MINIMAX_API_KEY`
- `CLOUDFLARE_API_TOKEN=… npm run deploy`
- Check `/`, `/auth/login` and signup load, and that a signup gets the confirmation email.

**5. First admin**
- The first admin signs up on the portal, then run `supabase/setup/first-admin.sql`
  with their email.

**6. GitHub** (the community repo)
- Settings › Actions › General › Workflow permissions: **Read and write**, and tick **Allow GitHub
  Actions to create and approve pull requests**. Then `core-update.yml` opens a pull request whenever core
  releases, and `core-drift.yml` checks that only `instance/` differs from core.
- While the core repo is private, add a `CORE_REPO_TOKEN` Actions secret: a fine-grained token with
  read access to `regen-Tribe/myconet`. Not needed once core is public.
- After merging a core update: `supabase db push` if it has migrations, then deploy.

**7. Setup in the portal** (`INSTANCES.md` §6), as that admin
- Blueprint: upload the community's documents (✨ Import from document), review the answers.
- Blueprint › Look & feel: upload the logo and banner image.
- Blueprint › Step 1.4: join questions and community values.
- Blueprint › Circles: confirm the circles the scan found, or start from a template.
  Setup isn't finished without at least one circle.
- Join questions, then invite the first members; assign circle leads in Admin › Users.
