# M18 — Meetings (optional)

Built by Sonia for Protopia (Nov 16). Meeting recordings are transcribed and summarised by
[Fireflies.ai](https://fireflies.ai); the notes (summary, action items by person, transcript) show at
`/meetings`. **Off unless the community turns it on** in `instance/config.jsonc`: `"modules": ["meetings"]`.

## Two ways in

1. **Upload** (`/meetings/upload`, joining members and above): the browser puts the audio in the private
   `meeting-audio` bucket under the person's id → `/api/meetings/upload` records the meeting
   (`status: processing`) and sends Fireflies a 2-hour signed link → Fireflies calls
   `/api/fireflies-webhook?key=FIREFLIES_WEBHOOK_SECRET` when done → the row gets the summary,
   action items and transcript (`status: done`, or `error`).
2. **Recorded in Fireflies directly**: Fireflies' webhook calls
   `/api/fireflies-ingest?key=PROTOPIA_INGEST_SECRET` → a new row with `source: fireflies_direct`,
   `needs_review: true` (skipped if that Fireflies id is already in).

## Secrets (Cloudflare, `npx wrangler secret put …`)

`FIREFLIES_API_KEY`, `FIREFLIES_WEBHOOK_SECRET`, `PROTOPIA_INGEST_SECRET` (the ingest key; the name is
historical), `SUPABASE_SERVICE_ROLE_KEY` (the webhooks write with it: `core/lib/supabase/service.ts`).

## Files

| File | Purpose |
|------|---------|
| `MeetingsList.tsx`, `MeetingDetail.tsx`, `UploadForm.tsx` | The three pages' UI |
| `lib/fireflies.ts` | Fireflies GraphQL: `uploadAudio`, `fetchTranscript`, transcript text, action-item parsing |
| `lib/access.ts` | Pages: module on + joining or above |
| `app/meetings/**`, `app/api/meetings/upload`, `app/api/fireflies-webhook`, `app/api/fireflies-ingest` | Routes |

## Database

Migration `supabase/migrations/20261121000000_meetings.sql`: `meeting_transcripts` (read: joining members
and above; writes through the server routes) and the private `meeting-audio` bucket (each person's own folder).
