// Turns an export of the live portal (live/raw.json) into live/live-data.js for app.html.
// The live/ folder holds real members' data: it stays on this computer and is never committed.
//   node live-build.mjs
import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync(new URL('./live/raw.json', import.meta.url)));
const TZ = 'America/Costa_Rica';
const ME = raw.me;
const key = u => !u ? '' : u === ME ? 'MO' : u;
const PASTEL = ['#F3D9B1','#D8E3C8','#F1D9C6','#DCE3F2','#E8D3E3','#F6E2B8','#CFE0EE','#D9D2EE','#E6DDCB','#D4E4DA','#E9DFC9','#E3E6EF','#F0DCD4','#DDE7D2'];
const ROLE = {explorer:'explorer', joining:'joining member', member:'member', project_lead:'project lead', circle_lead:'circle lead', advisor:'advisor', admin:'admin'};
const ST = {pending:'idea', backlog:'todo', in_progress:'doing', review:'review', done:'done', paused:'paused'};
const ini = n => { const w = n.replace(/[^\p{L}\s]/gu,'').trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0,2)).toUpperCase(); };
const fmt = (iso, o) => new Intl.DateTimeFormat('en-GB', {timeZone: TZ, ...o}).format(new Date(iso));
const day = iso => ({day: +fmt(iso,{day:'numeric'}), dow: fmt(iso,{weekday:'short'}), month: fmt(iso,{month:'short'}), time: fmt(iso,{hour:'2-digit', minute:'2-digit', hour12:false})});
const due = d => { if (!d) return ''; const x = day(d + 'T12:00:00Z'); return `${x.dow} ${x.day} ${x.month}`; };
const firstName = n => n.split(' ')[0];

/* circles and teams */
const circleUnit = {}; raw.units.filter(u => u.k === 'circle').forEach(u => circleUnit[u.c] = u.id);
const unitPeople = id => [...new Set(raw.um.filter(m => m[0] === id && m[1]).map(m => key(m[1])))];
const teamName = {}; raw.units.filter(u => u.k === 'team').forEach(u => teamName[u.id] = u.n);

const people = {};
raw.people.forEach((p, i) => {
  const k = key(p.i);
  const inCircles = raw.circles.map(c => c.s).filter(s => (p.lc || []).includes(s) || unitPeople(circleUnit[s]).includes(k));
  people[k] = {
    name: p.n, ini: ini(p.n), c: PASTEL[i % PASTEL.length], av: p.av || '', rawRole: p.r,
    role: ROLE[p.r] || p.r, circles: inCircles, leads: p.lc || [],
    bio: p.bio || p.h || '', headline: p.h || '', city: p.c || '',
    offers: raw.offers.filter(o => o[0] === p.i).map(o => o[1]),
    requests: raw.requests.filter(o => o[0] === p.i).map(o => o[1])
  };
});

const circles = {};
raw.circles.forEach(c => {
  const leads = Object.keys(people).filter(k => people[k].leads.includes(c.s));
  const members = [...new Set([...leads, ...unitPeople(circleUnit[c.s])])];
  const teams = raw.units.filter(u => u.k === 'team' && u.c === c.s).map(u => ({name: u.n, people: unitPeople(u.id)}));
  circles[c.s] = {name: c.n, c: c.c, leads, members, teams, steward: !!c.st, about: ''};
});

const tasks = raw.tasks.map((t, i) => ({
  id: 't' + i, title: t.t, project: t.p || null,
  circle: t.c || (raw.projects.find(p => p.i === t.p) || {}).c || '',
  team: teamName[t.tm] || '', who: key(t.w), whoName: t.wn || '', due: due(t.d), status: ST[t.s] || 'todo'
}));
const projects = raw.projects.filter(p => !p.ch).map(p => {
  const team = [...new Set([key(p.l), ...tasks.filter(t => t.project === p.i && t.who).map(t => t.who)])].filter(Boolean);
  return {id: p.i, name: p.t, circle: p.c || '', status: ST[p.s] || 'todo', lead: key(p.l), team, sprint: p.sp || '', about: p.d || '', open: p.o};
});

const myRsvp = {}; raw.rsvps.filter(r => r[1] === ME).forEach(r => myRsvp[r[0]] = r[2] === 'going');
const events = raw.events.map(e => ({
  id: e.i, title: e.t, ...day(e.at), where: e.l || 'Protopia', circle: e.c || '', kind: e.k, about: e.d || '',
  going: raw.rsvps.filter(r => r[0] === e.i && r[2] === 'going' && r[1] !== ME).length
}));

const byName = n => { if (!n) return ''; const l = n.toLowerCase(); const k = Object.keys(people).find(k => people[k].name.toLowerCase().startsWith(l) || firstName(people[k].name).toLowerCase() === l.split(' ')[0]); return k || ''; };
const meetings = raw.meetings.map(m => ({
  id: m.i, title: m.t.replace(/^\d{1,2}\.\d{1,2}\.\d{4}\s*/, ''), circle: m.c || '', date: (x => `${x.dow} ${x.day} ${x.month}`)(day(m.at)),
  people: m.n || 0, summary: m.s || '', decisions: [], notesPath: m.np || '',
  actions: m.a.map(a => ({text: a.t, who: byName(a.w), whoName: a.w || '', moved: false}))
}));

const members = Object.values(people).filter(p => !['explorer'].includes(p.rawRole)).length;
const myVotes = {};
const proposals = raw.proposals.map(p => {
  const vs = raw.votes.filter(v => v[0] === p.i);
  const mine = vs.find(v => v[1] === ME && v[3] === 'democracy'); if (mine) myVotes[p.i] = mine[2];
  const others = vs.filter(v => v[1] !== ME && v[3] === 'democracy');
  const days = Math.ceil((new Date(p.cl) - Date.now()) / 864e5);
  const has = layer => vs.some(v => v[3] === layer);
  return {
    id: p.i, title: p.t, circle: '', by: key(p.by), body: p.d || '',
    status: p.s === 'open' ? 'open' : p.s === 'approved' ? 'approved' : 'no',
    left: p.s === 'open' ? (days <= 1 ? 'closes tomorrow' : `${days} days left`) : `Closed ${due(p.cl.slice(0,10))}`,
    yes: others.filter(v => v[2] === 'yes').length, no: others.filter(v => v[2] === 'no').length, of: members,
    checks: [has('sociocracy') ? 'open' : 'wait', 'open', has('meritocracy') ? 'open' : 'wait', 'wait']
  };
});

const itemName = {}; raw.items.forEach(x => itemName[x.i] = x.n);
const item = x => ({id: x.i, name: x.n, note: [x.d, x.l].filter(Boolean).join(' · ') || x.cat, approval: !!x.ap, off: !x.on});
const BK = {confirmed: 'ok', approved: 'ok', pending: 'request', requested: 'request', declined: 'no', cancelled: 'no'};

const recentProjects = [...raw.projects].slice(0, 2);
const data = {
  live: true, exportedAt: new Date().toISOString(),
  brand: {name: 'Protopia', logo: 'live/logo.png'},
  myRole: {circle_lead: 'lead', admin: 'admin', explorer: 'explorer', joining: 'joining'}[people.MO.rawRole] || 'member',
  people, circles, projects, tasks, agreements: [], events, meetings, proposals, myVotes, myRsvp,
  stay: raw.items.filter(x => x.cat === 'accommodation').map(item),
  borrow: raw.items.filter(x => x.cat !== 'accommodation').map(item),
  bookings: raw.bookings.map((b, i) => ({id: 'k' + i, item: itemName[b.it] || 'Item', who: key(b.w), start: b.a, end: b.b, when: `${due(b.a.slice(0,10))} · ${day(b.a).time}`, status: BK[b.s] || 'request'})),
  applications: raw.applications.filter(a => a.s === 'pending').map(a => { const p = people[key(a.w)]; return {id: a.w, name: p.name, ini: p.ini, c: p.c, by: `Applied ${due(a.at)}`, why: 'Their answers are in the application.', give: p.offers.join(', ') || 'No offers yet'}; }),
  circleRequests: [], questions: [],
  notes: [
    ...meetings.slice(0, 2).map(m => ({ic: 'chat', t: `Meeting notes are in: ${m.title}`, when: m.date, go: `#/meetings/${m.id}`})),
    ...recentProjects.map(p => ({ic: 'board', t: `New project: ${p.t}`, when: 'today', go: `#/operations/${p.i}`})),
    ...proposals.filter(p => p.status === 'open').map(p => ({ic: 'scale', t: `${p.title}: ${p.left}`, when: '', go: `#/governance/${p.id}`}))
  ],
  helped: {}
};
// the dashboard's featured project: the one with most of my open tasks, else the one in progress
const mineBy = {}; tasks.filter(t => t.who === 'MO' && t.status !== 'done' && t.project).forEach(t => mineBy[t.project] = (mineBy[t.project] || 0) + 1);
data.featured = Object.entries(mineBy).sort((a, b) => b[1] - a[1])[0]?.[0] || (projects.find(p => p.status === 'doing') || projects[0]).id;
data.defaultCircle = people.MO.leads[0] || Object.keys(circles)[0];

fs.writeFileSync(new URL('./live/live-data.js', import.meta.url), '/* Live Protopia data, exported ' + data.exportedAt + '. Local only: never commit. */\nwindow.LIVE = ' + JSON.stringify(data) + ';\n');
console.log('people', Object.keys(people).length, 'circles', Object.keys(circles).length, 'projects', projects.length, 'tasks', tasks.length, 'events', events.length, 'meetings', meetings.length, 'featured', data.featured, 'role', data.myRole);
console.log('me', people.MO.name, people.MO.ini, people.MO.circles, 'mine', tasks.filter(t => t.who === 'MO').length);
