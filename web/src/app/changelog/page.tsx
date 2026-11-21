import Link from 'next/link'

// MyCoNet core release notes. A community's own history before v4.0.0 is in its instance/log.md.
const ENTRIES = [
  {
    version: 'v4.84.0',
    date: '2026-11-21',
    title: 'Sort drafts right in the list',
    items: ['In Operations › Tasks you can change a task’s status, circle, subcircle and the task it’s part of right in the list. Changing a draft confirms it.', '“✦ Tell the assistant” on each row asks the assistant to do something with that task.', 'Drafts you change or confirm stay in the drafts list with their new values until you reload the page.'],
  },
  {
    version: 'v4.83.0',
    date: '2026-11-21',
    title: 'About reads as chapters',
    items: ['About is easier to read through: each chapter keeps its heading, a short intro and a photo of the place in view while you read its topics, and each topic opens to the whole answer. A day here is a timeline.', 'The tiles under the photo each show a figure and what it means: the size of the land, how many people, places to sleep, the climate, the year it began, and off-grid power and water. Click one to read the whole answer.', 'The photo at the top fits the screen better, and the name and the line under it stay readable without covering the place.'],
  },
  {
    version: 'v4.82.0',
    date: '2026-11-21',
    title: 'A calmer page colour',
    items: ['In the v4 look the page behind the cards is half as blue, and the thin lines between things are a soft grey instead of blue. Cobalt stays for the drawings, so they stand out more.'],
  },
  {
    version: 'v4.81.0',
    date: '2026-11-21',
    title: 'Circle seals',
    items: ['In the v4 look each circle has a seal: its colour as a hand-drawn round with a small drawing in a cream line (a wheat stalk for farming, a pot for the kitchen). It shows on the circle cards, in the Circles filter, on board cards, on a task’s page and in the calendar.', 'Circles are now the only coloured icons, so a coloured seal always means a circle. Circle names no longer carry an emoji. A circle without a drawing shows its first letter.'],
  },
  {
    version: 'v4.80.0',
    date: '2026-11-21',
    title: 'A calm Home that tells you where you are',
    items: ['In the new look, Home is short and everyone lands there again. It welcomes you with a photo and says in one line what the community is, then shows Start here: three steps for your way in, with what you’ve already done ticked.', 'Below are About the community, in its own words, and Your portal: what MyCoNet is, how to ask it anything and where every page is. Then what we do here as tiles with live numbers, and what’s happening this week.', 'The logo takes you to Home; My dashboard is in the menu. The long tour of every page is still there, linked at the bottom.'],
  },
  {
    version: 'v4.79.1',
    date: '2026-11-21',
    title: 'A bigger Draft pill to slide',
    items: ['The Draft pill on a task the agent drafted is bigger, so it’s easier to grab and slide on a phone or with a mouse. Slide it right to approve, left to decline, as before.'],
  },
  {
    version: 'v4.79.0',
    date: '2026-11-20',
    title: 'Open a suggestion’s task, and accepting confirms a draft',
    items: ['In the project manager panel, click a task’s name to open its card. You can edit it there, and saving confirms a draft.', 'When you accept a suggestion, such as “Give it to…”, its draft tasks are confirmed and stop showing as drafts. Undo makes them drafts again.'],
  },
  {
    version: 'v4.78.0',
    date: '2026-11-21',
    title: 'The v4 look on every screen',
    items: ['In the v4 look, the logo and signing in take you to your dashboard: the older home page stays for communities that haven’t turned v4 on.', 'Every remaining page and pop-up gets the v4 look: quiet labels above the title, the light heading, borderless cards, pill buttons and the soft veil behind pop-ups. That includes Changelog, Change password, Applications, Questions, the agreement form, New task and Upload a recording.', 'Emoji and the second icon set are gone from the screens: places, links, locks, warnings and ticks use the same line icons as the menu, sized to the text.'],
  },
  {
    version: 'v4.77.0',
    date: '2026-11-20',
    title: 'See where a project manager suggestion comes from',
    items: ['Every suggestion in the project manager panel has “Where this comes from”. For each task it’s about, you see the meeting it came from with its date, what was said, who said it and who was there. A task added by hand shows who added it and when.', 'You also see the task’s status, project, person, due date and notes, and when the project manager last looked at the board.'],
  },
  {
    version: 'v4.76.0',
    date: '2026-11-20',
    title: 'Rooms, beds and tools have their own photos',
    items: ['Each room, bed, tool or space can have a photo of its own. Admins add it when they edit the item. It shows on the card and when you open it.', 'Without one, it shows the photo of the place it’s in. In the list each picture shows once, so beds that share a photo don’t repeat it.'],
  },
  {
    version: 'v4.75.1',
    date: '2026-11-20',
    title: 'A place’s photo shows once',
    items: ['In Amenities & tools, a place’s photo shows on its first card only, so the 20 dorm beds don’t repeat the same picture. Each item’s window still shows it.'],
  },
  {
    version: 'v4.75.0',
    date: '2026-11-20',
    title: 'One map, and photos on rooms and tools',
    items: ['Amenities & tools is a list again, with a “See the map” button: the Map page is the one map of the land.', 'Each room, tool or space shows the photo of the place it sits in, on its card and when you open it, with a link to that place on the map.'],
  },
  {
    version: 'v4.74.0',
    date: '2026-11-20',
    title: 'The assistant reads the second brain',
    items: ['Where a community turns it on, Ask answers from its second brain too — meeting notes and circle boards for members, and the hand-written notes for leads and admins — and Do uses them to understand what you ask.'],
  },
  {
    version: 'v4.73.0',
    date: '2026-11-20',
    title: 'Community-wide meetings in “My circles”',
    items: ['A meeting that spans several circles — like a morning sync — now shows in “My circles” as well as “All”, so it no longer looks missing.'],
  },
  {
    version: 'v4.72.0',
    date: '2026-11-20',
    title: 'About: a calm overview with a sticky heading',
    items: ['The facts under the About photo are a quick overview; tap one to jump to its whole answer in the right chapter.', 'The chapter bar stays at the top as you scroll and shows where you are; the chapters follow the questions a visitor asks.', 'Editing the Blueprint looks like the rest of MyCoNet.'],
  },
  {
    version: 'v4.71.0',
    date: '2026-11-20',
    title: 'Reviewing a meeting, step by step',
    items: ['Leads see a “Review this meeting” box at the top of a meeting: choose the circle, put the tasks on the board, email the notes, and see where the notes were saved. Done steps are ticked; the green button is always the next thing to do.', 'Meetings no longer show a day early.'],
  },
  {
    version: 'v4.70.1',
    date: '2026-11-20',
    title: 'The community’s mark beside its name',
    items: ['The menu shows a small mark (for Protopia, its spiral) with the community’s name and “on MyCoNet” beside it.'],
  },
  {
    version: 'v4.70.0',
    date: '2026-11-20',
    title: 'A map of the land',
    items: ['New Map page: the picture of the land with a pin for every place, the houses, shared spaces, gardens, water, forest and meeting spots. Tap a pin for its photo, a short description, who looks after it and what you can book there. Filter by kind; works with two fingers on a phone.', 'Admins and circle leads put places on the map and add photos with “Edit places”.'],
  },
  {
    version: 'v4.69.0',
    date: '2026-11-20',
    title: 'All of Members in the new look',
    items: ['Matches, My offers, My requests, Discover and Edit profile now look like the rest of the portal. My profile opens your own profile page.'],
  },
  {
    version: 'v4.68.2',
    date: '2026-11-20',
    title: 'Your community’s logo in the menu',
    items: ['The menu shows the community’s logo, set in the Blueprint, instead of a letter.'],
  },
  {
    version: 'v4.68.1',
    date: '2026-11-20',
    title: 'Members takes less room',
    items: ['Your best matches on Members are short rows, and “Lately” is now “Members activity”. Your profile no longer lists your circles twice.'],
  },
  {
    version: 'v4.68.0',
    date: '2026-11-20',
    title: 'One way to filter by circle',
    items: ['Members, Operations, Meetings and the Calendar filter by circle the same way: a “Circles” button opens every circle with a search, you pick one or several, and the chosen ones show as pills you can remove. On phones the list slides up from the bottom, and nothing scrolls sideways any more.'],
  },
  {
    version: 'v4.67.1',
    date: '2026-11-20',
    title: 'Fixes: Operations and requests',
    items: ['Operations opens even when a community hasn’t set every server key yet.', 'What people are looking for shows again on Home and Members.'],
  },
  {
    version: 'v4.67.0',
    date: '2026-11-20',
    title: 'Members: your matches first',
    items: ['Members opens with your best matches, your profile, your offers and requests and what’s new. Below, everyone as same-size cards with your match %, one clear search and circle filters.'],
  },
  {
    version: 'v4.66.0',
    date: '2026-11-20',
    title: 'Who edits the Blueprint',
    items: ['A community can choose that only admins edit its Blueprint. Others keep circle leads and admins as editors.'],
  },
  {
    version: 'v4.65.0',
    date: '2026-11-20',
    title: 'The assistant changes events',
    items: ['Ask the assistant to move an event, change its time or date, or update its notes, place or link: "move tonight’s dinner to 7", or "add to this event: bring a dish" with the event open. It shows the change first, follows the Calendar’s rules, updates Google Calendar too, and can be undone.'],
  },
  {
    version: 'v4.64.0',
    date: '2026-11-20',
    title: 'About shows the whole Blueprint',
    items: ['With the new look on, About shows every Blueprint answer: day-to-day life on the land, how we meet and talk, money and leaving. The facts at the top have their label on top and open to the whole answer.'],
  },
  {
    version: 'v4.63.0',
    date: '2026-11-20',
    title: 'Circles at a glance',
    items: ['With the new look on, each circle card shows its purpose, lead, members with their photos, open tasks and meetings. A circle opens in tabs: Overview, Manuals & guides, People, Subcircles, Tasks and Meetings.'],
  },
  {
    version: 'v4.62.0',
    date: '2026-11-20',
    title: 'The Task board',
    items: ['Operations is now the Task board. With the new look on, it opens with one clear summary line, each task card shows how far along its subtasks are and who is on it, and late tasks and drafts are one tap away. On a phone the board scrolls one column at a time.'],
  },
  {
    version: 'v4.61.0',
    date: '2026-11-20',
    title: 'Subcircles, tasks and subtasks',
    items: ['Teams are now called subcircles, and projects are tasks with subtasks. Only the words changed: everything you made is still there.'],
  },
  {
    version: 'v4.60.0',
    date: '2026-11-20',
    title: 'Meetings clear at a glance',
    items: ['With the new look on, each meeting shows its date in a box and its circle by name, not only by colour. Meetings are grouped by week, titles lose the repeated date, and the summary is one clean line.'],
  },
  {
    version: 'v4.59.0',
    date: '2026-11-20',
    title: 'Clearer actions, more calendar',
    items: ['With the new look on, the main action on a page is green and the tabs are softer. The calendar opens on the week at the morning, with tasks off until you want them, and + Add event stands out.'],
  },
  {
    version: 'v4.58.0',
    date: '2026-11-20',
    title: 'The new look on phones',
    items: [
      'With the new look on, project boards scroll sideways on a phone, one column at a time, instead of one very long page.',
      'Buttons and links that read off-centre on a phone are centred, and cards that squeezed their text now stack.',
      'Tapping a field on an iPhone no longer zooms the page, and pages load a little lighter (fewer fonts, member photos load as you scroll).',
    ],
  },
  {
    version: 'v4.57.0',
    date: '2026-11-20',
    title: 'Nothing lost in the new look',
    items: ['Meetings show who was there, proposals show how close they are to approval and who proposed them, overdue projects say so, and team roles show on Circles again.'],
  },
  {
    version: 'v4.56.0',
    date: '2026-11-20',
    title: 'The calendar opens on the week',
    items: [
      'The calendar opens on the whole week with its time slots.',
      'The list shows what’s coming up; what’s already over today stays there, greyed out.',
    ],
  },
  {
    version: 'v4.55.0',
    date: '2026-11-20',
    title: 'Profiles, joining and projects, as designed',
    items: [
      'With the new look on, a profile shows the person large, with their circles beside it.',
      'Applying to join is one card with your step and what comes next.',
      'A project opens with a banner in its circle’s colour and a clear way to offer help.',
    ],
  },
  {
    version: 'v4.54.0',
    date: '2026-11-20',
    title: 'Meetings, decisions and agreements, as designed',
    items: [
      'With the new look on, each meeting shows its summary, its action items and its files side by side.',
      'Governance shows each proposal as a card with its four checks, and a page where you vote and discuss.',
      'Agreements lists yours as simple rows: what you give, what you’d like back, and where it stands.',
    ],
  },
  {
    version: 'v4.53.0',
    date: '2026-11-20',
    title: 'Circles and the calendar, as designed',
    items: [
      'With the new look on, Circles shows a card per circle, and each opens its own page with its members, teams, projects and who’s asking to join. Members can ask to join from there.',
      'The calendar opens on a list of what’s coming, with a date box and a one-tap RSVP for each event, and a small month beside it.',
    ],
  },
  {
    version: 'v4.52.0',
    date: '2026-11-20',
    title: 'About, as designed',
    items: ['With the new look on, About shows the community as designed: the big photo and name, short facts, and chapters from our story to where we’re going, with the map of the land and the Blueprint’s progress.'],
  },
  {
    version: 'v4.51.0',
    date: '2026-11-20',
    title: 'The new look, all the way in',
    items: ['With the new look on, the cards, tabs, buttons, labels and fields inside Agreements, Meetings, Governance, Join, Achievements, the Members pages and the pop-ups match the rest of the app.'],
  },
  {
    version: 'v4.50.0',
    date: '2026-11-20',
    title: 'The rest of the way in',
    items: ['With the new look on, Join, Achievements, the sign-in page and the landing page match the rest of the app.'],
  },
  {
    version: 'v4.49.0',
    date: '2026-11-20',
    title: 'Operations, the new way',
    items: ['With the new look on, Operations, its board and project pages match the rest of the app.', 'On a phone, the top bar shows a menu button and the page you’re on.'],
  },
  {
    version: 'v4.48.0',
    date: '2026-11-20',
    title: 'The menu, as designed',
    items: ['With the new look on, the menu runs the full height with your community’s mark on top and you at the foot. The arrow makes it a slim row of icons instead of hiding it.'],
  },
  {
    version: 'v4.47.0',
    date: '2026-11-20',
    title: 'More pages in the new look',
    items: ['With the new look on, Circles, Agreements, Meetings and Governance get the new page headers, and Circles gets soft cards.'],
  },
  {
    version: 'v4.46.0',
    date: '2026-11-20',
    title: 'Calendar, the new way',
    items: ['With the new look on, the Calendar’s header, filters, toolbar and event lists match the rest of the app. Everything works as before.'],
  },
  {
    version: 'v4.45.0',
    date: '2026-11-20',
    title: 'Members, the new way',
    items: [
      'With the new look on, Members shows everyone as cards with their circles, offers and what they’re looking for. Filter by circle or search.',
      'The Members pages share one row of tabs instead of a second side menu.',
    ],
  },
  {
    version: 'v4.44.0',
    date: '2026-11-20',
    title: 'Explore the map',
    items: [
      'Zoom into the Amenities map and move around it. Tap a pin to see what it is, whether it’s free, and book it.',
      'The list beside the map shows each pin when you point at a name, and takes you there when you click it.',
    ],
  },
  {
    version: 'v4.43.1',
    date: '2026-11-20',
    title: 'A fix for the map',
    items: ['A safety check on the map pins now holds in every case. Nothing changes on screen.'],
  },
  {
    version: 'v4.43.0',
    date: '2026-11-20',
    title: 'A map of the amenities',
    items: [
      'With the new look on, Amenities & tools shows a map of the land with a pin for each room, tool and space. Tap a pin to see it and book it.',
      'Admins upload the picture of the land in Admin › Bookings › Map; admins and circle leads put their rooms, tools and spaces on it.',
    ],
  },
  {
    version: 'v4.42.1',
    date: '2026-11-20',
    title: 'Booking in the new look',
    items: [
      'With the new look on, the booking pop-up and the form to add or edit a room, tool or space match the rest of the app. Booking works as before.',
    ],
  },
  {
    version: 'v4.42.0',
    date: '2026-11-20',
    title: 'The new menu, with the new look',
    items: [
      'For communities that use the new look: your next step on top of the menu, then You, Community, Working together and Admin. Plain names, one icon each, and a count of your open tasks beside My dashboard.',
      'Newcomers see where they are (Explorer, Joining member, Member) inside the next step, a line under each group, and why a locked page is locked.',
      'Accommodation and Resources become one page, Amenities & tools, that explorers can look around. Booking opens when you’re a joining member.',
      'Admin has Applications, Bookings and Permissions. Circle leads see Permissions without changing it.',
      'On a phone, a bar at the bottom with Dashboard, Operations (About for newcomers), Calendar, Members and Menu, each with its name.',
      'About {community} tells the Blueprint as a page to read: the photo, short facts and chapters (why we’re here, how we live, how we decide, joining…), with the whole plan still one click away.',
      'Amenities & tools and Admin › Bookings in the new look, and a calendar in Admin › Bookings that shows who stays where, day by day.',
      'Permissions lists each person’s role and circles, explains what each role can do, and gathers the settings only admins change.',
    ],
  },
  {
    version: 'v4.41.0',
    date: '2026-11-19',
    title: 'Building blocks and a new My dashboard',
    items: [
      'Shared buttons, status labels, filters, cards, lists, page headers, the next-step box, empty states and one hand-drawn icon set, so every page can move to the new look the same way. See them all at /design.',
      'With the new look on, My dashboard is redesigned: one next step on top, your tasks with filters, your project, the next event, open proposals and your circles.',
      'With the new look on, pop-ups get a light blurred backdrop and open from the bottom on phones.',
    ],
  },
  {
    version: 'v4.40.0',
    date: '2026-11-19',
    title: 'One vocabulary',
    items: [
      'The same words everywhere, from the new word list (LEXICON.md): tasks, To do, Requests, Members, Achievements, Agreements, and the assistant.',
      'Every module’s address matches its name: /operations, /members, /calendar, /circles, /accommodation, /resources, /achievements. Old links still work.',
      'A points log for agreements and awards, behind a switch that is off by default.',
    ],
  },
  {
    version: 'v4.39.0',
    date: '2026-11-19',
    title: 'A new look you can switch on',
    items: [
      'A community can turn on the redesigned look (“v4”): a pale blue page with white cards, Inter type, light capital labels, black main buttons and pastel colours that show status. Nothing changes for communities that don’t turn it on.',
    ],
  },
  {
    version: 'v4.38.4',
    date: '2026-11-19',
    title: 'Clearer suggestions',
    items: [
      'Each project manager suggestion now says in plain words what will happen, and its button names the action (for example “Give it to Sonia” or “Merge them”).',
    ],
  },
  {
    version: 'v4.38.3',
    date: '2026-11-19',
    title: 'Choose where a suggestion goes',
    items: [
      'On the project manager’s suggestions, “Put it in…” lets you make the new project in another circle or team, or add its tasks to an existing project. It tells you first when the tasks will move into another project.',
    ],
  },
  {
    version: 'v4.38.2',
    date: '2026-11-19',
    title: 'Click a module again to refresh it',
    items: [
      'Clicking the module you’re already on in the side menu reloads it with the latest information.',
    ],
  },
  {
    version: 'v4.38.1',
    date: '2026-11-19',
    title: 'Leads are members',
    items: [
      'A circle’s leads are now members of that circle automatically. If someone stops leading a circle, they stay a member.',
    ],
  },
  {
    version: 'v4.38.0',
    date: '2026-11-19',
    title: 'All tasks on the board',
    items: [
      'The board has a Projects | All tasks switch. All tasks shows every task as a card, including the ones inside projects, each tagged with its project. Projects shows the projects and the tasks with no project yet.',
    ],
  },
  {
    version: 'v4.37.0',
    date: '2026-11-19',
    title: 'Projects and teams',
    items: [
      'A project can belong to one of its circle’s teams, or to the whole circle. Pick it when you create the project or in its settings; it shows on the board and on the Circles page.',
      'In Operations › Circles, open a circle to see its projects, grouped by team.',
    ],
  },
  {
    version: 'v4.36.1',
    date: '2026-11-19',
    title: 'Accepted suggestions stay',
    items: [
      'After you accept a project manager suggestion, it stays on the panel as accepted, with a link to open the project it went into, until you reload the page.',
    ],
  },
  {
    version: 'v4.36.0',
    date: '2026-11-19',
    title: 'Talk to the agent from any page',
    items: [
      'The agent is now a small ✦ dot on every page. It sees what you’re looking at, so you can say “give this task to Sonia” or “move these into the cacao project”, and you confirm each change.',
      'On the project manager’s suggestions, “Tell the agent…” lets you say what should happen instead. The agent does it, and the project manager learns from it.',
    ],
  },
  {
    version: 'v4.35.0',
    date: '2026-11-18',
    title: 'Circle members',
    items: [
      'Circle leads and admins add members with “+ Add member” on the Circles page and in Ops › Circles; admins can also set them in Admin › Users.',
      'On your own profile, “My circles” shows the circles you’re in and lets you ask to join another. Its leads approve on the Circles page.',
    ],
  },
  {
    version: 'v4.34.0',
    date: '2026-11-18',
    title: 'Tasks without a project',
    items: [
      'A task doesn’t need a project any more: it sits on the main board with its circle. The hidden “chores” projects are gone, and their tasks are on the board.',
      'A task’s pop-up opens right on the board. It shows which project the task is in, and you can move it to another project, take it out of one, or give it to one of its circle’s teams.',
    ],
  },
  {
    version: 'v4.33.6',
    date: '2026-11-18',
    title: 'Paused projects on the board',
    items: [
      'The main board has a Paused column: drag a project there to pause it, or back out to restart it.',
    ],
  },
  {
    version: 'v4.33.5',
    date: '2026-11-18',
    title: 'Back to the board after a task',
    items: [
      'Closing a circle’s loose task takes you back to where you opened it, such as the main board, instead of a “chores” page.',
    ],
  },
  {
    version: 'v4.33.4',
    date: '2026-11-18',
    title: 'The task pop-up fits your screen',
    items: [
      'A task’s pop-up no longer runs off the screen on a computer or a phone: its fields scroll, and the Save and Delete buttons stay in view.',
    ],
  },
  {
    version: 'v4.33.3',
    date: '2026-11-18',
    title: 'Easier-to-read meeting summaries',
    items: [
      'A meeting’s summary shows each topic as its own card with a heading, instead of raw text.',
    ],
  },
  {
    version: 'v4.33.2',
    date: '2026-11-18',
    title: 'Confirm drafts from the meeting page',
    items: [
      'On a meeting’s page, leads can slide a task’s Draft pill right to approve it or left to decline it, as on the board.',
    ],
  },
  {
    version: 'v4.33.1',
    date: '2026-11-18',
    title: 'A tidier operations page',
    items: [
      'The project manager’s panel on the board starts collapsed: press Show to see its suggestions. The Project manager button on a circle page still opens it.',
    ],
  },
  {
    version: 'v4.33.0',
    date: '2026-11-18',
    title: 'Slide a draft to approve or decline it',
    items: [
      'Leads can slide a task’s Draft pill right to approve it or left to decline it, on the board, the task list and the project page. A declined task can be brought back with Undo for a few seconds.',
      'A task you decline or delete doesn’t come back when its meeting is processed again.',
      'Signing up with an address that already has an account now says so, with links to sign in or reset your password. If the confirmation email doesn’t arrive, you can have it sent again.',
    ],
  },
  {
    version: 'v4.32.1',
    date: '2026-11-18',
    title: 'The meeting agent gets the time it needs',
    items: [
      'A new meeting is read by the agent within about 2 minutes, with enough time for long meetings. Before, a long meeting could run out of time and wait for a lead.',
      'If the AI still can’t read a meeting, the agent tries again by itself, up to 3 times. A lead can also choose its circle meanwhile.',
      'The meetings list shows “Agent reading soon” for a meeting that has just come in.',
    ],
  },
  {
    version: 'v4.32.0',
    date: '2026-11-18',
    title: 'Task priority, and names without an account',
    items: [
      'Each task has a priority: None, Low, Med or High, set with a slider in its pop-up and shown on the board.',
      'In a task’s pop-up, Assigned to has “Type a name…” for someone who isn’t on MyCoNet yet. It’s just a name on the task: no account or invite is made.',
      'Once they join, pick their account and the name goes away. Tasks from meetings use the same name tag instead of “(for …)” in the title.',
    ],
  },
  {
    version: 'v4.31.0',
    date: '2026-11-18',
    title: 'More in the task pop-up',
    items: [
      'A task’s pop-up now has its status, who it’s assigned to, and notes. Saving a draft from a meeting still confirms it.',
      'The person a task is assigned to can update its status and notes themselves.',
    ],
  },
  {
    version: 'v4.30.0',
    date: '2026-11-17',
    title: 'Every circle has its space in the second brain',
    items: [
      'Each circle has a folder in the second brain with its index (purpose, leads, projects, recent meetings, what’s in the folder) and its board status, kept up to date by MyCoNet.',
      'A new circle gets its folder automatically within minutes; a renamed or retired one is updated. Notes people write in a circle’s README are left as they are.',
    ],
  },
  {
    version: 'v4.29.0',
    date: '2026-11-17',
    title: 'The agent can do what you can do',
    items: [
      'Ask / Do now reaches beyond the board: roles and circle leadership, circles, the org chart (who’s in which circle or team), projects and tasks.',
      'Those changes are made with your own permissions, so the agent can do exactly what you could do yourself, and nothing more. You confirm each one, and each can be undone.',
    ],
  },
  {
    version: 'v4.28.0',
    date: '2026-11-17',
    title: 'Ask the agent to create a circle',
    items: [
      'Admins and circle leads can ask the agent (Do tab) to create a new circle, e.g. “add an Incubator circle for new ventures until they stand on their own”. Undo retires it.',
    ],
  },
  {
    version: 'v4.27.0',
    date: '2026-11-17',
    title: 'Add a circle from the circle pages',
    items: [
      'Admins can add a circle straight from Operations › Circles and the Circles chart: a name, a one-line purpose and an emoji.',
    ],
  },
  {
    version: 'v4.26.0',
    date: '2026-11-17',
    title: 'Ask / Do: tell the agent what to change',
    items: [
      'Signed in, the assistant has a Do tab: say what to change on the board (merge or rename projects, move tasks, give a task to someone, set dates, confirm drafts).',
      'The agent shows exactly what it will do first; you confirm, it acts with your own rights, and every change can be undone.',
    ],
  },
  {
    version: 'v4.25.0',
    date: '2026-11-17',
    title: 'A project manager for every circle',
    items: [
      'When a meeting adds tasks, the MyCoNet agent reviews the circle’s whole board: it merges its own duplicate drafts and files tasks into projects when it’s sure (each can be undone).',
      'It suggests new projects, merges, moves and who could take a task; circle leads accept or dismiss them in the 🧭 Project manager panel on the board, reached from each circle’s page.',
      'Each circle’s board status is kept in the second brain.',
    ],
  },
  {
    version: 'v4.24.3',
    date: '2026-11-17',
    title: 'Meeting tasks join a project only when it’s clear',
    items: [
      'A meeting task goes into an existing project only when the agent is very sure it belongs there (it says why); everything else stays on the main board with its circle.',
    ],
  },
  {
    version: 'v4.24.2',
    date: '2026-11-17',
    title: 'No more “(for Unassigned)”',
    items: [
      'Meeting tasks no longer get “(for Unassigned)” or “(for Kitchen Circle)” in their title: those are Fireflies headings, not people.',
    ],
  },
  {
    version: 'v4.24.1',
    date: '2026-11-17',
    title: 'Meeting tasks always on the main board',
    items: [
      'Tasks from a meeting now always go on the main board, tagged with their circle, never inside a project as subtasks.',
    ],
  },
  {
    version: 'v4.24.0',
    date: '2026-11-17',
    title: 'Circle tasks on the main board',
    items: [
      'A circle’s one-off tasks (from meetings or + Task) are now cards on the main board, tagged with their circle, instead of sitting inside a “Chores” card.',
    ],
  },
  {
    version: 'v4.23.1',
    date: '2026-11-17',
    title: 'Long meetings finish',
    items: [
      'Meetings with many tasks no longer stop before their second-brain note is written.',
    ],
  },
  {
    version: 'v4.23.0',
    date: '2026-11-17',
    title: 'Meetings named by date and content, all of it in the second brain',
    items: [
      'Meetings are named like “17.11.2026 Kitchen lead handover”: the date, then a name from the title people gave and what was discussed.',
      'Each meeting goes to the second brain in full: summary, Fireflies’ notes, bullet points, outline, topics, keywords, tasks, and the transcript in its own file.',
      'Meetings that came in but weren’t finished are completed automatically every few minutes.',
    ],
  },
  {
    version: 'v4.22.1',
    date: '2026-11-17',
    title: 'Only this community’s meetings',
    items: [
      'Fireflies’ “summary ready” calls only update meetings that are already in MyCoNet. Other calls recorded on the same Fireflies account are ignored.',
    ],
  },
  {
    version: 'v4.22.0',
    date: '2026-11-17',
    title: 'Meeting documents in tabs',
    items: [
      'At the bottom of a meeting page, a tab for each document: Fireflies’ notes, outline, bullet points, topics and keywords, the second-brain note and the transcript.',
    ],
  },
  {
    version: 'v4.21.2',
    date: '2026-11-17',
    title: 'Meeting summaries arrive when Fireflies has them',
    items: [
      'Fireflies writes a meeting’s summary and action items a few minutes after the transcript. MyCoNet now hears when they’re ready, fetches them and lets the agent read the meeting again, without adding tasks twice.',
    ],
  },
  {
    version: 'v4.21.1',
    date: '2026-11-17',
    title: 'Fixes after a review',
    items: [
      'Setting the circle on a meeting the agent skipped now puts its tasks on the board.',
      'Removing a meeting’s circle also makes it visible to everyone again (no more Circle only without a circle).',
      'Task and project dates no longer show a day early on the home page, the board’s At risk count and project deadlines.',
    ],
  },
  {
    version: 'v4.21.0',
    date: '2026-11-17',
    title: 'Meetings turn into tasks on the board',
    items: [
      'Meetings recorded in Fireflies turn into tasks by themselves: the agent reads the whole meeting, works out which circle it’s about (or that it’s community-wide), and puts each task on the board as a draft in the right circle and project, with who and by when. It skips what’s already on the board, and leaves meetings that aren’t the community’s alone.',
      'The leads of the circles involved get the notes by email, with links to the tasks. People who aren’t on the portal yet are listed so their tasks can be passed on.',
      'The notes are saved to the community’s second brain too (summary and tasks; the transcript stays in the portal).',
      'Meetings has filters by circle, My circles and search, and every circle has a Meeting notes button. A meeting can be Circle only, for just that circle.',
      'On the board, a Drafts card shows the tasks waiting to be confirmed.',
    ],
  },
  {
    version: 'v4.20.0',
    date: '2026-11-17',
    title: 'Tasks with a time and a circle, and on the calendar',
    items: [
      'Tasks on the board can have a time as well as a date, and a circle (the project’s circle unless you choose another).',
      '+ Task on the board adds a one-off task for a circle, like a kitchen clean-up on Saturday at 4 PM. It goes into that circle’s Chores, made the first time.',
      'The calendar’s Tasks checkbox shows the board’s dated tasks. Click one to open it on the board. Tasks are added and changed on the board; the calendar is for events.',
      'Tasks drafted for you (for example from a meeting’s action items) show a Draft badge until a lead opens and saves them.',
      'Due dates no longer show a day early in time zones west of UTC.',
    ],
  },
  {
    version: 'v4.19.0',
    date: '2026-11-17',
    title: 'Meetings, and everyone works from the newest code',
    items: [
      'Meetings (Sonia’s, M18): upload a meeting recording and it’s transcribed and summarised by Fireflies, with action items by person and the full transcript. Meetings recorded straight in Fireflies come in too, marked for review. An optional module: on for communities that turn it on.',
      'Working on the code: every session starts with a check that pulls the newest code, shows what others changed and who is working on what right now, and warns when files overlap. Deploys are refused when the code isn’t on GitHub, is behind, or is older than what’s live, so one person’s deploy can’t undo another’s.',
      'The portal reports its version and commit at /api/version.',
    ],
  },
  {
    version: 'v4.18.2',
    date: '2026-11-16',
    title: 'How changes are made',
    items: [
      'Behind the scenes only: new working rules for the people and AI agents who build MyCoNet. Each change is now marked as for every community or for this one only, and community-only changes are logged.',
    ],
  },
  {
    version: 'v4.18.1',
    date: '2026-11-16',
    title: 'Week view like Google Calendar',
    items: [
      'On a computer or tablet, the Week view is now a time grid: hours down the side, one column per day, each event placed at its time and as tall as it lasts, so the rows line up across the week. Overlapping events sit side by side, all-day events sit in a strip at the top, and a red line marks the time now. It opens scrolled to the morning.',
      'On phones the Week view stays as it was, one card per day.',
    ],
  },
  {
    version: 'v4.18.0',
    date: '2026-11-16',
    title: 'Add events from a photo',
    items: [
      'Events › 📷 Add from a photo: take a photo of the schedule board, pick the week, and the AI reads the notes (about a minute or two). You check every event, fix anything misread, and add the ones you tick. Events already on the calendar are spotted and left unticked.',
      'The new events go to the linked Google calendar too, like any event posted from the form.',
      'Who can use it: admins, and the leads and people of one circle that admins choose under Linked calendars (on Protopia, Community Hosting).',
    ],
  },
  {
    version: 'v4.17.7',
    date: '2026-11-15',
    title: 'Weeks start on Monday',
    items: [
      'The Events calendar now runs Monday to Sunday, in the month and week views.',
    ],
  },
  {
    version: 'v4.17.6',
    date: '2026-11-14',
    title: 'Event categories from a set list',
    items: [
      'The category checkboxes are back above the calendar (undoing v4.17.5).',
      'When you post or edit an event, the category is now picked from a list (Food, Movement, Focus hours) instead of typed, so new categories can’t be added by accident.',
    ],
  },
  {
    version: 'v4.17.5',
    date: '2026-11-14',
    title: 'Tidier calendar filters',
    items: [
      'Event categories no longer add their own row of checkboxes above the calendar. The top shows just the kinds of events; categories still show as coloured dots on events and in the legend.',
    ],
  },
  {
    version: 'v4.17.4',
    date: '2026-11-14',
    title: 'Find your Big Five',
    items: [
      'Profile › Personality now invites you to take the free Big Five test at bigfivepersonality.me, then set the OCEAN sliders to match.',
    ],
  },
  {
    version: 'v4.17.3',
    date: '2026-11-14',
    title: 'Website scans stop on time',
    items: [
      'A website scan now always stops by itself within about 5 minutes, even on a big site full of links that don’t load, and gives up after a minute if the site doesn’t answer. Before, it could keep going for over an hour.',
      'Sites built only with JavaScript (the text appears only after the page runs) have nothing to read: the scan now says so straight away. Upload a document for those.',
      'While it reads, it shows how many pages it read and how many it tried.',
    ],
  },
  {
    version: 'v4.17.1',
    date: '2026-11-14',
    title: 'Easier to find: Change time',
    items: [
      'Change time is now a clear button with a clock, next to the event’s date.',
    ],
  },
  {
    version: 'v4.17.0',
    date: '2026-11-14',
    title: 'Changes go to Google Calendar',
    items: [
      'When someone changes the time of an event that came from your Google calendar, Google gets the new time too (just that date, for a repeating event).',
      'Public events posted in MyCoNet can now be added to your Google calendar, and later edits and deletion follow. Admins turn this on per calendar in Linked calendars: “Add public MyCoNet events to Google”.',
      'You’ll see “here and in Google Calendar” when it worked, or why Google wasn’t updated.',
    ],
  },
  {
    version: 'v4.16.5',
    date: '2026-11-14',
    title: 'Blueprint confirms imported answers',
    items: [
      'When you apply answers from an import, the Blueprint saves them straight away and confirms it: “✓ Blueprint updated: 24 answers saved.” If they can’t be saved, it says so.',
    ],
  },
  {
    version: 'v4.16.4',
    date: '2026-11-14',
    title: 'Anyone can change an event’s time',
    items: [
      'Everyone signed in can now change when an event starts and ends: open the event and tap Change time. Only the time; the rest stays with the host.',
      'This works on events from a linked calendar too, and the next sync won’t change the time back. The event shows who changed the time and when.',
    ],
  },
  {
    version: 'v4.16.3',
    date: '2026-11-13',
    title: 'Imports combine answers',
    items: [
      'When an import finds something for a question you’ve already answered, the AI now writes one answer that combines both, keeping every fact once, instead of adding the new text after yours. You see the combined answer before applying, and can still keep yours or replace it.',
    ],
  },
  {
    version: 'v4.16.2',
    date: '2026-11-13',
    title: 'Layout fixes, Achievements, and safer decisions',
    items: [
      'Blueprint › Import from a website now reads the whole site, not just 8 pages: every page it lists or links to, up to 300, with a running count and a Stop here button.',
      'Desktop: a new arrow in the top bar collapses the side menu for more room, and remembers your choice. (Thanks, Sonia.)',
      'Phones: pages with two columns no longer get cut off at the edge; they stack into one column. The Ask button no longer covers the end of the page. (Thanks, Sonia.)',
      'Profile photos: the Use photo button now looks clickable, and a new crop shows everywhere straight away, not only on the edit page. (Thanks, Sonia.)',
      'Contributions is now called Achievements in the menu and search. (Thanks, Sonia.)',
      'Join: only admins see Accept, Decline and Mark reviewing (they were the only ones who could use them), and the screen only changes when the decision is saved. (Thanks, Max.)',
      'Governance: whoever makes a proposal can withdraw it while it’s open, but can’t mark it passed or rejected. (Thanks, Max.)',
      'Agreements: new agreements always start as pending, and only admins and project leads can accept them. (Thanks, Max.)',
    ],
  },
  {
    version: 'v4.16.1',
    date: '2026-11-13',
    title: 'MyCoNet in the phone top bar',
    items: [
      'On phones, the top bar now shows MyCoNet above your community’s name, above the version.',
    ],
  },
  {
    version: 'v4.16.0',
    date: '2026-11-13',
    title: 'Fill the Blueprint from your website',
    items: [
      'Blueprint › Import now takes a website address too. It reads the page and up to 7 pages it links to (about, mission, governance…) and suggests answers, the same way it does for documents. Answers show which page they came from.',
      'Imports no longer overwrite what you have written. Where a question already has an answer, the new text is added after it; you can still choose Keep current or Replace it for each one.',
      'Every document or website you import is now saved in Setup › Documents, as shareable or sensitive, so the portal assistant can answer from it.',
    ],
  },
  {
    version: 'v4.15.8',
    date: '2026-11-13',
    title: 'Only admins and circle leads change the blueprint',
    items: [
      'The Blueprint can now be changed by any admin or circle lead, and only by them. Before, only the person who first set it up could save; other admins and circle leads could type in it but their changes were lost.',
      'If a change can’t be saved, the Blueprint now says so instead of losing it quietly.',
    ],
  },
  {
    version: 'v4.15.7',
    date: '2026-11-13',
    title: 'Find your personality type',
    items: [
      'Profile › Personality now invites you to find your Myers-Briggs type with the free test at 16personalities.com, then pick it.',
    ],
  },
  {
    version: 'v4.15.6',
    date: '2026-11-13',
    title: 'The calendar opens on today',
    items: [
      'A new Day view shows one day’s events in full, and the calendar now opens on it, on today. Use ‹ › to move a day at a time, or pick Week, Month or List.',
      'Tapping a day in Month opens that day. On a day with nothing on, it links to the next day that has something.',
    ],
  },
  {
    version: 'v4.15.5',
    date: '2026-11-13',
    title: 'Position your profile photo',
    items: [
      'When you choose a profile photo, you can drag and zoom it inside a circle. That exact crop is saved, so your photo looks the same everywhere. Thanks to Sonia.',
      'If a photo’s format can’t be opened (often iPhone HEIC photos), it tells you to use a JPG or PNG instead.',
    ],
  },
  {
    version: 'v4.15.4',
    date: '2026-11-13',
    title: 'Top bar fits on phones',
    items: [
      'On phones the top bar grows to fit, so the Modules button, the full-size logo and the version no longer spill below it. Your name there is shown as just your photo.',
    ],
  },
  {
    version: 'v4.15.1',
    date: '2026-11-13',
    title: 'One list of circle leads',
    items: [
      'The org chart, Ops › Circles and Blueprint › Circles now show the same lead for each circle. Change it in any of them and the others update straight away.',
      'Ops › Circles and the Blueprint also show the circle leads who have an account, and Ops marks the steward circle.',
    ],
  },
  {
    version: 'v4.15.0',
    date: '2026-11-13',
    title: 'Circle leads and the steward circle',
    items: [
      'Each circle on the org chart shows its lead’s name, even if they aren’t on the portal yet. Admins type or change it right on the card.',
      'A community can mark one circle as its stewards, the circle that looks after every circle. It sits at the top of the org chart, with the admins.',
    ],
  },
  {
    version: 'v4.14.1',
    date: '2026-11-13',
    title: 'You choose who sees your fears and healing journey',
    items: [
      'Profile › Edit › Goals & Growth now asks who can see your fears and healing journey: only you, full members, joining members and up, everyone signed up, or anyone. It starts at full members.',
      'Calendar events named like a circle find it even when the name is a little different, for example "Clean Circle" goes in the Cleaning circle.',
    ],
  },
  {
    version: 'v4.14.0',
    date: '2026-11-13',
    title: 'Public profiles and admin rights',
    items: [
      'Profiles have an “About you” bio and website, Instagram, LinkedIn and X links. Anyone can see your name, photo, headline, bio and links.',
      'Everything else on a profile (location, values, skills, personality, offers, requests, travel) is now only for people who have signed up. Visitors see those sections shaded, with an invitation to sign up.',
      'Only admins can edit other people’s profiles. Circle and project leads could before; project leads also no longer see every join application. Thanks to Max for finding and fixing both.',
    ],
  },
  {
    version: 'v4.13.2',
    date: '2026-11-12',
    title: 'A colour for each calendar',
    items: [
      'Daily events are green, Core events indigo, Community hosted pink and Tasks orange, on the calendar, the checkboxes and the legend. Categories like Food and Movement show as a small dot on each event.',
    ],
  },
  {
    version: 'v4.13.1',
    date: '2026-11-12',
    title: 'Event descriptions and comments',
    items: [
      'Every event has a comment thread. Everyone signed in can read it; full members can comment and delete their own comments, and admins can delete any.',
      'Full members can add a description to events from a linked Google calendar (+ Add a description in the event). Updates from Google never overwrite it.',
    ],
  },
  {
    version: 'v4.12.2',
    date: '2026-11-12',
    title: 'Passwords',
    items: [
      'Change your password any time from the menu › Change password, without an email.',
      'Password reset links work whichever way they were sent, and an expired link explains what to do next.',
      'If a reset email doesn\'t arrive, admins can now see why: every request is recorded for 30 days, including addresses typed slightly differently from the account (like a Gmail address without its dot).',
    ],
  },
  {
    version: 'v4.12.1',
    date: '2026-11-12',
    title: 'Show several calendars at once',
    items: [
      'The calendar\'s Daily events, Core events, Community hosted and Tasks are now checkboxes, so you can see any mix of them together. Categories like Food and Movement are checkboxes too.',
    ],
  },
  {
    version: 'v4.12.0',
    date: '2026-11-12',
    title: 'Daily events and categories',
    items: [
      'A new "Daily events" calendar for the community\'s rhythm, such as meals, movement and focus hours, alongside Core events, Community hosted and Tasks.',
      'Events can have a category ("Food", "Movement"…), with filter buttons and a colour for each.',
      'Linked calendars can sort their events: for example, everything titled Breakfast, Lunch or Dinner goes to Daily events › Food.',
    ],
  },
  {
    version: 'v4.11.0',
    date: '2026-11-11',
    title: 'Linked calendars',
    items: [
      'Admins can link the community\'s Google Calendar (or any calendar with an iCal link) from the Calendar page. Its events appear on the community calendar for the next three months and stay up to date: repeating events, changes and cancellations follow the original calendar.',
      'Events named after a circle, like "Farming Circle", are placed in that circle automatically.',
      'Linked events are marked as such and are edited in the original calendar.',
    ],
  },
  {
    version: 'v4.10.1',
    date: '2026-11-11',
    title: 'Working rules for contributors',
    items: [
      'The code now spells out how to contribute: every change goes on its own branch and in a pull request for review, never straight to the live version. The same rules are written for AI coding assistants.',
    ],
  },
  {
    version: 'v4.10.0',
    date: '2026-11-05',
    title: 'Home page: every module at a glance',
    items: [
      'The landing page and Home now open with "The portal at a glance": a card for every module with a one-line explanation, a jump to its preview further down, and a link to open it.',
      'A new section introduces the community assistant, with example questions that open the chat.',
      'The demo panels show the community\'s own name, and the Join preview shows the community\'s real values once they are written (until then, clearly labelled examples).',
    ],
  },
  {
    version: 'v4.9.0',
    date: '2026-11-05',
    title: 'Admin › Questions: what people ask the assistant',
    items: [
      'Every question asked to the community assistant is saved with its answer, who asked (or "Visitor") and when.',
      'Questions the community\'s material couldn\'t answer are flagged "No answer", in any language, so admins can see what to add to the Blueprint or the documents.',
      'New Admin › Questions tab next to Users: "Needs an answer" first, filters for All / Resolved / Dismissed, search, the full answer, notes, and Mark resolved / Dismiss / Reopen. The tab shows how many questions are waiting.',
      'The chat now says that questions are saved to improve the community\'s answers.',
    ],
  },
  {
    version: 'v4.8.0',
    date: '2026-11-05',
    title: 'The search bar works',
    items: [
      'Type in the top bar to find pages, members, projects, proposals, calendar events and circles. You only see what you are allowed to see.',
      'The last suggestion always asks the community assistant your question, so a search that finds nothing still gets an answer.',
      '⌘K (Ctrl+K on Windows) jumps to the search from anywhere; arrow keys and Enter pick a result.',
    ],
  },
  {
    version: 'v4.7.0',
    date: '2026-11-05',
    title: 'Bigger top bar, and a picture when the link is shared',
    items: [
      'The top bar is taller across the whole portal, with a bigger logo and community name.',
      'Sharing the portal\'s link (WhatsApp, Telegram, Slack, email, social media) now shows a preview picture, title and description. Admins set the picture in Blueprint › Look & feel (a screenshot of the home page works well); until then the banner is used. The logo also becomes the browser tab icon.',
    ],
  },
  {
    version: 'v4.6.0',
    date: '2026-11-05',
    title: 'Ask the community: a portal assistant',
    items: [
      'An "Ask <community>" button on every page opens a chat that answers questions from the community\'s Blueprint and documents, quoting where each answer comes from (for example "Handbook p. 12"). It answers in the language you write in, and says so when the material doesn\'t cover a question.',
      'Visitors can ask 2 questions before signing in; everyone signed in can keep asking.',
      'New Blueprint step, Documents: the community\'s library. Every upload asks what kind of document it is: Shareable (the assistant may use it for anyone) or Sensitive (only admins and circle leads get answers from it). The Blueprint import asks too, and adds the document.',
    ],
  },
  {
    version: 'v4.5.0',
    date: '2026-11-05',
    title: 'Blueprint import: faster, starts on its own, shows its progress',
    items: [
      'Dropping a document starts the import straight away: no separate "Scan" button.',
      'A live checklist shows what is happening: reading the PDF (page by page), finding what the document says about each question (per framework phase, with a running count), writing your answers, and looking for the logo and banner, with a timer.',
      'Much faster and more reliable on long, detailed documents: a fast model gathers the quotes, and the full model writes the answers. Before, a detailed 70-page handbook could take 30 minutes or fail.',
      'The logo and banner search runs at the same time as the text, and can be skipped.',
    ],
  },
  {
    version: 'v4.4.0',
    date: '2026-11-05',
    title: 'Blueprint import: reads the whole document, answers with sources',
    items: [
      'The document import now uses MiniMax M3. It reads up to about 400 pages, in one go for most documents (it used to cut documents into many small pieces, and big files failed with "Prompt too long").',
      'It works in two steps: first it collects quotes for every Blueprint question from the whole document, then it writes each answer from all of them. Answers that combine several pages come out as one answer instead of fragments.',
      'Each proposed answer shows how sure the AI is, the pages it came from, and a warning when the document contradicts itself or your current answer. Answers the AI isn\'t sure about start unticked.',
      'The review lists the questions the document doesn\'t cover, so you know what\'s left to write.',
      'Logo and banner: the AI now looks at the images from your PDF and marks its picks. Big image-heavy PDFs are handled safely, with a Skip button.',
      'If part of the scan fails, the rest of the answers are kept and the review says what was missing.',
    ],
  },
  {
    version: 'v4.3.0',
    date: '2026-11-04',
    title: 'Blueprint import finds your logo and banner',
    items: [
      'When an admin imports a PDF into the Blueprint, the wizard also looks through its images and suggests a logo (an image repeated across pages, or a small one on the cover) and a banner (a wide, high-resolution photo).',
      'The review screen shows them as thumbnails next to the proposed answers, with the best guesses selected where the community has none yet. Pick another, or None; they are saved together with the answers.',
    ],
  },
  {
    version: 'v4.2.1',
    date: '2026-11-04',
    title: 'Database hardening',
    items: [
      'Two internal database functions (the signup hook and the automatic security switch for new tables) can no longer be called from outside, and six functions now use a fixed search path. Nothing changes for members.',
    ],
  },
  {
    version: 'v4.2.0',
    date: '2026-11-04',
    title: "Each community's own look, and core updates by pull request",
    items: [
      'The top bar now reads "MyCoNet · <community name>", with the community\'s logo. The name also appears in the browser tab, the sign-in page, the landing page, Home and the footer.',
      'A banner image can run across the top of the landing page, Home and the Dashboard.',
      'New Blueprint setup step, "Look & feel": admins upload the logo and banner. Until they do, the Blueprint dashboard lists them as open setup items and admins see a prompt where the banner goes.',
      'For each community repo: a daily check opens a pull request when MyCoNet core has a new release, a drift check flags changes to core files, and `npm run upstream` sends an improvement back to core.',
    ],
  },
  {
    version: 'v4.1.0',
    date: '2026-11-04',
    title: 'Join: application questions and community values set in the Blueprint',
    items: [
      'The application form now shows each question from the Blueprint (Step 1.4 · First Agreements) with its own answer box. Admins see every answer, under the wording the applicant saw, plus the "anything else" note.',
      'Community values are edited in the Blueprint too: Step 1.4 has a new Community values section to add, edit, reorder and remove the values members sign.',
      'The joining steps stay the same for every community. If the values or questions haven\'t been written yet, those steps say so and link to Step 1.4 instead of showing an empty list.',
      'Fixed: with no values, the first joining step showed "Sign 0 more to continue" and couldn\'t be passed.',
      'The Blueprint can open on a given step: /blueprint?step=s1.4.',
    ],
  },
  {
    version: 'v4.0.0',
    date: '2026-11-03',
    title: 'MyCoNet core: one codebase for every community',
    items: [
      'MyCoNet is now a core that each community runs from, with its own database, hosting and settings. RTRN (Regen Hood 0) is the first community; Protopia is next.',
      'Each community\'s settings live in one file (instance/config.jsonc): name, web address, Cloudflare and Supabase. The community name and the "open sourced by The Regen Tribe Collective" credit come from there.',
      'Circles are the community\'s own: set during setup in the Blueprint\'s new Circles step. The AI document scan suggests circles (each with a quote from the document), or start from the neighborhood org chart template, whose roles become teams on the Circles page. Admins can rename, retire and restore circles.',
      'The Blueprint shows a reminder until the community has at least one circle.',
      'The Neighborhood Directory (M02) and Resources & Tools (M03) links are gone; they become a separate platform.',
      'Fixed: choosing Advisor in Admin › Users failed to save.',
    ],
  },
]

export default function ChangelogPage() {
  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '56px 24px 80px' }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{
          display: 'inline-block', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--accent)', background: 'var(--accent-soft)',
          padding: '3px 10px', borderRadius: 20, marginBottom: 16,
        }}>
          Release notes
        </div>
        <h1 style={{
          fontFamily: 'var(--display)', fontSize: 40, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 12,
        }}>
          Changelog
        </h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.6 }}>
          What's new in MyCoNet, release by release.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {ENTRIES.map((entry, i) => (
          <div key={entry.version} className="changelog-timeline" style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr',
            gap: '0 28px',
            paddingBottom: 40,
          }}>
            {/* Left column — version + date */}
            <div className="changelog-meta" style={{ paddingTop: 3 }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                color: 'var(--accent)', letterSpacing: '0.04em',
              }}>
                {entry.version}
              </div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)',
                marginTop: 4, letterSpacing: '0.02em',
              }}>
                {entry.date}
              </div>
            </div>

            {/* Right column — content */}
            <div style={{
              borderLeft: '1px solid var(--rule)',
              paddingLeft: 28,
              position: 'relative',
            }}>
              {/* Timeline dot */}
              <div style={{
                position: 'absolute', left: -5, top: 6,
                width: 9, height: 9, borderRadius: '50%',
                background: i === 0 ? 'var(--accent)' : 'var(--rule)',
                border: '1.5px solid var(--surface)',
                boxShadow: `0 0 0 1.5px ${i === 0 ? 'var(--accent)' : 'var(--rule)'}`,
              }} />

              <div style={{
                fontFamily: 'var(--display)', fontSize: 20, marginBottom: 12,
                color: 'var(--ink)',
              }}>
                {entry.title}
              </div>

              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entry.items.map((item, j) => (
                  <li key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--ink-4)', flexShrink: 0, marginTop: 2, fontSize: 12 }}>—</span>
                    <span style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.65 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        borderTop: '1px solid var(--rule)', paddingTop: 32, marginTop: 8,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Link href="/" style={{
          fontSize: 13, color: 'var(--ink-3)', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ← Back to home
        </Link>
        <span style={{ color: 'var(--rule)', fontSize: 12 }}>|</span>
        <Link href="/blueprint" style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>
          Open Blueprint Wizard
        </Link>
      </div>
    </div>
  )
}
