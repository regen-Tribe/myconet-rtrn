# M15 — Accommodation (and the shared booking engine)

This folder runs two modules from one codebase:

- **M15 Accommodation** — `/accommodation`, accommodation only
- **M16 Resources** — `/resources`, tools and spaces — see `../m16-resources/README.md`

`BookingsClient` takes a `scope` (`stays` | `resources` | `amenities`, all categories on one page, used by the v4 menu since v4.42.0); `SCOPE_META` in `lib/inventory.ts` sets each page's number, label, route, accent (`--bk-accent`) and categories. The loader is `BookingsPage.tsx` (`renderBookings`).

- **Admins and circle leads** add items to the inventory, tag them, and approve requests
- **Joining members and above** book items
- **Everyone** (even logged out) can browse what's in the inventory

## What users see here

- **Browse** — category chips (🏡 Accommodation, 🔧 Tools, 🏛 Spaces), tag chips from the items in view, search; cards show "Free now" / "In use until …" for members
- **Item pop-up** — details, booked times (with who), and the booking form. Accommodation books by night (check-in/check-out dates); tools and spaces by time. Overlaps are caught in the form and again by the database.
- **My bookings** — upcoming (with Cancel) and past/cancelled
- **Manage** (admins + circle leads) — pending requests with Approve/Decline, the inventory they can manage with Edit/Archive/Restore, "+ Add item"

## Routes

| Route | File |
|-------|------|
| `/accommodation` | `app/accommodation/page.tsx` → `renderBookings('stays')` |
| `/resources` | `app/resources/page.tsx` → `renderBookings('resources')`; `?category=accommodation` redirects to `/accommodation` |
| `/amenities` | `app/amenities/page.tsx` → `renderBookings('amenities')`: Amenities & tools. With the v4 look, `/accommodation` and `/resources` redirect here |
| `/admin/bookings` | `app/admin/bookings/page.tsx` → `renderBookings('amenities', …, { admin: true })`: only the requests and the inventory, for admins and circle leads |

Query params: `tab=browse|mine|manage`, `category=accommodation|tools|spaces`, `item=<id>` (opens the pop-up).

## Files

| File | Purpose |
|------|---------|
| `BookingsClient.tsx` | Page: tabs, filters, book / cancel / approve, item save and archive |
| `AmenitiesMap.tsx` | The Amenities map (v4.43.0): the picture of the land (`community_settings.site_map_url`) with a pin per item (`map_x`, `map_y`, percent); `placing` turns a click into a pin (Admin › Bookings › Map). Since v4.70.0 a thin wrapper over the shared `core/components/v4/SiteMap.tsx`, which the Map page (M19) uses too. Since v4.75.0 members browse a list (each item shows the photo of the place its pin sits in) and the one map is `/map`. Since v4.76.0 an item can have its own photo (`photo_url`, admins set it in the edit form), shown before the place's |
| `BookingsV4.tsx` | The v4 look's view of the same page (BookingsClient passes its state and actions as `vm`); Admin › Bookings adds the Calendar (who stays where, two weeks) |
| `ItemModal.tsx` | Item details, schedule, booking form, manager actions (with v4, its own view in the shared building blocks) |
| `ItemFormModal.tsx` | Add/edit item: category, tags, circle, capacity, approval toggle (with v4, its own view) |
| `lib/inventory.ts` | Categories, status labels, permission helpers, formatting, error messages |
| `lib/queries.ts` | `ITEM_SELECT`, `BOOKING_SELECT`, row normalizers |

## Database tables

Migration: `supabase/migrations/20261101_m15_bookings.sql` (repo root).

| Table | Access |
|-------|--------|
| `booking_items` | Read: active items for everyone, archived for admins/circle leads. Insert: admin, or circle lead with no circle / a circle they lead. Update/delete: `private.can_manage_item()` — admin, or circle lead when the item has no circle, is in their circles, or they added it |
| `bookings` | Read: own bookings, or everything for joining+. Insert: joining+ for themselves. Update: booker (cancel only) or item manager |

- `bookings_no_overlap` — exclusion constraint (btree_gist): pending/confirmed bookings of one item can't overlap. Error code `23P01`.
- `bookings_guard` trigger — sets status on insert from `requires_approval` (pending vs confirmed; the client's value is ignored), blocks bookings of archived items, lets non-managers only cancel, stamps `decided_by` on approve/decline.

## Gotchas

- One row = one bookable thing. Five identical bikes are five items (tag them `bike`).
- Accommodation ranges are local midnight → midnight with `[)` bounds, so back-to-back stays don't clash.
- No notifications yet: leads see pending requests in the Manage tab and the badge count.
