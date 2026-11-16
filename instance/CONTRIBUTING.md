# Contributing to the RTRN portal

This repo is RTRN's copy of **MyCoNet**. Almost all of the code is MyCoNet core
([`regen-Tribe/myconet`](https://github.com/regen-Tribe/myconet)); only the `instance/`
folder is RTRN's own. Keeping it that way lets RTRN take every core update cleanly.

## Who pushes where

- **Maintainers: Oz (`brucester`) and Sonia (`wensonia`)** push checked changes straight to `master`
  (`cd web && npm run lint && npx tsc --noEmit` first). Merging doesn't deploy; deploys are done by hand.
- **Everyone else:** work on a branch and open a pull request (below); a maintainer reviews and merges.

## Before you start

Pull, then read what changed since you last worked here: `git log --since=<date> --stat`, the latest
core releases (`git fetch upstream --tags && git log upstream/main -10`), and the top of
`instance/log.md` and `instance/LOCAL-CHANGES.md`. Flag anything surprising to Oz or Sonia.

## Setup (once)

```sh
gh auth login                      # or set up git with your GitHub account
gh repo clone regen-Tribe/myconet-rtrn
cd myconet-rtrn/web
npm install
npm run instance                   # writes wrangler.jsonc and .env.production.local from instance/config.jsonc
cp .env.production.local .env.local
# in .env.local set NEXT_PUBLIC_APP_URL=http://localhost:3000
npm run dev                        # http://localhost:3000
```

Local dev talks to **RTRN's live database**: anything you create or delete while
testing is real. Use a test account, and clean up after yourself.

## Making a change

```sh
git checkout master && git pull
git checkout -b your-name/short-description
# ...edit, test with npm run dev, then:
cd web && npm run lint && npx tsc --noEmit
git add -A && git commit -m "What changed and why"
git push -u origin your-name/short-description
gh pr create --fill                # or open the PR on github.com
```

In the PR, say what you changed, how you tested it, and include a screenshot for anything visible.

## Where should the change go? Ask first: core too, or only RTRN?

| The change is... | Put it in |
|---|---|
| For every community: a feature, a fix, design | **MyCoNet core.** Build it on a branch here, then `cd web && npm run upstream` (opens a PR on `regen-Tribe/myconet`). It comes back to RTRN with the next core release. |
| RTRN only: name, URL, settings, theme, seed, extra tables, notes | `instance/` in this repo, **and log it in `instance/LOCAL-CHANGES.md`** (date, who, what, why, files) |
| RTRN only, but it needs core code | Say so first. Prefer core behind a config switch that's off for other communities. A local edit to a core file is a **core exception**: only with Oz's or Sonia's OK, logged in `instance/LOCAL-CHANGES.md`, and the **Core drift check** fails until it's moved into core or undone. |

Database changes for every community are core: new files in `supabase/migrations/`, never edits to old ones.
RTRN-only tables go in `instance/migrations/`.

## Never commit

- API keys, tokens, passwords, or `.env*` files (they're git-ignored, keep it that way)
- Real members' personal data, even in tests or screenshots
- Secrets live in Bitwarden, Cloudflare and Supabase; ask Oz if you need access to something.
