# MyCoNet lexicon

One word per idea, on every screen, in emails, in agent prompts and in the second brain. People
and agents read the community's knowledge outside the portal too, so the words have to hold up there.
If a word isn't here, use the plainest one a newcomer would understand.
Approved 2026-11-18 (Sonia). Change this file first, then the screens.

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
| M07 | **Operations** | `/operations` | Ops, Projects (as the module name) |
| M08 | **Achievements** | `/achievements` | Contributions (as the module name) |
| M09 | **Governance** | `/governance` | |
| M14 | **Calendar** | `/calendar` | Events (as the module name) |
| M15 | **Accommodation** | `/accommodation` | Stays, Places to stay |
| M16 | **Resources** | `/resources` | Bookings, Tools & spaces |
| M17 | **Circles** | `/circles` | org chart, Org |
| M18 | **Meetings** | `/meetings` | |

The old addresses (`/network`, `/ops`, `/contributions`, `/events`, `/stays`, `/bookings`, `/org`)
redirect permanently (`web/next.config.ts`), because notes and emails link to them. Code folders
(`m01-network`, `m07-ops`…) and table names keep their names.

## Work

| Say | Means | Not |
|---|---|---|
| **project** | A piece of work with a lead, on the Operations board | |
| **task** | One thing to do, in a project or straight on the board (`deliverables` table) | deliverable, subtask, to-do, action item* |
| **project idea** | A project someone suggested; it waits in Ideas. Button: "+ Suggest a project" | project proposal |
| **board** | The Operations board | Kanban |
| Columns | **Ideas → To do → In progress → Review → Done**, plus **Paused** on the main board for projects (status `backlog` shows as "To do") | Backlog |
| **lead** / **assigned to** | A project has a lead; a task is assigned to someone | owner |
| **sprint** | Only where a project has a sprint name set | |

\* "Action items" is only the meeting tool's own word, before they become tasks.

## Agreements and decisions

| Say | Means | Not |
|---|---|---|
| **agreement** | An offer to help on a project, with what you give and get: proposed → **accepted** / **declined** | collaboration proposal, support |
| **proposal** | Only in Governance: something put to a decision | |
| **decision** | A proposal that was approved; also its note in the second brain | |
| **Accept / Decline** | Answering any request | Reject, Rejected |

## Governance

Every proposal gets **4 checks** at once and is **Approved** when enough pass (the screen states the
real rule). Name each check **who · how**:
**Circle leads · consent**, **All members · majority vote**, **Admins & advisors · expert review**,
**AI · Blueprint check**. Statuses: **Approved** / **Not approved**. Say "checks", not "layers";
never "L1–L4", "CL", "live" or "threshold". "Sociocracy / Democracy / Meritocracy" only in a short
"How we decide" explanation.

## People and groups

| Say | Not |
|---|---|
| **member(s)**, **people** on screen; "user" only in admin | user |
| Roles: **explorer**, **joining member**, **member**, **project lead**, **circle lead**, **advisor**, **admin** | CL, Joining Member |
| **circle**: a standing group that looks after an area of community life | |
| **team**: a group inside a circle | unit, pod, guild, working group |
| **Community stewards**: the one circle that looks after every circle | |

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
manage view; **space** only for a physical space you book.

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
| Add something | **+ Add {thing}** (exceptions: "+ Suggest a project", "+ New proposal") |
| Save | **Save**, **Save & continue →**, **Save as draft**. "Done" is a status, never a button |
| Take away | **Remove** = out of a list; **Delete** = gone for good; **Archive** = hidden but kept |
| Back out | **Cancel** |
