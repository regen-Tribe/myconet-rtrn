# AGENTS.md

Instructions for AI coding agents (Codex, Cursor, Claude Code, Copilot and others).
The full project context is in [`CLAUDE.md`](./CLAUDE.md); read it first.

## Rules

- **Never commit or push to `main` or `master`.** Create a branch (`<person>/<short-description>`),
  commit there, push it, and open a pull request for review (`gh pr create --fill`). Then stop.
- **Don't merge pull requests, deploy (`npm run deploy`), or apply migrations to a live
  database** unless the person you're working for explicitly asks you to in this session.
- **In a community repo, only `instance/` is that community's.** Other files are MyCoNet core:
  put core changes on a branch and send them with `cd web && npm run upstream`. The Core drift
  check fails a PR that edits core files. Read `instance/CONTRIBUTING.md` if it exists.
- **Local dev uses the community's live database**: use test accounts and clean up test data.
- Never commit secrets (keys, tokens, passwords, `.env*` files) or real members' personal data.

## Checks before opening a PR

The `verify` skill in `skills-src/verify` is this checklist. Skills are authored in
`skills-src/` and copied into `.agents/skills`, `.claude/skills`, and `.cursor/skills`
by the sync script. Edit the source, then sync.

```sh
cd web && npm run lint && npx tsc --noEmit
node scripts/sync-skills.mjs --check
```
