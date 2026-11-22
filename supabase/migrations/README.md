# Migrations: numbers

Every community's database keeps **one list** of the migrations it has run (`supabase_migrations.schema_migrations`),
for core's and its own together. `supabase db push` runs a file only when its **number** isn't in that list yet. So if
a community migration takes a number core also uses, the database thinks core's has run and skips it, without a
word. This happened on Protopia on 2026-11-21: three core changes were hidden that way, and two columns were missing
until they were found.

## The rule

A number is `YYYYMMDDHHMMSS`. The hour digits (`HH`) say whose it is:

| Where | Hour | Example |
|---|---|---|
| core: `supabase/migrations/` (here) | `00`–`89` | `20261217000100_meeting_teams.sql` |
| one community: `instance/migrations/` | `90`–`99` | `20261217900100_protopia_dorm_names.sql` |

Core and a community can't meet, whatever order they're written or applied in, and any number of communities can each
use 90–99, because each has its own database.

## A new core migration

1. Take the newest file here and add `000100` (next on the same day), or start a new day with `000000`. Keep `HH` at
   `00`–`89`.
2. Write it so it can run again safely (`if not exists`, `create or replace`, `drop … if exists`): a community may
   have to apply it by hand.
3. Before merging, check it: `cd web && node scripts/migration-check.mjs`.

## A community's own migration

Put it in that community's `instance/migrations/` with `HH` `90`–`99`: the date, then `9`, then the rest, e.g.
`20261217900000_rtrn_seed_rooms.sql`. See `instance.example/migrations/README.md`.

## Applying them to a community

Every deploy (`npm run deploy`) checks the files first and stops on a clash. Before applying, check the database too:

```
cd web && npm run migrations:check      # the files, plus the linked database: clashes, and what isn't applied yet
supabase db push                       # then apply what it listed
```

Files numbered before 2026-12-17 keep their numbers. The clashes among them were found and fixed by hand on
2026-11-21, so the check lists them as notes, not errors.
