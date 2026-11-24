# instance/log/: this community's log, one file per entry

Every deploy, core update, migration applied, new secret (the name only) or decision gets **its own file** here:

    instance/log/<YYYY-MM-DD>-<slug>.md      e.g. 2026-11-21-core-v4-82-0.md

```md
# 2026-11-21 — Core v4.82.0 via update PR #143 (deployed, 1a2b3c4d): a calmer page colour
- No migration. Anything the next person should know: what was applied, what's still open and who it waits on.
```

The first line is the heading: the date, what happened, and for a deploy the version or deploy id.
`npm run start-work` shows the five newest, and `npm run ship` writes the entry for a release it deploys.

Why one file per entry: two people adding to the top of the same file at the same time conflict on every merge;
two new files never do. Don't append to `instance/log.md`: where a community has one, it's the archive of the
entries written before this folder.
