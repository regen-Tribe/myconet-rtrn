# MyCoNet lexicon

One word per idea, on every screen, in emails, in agent prompts and in the second brain. People
and agents read the community's knowledge outside the portal too, so the words have to hold up there.
If a word isn't here, use the plainest one a newcomer would understand.
Approved 2026-11-18 (Sonia). Change this file first, then the screens.
Changed 2026-11-20 (Sonia): **teams are subcircles**, and **projects are parked**: work is **tasks** with **subtasks**.

**Writing rules:** sentence case for buttons, headings and labels ("Create account", not "Create
Account"). Module names keep their capital ("Open Operations →"). Role names are lowercase inside a
sentence ("ask a circle lead").

## Modules: name = menu label = address

| Module | Say | Address | Not |
|---|---|---|---|
| M00 | **Dashboard** | `/dashboard` | |
| M01 | **Members** | `/members` (profiles: `/u/{username}`) | Network, Community Network |
| M04 | **Blueprint** | `/blueprint` | community plan (as a name) |
| M05 | **Join** | `/join` | |
| M06 | **Agreements** | `/agreements` | Collaborations |
| M07 | **Operations** | `/operations` | Ops, Projects |
| M08 | **Achievements** | `/achievements` | Contributions (as the module name) |
| M09 | **Governance** | `/governance` | |
| M14 | **Calendar** | `/calendar` | Events (as the module name) |
| M15 | **Accommodation** | `/accommodation` | Stays, Places to stay |
| M16 | **Resources** | `/resources` | Bookings, Tools & spaces |
| M17 | **Circles** | `/circles` | org chart, Org |
| M18 | **Meetings** | `/meetings` | |
| M19 | **Map** | `/map` ("Map of {community}") | site plan, property map |

The old addresses (`/network`, `/ops`, `/contributions`, `/events`, `/stays`, `/bookings`, `/org`)
redirect permanently (`web/next.config.ts`), because notes and emails link to them. Code folders
(`m01-network`, `m07-ops`…) and table names keep their names.

### With the v4 look: the menu (Sonia, 2026-11-19)

Communities with `"design": "v4"` use the menu from `design/redesign-prototype` (`core/lib/nav.ts › menuGroups`).
Its groups are **You**, **Community**, **Working together** and **Admin**. On top: **Your next step**.
Where its names differ from the table above, these win, and each has its own address:

| Say | Address | Instead of |
|---|---|---|
| **Dashboard** (with the design review; "My dashboard" without it) | `/dashboard` | My dashboard |
| **About {community}** | `/about` | Blueprint as the page's name. "The Blueprint" is the document it's built from ("Edit Blueprint") |
| **Amenities & tools** | `/amenities` | Accommodation and Resources (one page now), Our place |
| **The space** | menu item (`/amenities`, `/map`) | the one menu item for Amenities & tools and the Map (v4.102.0); each page keeps its own name. Under the design review both pages are headed **The space**, with the views **Places · Map · My bookings** (decision #23). There is no Manage view (decision #43): whoever can manage a thing has an **Edit** button on its photo, and the requests and the inventory are in Admin › **Bookings** |
| **Applications** | `/admin/applications` | join applications in the menu, Join › admin review |
| **Bookings** | `/admin/bookings` | Manage (the booking requests and the inventory) |
| **Permissions** | `/admin/permissions` | Users (admin) |

With v4, the old addresses (`/blueprint`, `/accommodation`, `/resources`, `/admin/users`) redirect permanently to
these. Without v4 they stay as they are. Achievements leaves the menu (under your name, until badges show on
profiles). My tasks isn't a menu item: your open tasks are counted beside My dashboard.

## Work

| Say | Means | Not |
|---|---|---|
| **task** | A piece of work on the Operations board, with a lead; it can have subtasks | project, deliverable, to-do, action item* |
| **subtask** | One step inside a task, assigned to someone | sub-task, deliverable |
| **task idea** | A task someone suggested; it waits in Ideas. Button: "+ Suggest a task" | project idea, project proposal |
| **board** | The Operations board | Kanban |
| Columns | **Ideas → To do → In progress → Review → Done**, plus **Paused** on the main board for tasks with subtasks (status `backlog` shows as "To do") | Backlog |
| **lead** / **assigned to** | A task has a lead; a subtask is assigned to someone | owner |
| **sprint** | Only where a task has a sprint name set | |
| **draft** | A task the assistant suggested from a meeting, waiting for a circle lead or admin to confirm or decline it. The list is **Drafts to confirm** | to decide, pending task |
| **watch** | Follow a task or subtask: its changes reach you. Button **Watch** / **Watching**; "3 watching" | subscribe, subscriber, follow |

**How it maps to the data (for code and agents):** the `projects` table holds tasks (the ones that can have
subtasks); `deliverables` holds their subtasks, and a deliverable with no project is a task of its own on the
board. Table and column names stay as they are; only the words change.

\* "Action items" is only the meeting tool's own word, before they become tasks.

## Agreements and decisions

| Say | Means | Not |
|---|---|---|
| **agreement** | An offer to help on a task, with what you give and get: proposed → **accepted** / **declined** | collaboration proposal, support |
| **proposal** | Only in Governance: something put to a decision | |
| **decision** | A proposal that was approved; also its note in the second brain | |
| **Accept / Decline** | Answering any request | Reject, Rejected |

## Governance

Every proposal gets **4 checks** at once and is **Approved** when 2 of the 3 people checks pass; the
AI · Blueprint check is advice and doesn't count (decided by Sonia, 2026-11-19). Name each check **who · how**:
**Circle leads · consent**, **All members · majority vote**, **Admins & advisors · expert review**,
**AI · Blueprint check**. Statuses: **Approved** / **Not approved**. Say "checks", not "layers";
never "L1–L4", "CL", "live" or "threshold". "Sociocracy / Democracy / Meritocracy" only in a short
"How we decide" explanation.

## People and groups

| Say | Not |
|---|---|
| **member(s)**, **people** on screen; "user" only in admin | user |
| Roles: **explorer**, **joining member**, **member**, **task lead**, **circle lead**, **advisor**, **admin** | CL, Joining Member, project lead |
| **circle**: a standing group that looks after an area of community life | |
| **subcircle**: a smaller, lasting group inside a circle, with its own members and lead | team, unit, pod, guild, working group |
| **Community stewards**: the one circle that looks after every circle | |

## Joining

The way in, the same words on Join, the menu's next step and My dashboard (design review, 2026-11-22).

| Say | Means | Not |
|---|---|---|
| **visitor** | Someone looking around who isn't signed in | guest |
| **Start joining** | The button, and the Join page's heading | Join application, M05 |
| **Get to know us · About you · Apply** | The three join steps (decisions #80, #81): read About and sign its values at the end of the values chapter; a short form in Start joining (a photo, a line about you, what you'd like to offer, what brings you); send your application. As titles: "Get to know us", "Tell us about you", "Send your application" | Values · Profile · Application (until 23 Nov), buddy matching (dropped) |
| **steward** | An admin who welcomes new people and reviews join applications (Sonia, 2026-11-22). Same family as **Community stewards**. Lowercase on screens: "A steward reads your application". Which admins are stewards is the community's, never named in core | the community team, the team, reviewer |
| **Send application** / **Your application is in** | Sending it, and the state while it's read | Submit application, Under review |

## Members module

**Offers** (what I can give) and **Requests** (what I'm looking for): "+ Add offer", "+ Add request".
Not "Seeks", not "Needs". A booking that needs approval is a **booking request**.

## Recognition

| Say | Means | Not |
|---|---|---|
| **badge** | Something you earn, shown on Achievements | award |
| **points** | Logged in `points_log`; shown only where the community turns on the `points` switch | |
| — | Reputation isn't stored or shown | reputation |
| **contribute** | A plain verb ("what you'll contribute") | Contributions (as a module) |

## Places and things

**book / booking**; **booking request** when it needs approval; **item** for a bookable thing in the
manage view; **space** only for a physical space you book. **place** for anything with a pin on the Map
(a house, a garden, the spring); its kinds on screen: Accommodation, Shared spaces, Amenities, Food & gardens,
Water, Forest & trails, Gathering spots.

On screen a bookable thing's kind is **Accommodation**, **Tools** or **Spaces**. Its tags are stored as slugs and
always shown in plain words (`web/src/modules/m15-bookings/lib/tag-labels.ts`, the only place that maps them):
`dorm-1` → **Dorm 1**, `dorm-2` → **Dorm 2**, `dorm-bed` → **Dorm bed**, `main-space` → **Main space**,
`private-room` → **Private room**, `female` → **Women only**, `male` → **Men only**; any other tag is sentence-cased
(`outdoor` → **Outdoor**). Never show the slug.

## Knowledge and the assistant

| Say | Means | Not |
|---|---|---|
| **second brain** | The community's notes repo, readable by any agent tool | knowledge base |
| **circle folder** | A circle's folder in the second brain | circle space |
| **Documents** | Files uploaded to the portal | library |
| **meeting notes**, **summary**, **transcript** | What a meeting leaves behind | |
| **the assistant** | The helper on screen; its features are **Ask** and **Do** | the agent (on screen; "agent" is fine in code and docs) |

## Buttons

| Action | Say |
|---|---|
| Become part of the community | **Start joining →** (to `/join`) |
| Make an account | **Create account**, with **Sign in** beside it |
| Go back | **← {Page}** |
| Go to a page | **Open {Page} →** |
| See a whole list | **See all {things} →** |
| Add something | **+ Add {thing}** (exceptions: "+ Suggest a task", "+ New proposal") |
| Save | **Save**, **Save & continue →**, **Save as draft**. "Done" is a status, never a button |
| Take away | **Remove** = out of a list; **Delete** = gone for good; **Archive** = hidden but kept |
| Back out | **Cancel** |

## For later

Words parked until the community needs the extra layer (Sonia, 2026-11-20: "for more complexity").

| Word | Why it's parked | Until then |
|---|---|---|
| **project** | A bundle of tasks with its own page, lead and team was more structure than the community uses | a **task** with **subtasks** |
| **Agreements** (the module) | No agreements yet; parked from the menu in the design review (Sonia, 2026-11-22). The word **agreement** keeps its meaning | /agreements still works by its address |

