-- Calendar sync key (core v4.11.0). Lets the portal's server refresh linked calendars
-- (Calendar › 🔗 Linked calendars) about hourly without an admin present. Run once per
-- community, with the sha256 of the Worker's CALENDAR_SYNC_SECRET (only the hash is stored):
--
--   SECRET=$(openssl rand -hex 32)
--   printf %s "$SECRET" | CLOUDFLARE_API_TOKEN=… npx wrangler secret put CALENDAR_SYNC_SECRET   (in web/)
--   printf %s "$SECRET" | shasum -a 256          → paste the hash below
--
-- Without it, linked calendars still sync when an admin presses "Sync now".
insert into private.calendar_sync_key (hash) values ('<sha256 hex of CALENDAR_SYNC_SECRET>')
on conflict (id) do update set hash = excluded.hash;
