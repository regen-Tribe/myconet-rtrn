# M14 — Calendar

The community calendar (labelled "Calendar" in the UI; route `/events`, with `/calendar` redirecting). Three calendars side by side:

- **Core events** — official events, posted by full members, circle leads, project leads, advisors and admins
- **Community hosted** — events anyone joining or above can post
- **Tasks** — things the community needs done; same posting rule as core. RSVP reads "I'll help" / "Who's helping" (`KIND_META` holds the wording)

## What users see here

- **Month / Week / List views** with Today and prev/next navigation; List has Upcoming and Past
- **Circle filter** and color coding by circle (no circle = module teal)
- **Event pop-up** — when, where, online link, description, linked project/proposal, RSVP (Going / Maybe) and who's coming, edit/delete for those allowed
- **Event form** — title, calendar (core is locked with an explanation for joining members), start/end or all-day, location, online link, description, circle, Ops project, Governance proposal, public toggle
- Logged-out visitors see public events only, and no RSVP names

## Routes

| Route | File |
|-------|------|
| `/events` | `app/events/page.tsx` → `EventsClient` |

Query params: `show=daily,core,community,task` (the ticked kinds, any mix; default all; `tab=<kind>` still works), `view=month|week|list`, `event=<id>` (opens the pop-up), `new=1&project=<id>&proposal=<id>&circle=<pillar>` (opens a pre-filled form).

## Files

| File | Purpose |
|------|---------|
| `EventsClient.tsx` | Page: kind and category checkboxes, toolbar, view switching, save/RSVP/delete |
| `CalendarViews.tsx` | `MonthView`, `WeekView`, `ListView`, `eventColor()` |
| `EventDetailModal.tsx` | Event pop-up + shared `ModalShell` |
| `EventFormModal.tsx` | Create/edit form |
| `LinkedEventsList.tsx` | Upcoming events for another module's page (used on `/ops/[id]`) |
| `lib/calendar.ts` | Local-time date math and formatting — call after mount only |
| `lib/permissions.ts` | `canCreateKind`, `canEditEvent` — mirror the RLS policies |
| `lib/queries.ts` | `EVENT_SELECT`, `RSVP_SELECT`, `FEED_SELECT`, row normalizers |
| `CalendarFeedsModal.tsx` | Admins: link, sync and remove outside calendars (🔗 Linked calendars) |
| `lib/feeds.ts` | `parseFeed()`: iCal → occurrences (repeats expanded, time zones, one-off changes, cancellations), `matchCircle()`. Server only (uses `ical.js`) |
| `lib/feed-url.ts` | Browser-safe: `normalizeFeedUrl()` (Google share/embed link → iCal address), `FEED_DAYS_AHEAD` |
| `lib/feed-sync.ts` | `syncCalendarFeeds()`: claims due feeds, fetches, parses, applies. Called after `/events` renders and by `/api/calendar/sync` |

## Database tables

Migrations: `supabase/migrations/20261101_m14_events.sql`, `20261102_m14_event_tasks.sql` (repo root).

| Table | Access |
|-------|--------|
| `events` | Read: public events for everyone, all events for joining+. Insert: community = joining+, core and task = full member+. Update/delete: host, admin, or circle lead of the event's circle |
| `calendar_feeds` | Linked calendars (`url` may be a secret link; `rules` sort events by title into a kind and category). Admins only |
| `event_rsvps` | One row per (event, user), status `going`/`maybe`. Signed-in users read; each user writes only their own |

Feed events have `feed_id` + `external_uid` (unique together; the UID plus the occurrence's original
start for repeats), so a sync updates rather than duplicates and RSVPs survive. Writes go through
`calendar_feeds_claim()` / `calendar_feed_apply()` (security definer), allowed for an admin or a caller
with `CALENDAR_SYNC_SECRET` (hash in `private.calendar_sync_key`, set with `supabase/setup/calendar-sync-key.sql`).

Policies use `private.my_role()` / `private.my_lead_circles()` (security definer, not exposed over the API).

## Gotchas

- Dates render in the viewer's time zone, so the calendar waits for mount; the server renders in UTC.
- The page loads events from the last 365 days onward. Older events need a fetch on navigation if that ever matters.
- Kinds: `daily` (rhythm: meals, movement, focus), `core`, `community`, `task`. `category` is free text within a kind; `categoryColor()` gives known ones fixed colours.
- Linked calendars: the next 90 days are kept in sync; past occurrences stay. Sync runs after someone
  opens `/events` and the last sync is over an hour old (no cron), or on "Sync now". All-day dates are
  stored at noon UTC so they land on the same day everywhere. Feed events can't be edited here (the
  next sync would undo it): change them in the source calendar.
- Not yet: recurring events made in MyCoNet itself, .ics export, an events section on the proposal cards in M09.
