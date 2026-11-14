---
name: verify
description: >-
  Checks a MyCoNet change before it is opened as a pull request. Runs the app
  lint and type check, confirms generated skill copies match skills-src, and
  requires database policy changes to be proven on a local database, and for
  a visible change captures the local app and adds those screenshots to the
  pull request description. Use when asked to verify, before opening a pull
  request, or after editing migrations, row-level security, grants,
  security-definer functions, or skills.
---

# Verify a MyCoNet change

Run these from the repository root. Stop at the first failure and fix that failure
before continuing. Report each command's result. Do not claim a check passed when
it was not run.

## App

```sh
cd web && npm run lint && npx tsc --noEmit
```

## Skills

Skills are authored only in `skills-src/`. The copies under `.agents/skills`,
`.claude/skills`, and `.cursor/skills` are generated.

```sh
node scripts/sync-skills.mjs --check
```

When the check fails, edit `skills-src/`, run `node scripts/sync-skills.mjs`, and
check again. Do not hand-edit a generated copy.

## Database boundaries

The screen is not the security boundary. A change to a policy, a grant, or a
security-definer function is unfinished until a local Postgres shows two things:
the new denial holds, and an allowed action still succeeds.

- The database URL must be `localhost` or `127.0.0.1`. Refuse any other host,
  including the community's live Supabase project.
- Seed only fake accounts, and delete them when the check finishes.
- Assert on counts and error codes. Do not print profile rows, bios, growth
  notes, emails, or keys.
- This repo does not yet have a local boundary harness. Until one exists, say
  in the pull request that the boundary check was not run. Do not query
  production and call that a pass.

## Screenshots

When the change is visible on a screen, capture that screen from the local app
and put the images in the pull request description.

```sh
cd web && npm run dev
```

Open `http://localhost:3000` and the route that changed. Do not capture the
live community site.

Take one image for each state the change affects. For a decision button, that
is the screen with the button and the screen without it.

Add the images to the pull request description. Do not claim an image that was
not captured. Do not include a member's name, application, bio, or photo. If
the local app is pointed at the live database and the screen shows any of
those, leave the image out and say which capture is missing. If the app is
signed out and the changed screen is behind login, say that too.
