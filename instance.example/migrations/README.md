# This community's own migrations

Tables, columns or data that only this community needs. Shared tables go in core (`supabase/migrations/`) through a
core pull request.

**Number them with the hour `90`–`99`**: the date, then `9`, then the rest, e.g. `20261217900000_<community>_rooms.sql`
(and `…900100`, `…900200` for the next ones that day). Core uses `00`–`89`. Both share one list in the database, so a
community migration with a core number makes `supabase db push` skip core's without a word. The full reason is in
`supabase/migrations/README.md`.

Before applying: `cd web && npm run migrations:check`. Every deploy also checks the files and stops on a clash.
