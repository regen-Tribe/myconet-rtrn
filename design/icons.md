# Icons: what each one means, and where it's used

The icon review of 22 Nov 2026 (instance/design/ux-review-2026-11-22.html › Principles 5–6; DESIGN-SYSTEM.md › v4: one
hand-drawn marker-line set, in ink, never coloured, never an emoji). Built from the code with the TypeScript
checker: every string typed as an icon name, the menu (`core/lib/nav.ts`) and the old lucide names
(`lucide-compat.tsx`). The same meanings show on `/design` (from `core/components/v4/icon-meanings.ts`; change
both together).

**Verdicts.** *keep*: one icon, one meaning. *keep, move a use*: the drawing is right, but a screen also uses
it for something else; the note says what to use there. *rename*: the name says something the drawing doesn't.
*unused*: in the set, used nowhere. Nothing needs redrawing; nine meanings have no icon yet (at the end).

Changes marked **Done here** are in this branch and only show with `"designReview": true` (Protopia).

## The set · 84 icons

| Icon | Means | Uses | Where | Verdict | Note |
|---|---|---:|---|---|---|
| `menu` | Open the menu | 5 | shell/AppTopBar, shell/TabBarV4, m04-blueprint/BlueprintClient, home/HomeV4, m01-network/MemberList | keep, move a use | Also used for the List view on Members (MemberList) and the Blueprint's phone nav tab. List view needs its own `list` icon. **Done here:** Members' List button now `list`. |
| `bell` | Notifications | 0 | — | keep | Not used: the top bar draws its own bell as inline SVG (AppTopBar, off-limits here). Move the top bar onto `bell`. |
| `down` | Open a dropdown / show more | 5 | ui/select×2, m04-blueprint/AboutV4, v4/CircleFilter, m17-org/CirclesV4 | keep |  |
| `right` | Go forward: the next step | 26 | m00-dashboard/DashboardV4×5, home/HomeV4×5, m17-org/CirclesV4×4, shell/MenuV4×2, app/profile/edit/page×2, admin/UsersAdminClient, PhotoStrip, m14-events/EventsClient, m18-meetings/MeetingsList, m18-meetings/MeetingDetail, m01-network/MembersV4, m07-ops/ProjectDetailClient, app/u/[username]/UserProfileClient | keep, move a use | Also the trailing arrow on list rows (Circles, My dashboard › Your circles, Meetings, Members, profiles) and breadcrumb separators. MenuV4 says arrows mean "go somewhere" only on the next-step card; rows are already links. |
| `left` | Back | 11 | app/profile/edit/page×2, m15-bookings/BookingsV4, PhotoStrip, m14-events/EventsClient, app/circles/guide/page, m09-governance/GovernanceClient, m05-join/JoinClient, m18-meetings/MeetingDetail, m07-ops/ProjectDetailClient, app/u/[username]/UserProfileClient | keep |  |
| `home` | My dashboard (menu) | 10 | menu (My dashboard), m04-blueprint/AboutV4×3, m04-blueprint/BlueprintClient×2, home/HomeClient×2, home/lib/at-a-glance, m08-contributions/ContributionsPage | keep, move a use | Also houses: Homes planned, Land & homes, Living here. Houses should use `building` (or a new house drawing); the menu keeps `home`. |
| `tasks` | Tasks (a count, your tasks) | 5 | m17-org/CirclesV4×2, m04-blueprint/BlueprintClient, m00-dashboard/YourTasks, app/design/page | keep |  |
| `board` | Operations (menu), a task's board | 8 | menu (Operations), m14-events/CalendarViews×2, app/auth/login/page, m14-events/EventDetailModal, m00-dashboard/DashboardV4, app/design/page, home/HomeClient | keep |  |
| `calendar` | Calendar, a date | 11 | menu (Calendar), m07-ops/ProjectDetailClient×2, m04-blueprint/AboutV4, m15-bookings/BookingsV4, m14-events/EventDetailModal, m17-org/CirclesV4, m00-dashboard/DashboardV4, app/design/page, home/HomeClient, m18-meetings/MeetingDetail | keep |  |
| `grid` | (unclear) | 4 | shell/TabBarV4, m04-blueprint/BlueprintClient, SpaceTabs, home/HomeClient | keep, move a use | Means four things: the phone tab bar's Menu, Dashboard (Blueprint nav, old LayoutDashboard), Amenities & tools (space tabs) and "See how the portal works". The tab bar's Menu should use `menu`; Amenities & tools `wrench`. **Done here:** Tab bar Menu now `menu`; Amenities & tools now `wrench`. |
| `filter` | Filter | 1 | m01-network/DiscoverClient | keep | Only on Discover today. The review's one Filter button (rule 4) uses it. |
| `users` | Members, people | 18 | menu (Members), m04-blueprint/AboutV4×2, m15-bookings/ItemModal×2, m17-org/CirclesV4×2, m19-map/lib/places, m15-bookings/BookingsClient, m00-dashboard/DashboardV4, app/design/page, m18-meetings/MeetingDetail, m01-network/MembersGridV4, m01-network/MembersV4, m01-network/DiscoverClient, m01-network/MatchesV4, app/members/matches/page, app/u/[username]/UserProfileClient | keep | Also gatherings and capacity ("up to 6"): all people, so fine. |
| `circles` | Circles, subcircles | 11 | menu (Circles), m09-governance/GovernanceClient×3, m04-blueprint/AboutV4×2, home/HomeClient×2, admin/UsersAdminClient, m04-blueprint/BlueprintClient, m17-org/CirclesV4 | keep | A newcomer may not know what a circle is; always with the word. |
| `book` | About / the Blueprint (menu) | 7 | menu (About), admin/UsersAdminClient, m04-blueprint/BlueprintClient, m17-org/CirclesV4, app/circles/guide/page, m00-dashboard/DashboardV4, home/HomeClient | keep | Also circle guides. Close enough (something to read). |
| `pin` | A place, a location | 23 | menu (The space), m14-events/CalendarViews×4, m04-blueprint/AboutV4×3, m15-bookings/ItemModal×3, home/HomeClient×2, m01-network/ProfilePage×2, app/u/[username]/UserProfileClient×2, home/lib/at-a-glance, m19-map/lib/places, m04-blueprint/BlueprintClient, m15-bookings/BookingsClient, m14-events/EventDetailModal, m01-network/DiscoverClient | keep | Also The space (menu) and Country. All places. |
| `handshake` | Agreements (menu) | 12 | menu (Agreements), m04-blueprint/AboutV4×3, m06-agreements/AgreementsClient×3, home/HomeClient×2, home/lib/at-a-glance, app/LandingClient, m05-join/JoinClient | keep, move a use | Also "How we live" (About at a glance) and a join step. Daily life isn't an agreement: `users` or `sun`. |
| `chat` | Ask: a conversation with the assistant | 6 | menu (Meetings), admin/UsersAdminClient, home/ModuleOverview, home/AskSection, shell/TopBarSearch, m04-blueprint/AboutV4 | keep, move a use | Also Meetings in the menu. Two meanings: Meetings should get `mic` (they are recordings) or a new meeting drawing; chat stays Ask. |
| `scale` | Governance: deciding together | 11 | menu (Governance), m04-blueprint/AboutV4×2, m00-dashboard/DashboardV4×2, home/HomeClient×2, home/lib/at-a-glance, app/LandingClient, m14-events/EventDetailModal, app/design/page | keep |  |
| `inbox` | Applications waiting (admin) | 2 | menu (Applications), m15-bookings/BookingsV4 | keep |  |
| `box` | Bookings / an item to book (admin) | 5 | menu (Bookings), m15-bookings/BookingsV4×3, m15-bookings/BookingsClient | keep |  |
| `shield` | Permissions, who may manage | 7 | menu (Permissions), m09-governance/GovernanceClient×3, m17-org/CirclesV4×2, home/HomeClient | keep | Newcomers may read it as security; fine for admins. |
| `spark` | The assistant (AI) | 24 | m04-blueprint/BlueprintClient×6, m09-governance/GovernanceClient×3, m04-blueprint/AboutV4×2, home/HomeClient×2, app/u/[username]/UserProfileClient×2, home/lib/at-a-glance, assistant/AssistantChat, m04-blueprint/CirclesStep, m04-blueprint/AskAboutButton, m08-contributions/ContributionsPage, home/HomeV4, m18-meetings/MeetingDetail, m01-network/PersonCardV4, app/profile/edit/page | keep, move a use | 25 uses. Means AI in Governance's check, Ask about, Import from document, match reasons and meetings; but also "Why we exist", "Look around freely", Achievements, energy and the profile editor. Keep it for AI only. **Done here:** "Look around freely" now `eye`; "Why we exist" now `heart`; About › Energy now `sun`. |
| `mail` | Email | 3 | app/auth/login/page×2, m18-meetings/MeetingDetail | keep |  |
| `check` | Done, yes, saved | 37 | app/profile/edit/page×7, m17-org/CirclesV4×4, m09-governance/GovernanceClient×4, m05-join/JoinClient×4, app/LandingClient×2, m04-blueprint/AboutV4×2, m15-bookings/ItemModal×2, m05-join/JoinAdminClient×2, admin/UsersAdminClient, assistant/AssistantChat, admin/QuestionsAdminClient, m14-events/EventDetailModal, m00-dashboard/DashboardV4, home/HomeV4, m07-ops/DraftSwipe, m18-meetings/MeetingDetail, m01-network/MembersV4, ui/select | keep | Also "You're in it" (membership): still a yes. |
| `clock` | Time, waiting, later | 6 | m07-ops/DecisionList×2, m18-meetings/MeetingDetail×2, m04-blueprint/AboutV4, m14-events/EventDetailModal | keep |  |
| `plus` | Add | 23 | m01-network/OffersPage×4, m01-network/SeeksPage×4, app/profile/edit/page×3, m06-agreements/AgreementsClient×2, m17-org/CirclesV4×2, app/design/page×2, v4/SiteMap, m15-bookings/BookingsV4, m08-contributions/ContributionsPage, m09-governance/GovernanceClient, m19-map/MapV4, m07-ops/OpsClient | keep, move a use | Also the map's zoom-in button (SiteMap) while `zoom-in` exists. The map should use `zoom-in`. **Done here:** Map zoom-in now `zoom-in`; zoom-out (a text "−") now `zoom-out`. |
| `x` | Close, clear | 16 | app/profile/edit/page×4, m01-network/DiscoverClient×2, m07-ops/OpsClient×2, assistant/AssistantChat, app/LandingClient, shell/MenuV4, m06-agreements/NewProjectModal, v4/CircleFilter, m07-ops/DraftSwipe, m01-network/MembersGridV4, ui/dialog | keep | Also No / Decline / failed. Common enough to keep. |
| `sidebar` | Open or slim the menu | 1 | shell/MenuV4 | keep |  |
| `search` | Search | 10 | m01-network/DiscoverClient×3, admin/UsersAdminClient, shell/TopBarSearch, m04-blueprint/AboutV4, m15-bookings/BookingsV4, v4/CircleFilter, home/HomeV4, m01-network/MembersGridV4 | keep, move a use | Also "What the land is like" on About. Use `tree` or `map` there. **Done here:** About › "What the land is like" now `map`; the top bar search draws `search` instead of its own SVG. |
| `lock` | Only some people can see this | 29 | m18-meetings/MeetingDetail×4, m15-bookings/BookingsV4×2, m15-bookings/ItemModal×2, m14-events/EventFormModal×2, home/HomeV4×2, app/LandingClient, shell/MenuV4, assistant/DocumentKindPicker, m04-blueprint/DocumentsStep, m15-bookings/BookingsClient, m08-contributions/ContributionsPage, m06-agreements/AgreementsClient, m14-events/EventDetailModal, m14-events/EventsClient, app/circles/guide/page, m00-dashboard/DashboardPage, m09-governance/GovernanceClient, home/HomeClient, m18-meetings/MeetingsList, m07-ops/PermissionNoticeModal, m07-ops/ProjectDetailClient, app/u/[username]/UserProfileClient | keep | Also locked features (opens when you join) and a padlock in the landing's fake address bar. Both say "not for you yet"; keep, always with the reason. |
| `phone` | Phone | 0 | — | unused | Not used anywhere. |
| `bed` | Accommodation, a bed | 6 | m15-bookings/BookingsV4×2, m15-bookings/lib/inventory, m19-map/lib/places, m04-blueprint/AboutV4, home/HomeClient | keep, move a use | Also Homes planned on About (Blueprint and Home use `home`): two icons for one fact. |
| `user` | One person, a profile | 4 | app/auth/login/page, m01-network/NetworkSidebar, m01-network/ProfilePage, m07-ops/ProjectDetailClient | keep |  |
| `id` | Your profile (join step) | 1 | m05-join/JoinClient | keep | Only on Join. |
| `compass` | Our values / direction | 6 | m04-blueprint/AboutV4×2, m07-ops/DecisionList×2, home/lib/at-a-glance, m07-ops/PmLink | keep, move a use | Also Operations' Project manager and To decide (DecisionList, PmLink). Values also use `heart` (admin). Pick one for values; To decide needs its own. |
| `sprout` | Joining (growing in) | 11 | m04-blueprint/AboutV4×2, home/HomeClient×2, home/lib/at-a-glance, m19-map/lib/places, app/LandingClient, app/auth/login/page, app/auth/reset-password/page, m00-dashboard/DashboardV4, m09-governance/GovernanceClient | keep, move a use | Also Food & gardens, food, land care, "What we are", the login mark and every EmptyState's default. Joining keeps it; food gets `bowl`, gardens a leaf/`tree`. |
| `alert` | Needs attention: a warning, late, a concern | 19 | m04-blueprint/BlueprintClient×5, m15-bookings/ItemModal×2, m09-governance/GovernanceClient×2, home/HomeClient×2, app/LandingClient, m04-blueprint/AboutV4, m14-events/CalendarFeedsModal, m14-events/PhotoImportModal, m18-meetings/MeetingDetail, m07-ops/DeliverablesTab, m07-ops/OpsClient, m07-ops/ProjectDetailClient | keep |  |
| `unlock` | Opens for your role | 1 | m09-governance/GovernanceClient | keep | One use (old Governance banner). |
| `flag` | Your next step (menu rail) / where we are now | 6 | m04-blueprint/AboutV4×2, home/lib/at-a-glance, app/LandingClient, shell/MenuV4, m05-join/JoinClient | keep |  |
| `eye` | You can see it (preview) | 3 | m04-blueprint/AboutV4, m09-governance/GovernanceClient, home/HomeV4 | keep, move a use | Also "Our vision" on About. Vision is fine as an eye but then preview needs another. |
| `party` | Done! A celebration | 4 | m06-agreements/NewProjectModal, m06-agreements/AgreementsClient, home/HomeClient, m05-join/JoinClient | keep |  |
| `pencil` | Edit | 18 | m17-org/CirclesV4×3, m01-network/NetworkSidebar×2, m01-network/OffersPage×2, m01-network/SeeksPage×2, app/u/[username]/UserProfileClient×2, m04-blueprint/BlueprintClient, m04-blueprint/AboutNav, m04-blueprint/AboutV4, m15-bookings/ItemModal, m19-map/MapV4, m07-ops/DecisionList, m01-network/ProfilePage | keep |  |
| `trash` | Delete | 5 | m01-network/OffersPage×2, m01-network/SeeksPage×2, m04-blueprint/AboutV4 | keep, move a use | Also "Waste" on About. Literal, but a delete icon in a list of topics reads as a button. |
| `undo` | Undo | 2 | v4/SiteMap, assistant/AssistantChat | keep, move a use | Also "Show the whole map" (reset zoom). Reset view needs its own or `zoom-out`. **Done here:** "Show the whole map" now `map`. |
| `upload` | Upload | 2 | m15-bookings/BookingsV4, m18-meetings/MeetingsList | keep |  |
| `external` | Opens in a new tab (external link) | 0 | — | keep | Renamed from `share` in this branch; not used yet. **Done here:** Renamed `external` (it was unused). |
| `link` | A linked calendar / a link | 4 | m14-events/EventsClient×2, m14-events/EventDetailModal, m14-events/CalendarFeedsModal | keep |  |
| `settings` | Settings | 0 | — | unused | Not used. The drawing is two sliders, which also reads as Filter. |
| `logout` | Log out | 2 | m04-blueprint/AboutV4, m01-network/NetworkSidebar | keep, move a use | Also "Leaving" on About › Staying here. Mild. |
| `vote` | A vote, all members vote | 6 | m09-governance/GovernanceClient×4, app/auth/login/page, home/HomeClient | keep |  |
| `badge` | An achievement | 2 | m04-blueprint/AboutV4, home/HomeClient | keep |  |
| `star` | (unclear) | 6 | m04-blueprint/AboutV4×3, app/LandingClient, v4/CircleFilter, home/HomeClient | keep, move a use | Means My circles (circle filter), Rituals, Rewards/points and a locked landing badge. Keep for "mine"; rituals and rewards need others. |
| `gift` | An offer (what someone gives) | 6 | m01-network/OffersPage×3, app/LandingClient, m04-blueprint/AboutV4, home/HomeClient | keep |  |
| `hand` | Asking: a request, needs approval, asking to join | 12 | m17-org/CirclesV4×3, m15-bookings/ItemModal×2, m01-network/SeeksPage×2, home/lib/at-a-glance, m15-bookings/BookingsV4, m15-bookings/BookingsClient, home/HomeClient, m07-ops/ProjectDetailClient | keep, move a use | Also How to join, "Meet the community" and "Open for helpers". Newcomers may read a raised hand as stop or hello. |
| `target` | Our mission / a goal | 2 | m04-blueprint/BlueprintClient, m04-blueprint/AboutV4 | keep | Also the Blueprint's phone tab (sections). |
| `plane` | Travel plans | 0 | — | keep | Profile only. |
| `file` | A document, meeting notes | 11 | m04-blueprint/BlueprintClient×4, m17-org/CirclesV4×2, admin/UsersAdminClient, m07-ops/TaskModal, admin/QuestionsAdminClient, m18-meetings/MeetingNotesLink, m18-meetings/MeetingDetail | keep |  |
| `mic` | A recording, a transcript | 1 | m18-meetings/MeetingDetail | keep | Candidate for Meetings in the menu. |
| `brain` | The second brain | 3 | m18-meetings/MeetingDetail×3 | keep | Jargon for newcomers: always with "second brain". |
| `map` | The map | 8 | m04-blueprint/AboutV4×2, m15-bookings/BookingsV4×2, m19-map/MapV4×2, v4/SiteMap, SpaceTabs | keep |  |
| `camera` | Take or add a photo | 6 | m14-events/EventsClient×2, admin/UsersAdminClient, m14-events/CalendarFeedsModal, m01-network/ProfilePage, app/profile/edit/page | keep, move a use | Also Look and feel (admin), where Blueprint uses `image`: two icons for one meaning. Use `image`. **Done here:** Admin › Look and feel now `image`. |
| `laptop` | Online | 4 | m14-events/CalendarViews×2, m04-blueprint/AboutV4, m14-events/EventDetailModal | keep |  |
| `globe` | Public, everyone | 9 | m14-events/CalendarViews×2, m04-blueprint/AboutV4×2, assistant/DocumentKindPicker, m04-blueprint/DocumentsStep, m04-blueprint/BlueprintClient, m14-events/EventDetailModal, home/HomeClient | keep, move a use | Also Land size (Blueprint, Home), Water (About) and a governance topic. Water has `drop`; land size `tree` (as on About). **Done here:** About › Water now `drop`. |
| `heart` | What we care about | 3 | admin/UsersAdminClient, home/lib/at-a-glance, m04-blueprint/AboutV4 | keep | Values also use `compass` (at a glance): pick one. |
| `megaphone` | Telling the story | 0 | — | unused | Not used as an interface icon (a circle glyph of the same name exists for seals). |
| `wrench` | Tools, amenities | 4 | m15-bookings/lib/inventory, m19-map/lib/places, SpaceTabs, m15-bookings/BookingsV4 | keep |  |
| `building` | Shared spaces, buildings | 5 | m04-blueprint/AboutV4×2, m15-bookings/lib/inventory, m19-map/lib/places, m15-bookings/BookingsV4 | keep |  |
| `drop` | Water | 3 | m04-blueprint/AboutV4×2, m19-map/lib/places | keep | About uses it for Climate while Water gets `globe`: swap. |
| `tree` | Forest, land | 2 | m19-map/lib/places, m04-blueprint/AboutV4 | keep |  |
| `zoom-in` | Zoom in | 2 | v4/SiteMap, AvatarCropper | keep | The map uses `plus` instead. |
| `zoom-out` | Zoom out | 2 | v4/SiteMap, AvatarCropper | keep |  |
| `loader` | Loading | 14 | app/profile/edit/page×4, app/auth/reset-password/page×3, m01-network/OffersPage×2, AvatarCropper×2, m01-network/SeeksPage×2, m01-network/ProfilePage | keep |  |
| `help` | A question, help | 1 | m01-network/SeeksPage | keep, move a use | Used as the old Requests empty state; requests are `hand`. |
| `briefcase` | Work, profession | 0 | — | keep | Profile only. |
| `at` | A social handle | 0 | — | keep |  |
| `up` | Close a dropdown / show less | 2 | m01-network/NetworkSidebar, ui/select | keep |  |
| `sun` | Light mode | 4 | home/lib/at-a-glance, m04-blueprint/BlueprintClient, m04-blueprint/AboutV4, ThemeToggle | keep, move a use | Also Energy & water (at a glance). Mild. |
| `moon` | Dark mode | 2 | m04-blueprint/BlueprintClient, ThemeToggle | keep |  |
| `check-circle` | Confirmed, all done | 3 | m15-bookings/ItemModal, m06-agreements/AgreementFormClient, app/auth/reset-password/page | keep |  |
| `image` | A picture, the look | 3 | admin/UsersAdminClient, BannerImage, m04-blueprint/BlueprintClient | keep |  |
| `bowl` | Food | 1 | home/lib/at-a-glance | keep | Food also uses `sprout` (About): use `bowl` for food everywhere. |
| `info` | Good to know | 2 | m06-agreements/NewProjectModal, m06-agreements/AgreementsClient | keep |  |
| `list` | List view | 1 | m01-network/MemberList | keep | New in this branch (Members' List button). |
| `key` | Who owns it, access | 2 | home/lib/at-a-glance, home/HomeClient | keep |  |

Uses count each place in the code (a list row drawn for every item counts once). `lucide-compat` names
(`MapPin`, `Trash2`, …) are counted under the icon they draw.

## One icon, two meanings

- **`menu`** (Open the menu). Also used for the List view on Members (MemberList) and the Blueprint's phone nav tab. List view needs its own `list` icon. *Done here:* Members' List button now `list`.
- **`right`** (Go forward: the next step). Also the trailing arrow on list rows (Circles, My dashboard › Your circles, Meetings, Members, profiles) and breadcrumb separators. MenuV4 says arrows mean "go somewhere" only on the next-step card; rows are already links.
- **`home`** (My dashboard (menu)). Also houses: Homes planned, Land & homes, Living here. Houses should use `building` (or a new house drawing); the menu keeps `home`.
- **`grid`** ((unclear)). Means four things: the phone tab bar's Menu, Dashboard (Blueprint nav, old LayoutDashboard), Amenities & tools (space tabs) and "See how the portal works". The tab bar's Menu should use `menu`; Amenities & tools `wrench`. *Done here:* Tab bar Menu now `menu`; Amenities & tools now `wrench`.
- **`handshake`** (Agreements (menu)). Also "How we live" (About at a glance) and a join step. Daily life isn't an agreement: `users` or `sun`.
- **`chat`** (Ask: a conversation with the assistant). Also Meetings in the menu. Two meanings: Meetings should get `mic` (they are recordings) or a new meeting drawing; chat stays Ask.
- **`spark`** (The assistant (AI)). 25 uses. Means AI in Governance's check, Ask about, Import from document, match reasons and meetings; but also "Why we exist", "Look around freely", Achievements, energy and the profile editor. Keep it for AI only. *Done here:* "Look around freely" now `eye`; "Why we exist" now `heart`; About › Energy now `sun`.
- **`plus`** (Add). Also the map's zoom-in button (SiteMap) while `zoom-in` exists. The map should use `zoom-in`. *Done here:* Map zoom-in now `zoom-in`; zoom-out (a text "−") now `zoom-out`.
- **`search`** (Search). Also "What the land is like" on About. Use `tree` or `map` there. *Done here:* About › "What the land is like" now `map`; the top bar search draws `search` instead of its own SVG.
- **`bed`** (Accommodation, a bed). Also Homes planned on About (Blueprint and Home use `home`): two icons for one fact.
- **`compass`** (Our values / direction). Also Operations' Project manager and To decide (DecisionList, PmLink). Values also use `heart` (admin). Pick one for values; To decide needs its own.
- **`sprout`** (Joining (growing in)). Also Food & gardens, food, land care, "What we are", the login mark and every EmptyState's default. Joining keeps it; food gets `bowl`, gardens a leaf/`tree`.
- **`eye`** (You can see it (preview)). Also "Our vision" on About. Vision is fine as an eye but then preview needs another.
- **`trash`** (Delete). Also "Waste" on About. Literal, but a delete icon in a list of topics reads as a button.
- **`undo`** (Undo). Also "Show the whole map" (reset zoom). Reset view needs its own or `zoom-out`. *Done here:* "Show the whole map" now `map`.
- **`logout`** (Log out). Also "Leaving" on About › Staying here. Mild.
- **`star`** ((unclear)). Means My circles (circle filter), Rituals, Rewards/points and a locked landing badge. Keep for "mine"; rituals and rewards need others.
- **`hand`** (Asking: a request, needs approval, asking to join). Also How to join, "Meet the community" and "Open for helpers". Newcomers may read a raised hand as stop or hello.
- **`camera`** (Take or add a photo). Also Look and feel (admin), where Blueprint uses `image`: two icons for one meaning. Use `image`. *Done here:* Admin › Look and feel now `image`.
- **`globe`** (Public, everyone). Also Land size (Blueprint, Home), Water (About) and a governance topic. Water has `drop`; land size `tree` (as on About). *Done here:* About › Water now `drop`.
- **`help`** (A question, help). Used as the old Requests empty state; requests are `hand`.
- **`sun`** (Light mode). Also Energy & water (at a glance). Mild.

## Two icons, one meaning

- **Menu:** `menu` (top bar) and `grid` (phone tab bar). *Done here:* the tab bar uses `menu`.
- **Zoom in:** `plus` (the map) and `zoom-in` (the photo cropper). *Done here:* the map uses `zoom-in`.
- **Look and feel:** `camera` (Admin) and `image` (Blueprint). *Done here:* `image`.
- **Our values:** `compass` (About at a glance) and `heart` (Admin › Community values). Open: pick one.
- **Homes planned:** `home` (Blueprint, old Home) and `bed` (About). Open: `home` is also My dashboard.
- **Land size:** `globe` (Blueprint, old Home) and `tree` (About). Open: `tree`.
- **Food:** `bowl` (at a glance) and `sprout` (About, map kinds). Open: `bowl`.
- **Water:** `drop` (map) and `globe` (About). *Done here:* `drop`.
- **Requests:** `hand` (Members, Offers & requests) and `help` (old Requests empty state). Open: `hand`.

## Hard for a newcomer to read

Always shown with a word today, and should stay that way: `spark` (reads as "new", not "AI": write "AI" or
"assistant" beside it), `brain` (second brain is our jargon), `compass` (values? direction? To decide?),
`hand` (a raised hand reads as stop or hello), `circles` (a newcomer doesn't know what a circle is yet), `key`
(who owns it), `shield` (permissions reads as security), `inbox` (applications), `grid` (reads as apps, and
meant four things). Icons alone, with no word, appear only in the slim menu rail (with a hover label) and on
icon buttons that have an `aria-label`.

## Meanings with no icon (screens use words)

| Missing | Means | Today |
|---|---|---|
| `list` | List view | Members' List button uses `menu`; Operations' List tab and Calendar's List view are words. **Done here:** drawn as `list`, used on Members. |
| `external` | Opens in a new tab | Second-brain and calendar links say "(opens …)" or nothing. Rename `share`. **Done here:** `share` renamed `external`. |
| `archive` | Archive / archived | Bookings › Inventory says "Archived" in words; the button is words. |
| `eye-off` | Hidden / not shown | Hidden items and circle-only things are words or `lock`. |
| `sort` | Sort | Operations and lists write "↕ Soonest deadline" with a text arrow. |
| `login` | Sign in | "Sign in" links appear on nearly every page as words. |
| `meeting` | Meetings | The menu borrows `chat` (Ask). Or use `mic`. |
| `priority` | Priority (High / Medium / Low) | Shown as an orange "Med" pill; the lexicon has no priority words yet. |
| `more` | More actions (…) | Rows grow a line of Edit / Archive / Open buttons instead of one menu. |

## Sizes: three, not twelve

Before this branch icons were drawn at 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 28, 30, 32, 34,
36, 44 and 48px (most often 14, 16 and 15). With the review on, there are three:

| Size | Where | Examples |
|---:|---|---|
| **16** | inline: beside words, in tags, in buttons, back links, chevrons | `Tag`, `Button`, "‹ Members", "Circle only" |
| **20** | controls and list rows | icon-only buttons, the menu, search fields, `IconTile` in a list row |
| **24** | tiles and headers | the phone tab bar, empty states, stat tiles, confirmation marks |

How: `<Icon>` and the old lucide names snap whatever size a screen asks for to the nearest of the three
(`core/components/v4/icon-size.ts`: up to 17 → 16, 18–21 → 20, 22 and up → 24), so no screen had to change. A
size in text units (`<InlineIcon>`, 1.1em) follows the text and stays. Map pins keep their own 10–12px glyphs
(a pin is a marker, not an icon in a line of text). New code should pass 16, 20 or 24 (`ICON_SIZES`).

Because the snapping is in the shared `<Icon>`, Operations' icons snap too, with no Operations file changed.

The colour and icon audit of the same day (the v4-icons session) proposed four sizes, 14, 16, 18 and 24. The
review settles on the three above: 14 and 16 read as one size beside text, and 18 in the menu becomes 20 with
the other controls. One list, used by `<Icon>`, the old lucide names and `/design`.

## Decorative colour: what went neutral

All behind `html[data-review]` (the block "Icons and decorative colour" in `app/v4-review.css`), so other
communities see no change.

- **Icon tiles** (`IconTile`, and any `v4-tile--*`): neutral grey with an ink icon, whatever tone a screen asks
  for. This covers My dashboard's "Start here" (blue, red, yellow), About's topic tiles, Admin, Offers and
  requests, Bookings and Map list rows, the visitor notes on Members. The governance checks keep their tone
  because there it is a result (passed, objected): `v4-tile--result`. An item that is archived or not on the
  map shows as a dashed, faded tile (`off`), so the state shows without reading the line under it.
- **About:** the six "At a glance" tiles, the numbered values, the three ways to live here, the numbered
  steps, the chapter you're reading (now filled black, as a selected filter) and the day's times.
- **Member cards:** circles are their seal at 16 (`CircleSeal`), never a coloured dot; "No circle yet",
  "No offers yet", "No requests yet" and "No skills listed yet" are left out; offers and requests are told
  apart by their icon (gift, hand), not green and yellow; the match % and "you" are outline labels. My
  dashboard's "Your circles" list uses seals too.
- **Map pins:** white with the kind's icon in ink; the selected pin is black. A kind of place is a tag.
- **Meetings:** the second-brain link and "the assistant said" lose their violet.
- **Icons are ink:** the circle filter's yellow star, the profile's coloured pins and locks, a yellow party
  icon on the old Home.
- **Hard-coded hex colours** in modules became tokens with the old colour as fallback,
  `var(--rv-bad, #b91c1c)`: errors (`--rv-bad`), warnings and drafts (`--rv-attn`, see decision #34 below), live dots and yes bars
  (`--rv-good`), count badges (`--rv-count`, black), coloured eyebrows (`--rv-neutral`), the odd blue or
  orange button (`--rv-primary`, ink), coloured icons (`--rv-icon`). 21 files: AssistantChat, HomeClient,
  BookingsClient, AgreementsClient, AgreementFormClient, AgreementsAdminClient, BlueprintClient, BrandingStep,
  CirclesStep, CommunityValuesEditor, DocumentsStep, AdminTabs, QuestionsAdminClient, UsersAdminClient,
  UnitEditModal, GovernanceClient, the login page, DraftBadge, AppSideNav, UserProfileClient, ProfilePage.

The `--rv-*` tones are a stop-gap until the Result pill family (the main review branch) settles its tokens;
then rename them to those.

## Explain with the interface, not a sentence

| Where | Today | Interface instead | State |
|---|---|---|---|
| Map and Amenities, "Place on the map" | "not on the map" / "Archived" in the line under each row | a dashed, faded tile | **Done here** |
| Members cards | "No circle yet", "No offers yet", "No requests yet", "No skills listed yet" | leave empty values out; a faded icon keeps the cards lined up | **Done here** |
| Circles cards | "0 subcircles" on every card | leave it out | **Done here** |
| Map zoom | "−" typed as text | the `zoom-out` icon | **Done here** |
| Governance, after voting | "Tap your answer again to take it back." | the chosen answer is filled with a check; give it an × on hover that says "Take back" | open (Governance's vote buttons belong with the pill and result work) |
| Bookings › item | "The schedule is visible to joining members and above." (twice in ItemModal) | a lock tag "Joining members" on the schedule heading | open |
| My dashboard (visitor) | "Start here" rows each explain themselves in a meta line | fine: the meta says what you'll find | keep |
| Home › how it works | "Ask anything in the bar at the top", "Every page is in the menu" | point at the real bar and menu (a one-time coach mark) | open: needs a design |
| Profile editor | "Click photo to change" | the camera icon already sits on the photo; drop the sentence | open (old profile editor) |
| Blueprint wizard | "Drag to score 0–10", "Click to jump in" | the slider and the cards already say it | open (Blueprint wizard, admins only) |
| Operations | "Task of its own", "N tasks on the go · N open subtasks · N done", "31 late" as words | see Operations below | open (Operations) |
| Calendar | the legend with counts that is also a filter | see "Not changed here" | open (Calendar session) |

## One set of rules for every visual mark

Every icon, seal, selected state and decorative colour is decided here, so the page-by-page review sessions
don't each invent their own. What a session finds goes into this file; screens only use what's written here.

| Mark | Rule | Where it lives | State |
|---|---|---|---|
| Interface icons | One set, ink lines, never coloured, one meaning each (the table above) | `core/components/v4/icons.ts`, `icon-meanings.ts` | Done here |
| Icon sizes | 16 inline, 20 controls and rows, 24 tiles and headers | `core/components/v4/icon-size.ts` | Done here |
| Typed marks | ✓ × › ▾ ✗ become `check`, `x`, `right`, `down`; arrows inside button words stay | screens | Open: 98 left, most in About, Calendar, Home, Governance and Operations |
| Circle seals | The only coloured icon. Always the seal, never a bare colour dot | `core/components/v4/circle-land.ts` (drawn while the review is on), `circle-glyphs.ts`, `CircleSeal.tsx` | Of this land, all 13 drawn (#33) and approved (#35). Done |
| Icon tiles | Grey; coloured only when the tile repeats a row's status (`v4-tile--result`); dashed when off | `v4-review.css` | Done here |
| Map pins | White with the kind's icon in ink; the chosen pin black | `v4-review.css` | Done here |
| Selected chip, segment, tab | Filled black, on every page (decision #31; replaces the soft blue of 20 Nov, which is also To do) | `v4-review.css` | Done here; Calendar (#176) and Governance (#179) can drop their own copies |
| Person without a photo | Initial on grey, hairline (violet is In progress) | `v4-review.css` | Done here |
| Count | Black number badge (`Count`) | `v4-review.css` § 3, the review branch | Done (#174) |
| Main button | Dark green (decision #30); the one next step soft green | `globals.css` (`.v4-btn--primary`), `--rv-primary` | Done |
| Status colours | Yellow = waiting on someone's answer (Review, pending, awaiting approval); red = only "no" (Declined); Paused is an outline pill (decision #34). Results use good, bad, attention, neutral | `v4-review.css` § 6 (#174); `--rv-*` tokens here | `--rv-good`/`--rv-bad`/`--rv-attn` equal `--green-ink`/`--red-ink`/`--yellow-ink`. One exception: a Governance vote's concern stays yellow (decision #36, below) |
| Calendar colours | The one named exception: its own colours to tell calendars apart, with a legend | `m14-events` | For the Calendar session |
| A colour check | Fail the build when a screen writes a colour outside the palette, like `icon-check` | `web/scripts/` | Open |

## Circle seals: Of this land (decisions #32–#33)

Sonia chose **Of this land**: plants, fire and water from Protopia instead of everyday objects (#32), and for the
five sketched circles the first drawing (#33): Vision fern curl, Farming torn leaf, Kitchen papaya, Hospitality
hibiscus, Community Hosting bonfire. The other eight are drawn in the same style, and Sonia approved all 13 as
drawn (#35, "All 8 are good"). **Done.**

![All 13 circle seals, of this land](seals/2026-11-23-of-this-land-13.png)

| Circle | Key (`circles.icon`) | Seal | Why |
|---|---|---|---|
| Vision / Strategy | `spiral` | Fern unrolling | Picked (#33) |
| Farming | `wheat` | Torn leaf | Picked (#33) |
| Kitchen | `pot` | Papaya | Picked (#33) |
| Hospitality | `key` | Hibiscus | Picked (#33) |
| Community Hosting | `fire` | Bonfire | Picked (#33) |
| Infrastructure | `hammer` | Bamboo | What Protopia builds with. Approved (#35) |
| Marketing and communications | `megaphone` | Trumpet flower (floripondio) | The land's own horn. Approved (#35) |
| Finance | `coins` | Cacao pod | Cacao beans were money here. Approved (#35) |
| Cleaning | `broom` | Water drop | Clean water. Approved (#35) |
| Art | `brush` | Feather | Narrow and leaning left, so it isn't Farming's leaf. Approved (#35) |
| Community management | `ring` | Ceiba tree | The tree people gather under. Approved (#35) |
| Incubator | `egg` | Seed opening | Approved (#35) |
| Shop | `bag` | Basket of fruit | Approved (#35) |

- **Where:** `core/components/v4/circle-land.ts`, keyed like `circle-glyphs.ts`, so no circle changes its saved
  key and no migration is needed. `CircleSeal.tsx` draws these while `designReview` is on, clipped to the seal;
  without it, the old stamps. The pickers and `/design` name each by what it draws (`glyphLabel`).
- **Rules:** 100×100 art, centre 50 50, the seal clips the edge. Solid cream shapes; cuts in the circle's colour as
  a fill or a 2.2–3 line; cream lines 4–7.5 wide. Each is checked at 16px inside a tag.
- **The sheet:** `node design/seals/land-sheet.mjs out.html`, then Chrome headless `--screenshot` (1410×940 at
  1.5×). It reads `circle-land.ts` directly, so the sheet and the app always match.
- Earlier sheets, for the record: the three directions (A Signals, B Of this land, C Badges),
  `seals/2026-11-22-circle-seal-directions.png`, and three more Of-this-land drawings per circle,
  `seals/2026-11-22-of-this-land-variants.png` (none chosen).

## Yellow means waiting (decisions #34, #36): where `--rv-attn` is used

| Where | What it marks | Now |
|---|---|---|
| `DraftBadge` | A draft task waiting for a lead to approve or decline it | Yellow: waiting |
| Admin › Questions, "No answer" | A question no one has answered | Yellow: waiting |
| Home, "Voting" pill beside the governance result | A proposal still waiting for votes | Yellow (`--rv-attn`, was a raw `#f59e0b`) |
| Home, the governance result bar | The "concern" share of a vote | **Yellow, the one exception** (#36): votes keep green / yellow / red, consent / concern / object, like a traffic light |
| Blueprint scan notes (big site, long document, parts that failed) | A warning about the scan, nobody's answer | Neutral grey with the `alert` icon (`--rv-neutral…`, #36) |

## What Operations would need (not changed here)

Oscar is working on Operations, so no `m07-ops` file changed. What the review would do there:

- **Sizes:** nothing to change by hand; `<Icon>` already snaps (DecisionList clock 12/13 and pencil 13 → 16,
  ProjectDetailClient back and next 14 → 16, DraftSwipe 16).
- **Hand-made icons:** inline SVGs in `CalendarPicker.tsx:111, 136, 142` (a calendar, ‹ and ›: use `calendar`,
  `left`, `right`), `ProjectDetailClient.tsx:440` (a calendar: `calendar`) and `TaskModal.tsx:51` (`BellIcon`,
  a bell that fills when you follow: use `bell`).
- **Meanings:** `compass` means Project manager (PmLink) and To decide (DecisionList); values use it too. To
  decide needs its own icon (or `scale`, as Governance decides). `alert` for Late is right.
- **Hex colours:** `Priority.tsx` (sky, amber, red per priority: the orange "Med" pill the review calls a sixth
  colour family), `ProjectDetailClient.tsx:35–39, 403, 525–529` (status and blue highlights),
  `DeliverablesTab.tsx:19–21, 140–157`, `TaskModal.tsx:354–426`, `DraftSwipe.tsx:73`,
  `NewProjectClient.tsx:89–181`, `NewTaskModal.tsx:88–95`, `PermissionNoticeModal.tsx:99` (indigo button),
  `TaskQuickEdit.tsx:168–182`. Each to a `--rv-*` tone with the hex as fallback, the same way as above.
- **Words for things the board could show:** "Task of its own" on cards and the Paused column; the three
  counts above the board; "31 late" as a filter chip rather than a result badge.

## Not changed here (other sessions' files)

- `AppTopBar.tsx`: four hand-drawn SVGs (the sidebar arrow, the bell, a search glass, the menu chevron). Use
  `sidebar`, `bell`, `search`, `down`.
- `m05-join`: hex backgrounds in `JoinClient.tsx:215, 377` and `JoinAdminClient.tsx:214, 227`; four hand-drawn
  check marks in `JoinClient.tsx:277, 461, 493, 525` (use `check`).
- `m14-events`: hex `#dc2626` (the now-line) in `CalendarViews.tsx:285–286` and `EventDetailModal.tsx:290`,
  `CalendarFeedsModal.tsx:91`; event types painted with the status pastels.
- `globals.css`: the `.v4-tile--*` and `.v4-pin--*` tones themselves (overridden in v4-review.css instead).
- Governance's check pills and Agreements' status colours (`${meta.color}20`): pills, for the Result family.
- `globals.css` § "Actions green, toggles soft": left as is; the review's selected rule overrides the toggles.
- The arrow rule: MenuV4 says arrows mean "go somewhere" only on the next-step card, yet list rows on Circles,
  My dashboard, Meetings and Members end in `right`. Decide whether rows lose the arrow (they are links
  already) and write it in `design/decisions.md`.
