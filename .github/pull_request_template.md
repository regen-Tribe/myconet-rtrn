## What and why

## Second brain (design goal, see CLAUDE.md)
- **Knowledge this creates or changes:**
- **Where it lands in the second brain** (folder, front matter, visibility), or why not yet and the follow-up:
- **How it stays current** (updated in place, no duplicates):

## Checks
- [ ] `cd web && npm run lint && npx tsc --noEmit`
- [ ] Migration in `supabase/migrations/` (if the database changes)
- [ ] New secrets named here (names only)
- [ ] A note in `changes/<slug>.md` for a core change (no edits to `version.ts`, `CHANGELOG.md` or the `/changelog` entries: the release writes them)
- [ ] Work logs updated (a new file in `instance/log/` for a community change, and the team's work log) — see CLAUDE.md
