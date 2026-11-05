/**
 * One line per portal module, for the "at a glance" grid on the landing page and Home.
 * `anchor` is the id of that module's preview section further down the page ("a|b": the first that exists).
 */
export interface ModuleGuide { num: string; name: string; color: string; href: string; anchor: string; what: string }

export const MODULE_GUIDE: ModuleGuide[] = [
  { num: '00', name: 'Dashboard',     color: 'var(--ink)',  href: '/dashboard',     anchor: 'how-it-works|clubhouse',  what: 'Your personal start page: what needs you today, your next step, and the community at a glance.' },
  { num: '01', name: 'Members',       color: 'var(--m1)',   href: '/network',       anchor: 'meet',          what: 'Profiles of everyone involved, what they offer and seek, and AI matches for who to meet first.' },
  { num: '14', name: 'Calendar',      color: 'var(--m14)',  href: '/events',        anchor: 'events',        what: 'Community events, gatherings and work days, plus tasks anyone can sign up to help with.' },
  { num: '04', name: 'Blueprint',     color: 'var(--m4)',   href: '/blueprint',     anchor: 'blueprint',     what: 'The neighborhood plan, phase by phase (Spark → Prove → Build → Live), open for everyone to read.' },
  { num: '05', name: 'Join',          color: 'var(--m5)',   href: '/join',          anchor: 'join',          what: 'How to become part of it: sign the values, meet a buddy, answer a few questions.' },
  { num: '15', name: 'Accommodation', color: 'var(--m15)',  href: '/stays',         anchor: 'stays',         what: 'Rooms, cabins and beds to book by the night for visits, retreats and work stays.' },
  { num: '16', name: 'Resources',     color: 'var(--m16)',  href: '/bookings',      anchor: 'resources',     what: 'Shared tools, vehicles and spaces to borrow or book by the hour or day.' },
  { num: '06', name: 'Agreements',    color: 'var(--m6)',   href: '/agreements',    anchor: 'agreements',    what: 'Offer help on an open project and agree up front what you give and what you get.' },
  { num: '17', name: 'Circles',       color: 'var(--m17)',  href: '/org',           anchor: 'circles',       what: 'Who does what: the working circles, their roles, leads and teams.' },
  { num: '07', name: 'Operations',    color: 'var(--m7)',   href: '/ops',           anchor: 'ops',           what: 'Every project and task on one board, from idea to done, with updates along the way.' },
  { num: '08', name: 'Contributions', color: 'var(--m8)',   href: '/contributions', anchor: 'contributions', what: 'The log of what each person has given, with points and badges that build trust.' },
  { num: '09', name: 'Governance',    color: 'var(--m9)',   href: '/governance',    anchor: 'governance',    what: 'Proposals and decisions, by consent, vote or expert advice, with an AI check against the plan.' },
]
