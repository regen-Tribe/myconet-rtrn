# changes/: one note per change

A change to MyCoNet core **doesn't pick its own version**. It adds one file here, and the release gives it the
next free version when it ships. That way two people (or ten agent sessions) working at the same time never
edit the same lines or claim the same number.

## What a change does

Add `changes/<slug>.md` (any short name, e.g. `bigger-draft-pill.md`):

```md
---
bump: patch
title: A bigger Draft pill to slide
public: The Draft pill on a task the agent drafted is bigger, so it’s easier to grab and slide.
---
Sonia: "make slideable draft buttons slightly bigger". The Draft pill (`DraftSwipe`, M07) is 11px text
instead of 9px… No migration.
```

- `bump`: `patch` for a fix, `minor` for something new, `major` when communities must act.
- `title`: the release's title, in plain words.
- `public`: what people read in the app at `/changelog`. One line, or a list for several points:

  ```md
  public:
    - First thing people will notice.
    - Second thing.
  ```
- The text below the front matter goes into `CHANGELOG.md` as written: who asked, what changed, which files,
  whether there's a migration. No `## vX.Y.Z` heading; the release adds it.

**Don't edit** `web/src/core/lib/version.ts`, `CHANGELOG.md` or the `ENTRIES` list in
`web/src/app/changelog/page.tsx`. The release writes all three from the notes
(`web/scripts/release.mjs`), and CI stops a change that has a note and edits them too.

## What the release does

`cd web && npm run ship -- <core PR>` (maintainers; `web/scripts/ship.mjs`) waits its turn, merges the newest
core `main` into the PR, runs `npm run release`, checks, merges, tags and updates the community.
`npm run release -- --dry-run` shows the version and the text without changing anything.
Several notes waiting at once become one release: the biggest `bump` wins, and each note keeps its own lines.
