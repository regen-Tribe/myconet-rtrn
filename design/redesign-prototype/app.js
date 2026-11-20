'use strict';
/* MyCoNet clickable prototype. Sample people, projects and places are made up. Nothing touches live data. */

/* ───────── one more drawing: the place to stay ───────── */
function cabin(){
  return `<svg viewBox="0 0 320 210" preserveAspectRatio="xMidYMid meet" ${INK} stroke-width="4">
    <text x="160" y="58" text-anchor="middle" fill="${CRM}" stroke="none" font-family="Inter Tight, sans-serif" font-weight="800" font-size="92" letter-spacing="-4">STAY</text>
    <path d="M204 72 C214 68 220 74 230 70 C240 66 244 72 254 68" stroke-width="3.5"/>
    <path fill="${COB}" d="M191 104 L192 76 L206 77 L205 118 Z"/>
    <path fill="${COB}" d="M161 66 C141 104 121 150 100 194 C140 197 182 197 222 193 C203 150 183 106 161 66 Z"/>
    <path d="M161 66 C150 90 140 112 131 134" stroke-width="3"/>
    <path fill="${CRM}" d="M136 124 C143 121 152 121 158 123 C159 130 156 136 150 137 C143 138 137 134 136 129 Z" stroke-width="3"/>
    <path fill="${CRM}" d="M165 122 C172 119 181 120 186 123 C187 129 184 135 178 136 C171 137 166 133 165 128 Z" stroke-width="3"/>
    <path d="M158 126 C160 123 163 123 165 126" stroke-width="3"/>
    <path fill="${COB}" d="M149 194 C149 178 150 166 160 165 C170 165 172 177 172 194"/>
    <path d="M166 181 v1" stroke-width="5"/>
    <path d="M60 194 C110 192 220 192 268 194"/>
    <path d="M72 192 L72 168 M72 140 L56 170 L88 170 Z M72 124 L60 148 L84 148 Z" stroke-width="3.5"/>
    <path d="M248 120 v12 M242 126 h12 M262 100 v7 M258.5 103.5 h7" stroke-width="3"/>
  </svg>`;
}
SCENES.cabin = ()=>cabin();

/* ───────── sample data ───────── */
function seed(){ if(window.LIVE && useLive()) return structuredClone(window.LIVE); return sampleSeed(); }
function useLive(){ try{ return localStorage.getItem('myco-proto-data')!=='sample'; }catch(e){ return true; } }
function sampleSeed(){ return {
  people:{
    MO:{name:'Maya Okafor', c:'#F3D9B1', role:'joining member', circles:['food'], leads:['food'], bio:'Moved here in October. Gardener, part-time illustrator, learning to keep bees.', offers:['Illustration','Seed saving','Weekend childcare'], requests:['Learn beekeeping','A lift to the market on Saturdays']},
    JO:{name:'Jonas Weber', c:'#D8E3C8', role:'circle lead', circles:['food'], bio:'Twenty years of market gardening. Ask me about compost.', offers:['Compost workshops','Tractor driving'], requests:['Help on the seed shelf']},
    AI:{name:'Aiko Tanaka', c:'#F1D9C6', role:'member', circles:['food','places'], bio:'Carpenter. I keep the tool shed in order.', offers:['Carpentry','Japanese lessons'], requests:['Someone to share the van']},
    TO:{name:'Tomás Ruiz', c:'#DCE3F2', role:'project lead', circles:['food','places'], bio:'Baker, builder of ovens, maker of noise.', offers:['Bread','Clay work'], requests:['Fire bricks']},
    LE:{name:'Lena Fischer', c:'#E8D3E3', role:'circle lead', circles:['care'], bio:'Teacher. Runs the kids’ camp and the repair café.', offers:['Tutoring','Sewing repairs'], requests:['Camp helpers in July']},
    RA:{name:'Ravi Mehta', c:'#F6E2B8', role:'member', circles:['energy'], bio:'Electrical engineer on a long sabbatical.', offers:['Solar wiring','Bike repair'], requests:['A quiet desk two days a week']},
    SA:{name:'Sara Lind', c:'#CFE0EE', role:'circle lead', circles:['water'], bio:'Hydrologist. Thinks about every drop.', offers:['Water testing','Swimming lessons'], requests:['Rain tank donors']},
    KM:{name:'Kofi Mensah', c:'#D9D2EE', role:'admin', circles:['stewards'], bio:'One of the founders. Keeps the portal running.', offers:['Accounting','Guitar'], requests:['Fewer meetings']},
    ED:{name:'Elif Demir', c:'#E6DDCB', role:'advisor', circles:['stewards'], bio:'Lawyer for cooperatives. Advises on agreements.', offers:['Legal review'], requests:[]}
  },
  circles:{
    food:{name:'Food & land', c:'#A9CB8E', leads:['JO'], members:['JO','AI','TO','MO'], teams:[{name:'Seed keepers', people:['JO','AI']},{name:'Kitchen garden', people:['TO','MO']}], about:'Grows, keeps and shares the food and the seeds.'},
    water:{name:'Water', c:'#9DC0E6', leads:['SA'], members:['SA','RA'], teams:[{name:'Tanks & gutters', people:['SA','RA']}], about:'Catches, stores and cleans our water.'},
    energy:{name:'Energy', c:'#F2C28A', leads:['RA'], members:['RA','KM'], teams:[], about:'Sun on the roofs, wood in the store, power when it’s dark.'},
    care:{name:'Care', c:'#E3A6C2', leads:['LE'], members:['LE','TO'], teams:[{name:'Kids', people:['LE']}], about:'Children, elders, health and looking after each other.'},
    places:{name:'Places', c:'#D7C3A0', leads:['AI'], members:['AI','TO'], teams:[{name:'Tool shed', people:['AI']}], about:'Buildings, rooms, tools and the land between them.'},
    stewards:{name:'Community stewards', c:'#B9B4DE', leads:['KM'], members:['KM','ED','JO','LE','SA'], teams:[], about:'The one circle that looks after every circle.'}
  },
  projects:[
    {id:'seed-library', name:'Seed library', circle:'food', status:'doing', lead:'JO', team:['JO','AI'], sprint:'Autumn', about:'A shelf of local, open-pollinated seeds anyone can borrow and return after harvest. We’re building the shelf, sorting the first batch and writing the borrowing rules.'},
    {id:'bread-oven', name:'Community bread oven', circle:'food', status:'idea', lead:'TO', team:['TO'], about:'A clay oven by the long barn, fired every Friday.'},
    {id:'repair-cafe', name:'Repair café', circle:'care', status:'idea', lead:'LE', team:['LE'], about:'One Saturday a month we fix things together instead of buying new.'},
    {id:'solar-barn', name:'Solar on the barn', circle:'energy', status:'todo', lead:'RA', team:['RA'], about:'Twelve panels on the south roof of the long barn.'},
    {id:'rain-tanks', name:'Rainwater tanks', circle:'water', status:'doing', lead:'SA', team:['SA','RA'], about:'Four tanks to catch the winter rain for the gardens.'},
    {id:'summer-camp', name:'Kids’ summer camp plan', circle:'care', status:'review', lead:'LE', team:['LE','TO'], about:'Two weeks in July for the children of the valley.'},
    {id:'tool-shed', name:'Tool shed inventory', circle:'places', status:'done', lead:'AI', team:['AI'], about:'Every tool counted, labelled and on the list.'},
    {id:'yurt', name:'Guest yurt repairs', circle:'places', status:'paused', lead:'TO', team:['TO'], about:'New canvas and floor. Paused until the felt arrives in December.'}
  ],
  tasks:[
    {id:'t1', title:'Build the seed shelf', project:'seed-library', circle:'food', team:'Seed keepers', who:'JO', due:'Fri 20 Nov', status:'doing'},
    {id:'t2', title:'Sort the first 40 packets', project:'seed-library', circle:'food', team:'Seed keepers', who:'AI', due:'28 Nov', status:'todo'},
    {id:'t3', title:'Write the borrowing rules', project:'seed-library', circle:'food', team:'', who:'', due:'', status:'todo'},
    {id:'t4', title:'Find a dry room for storage', project:'seed-library', circle:'food', team:'', who:'TO', due:'', status:'done'},
    {id:'t5', title:'Water the seedling trays', project:null, circle:'food', team:'Kitchen garden', who:'MO', due:'today', status:'doing'},
    {id:'t6', title:'Design the seed packet labels', project:null, circle:'food', team:'Seed keepers', who:'MO', due:'Sun 22 Nov', status:'review'},
    {id:'t7', title:'Measure the barn roof', project:'solar-barn', circle:'energy', team:'', who:'MO', due:'Thu 19 Nov', status:'todo'},
    {id:'t8', title:'Order two rain tanks', project:'rain-tanks', circle:'water', team:'Tanks & gutters', who:'SA', due:'Sun 22 Nov', status:'todo'},
    {id:'t9', title:'Dig the tank bases', project:'rain-tanks', circle:'water', team:'Tanks & gutters', who:'RA', due:'', status:'done'},
    {id:'t10', title:'Draft the camp packing list', project:'summer-camp', circle:'care', team:'Kids', who:'LE', due:'Fri 20 Nov', status:'review'},
    {id:'t11', title:'Clean the rain gutters', project:null, circle:'water', team:'Tanks & gutters', who:'MO', due:'Sat 21 Nov', status:'todo'},
    {id:'t12', title:'Fix the gate latch', project:null, circle:'places', team:'', who:'AI', due:'', status:'doing'},
    {id:'t13', title:'Introduce yourself at the circle', project:null, circle:'food', team:'', who:'MO', due:'', status:'done'}
  ],
  agreements:[
    {id:'a1', project:'seed-library', from:'AI', give:'Build the shelf with Jonas, Saturdays', get:'Seeds for my balcony', status:'accepted'},
    {id:'a2', project:'seed-library', from:'RA', give:'A moisture sensor for the storage room', get:'', status:'proposed'},
    {id:'a3', project:'rain-tanks', from:'KM', give:'Pay for the second tank', get:'', status:'accepted'}
  ],
  events:[
    {id:'e1', title:'Harvest gathering', day:21, dow:'Sat', time:'16:00', where:'The long barn', going:14, circle:'stewards', about:'Bring a dish and something you grew.'},
    {id:'e2', title:'Food & land circle', day:24, dow:'Tue', time:'18:30', where:'Online', going:6, circle:'food', about:'Seed library opening, winter beds.'},
    {id:'e3', title:'Repair café pilot', day:28, dow:'Sat', time:'10:00', where:'The tool shed', going:9, circle:'care', about:'Bring one broken thing.'},
    {id:'e4', title:'Seed swap', day:6, month:'Dec', dow:'Sun', time:'11:00', where:'The long barn', going:21, circle:'food', about:'The seed library’s first day.'}
  ],
  meetings:[
    {id:'m1', title:'Food & land circle', circle:'food', date:'Tue 10 Nov', people:6, summary:'We agreed the seed library opens on 1 December with a seed swap. Borrowed seeds come back after harvest, a third more than you took if you can. Maya will design the packet labels.', decisions:['The seed library opens on 1 December, with a seed swap on 6 December.','Borrowed seeds come back after harvest.'], actions:[{text:'Design the seed packet labels', who:'MO', moved:true},{text:'Ask the Places circle for a dry room', who:'TO', moved:true},{text:'Print a sign for the shelf', who:'JO', moved:false}]},
    {id:'m2', title:'Community stewards', circle:'stewards', date:'Thu 12 Nov', people:5, summary:'Tool shed rules go to a proposal. Two new join applications to answer this week. The guest yurt stays paused until the felt arrives.', decisions:['Tool shed rules go to Governance as a proposal.'], actions:[{text:'Write up the tool shed rules', who:'AI', moved:true},{text:'Answer the two join applications', who:'LE', moved:false}]},
    {id:'m3', title:'All-hands', circle:'stewards', date:'Tue 3 Nov', people:24, summary:'Autumn sprint review. Rain tanks half done, solar waits for the roof survey. Welcome to three new joining members.', decisions:[], actions:[{text:'Survey the barn roof', who:'MO', moved:true}]}
  ],
  proposals:[
    {id:'tool-shed', title:'Tool shed rules', circle:'places', by:'AI', status:'open', left:'3 days left', body:'Anyone can borrow tools. Return them cleaned the same day, and log anything broken in the book by the door.', yes:16, no:6, of:31, checks:['done','open','wait','done']},
    {id:'guest-stays', title:'Guest stays up to two weeks', circle:'places', by:'TO', status:'open', left:'6 days left', body:'Friends and family can stay in the barn loft or the yurt for up to two weeks, booked through Amenities & tools.', yes:9, no:2, of:31, checks:['open','open','wait','done']},
    {id:'quiet-hours', title:'Quiet hours after 22:00', circle:'stewards', by:'LE', status:'approved', left:'Approved 2 Nov', body:'No music or machines outdoors after 22:00.', yes:27, no:2, of:31, checks:['done','done','done','done']},
    {id:'cargo-bike', title:'Buy a second cargo bike', circle:'places', by:'RA', status:'no', left:'Not approved 28 Oct', body:'A second cargo bike for market days.', yes:11, no:15, of:31, checks:['done','no','done','done']}
  ],
  stay:[
    {id:'s1', name:'Barn loft', note:'Sleeps 4 · shared bathroom', approval:true},
    {id:'s2', name:'Tent pitch', note:'6 pitches by the orchard', approval:false},
    {id:'s3', name:'Guest yurt', note:'Back in December · being repaired', approval:true, off:true}
  ],
  borrow:[
    {id:'b1', name:'Cargo bike', note:'By the long barn', approval:true},
    {id:'b2', name:'Long ladder', note:'Tool shed', approval:false},
    {id:'b3', name:'Seed press', note:'Seed library', approval:false},
    {id:'b4', name:'Projector', note:'Common room', approval:false},
    {id:'b5', name:'Pressure washer', note:'Tool shed', approval:true}
  ],
  bookings:[
    {id:'k1', item:'Cargo bike', who:'MO', when:'Sat 21 Nov', status:'request'},
    {id:'k2', item:'Barn loft', who:'MO', when:'12–14 Dec · my sister', status:'ok'},
    {id:'k3', item:'Barn loft', who:'RA', when:'20–27 Dec · parents', status:'request'},
    {id:'k4', item:'Pressure washer', who:'TO', when:'Mon 23 Nov', status:'request'}
  ],
  applications:[
    {id:'n1', name:'Nina Kowalski', ini:'NK', c:'#E9DFC9', by:'Invited by Lena', why:'I grew up on a farm and want my kids to know where food comes from.', give:'Nursing, cooking for many'},
    {id:'n2', name:'Ben Carter', ini:'BC', c:'#D4E4DA', by:'Invited by Ravi', why:'I build off-grid systems and want to live in one.', give:'Solar, plumbing, a van'}
  ],
  circleRequests:[{id:'cr1', who:'RA', circle:'food', note:'I’d like to help with the seed storage sensors.'}],
  questions:[
    {id:'q1', q:'Who has the key to the tool shed?', n:3, who:'asked by 3 members'},
    {id:'q2', q:'Can guests use the sauna?', n:2, who:'asked by 2 members'},
    {id:'q3', q:'When is the next all-hands?', n:1, who:'asked by Maya'}
  ],
  notes:[
    {ic:'handshake', t:'Jonas accepted Aiko’s agreement on Seed library', when:'2 h', go:'#/agreements'},
    {ic:'chat', t:'Meeting notes from Food & land are in', when:'yesterday', go:'#/meetings/m1'},
    {ic:'scale', t:'Tool shed rules: 3 days left to vote', when:'yesterday', go:'#/governance/tool-shed'},
    {ic:'calendar', t:'Harvest gathering on Saturday', when:'2 days', go:'#/calendar'}
  ],
  helped:{}
};}

let D = seed();
let S;
function freshState(){
  const m=D.meetings[0];
  const chat = D.live
    ? [{me:true, t:'What came out of the last meeting?'},{me:false, t:`${esc((m.summary||'No summary yet.').split(/(?<=\.)\s/).slice(0,2).join(' '))} From the <a href="#/meetings/${m.id}">${esc(m.title)}</a> notes, ${m.date}.`}]
    : [{me:true, t:'What did Food & land decide last week?'},{me:false, t:'Two things: the seed library opens on 1 December with a seed swap on the 6th, and borrowed seeds come back after harvest. From the <a href="#/meetings/m1">meeting notes, 10 Nov</a>.'}];
  return {role:D.myRole||'joining', f:{}, rsvp:{...(D.myRsvp||{})}, vote:{...(D.myVotes||{})}, circleAsk:{}, joinStep:1, sent:false, assistTab:'ask', chat};
}

/* ───────── words ───────── */
const ROLE_NAME = {explorer:'explorer', joining:'joining member', member:'member', lead:'circle lead', admin:'admin'};
const COL = {idea:'Ideas', todo:'To do', doing:'In progress', review:'Review', done:'Done', paused:'Paused'};
const ONE = {idea:'Idea', todo:'To do', doing:'In progress', review:'Review', done:'Done', paused:'Paused'};
const AG = {proposed:['todo','Proposed'], accepted:['done','Accepted'], declined:['no','Declined']};
const CHECKS = [['Circle leads · consent','users'],['All members · majority vote','vote'],['Admins & advisors · expert review','shield'],['AI · Blueprint check','spark']];
const CK = {done:['done','Passed'], open:['doing','Open'], wait:['idea','Waiting'], no:['no','Not passed']};

/* ───────── helpers ───────── */
const $ = s=>document.querySelector(s);
const ic = (k,c='')=>`<svg class="i ${c}" data-i="${k}"></svg>`;
const esc = s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const NOBODY = {name:'Someone', c:'#EEF0F4', ini:'?', role:'', circles:[], leads:[], offers:[], requests:[], bio:''};
const who = k=>k==='MO' ? {...D.people.MO, role:ROLE_NAME[S.role]} : (D.people[k]||{...NOBODY, name:k||'Someone'});
const av = (k,cls='')=>{ if(!k||!D.people[k]) return `<span class="av ${cls}" style="--c:#EEF0F4">?</span>`; const p=who(k); return p.av ? `<span class="av ${cls}" style="--c:${p.c};background-image:url('${p.av}');background-size:cover;background-position:center" title="${esc(p.name)}"></span>` : `<span class="av ${cls}" style="--c:${p.c}" title="${esc(p.name)}">${p.ini||k}</span>`; };
const first = k=>k ? (k==='MO' ? 'you' : who(k).name.split(' ')[0]) : '';
const Cn = id=>D.circles[id]||{name:'Whole community', c:'#B9B4DE', leads:[], members:[], teams:[], about:''};
const cdot = id=>`<span class="dot-c" style="--c:${Cn(id).c}"></span>`;
const st = s=>`<span class="st ${s}">${ONE[s]}</span>`;
const proj = id=>D.projects.find(p=>p.id===id);
const tasksOf = id=>D.tasks.filter(t=>t.project===id);
const rank = ()=>['explorer','joining','member','lead','admin'].indexOf(S.role);
const isMember = ()=>rank()>=2;
const canManageCircle = c=>S.role==='admin' || (S.role==='lead' && (D.people.MO.leads||[]).includes(c));
const canMoveProject = p=>canManageCircle(p.circle) || p.lead==='MO';
const canMoveTask = t=>canManageCircle(t.circle) || t.who==='MO' || (t.project && proj(t.project).lead==='MO');
const myCircles = ()=>Object.keys(D.circles).filter(c=>D.circles[c].members.includes('MO'));

function paint(root){
  root.querySelectorAll('svg[data-i]').forEach(s=>{
    if(s.dataset.p) return; s.dataset.p=1;
    s.setAttribute('viewBox','0 0 24 24'); s.classList.add('i');
    const k=s.dataset.i, seed=[...k].reduce((n,c)=>n+c.charCodeAt(0),0)%4;
    s.innerHTML=`<g filter="url(#ink${seed})">${I[k]||''}</g>`;
  });
  root.querySelectorAll('[data-scene]').forEach(el=>{
    if(el.dataset.p) return; el.dataset.p=1;
    el.insertAdjacentHTML('afterbegin', SCENES[el.dataset.scene]());
  });
}

let toastTimer;
function toast(msg, undo){
  const t=$('#toast');
  t.innerHTML=`<span class="ok">${ic('check','sm')}</span><span>${msg}</span>${undo?'<button data-undo>Undo</button>':''}`;
  paint(t); t.classList.add('show');
  if(undo) t.querySelector('[data-undo]').onclick=()=>{undo(); t.classList.remove('show'); render();};
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'), undo?6000:3200);
}

S = freshState();
const ROLE_KEY = D.live ? 'myco-proto-role-live' : 'myco-proto-role';
try{ const r = localStorage.getItem(ROLE_KEY); if(r) S.role = r; }catch(e){}

/* ───────── navigation ───────── */
const CN = (window.LIVE_ABOUT&&window.LIVE_ABOUT.name)||'Protopia';
const NAV = [
  ['You', [['dashboard','My dashboard','home']]],
  ['Community', [['about','About '+CN,'book'],['members','Members','users'],['calendar','Calendar','calendar'],['circles','Circles','circles'],['amenities','Amenities & tools','pin']]],
  ['Working together', [['operations','Operations','board'],['agreements','Agreements','handshake'],['meetings','Meetings','chat'],['governance','Governance','scale']]],
  ['Admin', [['admin/applications','Applications','inbox'],['admin/bookings','Bookings','calendar'],['admin/permissions','Permissions','shield']]]
];
const TITLES = Object.fromEntries(NAV.flatMap(g=>g[1]).map(([k,t])=>[k,t])); TITLES.join='Join';
const LOCKED = ['amenities','agreements','meetings'];
const manageAllowed = k=>S.role==='admin' || (S.role==='lead' && (k==='manage/join'||k==='manage/place'));

function nextStep(){
  const r=S.role, fp=proj(D.featured||'seed-library'), lead=fp?first(fp.lead):'the lead';
  const vote=D.proposals.find(p=>p.status==='open'&&!S.vote[p.id]);
  const task=D.tasks.find(t=>t.who==='MO'&&t.status!=='done');
  const taskStep=task?{b:task.title, p:`Your task${task.project?' on '+proj(task.project).name:''}${task.due?' · due '+task.due:''}`, go:'#/dashboard'}:{b:'Find a project to help on', p:'Offer what you can give.', go:'#/operations'};
  const voteStep=vote?{b:`Vote on ${vote.title}`, p:`${vote.left} · ${vote.yes+vote.no+(S.vote[vote.id]?1:0)} of ${vote.of} have voted`, go:`#/governance/${vote.id}`}:null;
  if(r==='explorer') return {b:'Start joining', p:'Tell us who you are. A circle lead answers within a week.', go:'#/join'};
  if(r==='joining') return S.sent
    ? {b:`Waiting for ${lead}`, p:`They’re reading your agreement on ${fp.name}.`, go:'#/agreements'}
    : {b:'Your first agreement', p:'One accepted agreement makes you a member.', go:`#/operations/${fp.id}`};
  if(r==='member') return voteStep||taskStep;
  if(r==='lead') return D.applications.length ? {b:`${D.applications.length} join application${D.applications.length>1?'s':''}`, p:'Accept or decline them this week.', go:'#/admin/applications'} : voteStep||taskStep;
  const req=D.bookings.filter(b=>b.status==='request').length;
  return req ? {b:`${req} booking request${req>1?'s':''}`, p:'Answer them in Bookings.', go:'#/admin/bookings'} : D.applications.length ? {b:`${D.applications.length} join application${D.applications.length>1?'s':''}`, p:'Accept or decline them.', go:'#/admin/applications'} : voteStep||taskStep;
}

function navHTML(key){
  const n=nextStep();
  const count=D.tasks.filter(t=>t.who==='MO'&&t.status!=='done').length;
  let h=`<div class="brand" style="padding:0 6px"><span class="mark">${(D.brand?D.brand.name:'Protopia')[0]}</span><div><b>${D.brand?D.brand.name:'Protopia'}</b><small>on MyCoNet</small></div></div>
    <button class="btn next" data-go="${n.go}"><span><small>Your next step</small>${n.b}</span><span class="go">${ic('right','sm')}</span></button>`;
  NAV.forEach(([g,items])=>{
    const list = g==='Admin' ? items.filter(([k])=>adminAllowed(k)) : items;
    if(!list.length) return;
    h+=`<div class="group-label">${g}</div>`;
    list.forEach(([k,t,i])=>{
      const locked = S.role==='explorer' && LOCKED.includes(k);
      let extra='';
      if(k==='dashboard' && S.role!=='explorer') extra=`<span class="count" title="Your open tasks">${count}</span>`;
      if(k==='admin/applications') extra=`<span class="count">${D.applications.length}</span>`;
      if(k==='admin/bookings') extra=`<span class="count">${D.bookings.filter(b=>b.status==='request').length}</span>`;
      if(locked) extra=`<span class="note">${ic('lock','sm')}</span>`;
      h+=`<a class="navi ${key===k?'on':''} ${locked?'locked':''}" href="#/${k}"><span class="ic">${ic(i)}</span>${t}${extra}</a>`;
    });
  });
  h+=`<a class="me-row" href="#/members/MO">${av('MO','md')}<div><b>${esc(who('MO').name)}</b><small>${ROLE_NAME[S.role]}</small></div>${ic('right')}</a>`;
  return h;
}

function tabsHTML(key){
  const T=[['dashboard','Dashboard','home'],['operations','Operations','board'],['calendar','Calendar','calendar'],['members','Members','users']];
  const inTabs=T.some(t=>t[0]===key);
  return T.map(([k,t,i])=>key===k?`<a class="tab on" href="#/${k}">${ic(i)}${t}</a>`:`<a class="tab" href="#/${k}" aria-label="${t}">${ic(i)}</a>`).join('')
    + (inTabs?`<button class="tab" data-act="menu" aria-label="Menu">${ic('grid')}</button>`:`<button class="tab on" data-act="menu">${ic('grid')}<span style="overflow:hidden;text-overflow:ellipsis">${TITLES[key]||'Menu'}</span></button>`);
}

/* ───────── pages ───────── */
function locked(title){
  return `<div class="ph"><div><h1>${title}</h1></div></div>
  <div class="card empty"><div class="scene" data-scene="myco"></div><b>This opens when you join</b><p>${title} is for joining members and members. Tell the community who you are first.</p><button class="btn next" data-go="#/join">Start joining <span class="go">${ic('right','sm')}</span></button></div>`;
}

function projectCard(p, scene){
  const ts=tasksOf(p.id), done=ts.filter(t=>t.status==='done').length;
  return `<div class="card click" data-go="#/operations/${p.id}">
    <div class="card-head"><span class="ico-soft">${ic('board')}</span><div><b>${esc(p.name)}</b><small>${Cn(p.circle).name} circle · lead ${who(p.lead).name.split(' ')[0]}</small></div></div>
    <div class="tags">${st(p.status)}<span class="tag">${ts.length} tasks</span>${p.sprint?`<span class="tag">Sprint · ${p.sprint}</span>`:''}${p.team.includes('MO')?'<span class="tag">'+ic('check','sm')+'You’re helping</span>':''}</div>
    ${scene?`<div class="scene" data-scene="${scene}"><span class="over-br btn next">Open project <span class="go">${ic('right','sm')}</span></span></div>`:`<div class="prog k-${p.status}" style="margin-top:14px"><i style="width:${ts.length?Math.round(done/ts.length*100):0}%"></i></div><small class="muted small" style="display:block;margin-top:6px">${done} of ${ts.length} tasks done</small>`}
  </div>`;
}
function eventCard(e, scene){
  const going=S.rsvp[e.id];
  return `<div class="card">
    <div class="card-head"><span class="ico-soft">${ic('calendar')}</span><div><b>${e.title}</b><small>${e.dow} ${e.day} ${e.month||'Nov'} · ${e.time} · ${e.where}</small></div></div>
    <div class="tags"><span class="tag">${e.going+(going?1:0)} going</span><span class="tag">${cdot(e.circle)}${Cn(e.circle).name}</span></div>
    ${scene?`<div class="scene" data-scene="${scene}"><button class="over-br pill-white" data-act="rsvp" data-id="${e.id}">${going?ic('check','sm')+'Going':'RSVP '+ic('right','sm')}</button></div>`
      :`<div style="margin-top:12px"><button class="btn ${going?'secondary':'primary'} sm" data-act="rsvp" data-id="${e.id}">${going?ic('check','sm')+'Going':'RSVP'}</button></div>`}
  </div>`;
}
function taskRow(t){
  const p=t.project?proj(t.project):null;
  return `<div class="row click" data-act="task" data-id="${t.id}">
    <div class="main"><b>${esc(t.title)}</b><small>${cdot(t.circle)}${p?esc(p.name):'No project · '+Cn(t.circle).name}${t.due?` · ${ic('clock','sm')}${t.due}`:''}${t.who&&t.who!=='MO'?' · '+first(t.who):''}</small></div>${st(t.status)}</div>`;
}

function pDashboard(){
  const n=nextStep(), f=S.f.dash||'you', r=S.role;
  const mine=D.tasks.filter(t=>t.who==='MO'&&t.status!=='done');
  let cards='';
  if(f==='you') cards=D.live ? projectCard(proj(D.featured),'myco')+eventCard(D.events[0]) : projectCard(proj('seed-library'),'seeds')+eventCard(D.events[0],'myco');
  if(f==='projects') cards=D.projects.filter(p=>['doing','todo','review'].includes(p.status)).map((p,i)=>projectCard(p,i===0?'seeds':'')).join('');
  if(f==='calendar') cards=D.events.map(e=>eventCard(e)).join('');
  const right = r==='explorer'
    ? `<div class="h-sec"><h3>Start here</h3></div><div class="rows">
        <a class="row click" href="#/blueprint"><span class="ico-soft">${ic('book')}</span><div class="main"><b>Read the Blueprint</b><small>What we’re building and how we live</small></div>${ic('right')}</a>
        <a class="row click" href="#/members"><span class="ico-soft">${ic('users')}</span><div class="main"><b>Meet the members</b><small>${Object.keys(D.people).length} people, what they offer and look for</small></div>${ic('right')}</a>
        <a class="row click" href="#/join"><span class="ico-soft">${ic('sprout')}</span><div class="main"><b>Start joining</b><small>Three short steps</small></div>${ic('right')}</a></div>`
    : (()=>{ const tf=S.f.mt||'open', all=D.tasks.filter(t=>t.who==='MO'), l=all.filter(t=>tf==='open'?t.status!=='done':t.status===tf), cap=S.f.mtAll?99:5;
        return `<div class="h-sec" id="your-tasks"><h3>Your tasks · ${all.filter(t=>t.status!=='done').length} open</h3><a href="#/operations">Open Operations →</a></div>
        <div class="chiprow" style="margin-bottom:10px">${[['open','Open'],['todo','To do'],['doing','In progress'],['review','Review'],['done','Done']].map(([k,t])=>`<button class="chip ${tf===k?'on':''}" data-f="mt" data-v="${k}">${t}</button>`).join('')}</div>
        <div class="rows">${l.length?l.slice(0,cap).map(taskRow).join(''):'<div class="row"><div class="main"><small>No tasks with this status.</small></div></div>'}</div>
        ${l.length>cap?`<p style="text-align:center;margin-top:10px"><button class="btn quiet" data-f="mtAll" data-v="1">Show all ${l.length} →</button></p>`:''}`; })();
  const open=D.proposals.filter(p=>p.status==='open');
  return `<h1 class="hello">Hey <em>${esc(who('MO').name.split(' ')[0])},</em><br>welcome home</h1>
  <div class="split">
    <div>
      <div class="nextcard" data-go="${n.go}"><div class="txt"><small>Your next step</small><b>${n.b}</b><p>${n.p}</p></div><span class="go-round">${ic('right')}</span></div>
      <div class="chiprow">${[['you','For you'],['projects','Projects'],['calendar','Calendar']].map(([k,t])=>`<button class="chip ${f===k?'on':''}" data-f="dash" data-v="${k}">${t}</button>`).join('')}</div>
      <div class="cards">${cards}</div>
    </div>
    <div>
      ${right}
      <div class="h-sec"><h3>Open proposals</h3><a href="#/governance">Open Governance →</a></div>
      <div class="rows">${open.map(p=>`<a class="row click" href="#/governance/${p.id}"><span class="ico-soft">${ic('scale')}</span><div class="main"><b>${p.title}</b><small>${p.left} · ${p.yes+p.no+(S.vote[p.id]?1:0)} of ${p.of} voted</small></div>${S.vote[p.id]?'<span class="st done">You voted</span>':'<span class="st doing">Open</span>'}</a>`).join('')}</div>
      <div class="h-sec"><h3>Your circles</h3><a href="#/circles">See all circles →</a></div>
      <div class="rows">${myCircles().map(c=>`<a class="row click" href="#/circles/${c}"><span class="dot-c" style="--c:${Cn(c).c};width:12px;height:12px"></span><div class="main"><b>${Cn(c).name}</b><small>${Cn(c).members.length} members · lead ${first(Cn(c).leads[0])}</small></div><span class="avs">${Cn(c).members.slice(0,3).map(k=>av(k)).join('')}</span></a>`).join('')}</div>
    </div>
  </div>`;
}

function boardHTML(cols, items, opts={}){
  return `<div class="board" data-board="${opts.scope||'main'}">${cols.map(c=>{
    const list=items.filter(x=>x.col===c);
    const note = opts.notes&&opts.notes[c] ? `<div class="col-note">${opts.notes[c]}</div>` : '';
    return `<div class="col k-${c}" data-col="${c}">
      <div class="col-head"><span class="st ${c}">${opts.labels&&opts.labels[c]||COL[c]}</span><span class="count">${list.length}</span></div>${note}
      ${list.map(x=>x.html).join('')}
      ${opts.add&&opts.add[c]?opts.add[c]:''}
    </div>`;}).join('')}</div>`;
}
function projectPc(p){
  const ts=tasksOf(p.id), done=ts.filter(t=>t.status==='done').length;
  const foot = p.status==='idea' ? `Suggested by ${first(p.lead)}` : p.status==='paused' ? 'Paused · felt arrives Dec' : `${done} of ${ts.length} tasks`;
  return `<div class="pc" draggable="${canMoveProject(p)}" data-kind="project" data-id="${p.id}" data-go="#/operations/${p.id}">
    <b>${esc(p.name)}</b><div class="circ">${cdot(p.circle)}${Cn(p.circle).name}${p.sprint?' · Sprint '+p.sprint:''}</div>
    ${p.status!=='idea'?`<div class="prog"><i style="width:${ts.length?Math.round(done/ts.length*100):0}%"></i></div>`:''}
    <div class="foot"><small>${foot}</small><span class="avs">${p.team.slice(0,3).map(k=>av(k)).join('')}</span></div></div>`;
}
function taskPc(t, showKind){
  return `<div class="pc task" style="--c:${Cn(t.circle).c}" draggable="${canMoveTask(t)}" data-kind="task" data-id="${t.id}" data-act="task">
    ${showKind?`<span class="kind">Task · no project</span>`:''}<b>${esc(t.title)}</b>
    <div class="foot"><small>${showKind?Cn(t.circle).name+(t.team?' · '+t.team:''):(t.team||'No team')}${t.due?' · '+t.due:''}</small>${av(t.who)}</div></div>`;
}

function pOperations(sub){
  if(sub) return pProject(sub);
  const view=S.f.opsView||'board', fc=S.f.opsCircle||'all';
  const inC=x=>fc==='all'||x.circle===fc;
  const ps=D.projects.filter(inC), loose=D.tasks.filter(t=>!t.project&&inC(t));
  const helping=D.projects.filter(p=>p.team.includes('MO')).length;
  const canAdd=S.role==='lead'||S.role==='admin';
  const CAP=6, items=ps.map(p=>({col:p.status, html:projectPc(p)}));
  ['todo','doing','review','done'].forEach(c=>{ const l=loose.filter(t=>t.status===c); l.slice(0,CAP).forEach(t=>items.push({col:c, html:taskPc(t,true)})); if(l.length>CAP) items.push({col:c, html:`<button class="add" data-f="opsView" data-v="tasks">+ ${l.length-CAP} more tasks with no project</button>`}); });
  const body = view==='board'
    ? boardHTML(['idea','todo','doing','review','done','paused'], items, {notes:{paused:'Projects only'}, add:{idea:isMember()||S.role==='joining'?`<button class="add" data-act="suggest">${ic('plus','sm')}Suggest a project</button>`:'', todo:canAdd?`<button class="add" data-act="new-task">${ic('plus','sm')}Add task</button>`:''}})
      + `<p class="muted small" style="margin-top:6px">${canAdd?'Drag a card to move it. A task can’t go in Paused.':'Only a project’s lead or its circle lead can move a card. Open one to see more.'}</p>`
    : `<div style="max-width:820px">${['todo','doing','review','done'].map(s=>{const l=D.tasks.filter(t=>t.status===s&&inC(t)); return l.length?`<div class="group-label">${COL[s]} · ${l.length}</div><div class="rows">${l.map(taskRow).join('')}</div>`:'';}).join('')}</div>`;
  return `<div class="ph"><div><h1>Operations</h1><p><b>${D.projects.length} projects</b> across <b>${Object.keys(D.circles).length-1} circles</b>${helping?` · you’re helping on <b>${helping}</b>`:''}</p></div>
    ${S.role!=='explorer'?`<button class="btn next" data-act="suggest">+ Suggest a project <span class="go">${ic('right','sm')}</span></button>`:''}</div>
  <div class="chiprow">
    <button class="chip ${view==='board'?'on':''}" data-f="opsView" data-v="board">Projects</button>
    <button class="chip ${view==='tasks'?'on':''}" data-f="opsView" data-v="tasks">All tasks</button>
    <span class="spacer"></span>
    <select class="chip" data-fsel="opsCircle" aria-label="Circle"><option value="all">All circles</option>${Object.entries(D.circles).filter(([k])=>k!=='stewards').map(([k,c])=>`<option value="${k}" ${fc===k?'selected':''}>${c.name}</option>`).join('')}</select>
  </div>${body}`;
}

function pProject(id){
  const p=proj(id); if(!p) return `<p>Not found.</p>`;
  const ts=tasksOf(id), lead=who(p.lead), manage=canManageCircle(p.circle)||p.lead==='MO';
  const offers=D.agreements.filter(a=>a.project===id&&a.status==='proposed');
  const mineSent=D.agreements.find(a=>a.project===id&&a.from==='MO');
  let action;
  if(S.role==='explorer') action=`<button class="btn next block" data-go="#/join" style="height:48px">Start joining to help <span class="go">${ic('right','sm')}</span></button>`;
  else if(p.team.includes('MO')) action=`<div class="banner">${ic('check')}<div class="txt"><b>You’re helping on this project</b><span>Your agreement was accepted.</span></div><a class="btn quiet" href="#/agreements">Open Agreements →</a></div>`;
  else if(mineSent) action=`<div class="banner">${ic('clock')}<div class="txt"><b>Your offer to help is with ${lead.name.split(' ')[0]}</b><span>You’ll hear back here and by email.</span></div></div>`;
  else action=`<button class="btn next block" data-act="offer" data-id="${id}" style="height:48px">Offer to help · start an agreement <span class="go">${ic('right','sm')}</span></button>`;
  const items=[...ts.map(t=>({col:t.status, html:taskPc(t)})), ...(manage?offers.map(a=>({col:'idea', html:`<div class="pc offer"><span class="kind" style="color:rgba(17,19,23,.55)">Offer to help</span><b>${first(a.from)[0].toUpperCase()+first(a.from).slice(1)}: ${esc(a.give)}</b><div class="foot" style="justify-content:flex-start;gap:6px"><button class="btn primary sm" data-act="answer" data-kind="agreement" data-id="${a.id}" data-v="accepted">Accept</button><button class="btn secondary sm" data-act="answer" data-kind="agreement" data-id="${a.id}" data-v="declined">Decline</button></div></div>`})):[])];
  const cols = manage ? ['idea','todo','doing','review','done'] : ['todo','doing','review','done'];
  return `<a class="back" href="#/operations">${ic('left','sm')}Operations</a>
  <div class="split">
    <div>
      <div class="hero" data-scene="${p.id==='seed-library'?'seeds':'myco'}">
        <span class="over-bl pill-white">${ic('circles','sm')}${Cn(p.circle).name} circle</span>
        <span class="over-br"><a class="round-w" href="#/members/${p.lead}" aria-label="Message the lead">${ic('mail')}</a><a class="round-w" href="#/calendar" aria-label="Calendar">${ic('calendar')}</a></span>
      </div>
      <h1 class="big-title">${esc(p.name)}</h1>
      <div class="tags">${st(p.status)}<span class="tag">Lead · ${lead.name.split(' ')[0]}</span><span class="tag">${ts.length} tasks</span>${p.sprint?`<span class="tag">Sprint · ${p.sprint}</span>`:''}</div>
    </div>
    <div>
      <div class="h-sec" style="margin-top:0"><h3>About</h3></div>
      <p class="prose">${esc(p.about)}</p>
      <div style="margin:16px 0">${action}</div>
      <div class="h-sec"><h3>People</h3></div>
      <div class="rows">${p.team.map(k=>`<a class="row click" href="#/members/${k}">${av(k)}<div class="main"><b>${k==='MO'?esc(who('MO').name)+' (you)':who(k).name}</b><small>${k===p.lead?'Project lead':'Helping'}</small></div></a>`).join('')}</div>
      <div class="note-brain" style="margin-top:12px">${ic('brain','sm')}<span>In the second brain</span><code>projects/${p.id}.md</code><span style="margin-left:auto">updated today</span></div>
    </div>
  </div>
  <div class="h-sec"><h3>Tasks</h3>${manage||p.team.includes('MO')?`<button class="link" data-act="new-task" data-project="${id}">+ Add task</button>`:''}</div>
  ${boardHTML(cols, items, {scope:id, labels:{idea:'Offers to help'}})}`;
}

function pAgreements(){
  if(S.role==='explorer') return locked('Agreements');
  const lead=S.role==='lead'||S.role==='admin';
  const f=S.f.ag||'yours';
  let list=D.agreements;
  if(f==='yours') list=list.filter(a=>a.from==='MO');
  if(f==='answer') list=list.filter(a=>a.status==='proposed'&&a.from!=='MO'&&canManageCircle(proj(a.project).circle));
  if(f==='all') list=list.filter(a=>a.status==='accepted');
  const rows=list.map(a=>{const p=proj(a.project), s=AG[a.status];
    const acts = f==='answer' ? `<span class="acts"><button class="btn primary sm" data-act="answer" data-kind="agreement" data-id="${a.id}" data-v="accepted">Accept</button><button class="btn secondary sm" data-act="answer" data-kind="agreement" data-id="${a.id}" data-v="declined">Decline</button></span>` : `<span class="st ${s[0]}">${s[1]}</span>`;
    return `<div class="row">${av(a.from)}<div class="main"><b>${esc(p.name)}: ${esc(a.give)}</b><small>${a.from==='MO'?'You offer':who(a.from).name+' offers'}${a.get?' · in return: '+esc(a.get):''}</small></div>${acts}</div>`;}).join('');
  return `<div class="ph"><div><h1>Agreements</h1><p>An agreement is an offer to help on a project: what you give, and what you’d like back.</p></div>
    <button class="btn next" data-go="#/operations">Find a project <span class="go">${ic('right','sm')}</span></button></div>
  <div class="chiprow"><button class="chip ${f==='yours'?'on':''}" data-f="ag" data-v="yours">Yours</button>${lead?`<button class="chip ${f==='answer'?'on':''}" data-f="ag" data-v="answer">To answer</button>`:''}<button class="chip ${f==='all'?'on':''}" data-f="ag" data-v="all">All accepted</button></div>
  <div style="max-width:820px">${rows?`<div class="rows">${rows}</div>`:`<div class="card empty"><div class="scene" data-scene="myco"></div><b>${f==='answer'?'Nothing to answer':'No agreements yet'}</b><p>${f==='answer'?'Offers to help on your circle’s projects show up here.':'Find a project you’d like to help on and offer what you can give.'}</p>${f==='answer'?'':`<a class="btn primary" href="#/operations">Open Operations →</a>`}</div>`}</div>`;
}

function pMembers(sub){
  if(sub) return pProfile(sub);
  const fc=S.f.mem||'all';
  const people=Object.keys(D.people).filter(k=>fc==='all'||who(k).circles.includes(fc));
  return `<div class="ph"><div><h1>Members</h1><p><b>${Object.keys(D.people).length} people</b> live and work here. See what they offer and what they’re looking for.</p></div></div>
  <div class="chiprow"><button class="chip ${fc==='all'?'on':''}" data-f="mem" data-v="all">Everyone</button>${Object.entries(D.circles).map(([k,c])=>`<button class="chip ${fc===k?'on':''}" data-f="mem" data-v="${k}">${c.name}</button>`).join('')}</div>
  <div class="cards three">${people.map(k=>{const p=who(k); return `<a class="card click" href="#/members/${k}">
    <div class="card-head">${av(k,'md')}<div><b>${p.name}${k==='MO'?' (you)':''}</b><small>${p.role}</small></div></div>
    <div class="tags" style="margin-bottom:10px">${p.circles.map(c=>`<span class="tag">${cdot(c)}${Cn(c).name}</span>`).join('')}</div>
    <small class="muted small">Offers</small><div class="tags" style="margin-top:4px">${p.offers.slice(0,2).map(o=>`<span class="tag">${ic('gift','sm')}${o}</span>`).join('')}</div></a>`;}).join('')}</div>`;
}

function pProfile(k){
  const p=who(k); if(!p) return '<p>Not found.</p>';
  const me=k==='MO';
  const others=Object.keys(D.circles).filter(c=>!p.circles.includes(c));
  const badges=[['handshake','First agreement',isMember()],['sprout','Seed sorter',true],['calendar','Came 3 times',true],['star','Ten tasks done',false]];
  return `<a class="back" href="#/members">${ic('left','sm')}Members</a>
  <div class="profile-head">${av(k,'lg')}<div style="flex:1;min-width:200px"><h1>${p.name}</h1><div class="tags" style="margin-top:8px"><span class="tag">${p.role}</span>${p.circles.map(c=>`<span class="tag">${cdot(c)}${Cn(c).name}</span>`).join('')}</div></div>
    ${me?`<button class="btn secondary" data-act="soon" data-msg="Profile editing">${ic('pencil','sm')}Edit profile</button>`:`<button class="btn primary" data-act="soon" data-msg="Messages">${ic('mail','sm')}Message ${p.name.split(' ')[0]}</button>`}</div>
  <div class="split">
    <div>
      <div class="card"><div class="h-sec" style="margin-top:0"><h3>About</h3></div><p class="prose">${esc(p.bio)}</p></div>
      <div class="cards two" style="margin-top:12px">
        <div class="card"><div class="h-sec" style="margin-top:0"><h3>Offers</h3>${me?'<button class="link" data-act="soon" data-msg="Adding offers">+ Add offer</button>':''}</div><div class="tags">${p.offers.map(o=>`<span class="tag">${ic('gift','sm')}${o}</span>`).join('')}</div></div>
        <div class="card"><div class="h-sec" style="margin-top:0"><h3>Requests</h3>${me?'<button class="link" data-act="soon" data-msg="Adding requests">+ Add request</button>':''}</div><div class="tags">${p.requests.length?p.requests.map(o=>`<span class="tag">${ic('hand','sm')}${o}</span>`).join(''):'<span class="muted small">Nothing yet</span>'}</div></div>
      </div>
      <div class="h-sec"><h3>Achievements</h3><span class="muted small">Badges you earn by taking part</span></div>
      <div class="badges">${badges.map(([i,t,on])=>`<div class="badge ${on?'':'off'}"><span class="medal">${ic(i)}</span>${t}</div>`).join('')}</div>
    </div>
    <div>
      <div class="h-sec" style="margin-top:0"><h3>${me?'My circles':'Circles'}</h3></div>
      <div class="rows">${p.circles.map(c=>`<a class="row click" href="#/circles/${c}"><span class="dot-c" style="--c:${Cn(c).c};width:12px;height:12px"></span><div class="main"><b>${Cn(c).name}</b><small>${Cn(c).leads.includes(k)?'Circle lead':'Member'}</small></div>${ic('right')}</a>`).join('')}</div>
      ${me&&S.role!=='explorer'?`<div class="group-label">Ask to join another circle</div><div class="rows">${others.map(c=>`<div class="row"><span class="dot-c" style="--c:${Cn(c).c};width:12px;height:12px"></span><div class="main"><b>${Cn(c).name}</b><small>${S.circleAsk[c]?'Asked · '+first(Cn(c).leads[0])+' will answer':Cn(c).about}</small></div>${S.circleAsk[c]?`<button class="btn quiet" data-act="circle-ask" data-id="${c}">Withdraw</button>`:`<button class="btn secondary sm" data-act="circle-ask" data-id="${c}">Ask to join</button>`}</div>`).join('')}</div>`:''}
    </div>
  </div>`;
}

function pCircles(sub){
  if(sub) return pCircle(sub);
  return `<div class="ph"><div><h1>Circles</h1><p>A circle looks after one area of community life. Teams are smaller groups inside a circle.</p></div></div>
  <div class="cards two">${Object.entries(D.circles).map(([k,c])=>`<a class="card click" href="#/circles/${k}">
    <div class="card-head"><span class="ico-soft" style="background:${c.c}33">${ic('circles')}</span><div><b>${c.name}</b><small>lead ${c.leads.map(first).join(', ')} · ${c.members.length} members${c.teams.length?' · '+c.teams.length+' teams':''}</small></div></div>
    <p class="prose" style="margin-bottom:12px">${c.about}</p>
    <div style="display:flex;align-items:center;justify-content:space-between"><span class="avs">${c.members.slice(0,5).map(m=>av(m)).join('')}</span>${c.members.includes('MO')?'<span class="tag">'+ic('check','sm')+'You’re in it</span>':''}</div></a>`).join('')}</div>`;
}

function pCircle(k){
  const c=Cn(k); if(!c) return '<p>Not found.</p>';
  const manage=canManageCircle(k), inIt=c.members.includes('MO');
  const reqs=D.circleRequests.filter(r=>r.circle===k);
  const ps=D.projects.filter(p=>p.circle===k);
  return `<a class="back" href="#/circles">${ic('left','sm')}Circles</a>
  <div class="ph"><div><div class="tags" style="margin-bottom:10px"><span class="tag">${cdot(k)}Circle</span>${manage?'<span class="tag">'+ic('shield','sm')+'You can manage it</span>':''}</div><h1>${c.name}</h1><p>${c.about}</p></div>
  ${inIt?'<span class="tag">'+ic('check','sm')+'You’re a member</span>':S.role==='explorer'?'':`<button class="btn ${S.circleAsk[k]?'secondary':'primary'}" data-act="circle-ask" data-id="${k}">${S.circleAsk[k]?'Asked · withdraw':'Ask to join'}</button>`}</div>
  <div class="split even">
    <div>
      ${manage&&reqs.length?`<div class="h-sec" style="margin-top:0"><h3>Asking to join</h3></div><div class="rows" style="margin-bottom:8px">${reqs.map(r=>`<div class="row">${av(r.who)}<div class="main"><b>${who(r.who).name}</b><small>“${esc(r.note)}”</small></div><span class="acts"><button class="btn primary sm" data-act="answer" data-kind="circle" data-id="${r.id}" data-v="accepted">Accept</button><button class="btn secondary sm" data-act="answer" data-kind="circle" data-id="${r.id}" data-v="declined">Decline</button></span></div>`).join('')}</div>`:''}
      <div class="h-sec" ${manage&&reqs.length?'':'style="margin-top:0"'}><h3>Members · ${c.members.length}</h3>${manage?'<button class="link" data-act="add-member" data-id="'+k+'">+ Add member</button>':''}</div>
      <div class="rows">${c.members.map(m=>`<a class="row click" href="#/members/${m}">${av(m)}<div class="main"><b>${m==='MO'?esc(who('MO').name)+' (you)':who(m).name}</b><small>${c.leads.includes(m)?'Circle lead':who(m).role}</small></div></a>`).join('')}</div>
    </div>
    <div>
      <div class="h-sec" style="margin-top:0"><h3>Teams</h3>${manage?'<button class="link" data-act="soon" data-msg="Adding teams">+ Add team</button>':''}</div>
      ${c.teams.length?`<div class="rows">${c.teams.map(t=>`<div class="row"><span class="ico-soft">${ic('users')}</span><div class="main"><b>${t.name}</b><small>${t.people.map(m=>m==='MO'?'you':who(m).name.split(' ')[0]).join(', ')}</small></div><span class="avs">${t.people.map(m=>av(m)).join('')}</span></div>`).join('')}</div>`:'<p class="muted">No teams yet.</p>'}
      <div class="h-sec"><h3>Projects</h3><a href="#/operations">Open Operations →</a></div>
      ${ps.length?`<div class="rows">${ps.map(p=>`<a class="row click" href="#/operations/${p.id}"><div class="main"><b>${p.name}</b><small>lead ${first(p.lead)}</small></div>${st(p.status)}</a>`).join('')}</div>`:'<p class="muted">No projects yet.</p>'}
      <div class="note-brain" style="margin-top:12px">${ic('brain','sm')}<span>Circle folder</span><code>circles/${k}/README.md</code></div>
    </div>
  </div>`;
}

const BP=[
  ['why','Why we’re here','We are forty people on twelve hectares, trying to live well with less: grow most of our food, share what we own, and decide together. Protopia isn’t finished. This Blueprint is how we keep track of what we’re building.'],
  ['values','What we value','Care before efficiency. Say it to the person, not about them. Leave things better than you found them. Ask for help early.'],
  ['land','The land','Gardens on the south slope, orchard by the stream, the long barn as our common house. Wild margins stay wild.'],
  ['decide','How we decide','Each proposal gets four checks at once: circle leads give consent, all members vote, admins and advisors review it, and the assistant checks it against this Blueprint. It’s approved when enough checks pass.'],
  ['money','Money & sharing','Tools, bikes and rooms are shared through Amenities & tools. Costs are split by circle budgets, agreed every spring.'],
  ['joining','Joining & leaving','Anyone invited can explore. You become a joining member when you apply, and a member when your first agreement is accepted. Anyone can leave, with a goodbye dinner.']
];
function pBlueprint(){
  const edit=S.role==='lead'||S.role==='admin';
  return `<div class="ph"><div><h1>Blueprint</h1><p>The plan we’re building together. Last changed 2 Nov by the Community stewards.</p></div>
    <span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn secondary" data-act="assist">${ic('spark','sm')}Ask about the Blueprint</button>${edit?`<button class="btn primary" data-act="soon" data-msg="Editing the Blueprint">${ic('pencil','sm')}Edit</button>`:''}</span></div>
  ${D.live?'<div class="banner">'+ic('file')+'<div class="txt"><b>Sample text</b><span>Protopia\u2019s real Blueprint wasn\u2019t part of this export.</span></div></div>':''}<div class="split toc"><nav class="toc desk">${BP.map(([k,t])=>`<a href="#/blueprint" data-scroll="${k}">${t}</a>`).join('')}</nav>
  <article class="doc">${BP.map(([k,t,p])=>`<h2 id="bp-${k}">${t}</h2><p>${p}</p>`).join('')}
    <div class="note-brain" style="margin-top:24px">${ic('brain','sm')}<span>In the second brain</span><code>blueprint/README.md</code></div></article></div>`;
}

function pCalendar(){
  const now=new Date(), Y=now.getFullYear(), M=now.getMonth(), today=now.getDate();
  const mShort=now.toLocaleString('en-GB',{month:'short'}), mLong=now.toLocaleString('en-GB',{month:'long'});
  const evDays=D.events.filter(e=>(e.month||'Nov')===mShort).map(e=>e.day);
  const lead=(new Date(Y,M,1).getDay()+6)%7, days=new Date(Y,M+1,0).getDate(), prev=new Date(Y,M,0).getDate();
  let cells=['M','T','W','T','F','S','S'].map(d=>`<span class="dow">${d}</span>`).join('');
  for(let i=lead;i>0;i--) cells+=`<span class="d out">${prev-i+1}</span>`;
  for(let d=1;d<=days;d++) cells+=`<span class="d ${d===today?'today':''} ${evDays.includes(d)?'ev':''}">${d}</span>`;
  for(let d=1;(lead+days+d-1)%7!==0;d++) cells+=`<span class="d out">${d}</span>`;
  const list=D.events.slice(0, S.f.calAll?99:12);
  return `<div class="ph"><div><h1>Calendar</h1><p><b>${D.events.length} events</b> coming up. Meetings with notes show up in Meetings too.</p></div>
    ${isMember()?`<button class="btn next" data-act="soon" data-msg="Adding events">+ Add event <span class="go">${ic('right','sm')}</span></button>`:''}</div>
  <div class="split">
    <div><div class="rows">${list.map(e=>{const g=S.rsvp[e.id]; return `<div class="row"><span class="datebox"><small>${e.month||'Nov'}</small><b>${e.day}</b></span><div class="main"><b>${esc(e.title)}</b><small>${e.dow} · ${e.time} · ${esc(e.where)} · ${e.going+(g?1:0)} going</small><small>${cdot(e.circle)}${Cn(e.circle).name}${e.about?' · '+esc(e.about):''}</small></div><button class="btn ${g?'secondary':'primary'} sm" data-act="rsvp" data-id="${e.id}">${g?ic('check','sm')+'Going':'RSVP'}</button></div>`;}).join('')}</div>
    ${D.events.length>list.length?`<p style="text-align:center;margin-top:14px"><button class="btn quiet" data-f="calAll" data-v="1">See all ${D.events.length} events →</button></p>`:''}</div>
    <div class="card"><div class="h-sec" style="margin-top:0"><h3>${mLong} ${Y}</h3></div><div class="month">${cells}</div></div>
  </div>`;
}

function pMeetings(sub){
  if(S.role==='explorer') return locked('Meetings');
  if(sub) return pMeeting(sub);
  return `<div class="ph"><div><h1>Meetings</h1><p>Each meeting leaves notes: a summary, the decisions and the action items. The assistant files them in the second brain.</p></div></div>
  <div class="rows" style="max-width:860px">${D.meetings.map(m=>`<a class="row click" href="#/meetings/${m.id}"><span class="ico-soft">${ic('chat')}</span><div class="main"><b>${m.title}</b><small>${m.date} · ${cdot(m.circle)}${Cn(m.circle).name}${m.decisions.length?' · '+m.decisions.length+' decisions':''} · ${m.actions.length} action items</small></div>${ic('right')}</a>`).join('')}</div>`;
}
function pMeeting(id){
  const m=D.meetings.find(x=>x.id===id); if(!m) return '<p>Not found.</p>';
  const lead=S.role==='lead'||S.role==='admin';
  const slug=m.notesPath||`meetings/2026-11-${m.date.split(' ')[1].padStart(2,'0')} ${m.title}.md`;
  return `<a class="back" href="#/meetings">${ic('left','sm')}Meetings</a>
  <div class="ph"><div><div class="tags" style="margin-bottom:10px"><span class="tag">${cdot(m.circle)}${Cn(m.circle).name}</span><span class="tag">${m.date}</span><span class="tag">${m.people} people</span></div><h1>${m.title}</h1></div></div>
  <div class="split">
    <div>
      <div class="card"><div class="h-sec" style="margin-top:0"><h3>Summary</h3></div><p class="prose">${m.summary}</p></div>
      ${m.decisions.length?`<div class="h-sec"><h3>Decisions</h3></div><div class="rows">${m.decisions.map(d=>`<div class="row"><span class="ico-soft" style="background:var(--mint);color:var(--mint-ink)">${ic('check')}</span><div class="main"><b style="white-space:normal">${d}</b></div></div>`).join('')}</div>`:''}
      <div class="h-sec"><h3>Action items</h3><span class="muted small">They become tasks on the board</span></div>
      <div class="rows">${m.actions.map((a,i)=>`<div class="row">${av(a.who)}<div class="main"><b>${a.text}</b><small>${a.who==='MO'?'You':a.who?who(a.who).name:(esc(a.whoName)||'Not assigned yet')}</small></div>${a.moved?'<span class="st done">On the board</span>':`<button class="btn secondary sm" data-act="to-board" data-id="${m.id}" data-i="${i}">Move to the board</button>`}</div>`).join('')}</div>
    </div>
    <div>
      <div class="h-sec" style="margin-top:0"><h3>Files</h3></div>
      <div class="rows">
        <div class="row"><span class="ico-soft">${ic('file')}</span><div class="main"><b>Meeting notes</b><small>Members can read</small></div>${ic('right')}</div>
        <div class="row" style="${lead?'':'opacity:.55'}"><span class="ico-soft">${ic(lead?'mic':'lock')}</span><div class="main"><b>Transcript</b><small>${lead?'Circle leads and admins':'Only circle leads and admins'}</small></div>${lead?ic('right'):''}</div>
      </div>
      <div class="note-brain" style="margin-top:12px">${ic('brain','sm')}<span>Saved</span><code>${esc(slug)}</code></div>
    </div>
  </div>`;
}

function pGovernance(sub){
  if(sub) return pProposal(sub);
  const f=S.f.gov||'open';
  const l=D.proposals.filter(p=>f==='open'?p.status==='open':p.status!=='open');
  return `<div class="ph"><div><h1>Governance</h1><p>Every proposal gets <b>4 checks</b> at once. <button class="btn quiet" data-act="how">How we decide</button></p></div>
    ${isMember()?`<button class="btn next" data-act="soon" data-msg="New proposals">+ New proposal <span class="go">${ic('right','sm')}</span></button>`:''}</div>
  <div class="chiprow"><button class="chip ${f==='open'?'on':''}" data-f="gov" data-v="open">Open</button><button class="chip ${f==='closed'?'on':''}" data-f="gov" data-v="closed">Decided</button></div>
  <div class="cards two">${l.map(p=>`<a class="card click" href="#/governance/${p.id}">
    <div class="tags" style="margin-bottom:10px">${p.status==='open'?`<span class="st doing">Open · ${p.left}</span>`:p.status==='approved'?'<span class="st done">Approved</span>':'<span class="st no">Not approved</span>'}<span class="tag">${cdot(p.circle)}${Cn(p.circle).name}</span></div>
    <b style="font-size:var(--t-lg);font-weight:600;display:block">${p.title}</b><p class="prose" style="margin-top:6px">${p.body}</p>
    <div class="tags" style="margin-top:12px">${p.checks.map((c,i)=>`<span class="st ${CK[c][0]}" title="${CHECKS[i][0]}">${CHECKS[i][0].split(' · ')[0]}</span>`).join('')}</div></a>`).join('')}</div>`;
}
function pProposal(id){
  const p=D.proposals.find(x=>x.id===id); if(!p) return '<p>Not found.</p>';
  const v=S.vote[id], yes=p.yes+(v==='yes'?1:0), no=p.no+(v==='no'?1:0), pct=yes+no?Math.round(yes/(yes+no)*100):0;
  const nLeads=new Set(Object.values(D.circles).flatMap(c=>c.leads)).size;
  const checkSmall=[p.checks[0]==='done'?`No objections from ${nLeads} circle leads`:`Waiting for ${nLeads} circle leads`, `${yes+no} of ${p.of} voted · ${yes+no?pct:0}% yes`, p.checks[2]==='done'?'Reviewed':'Waiting for a review', p.checks[3]==='done'?'Fits the Blueprint':'Not checked yet'];
  let voteBox='';
  if(p.status!=='open') voteBox='';
  else if(!isMember()) voteBox=`<div class="banner" style="margin-top:14px">${ic('lock')}<div class="txt"><b>Members vote</b><span>${S.role==='joining'?'You’ll vote once your first agreement is accepted.':'Start joining to take part.'}</span></div></div>`;
  else if(v) voteBox=`<div class="banner" style="margin-top:14px">${ic('check')}<div class="txt"><b>You voted ${v}</b><span>You can change your vote until it closes.</span></div><button class="btn quiet" data-act="vote" data-id="${id}" data-v="">Change</button></div>`;
  else voteBox=`<div class="vote"><button class="btn primary" data-act="vote" data-id="${id}" data-v="yes">Vote yes</button><button class="btn secondary" data-act="vote" data-id="${id}" data-v="no">Vote no</button></div>`;
  return `<a class="back" href="#/governance">${ic('left','sm')}Governance</a>
  <div class="split">
    <div>
      <div class="tags">${p.status==='open'?`<span class="st doing">Open · ${p.left}</span>`:p.status==='approved'?'<span class="st done">Approved</span>':'<span class="st no">Not approved</span>'}<span class="tag">${cdot(p.circle)}${Cn(p.circle).name}</span></div>
      <h1 class="big-title">${p.title}</h1>
      <p class="prose">Proposed by ${who(p.by).name}. ${p.body}</p>
      ${voteBox}
      <p style="margin-top:14px"><button class="btn quiet" data-act="soon" data-msg="Discussion">Discuss (7 comments) →</button></p>
    </div>
    <div>
      <div class="h-sec" style="margin-top:0"><h3>4 checks</h3><button class="link" data-act="how">How we decide →</button></div>
      <div class="rows" style="padding:4px 6px">${CHECKS.map(([t,i],n)=>{const c=p.checks[n]; return `<div class="check"><span class="ico-soft" style="width:34px;height:34px;${c==='done'?'background:var(--mint);color:var(--mint-ink)':c==='no'?'background:var(--rose);color:var(--danger)':''}">${ic(c==='done'?'check':i)}</span><div class="main"><b>${t}</b><small>${checkSmall[n]}</small>${n===1?`<div class="bar"><i style="width:${pct}%"></i></div>`:''}</div><span class="st ${CK[c][0]}">${CK[c][1]}</span></div>`;}).join('')}</div>
      <p class="muted small" style="margin-top:10px">Approved when enough checks pass. (The exact rule goes here once the AI-check decision is made.)</p>
    </div>
  </div>`;
}

function pJoin(){
  if(S.role!=='explorer') return `<div class="card empty"><div class="scene" data-scene="myco"></div><b>You’ve already applied</b><p>You’re a ${ROLE_NAME[S.role]}. Your next step is in the yellow box.</p><a class="btn primary" href="#/dashboard">Open Dashboard →</a></div>`;
  const s=S.joinStep;
  const step = s===1 ? `<h2 class="big-title" style="margin-top:0">About you</h2>
      <div class="field"><label>Your name</label><input class="input" value="${esc(who('MO').name)}"></div>
      <div class="field"><label>Who invited you?</label><input class="input" value="Lena Fischer" disabled><span class="hint">From your invite link.</span></div>
      <div class="field"><label>Why Protopia?</label><textarea class="input" placeholder="A few lines are enough"></textarea></div>`
    : s===2 ? `<h2 class="big-title" style="margin-top:0">What you’ll contribute</h2>
      <p class="prose" style="margin-bottom:14px">Pick what you could offer. You can change it any time on your profile.</p>
      <div class="tags" style="margin-bottom:16px">${['Gardening','Cooking','Carpentry','Childcare','Illustration','Accounting','Driving','Teaching'].map((t,i)=>`<button class="chip ${[0,4].includes(i)?'on':''}" data-act="toggle-chip">${t}</button>`).join('')}</div>
      <div class="field"><label>Anything else?</label><textarea class="input" placeholder="Skills, time, things you own"></textarea></div>`
    : `<h2 class="big-title" style="margin-top:0">The Blueprint</h2>
      <p class="prose" style="margin-bottom:14px">The Blueprint is how we live and decide. <a class="btn quiet" href="#/blueprint">Read it →</a></p>
      <label class="banner" style="cursor:pointer"><input type="checkbox" id="bpok" style="width:18px;height:18px;accent-color:#111317"><div class="txt"><b>I’ve read the Blueprint and want to live by it</b><span>A circle lead answers within a week.</span></div></label>`;
  return `<div class="split even" style="align-items:center">
    <div class="card" style="padding:22px">
      <div class="eyebrow" style="margin-bottom:10px">Join · step ${s} of 3</div>
      <div class="steps">${[1,2,3].map(i=>`<i class="${i<=s?'on':''}"></i>`).join('')}</div>
      ${step}
      <div class="modal-foot">${s>1?'<button class="btn secondary left" data-act="join-back">← Back</button>':''}${s<3?`<button class="btn primary" data-act="join-next">Save & continue →</button>`:`<button class="btn next" data-act="join-send">Send application <span class="go">${ic('right','sm')}</span></button>`}</div>
    </div>
    <div class="scene desk" data-scene="poster" style="height:auto;aspect-ratio:300/380;border-radius:var(--r-card);margin:0;max-width:420px;justify-self:center;width:100%"></div>
  </div>`;
}

function denied(t){ return `<div class="ph"><div><h1>${t}</h1></div></div><div class="card empty"><div class="scene" data-scene="myco"></div><b>Only circle leads and admins see this</b><p>Switch “View as” in the prototype bar to see it.</p></div>`; }
function pManage(key){
  if(!manageAllowed(key)) return denied(TITLES[key]);
  if(key==='manage/join') return `<div class="ph"><div><h1>Join applications</h1><p>People who applied. Accept makes them a joining member.</p></div></div>
    <div style="max-width:860px">${D.applications.length?`<div class="cards">${D.applications.map(a=>`<div class="card"><div class="card-head"><span class="av md" style="--c:${a.c}">${a.ini}</span><div><b>${a.name}</b><small>${a.by} · applied 2 days ago</small></div></div>
      <p class="prose">“${a.why}”</p><div class="tags" style="margin-top:10px">${a.give.split(', ').map(g=>`<span class="tag">${ic('gift','sm')}${g}</span>`).join('')}</div>
      <div class="vote" style="max-width:320px"><button class="btn primary" data-act="answer" data-kind="app" data-id="${a.id}" data-v="accepted">Accept</button><button class="btn secondary" data-act="answer" data-kind="app" data-id="${a.id}" data-v="declined">Decline</button></div></div>`).join('')}</div>`
      :`<div class="card empty"><div class="scene" data-scene="myco"></div><b>All answered</b><p>New applications show up here and in your next step.</p></div>`}</div>`;
  if(key==='manage/place'){ const reqs=D.bookings.filter(b=>b.status==='request');
    return `<div class="ph"><div><h1>Place & bookings</h1><p>Booking requests to answer, and the items people can book.</p></div><button class="btn next" data-act="soon" data-msg="Adding items">+ Add item <span class="go">${ic('right','sm')}</span></button></div>
    <div class="split even"><div><div class="h-sec" style="margin-top:0"><h3>Booking requests · ${reqs.length}</h3></div>
      ${reqs.length?`<div class="rows">${reqs.map(b=>`<div class="row">${av(b.who)}<div class="main"><b>${b.item}</b><small>${b.who==='MO'?'You':who(b.who).name} · ${b.when}</small></div><span class="acts"><button class="btn primary sm" data-act="answer" data-kind="booking" data-id="${b.id}" data-v="ok">Accept</button><button class="btn secondary sm" data-act="answer" data-kind="booking" data-id="${b.id}" data-v="no">Decline</button></span></div>`).join('')}</div>`:'<p class="muted">All answered.</p>'}</div>
      <div><div class="h-sec" style="margin-top:0"><h3>Items</h3></div><div class="rows">${[...D.stay,...D.borrow].map(x=>`<div class="row"><span class="ico-soft">${ic(D.stay.includes(x)?'bed':'wrench')}</span><div class="main"><b>${x.name}</b><small>${x.note}</small></div>${x.approval?'<span class="tag">Needs a yes</span>':'<span class="tag">Anyone</span>'}</div>`).join('')}</div></div></div>`; }
  if(key==='manage/people') return `<div class="ph"><div><h1>People</h1><p>Roles and circles for everyone. Changes save straight away.</p></div></div>
    <div class="tablewrap"><table class="t"><thead><tr><th>Name</th><th>Role</th><th>Member of</th></tr></thead><tbody>${Object.keys(D.people).map(k=>{const p=who(k); return `<tr><td><span style="display:flex;align-items:center;gap:10px">${av(k)}<b>${p.name}</b></span></td><td><select class="input" style="height:36px;min-width:160px" data-act-change="role">${['explorer','joining member','member','project lead','circle lead','advisor','admin'].map(r=>`<option ${r===p.role?'selected':''}>${r}</option>`).join('')}</select></td><td><div class="tags">${p.circles.map(c=>`<span class="tag">${cdot(c)}${Cn(c).name}</span>`).join('')}</div></td></tr>`;}).join('')}</tbody></table></div>`;
  return `<div class="ph"><div><h1>Assistant questions</h1><p>Questions the assistant couldn’t answer from the second brain. Answer once, and it knows next time.</p></div></div>
    <div class="rows" style="max-width:860px">${D.questions.map(q=>`<div class="row"><span class="ico-soft">${ic('spark')}</span><div class="main"><b>${q.q}</b><small>${q.who}</small></div><button class="btn secondary sm" data-act="answer-q" data-id="${q.id}">Answer</button></div>`).join('')}</div>`;
}

/* ───────── About {community}: the Blueprint, told as a page ───────── */
const AB = window.LIVE_ABOUT || null;
function pAbout(){
  if(!AB) return pBlueprint();
  const lead=S.role==='lead'||S.role==='admin';
  const sec=(id,eyebrow,title,body)=>`<section class="ab-sec" id="ab-${id}"><div class="eyebrow">${eyebrow}</div><h2 class="ab-h">${title}</h2>${body}</section>`;
  const nav=[['story','Our story'],['land','The land'],['day','A day here'],['values','What we value'],['decide','How we decide'],['live','Living here'],['people','People'],['next','Where we’re going']];
  return `<div class="ab-hero" style="background-image:url('${AB.hero}')">
      <div class="ab-hero-in">
        <span class="tag" style="background:rgba(255,255,255,.9)">${ic('pin','sm')}La Cabanga, Costa Rica</span>
        <h1>${esc(AB.name)}</h1>
        <p>${esc(AB.tagline)}</p>
        <div class="ab-hero-acts">${S.role==='explorer'?`<button class="btn next" data-go="#/join">Start joining <span class="go">${ic('right','sm')}</span></button>`:''}<button class="btn secondary" data-act="assist">${ic('spark','sm')}Ask about ${esc(AB.name)}</button>${lead?`<button class="btn secondary" data-act="soon" data-msg="Editing the Blueprint">${ic('pencil','sm')}Edit Blueprint</button>`:''}</div>
      </div>
    </div>
    <div class="ab-facts">${AB.facts.map(([n,t])=>`<div><b>${n}</b><span>${esc(t)}</span></div>`).join('')}</div>
    <nav class="chiprow ab-nav">${nav.map(([k,t])=>`<button class="chip" data-scroll-ab="${k}">${t}</button>`).join('')}</nav>

    <section class="ab-why"><div class="eyebrow">Why we’re here</div><blockquote>${esc(AB.why)}</blockquote><p class="prose">${esc(AB.whyMore)}</p>
      <div class="cards two" style="margin-top:18px"><div class="card"><div class="eyebrow">Mission</div><p class="prose" style="margin-top:6px">${esc(AB.mission)}</p></div><div class="card"><div class="eyebrow">Vision</div><p class="prose" style="margin-top:6px">${esc(AB.vision)}</p></div></div></section>

    ${sec('story','Our story','We didn’t find this place, so we built it',`<div class="split"><div><p class="prose ab-lead">${esc(AB.story)}</p>
      <ol class="ab-time">${AB.timeline.map(([y,t,d])=>`<li><span class="y">${y}</span><div><b>${t}</b><p>${esc(d)}</p></div></li>`).join('')}</ol></div>
      <div class="ab-photo" style="background-image:url('${AB.photo2}')"></div></div>`)}

    ${sec('land','The land','Fourteen hectares, mostly forest',`<p class="prose ab-lead">${esc(AB.land.text)}</p>
      <div class="ab-split">${AB.land.split.map(([t,v,c])=>`<i style="flex:${v};background:${c}" title="${t} ${v}%"></i>`).join('')}</div>
      <div class="ab-legend">${AB.land.split.map(([t,v,c])=>`<span><i style="background:${c}"></i>${t} · ${v}%</span>`).join('')}</div>
      <div class="cards two" style="margin-top:16px">${AB.land.systems.map(([i,t,d])=>`<div class="card"><div class="card-head" style="margin-bottom:6px"><span class="ico-soft">${ic(i)}</span><div><b>${t}</b></div></div><p class="prose">${esc(d)}</p></div>`).join('')}</div>`)}

    ${sec('day','A day here','A weekday has a rhythm',`<div class="split"><ol class="ab-day">${AB.day.map(([t,w,n])=>`<li><span class="t">${t||'·'}</span><div><b>${w}</b>${n?`<small>${n}</small>`:''}</div></li>`).join('')}</ol>
      <div><div class="card"><div class="eyebrow" style="margin-bottom:10px">Rituals</div><div class="tags">${AB.rituals.map(r=>`<span class="tag">${ic('star','sm')}${r}</span>`).join('')}</div></div>
      <div class="card" style="margin-top:12px"><div class="eyebrow" style="margin-bottom:6px">Events</div><p class="prose">${esc(AB.events)}</p><p style="margin-top:10px"><a class="btn quiet" href="#/calendar">Open Calendar →</a></p></div></div></div>`)}

    ${sec('values','What we value','Four things we hold to',`<div class="cards two">${AB.values.map(([t,d],i)=>`<div class="card ab-val"><span class="n">${i+1}</span><b>${t}</b><p class="prose">${esc(d)}</p></div>`).join('')}</div>
      <div class="banner" style="margin-top:12px">${ic('handshake')}<div class="txt"><b>Our community agreements</b><span>${esc(AB.agreements)}</span></div></div>`)}

    ${sec('decide','How we decide','Decisions sit with the people they affect',`<div class="cards two">${AB.decide.map(([t,d])=>`<div class="card"><b style="display:block;margin-bottom:4px">${t}</b><p class="prose">${esc(d)}</p></div>`).join('')}</div>
      <p style="margin-top:12px;display:flex;gap:16px;flex-wrap:wrap"><a class="btn quiet" href="#/circles">Open Circles →</a><a class="btn quiet" href="#/governance">Open Governance →</a></p>`)}

    ${sec('live','Living here','Who we’re looking for, and how to stay',`<p class="prose ab-lead">${esc(AB.lookingFor)}</p>
      <div class="cards ab-ways">${AB.ways.map(([t,p,d])=>`<div class="card"><small class="muted">${t}</small><b class="price">${p}</b><p class="prose">${esc(d)}</p></div>`).join('')}</div>
      <p class="muted small" style="margin-top:8px">${esc(AB.waysNote)}</p>
      <div class="h-sec"><h3>How joining works</h3></div>
      <ol class="ab-steps">${AB.joinSteps.map(([t,d],i)=>`<li><span>${i+1}</span><b>${t}</b><small>${esc(d)}</small></li>`).join('')}</ol>
      ${S.role==='explorer'?`<button class="btn next" data-go="#/join" style="margin-top:16px">Start joining <span class="go">${ic('right','sm')}</span></button>`:''}`)}

    ${sec('people','People','Who carries the culture',`<div class="cards three">${AB.team.map(([n,r,c])=>`<div class="card"><div class="card-head" style="margin-bottom:0"><span class="av md" style="--c:${['#F3D9B1','#D8E3C8','#F1D9C6','#DCE3F2','#E8D3E3','#F6E2B8','#CFE0EE'][n.length%7]}">${n.replace(/[^A-Za-zÀ-ž ]/g,'').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('')}</span><div><b>${esc(n)}</b><small>${r}${c?' · '+c:''}</small></div></div></div>`).join('')}</div>
      <p style="margin-top:12px"><a class="btn quiet" href="#/members">See all members →</a></p>`)}

    ${sec('next','Where we’re going','Still evolving',`<div class="cards three">${AB.going.map(([t,d])=>`<div class="card"><div class="eyebrow">${t}</div><p class="prose" style="margin-top:6px">${esc(d)}</p></div>`).join('')}</div>`)}

    <section class="ab-sec"><div class="split even">
      <div class="card"><div class="h-sec" style="margin-top:0"><h3>Blueprint progress</h3>${lead?'<button class="link" data-act="soon" data-msg="The Blueprint steps">Open the steps →</button>':''}</div>
        <div style="display:flex;align-items:baseline;gap:8px"><b style="font-family:var(--display);font-size:40px;font-weight:500;letter-spacing:-.04em">${AB.readiness.score}</b><span class="muted">/ 10 ready · ${AB.readiness.spiral} · ${AB.readiness.gates}</span></div>
        <div style="display:grid;gap:8px;margin-top:12px">${AB.readiness.pillars.map(([t,v])=>`<div><div style="display:flex;justify-content:space-between" class="small"><span>${t}</span><span class="muted">${v}/10</span></div><div class="bar"><i style="width:${v*10}%"></i></div></div>`).join('')}</div></div>
      <div class="card"><div class="h-sec" style="margin-top:0"><h3>Read more</h3><span class="muted small">From the second brain</span></div>
        <div class="rows" style="padding:0">${AB.docs.filter(([,v])=>v==='everyone'||lead).map(([t,v])=>`<div class="row"><span class="ico-soft" style="width:32px;height:32px">${ic(v==='leads'?'lock':'file','sm')}</span><div class="main"><b>${t}</b><small>${v==='leads'?'Circle leads only':'Everyone'}</small></div>${ic('right')}</div>`).join('')}</div></div>
    </div></section>`;
}

/* ───────── Amenities & tools ───────── */
function siteMap(list, on){
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="map-art" aria-hidden="true">
    <path d="M0 0 H100 V100 H0Z" fill="#1F3FB8"/>
    <g fill="none" stroke="#F3EAD7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke">
      <path d="M2 30 C14 28 12 12 22 6 M8 40 C20 36 18 22 30 14" stroke-width="3" opacity=".9"/>
      <path d="M96 96 C80 86 72 78 64 70 C56 62 50 56 52 46 C54 38 62 30 70 34" stroke-width="2.4" stroke-dasharray="1 6"/>
      <path d="M90 88 L86 84" stroke-width="5"/>
      ${[[10,62],[16,50],[8,84],[30,88],[88,14],[78,12],[92,30],[66,12],[40,10],[50,18],[94,48],[34,76]].map(([x,y])=>`<path d="M${x-3} ${y+2} L${x} ${y-4} L${x+3} ${y+2} Z" stroke-width="1.8" opacity=".75"/>`).join('')}
    </g>
  </svg>
  ${list.map((a,i)=>`<button class="pin ${on===i?'on':''}" style="left:${a.x}%;top:${a.y}%" data-act="pin" data-i="${i}" aria-label="${esc(a.n)}">${i+1}</button>`).join('')}
  <span class="map-note">Sketch map · the real site map isn’t in the Blueprint yet</span>`;
}
function pAmenities(){
  if(S.role==='explorer') return locked('Amenities & tools');
  const f=S.f.am||'amenities', sel=S.f.pin==null?-1:+S.f.pin;
  const list = AB ? AB.amenities : [...D.stay,...D.borrow].map((x,i)=>({n:x.name,k:x.approval?'Needs a yes':'Anyone',d:x.note,ic:D.stay.includes(x)?'bed':'wrench',x:20+(i*13)%65,y:25+(i*17)%55,id:x.id}));
  const tools = AB ? AB.tools : D.borrow.map(x=>({n:x.name,d:x.note,ic:'wrench',where:'',real:true,id:x.id}));
  const bookables=[...D.stay,...D.borrow];
  let body='';
  if(f==='amenities') body=`<div class="split am-split"><div class="map">${siteMap(list,sel)}</div>
    <div class="rows am-list">${list.map((a,i)=>`<div class="row click ${sel===i?'sel':''}" data-act="pin" data-i="${i}"><span class="pin-n">${i+1}</span><div class="main"><b>${esc(a.n)}</b><small>${esc(a.k)}</small>${sel===i?`<p class="prose small" style="margin-top:6px;white-space:normal">${esc(a.d)}</p>${a.book?`<button class="btn primary sm" style="margin-top:8px" data-act="am-tab" data-v="stay">Book a room</button>`:''}`:''}</div></div>`).join('')}</div></div>
    ${AB?`<div class="banner" style="margin-top:14px">${ic('globe')}<div class="txt"><b>Internet & power</b><span>${esc(AB.connectivity)}</span></div></div>`:''}`;
  if(f==='tools') body=`<div class="cards three">${tools.map(t=>`<div class="card"><div class="card-head"><span class="ico-soft">${ic(t.ic)}</span><div><b>${esc(t.n)}</b><small>${esc(t.where||'')}</small></div></div><p class="prose">${esc(t.d)}</p>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">${t.real?'<span class="tag">'+ic('check','sm')+'In the Blueprint</span>':'<span class="tag" title="Not in the Blueprint yet">Example</span>'}<button class="btn primary sm" data-act="borrow" data-n="${esc(t.n)}">Borrow</button></div></div>`).join('')}</div>
    <p class="muted small" style="margin-top:10px">Only ${D.borrow.length} item${D.borrow.length===1?' is':'s are'} bookable in the portal today (${D.borrow.map(x=>esc(x.name)).join(', ')}). Tools marked Example aren’t listed anywhere yet.</p>`;
  if(f==='stay') body=`<div class="rows" style="max-width:820px">${bookables.map(x=>`<div class="row"><span class="ico-soft">${ic(D.stay.includes(x)?'bed':'pin')}</span><div class="main"><b>${esc(x.name)}</b><small>${esc(x.note)}${x.approval?' · needs a yes':''}</small></div>${x.off?'<span class="st paused">Paused</span>':`<button class="btn primary sm" data-act="book" data-id="${x.id}">Book</button>`}</div>`).join('')}</div>`;
  if(f==='mine'){ const l=D.bookings.filter(b=>b.who==='MO'); body=l.length?`<div class="rows" style="max-width:820px">${l.map(b=>`<div class="row"><span class="ico-soft">${ic('calendar')}</span><div class="main"><b>${esc(b.item)}</b><small>${b.when}</small></div>${b.status==='ok'?'<span class="st done">Booked</span>':b.status==='no'?'<span class="st no">Declined</span>':'<span class="st todo">Booking request</span>'}</div>`).join('')}</div>`:`<div class="card empty"><b>No bookings yet</b><p>Book a room or a space, or borrow a tool.</p></div>`; }
  return `<div class="ph"><div><h1>Amenities & tools</h1><p>What we share at ${AB?esc(AB.name):'Protopia'}: the houses, the land, and the things you can borrow.</p></div></div>
  <div class="chiprow">${[['amenities','Amenities'],['tools','Tools'],['stay','Book a room or space'],['mine','My bookings']].map(([k,t])=>`<button class="chip ${f===k?'on':''}" data-f="am" data-v="${k}">${t}</button>`).join('')}</div>${body}`;
}

/* ───────── Admin ───────── */
const adminAllowed = k=>S.role==='admin' || S.role==='lead';
const canEditPerms = ()=>S.role==='admin';
function pAdmin(key){
  if(!adminAllowed(key)) return `<div class="ph"><div><h1>${TITLES[key]}</h1></div></div><div class="card empty"><div class="scene" data-scene="myco"></div><b>Only ${key==='admin/permissions'?'admins':'circle leads and admins'} see this</b><p>Switch “View as” in the prototype bar to see it.</p></div>`;
  if(key==='admin/applications') return pManage('manage/join').replace('<h1>Join applications</h1>','<h1>Applications</h1>');
  if(key==='admin/bookings') return pAdminBookings();
  return pPermissions();
}
function pAdminBookings(){
  const days=14, t0=new Date(); t0.setHours(0,0,0,0);
  const dayIdx=iso=>Math.floor((new Date(iso)-t0)/864e5);
  const real=D.bookings.filter(b=>b.start);
  const ROWS = AB
    ? [['Dorm 1','10 beds'],['Dorm 2','10 beds'],...[1,2,3,4,5,6,7,8,9].map(n=>[`Private room ${n}`, n<=2?'large':n<=5?'medium':'small']),['Cabin 1',''],['Cabin 2',''],['Cabin 3',''],...[...D.stay,...D.borrow].map(x=>[x.name,'in the portal'])]
    : [...D.stay,...D.borrow].map(x=>[x.name,'']);
  // Example stays: made-up guests so the layout can be judged. Real bookings are drawn solid.
  const EX = S.f.bkEx===0 ? [] : [['Dorm 1',0,5,'Guest A','guest'],['Dorm 1',6,11,'Guest B','guest'],['Dorm 2',1,13,'Volunteer C','vol'],['Private room 2',0,3,'Guest D','guest'],['Private room 2',4,10,'Nomad E','nomad'],['Private room 5',3,12,'Apprentice F','appr'],['Private room 7',6,8,'Guest G','guest'],['Cabin 1',0,13,'Nomad H','nomad'],['Cabin 3',5,9,'Facilitator I','fac']];
  const realBars = real.map(b=>[b.item, Math.max(0,dayIdx(b.start)), Math.max(0,dayIdx(b.end)), who(b.who).name.split(' ')[0], b.status]);
  const hd=[...Array(days)].map((_,i)=>{const d=new Date(t0); d.setDate(d.getDate()+i); return d;});
  const bar=(r,a,z,n,cls)=>`<div class="bk ${cls}" style="grid-row:${r};grid-column:${a+2}/${Math.min(days,z+1)+2}" title="${esc(n)}">${esc(n)}</div>`;
  const rowIdx=n=>ROWS.findIndex(r=>r[0]===n)+2;
  const reqs=D.bookings.filter(b=>b.status==='request');
  return `<div class="ph"><div><h1>Bookings</h1><p>Who stays where, and what’s booked, for the next two weeks.</p></div>
    <span style="display:flex;gap:8px"><button class="chip ${S.f.bkEx===0?'':'on'}" data-f="bkEx" data-v="${S.f.bkEx===0?1:0}">${S.f.bkEx===0?'Show example stays':'Hide example stays'}</button><button class="btn next" data-act="soon" data-msg="Adding bookings">+ Add booking <span class="go">${ic('right','sm')}</span></button></span></div>
  ${reqs.length?`<div class="h-sec" style="margin-top:0"><h3>To answer · ${reqs.length}</h3></div><div class="rows" style="margin-bottom:16px">${reqs.map(b=>`<div class="row">${av(b.who)}<div class="main"><b>${esc(b.item)}</b><small>${b.who==='MO'?'You':who(b.who).name} · ${b.when}</small></div><span class="acts"><button class="btn primary sm" data-act="answer" data-kind="booking" data-id="${b.id}" data-v="ok">Accept</button><button class="btn secondary sm" data-act="answer" data-kind="booking" data-id="${b.id}" data-v="no">Decline</button></span></div>`).join('')}</div>`:''}
  <div class="bk-wrap"><div class="bk-grid" style="grid-template-columns:150px repeat(${days},minmax(44px,1fr));grid-template-rows:44px repeat(${ROWS.length},38px)">
    <div class="bk-corner">Place</div>
    ${hd.map((d,i)=>`<div class="bk-day ${i===0?'today':''} ${[0,6].includes(d.getDay())?'we':''}" style="grid-column:${i+2}"><small>${d.toLocaleString('en-GB',{weekday:'short'})}</small><b>${d.getDate()}</b></div>`).join('')}
    ${ROWS.map(([n,s],i)=>`<div class="bk-row" style="grid-row:${i+2}"><b>${esc(n)}</b>${s?`<small>${esc(s)}</small>`:''}</div>${hd.map((_,j)=>`<div class="bk-cell ${j===0?'today':''}" style="grid-row:${i+2};grid-column:${j+2}"></div>`).join('')}`).join('')}
    ${EX.filter(e=>rowIdx(e[0])>1).map(([n,a,z,g,t])=>bar(rowIdx(n),a,z,g,'ex t-'+t)).join('')}
    ${realBars.filter(e=>rowIdx(e[0])>1).map(([n,a,z,g,st])=>bar(rowIdx(n),a,z,g+(st==='request'?' · request':''),st==='request'?'req':'real')).join('')}
  </div></div>
  <div class="ab-legend" style="margin-top:10px"><span><i class="bk real"></i>Real booking</span><span><i class="bk req"></i>Booking request</span>${S.f.bkEx===0?'':[['guest','Guest'],['nomad','Digital nomad'],['vol','Volunteer'],['appr','Apprentice'],['fac','Facilitator']].map(([k,t])=>`<span><i class="bk ex t-${k}"></i>${t}</span>`).join('')+'<span class="muted">Striped = example stay, made up to judge the layout</span>'}</div>`;
}

const PERMS=[
  ['See members and profiles',[1,1,1,1,1,1]],['Book amenities and tools',[0,1,1,1,1,1]],['Suggest a project',[0,1,1,1,1,1]],['Add tasks',[0,0,1,1,1,1]],
  ['Vote on proposals',[0,0,1,1,1,1]],['Make a proposal',[0,0,1,1,1,1]],['Add events',[0,0,1,1,1,1]],['Move projects on the board',[0,0,0,1,1,1]],
  ['Read meeting transcripts',[0,0,0,0,1,1]],['Answer applications',[0,0,0,0,1,1]],['Answer booking requests',[0,0,0,0,1,1]],['Change roles and settings',[0,0,0,0,0,1]]];
const SETTINGS=[
  ['Joining',[['invite','Invite only','New people need an invite link from a member.',1],['autoMember','Become a member automatically','After the first accepted agreement.',1]]],
  ['Modules',[['meetings','Meetings','Notes, summaries and action items from meetings.',1],['governance','Governance','Proposals and the four checks.',1],['amenities','Amenities & tools','Map, list and borrowing.',1],['points','Points','Show points next to badges.',0]]],
  ['The assistant',[['ask','Ask','Members can ask questions about the community.',1],['do','Do','The assistant can make changes with the person’s own permissions.',1],['doLeads','Do for leads only','Only circle leads and admins can use Do.',0]]],
  ['Privacy',[['transcripts','Transcripts for leads only','Members read the notes, not the full transcript.',1],['publicCal','Public calendar link','Share events marked public outside the portal.',0]]]
];
function pPermissions(){
  const R=['explorer','joining member','member','project lead','circle lead','admin'];
  S.perm=S.perm||PERMS.map(p=>[...p[1]]); S.set=S.set||Object.fromEntries(SETTINGS.flatMap(g=>g[1]).map(x=>[x[0],x[3]]));
  const f=S.f.perm||'people', ro=!canEditPerms(), dis=ro?'disabled':'';
  let body='';
  if(f==='people') body=`<div class="tablewrap"><table class="t"><thead><tr><th>Name</th><th>Role</th><th>Leads</th><th>Member of</th></tr></thead><tbody>${Object.keys(D.people).map(k=>{const p=who(k); return `<tr><td><span style="display:flex;align-items:center;gap:10px">${av(k)}<b>${esc(p.name)}</b></span></td><td><select class="input" style="height:36px;min-width:150px" data-act-change="role" ${dis}>${R.map(r=>`<option ${r===p.role?'selected':''}>${r}</option>`).join('')}</select></td><td><div class="tags">${(p.leads||[]).slice(0,3).map(c=>`<span class="tag">${cdot(c)}${Cn(c).name}</span>`).join('')}${(p.leads||[]).length>3?`<span class="tag">+${p.leads.length-3}</span>`:''}</div></td><td><div class="tags">${p.circles.slice(0,3).map(c=>`<span class="tag">${cdot(c)}${Cn(c).name}</span>`).join('')}${p.circles.length>3?`<span class="tag">+${p.circles.length-3}</span>`:''}</div></td></tr>`;}).join('')}</tbody></table></div>`;
  if(f==='roles') body=`<div class="tablewrap"><table class="t perm"><thead><tr><th>Who can</th>${R.map(r=>`<th>${r}</th>`).join('')}</tr></thead><tbody>${PERMS.map(([t],i)=>`<tr><td><b>${t}</b></td>${R.map((r,j)=>`<td><button class="tog ${S.perm[i][j]?'on':''}" data-act="perm" data-i="${i}" data-j="${j}" aria-label="${t}: ${r}" ${j===5||ro?'disabled':''}></button></td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="muted small" style="margin-top:8px">Admins can always do everything. Changes apply straight away and are logged.</p>`;
  if(f==='platform') body=`<div class="cards two">${SETTINGS.map(([g,list])=>`<div class="card"><div class="h-sec" style="margin-top:0"><h3>${g}</h3></div>${list.map(([k,t,d])=>`<div class="set-row"><div><b>${t}</b><small>${d}</small></div><button class="tog ${S.set[k]?'on':''}" data-act="set" data-k="${k}" aria-label="${t}" ${dis}></button></div>`).join('')}</div>`).join('')}
    <div class="card"><div class="h-sec" style="margin-top:0"><h3>Look & feel</h3></div><div class="set-row"><div style="display:flex;align-items:center;gap:12px">${D.brand&&D.brand.logo?`<img src="${D.brand.logo}" alt="" style="width:44px;height:44px;object-fit:contain">`:''}<div><b>Logo and banner</b><small>Shown in the menu, the top of About and shared links.</small></div></div>${ro?'':'<button class="btn secondary sm" data-act="soon" data-msg="Changing the logo">Change</button>'}</div></div></div>`;
  return `<div class="ph"><div><h1>Permissions</h1><p>Who can do what, and the settings only admins change.</p></div></div>
  ${ro?`<div class="banner">${ic('lock')}<div class="txt"><b>You can see these, but only admins can change them</b><span>Ask an admin if something should be different.</span></div></div>`:''}
  <div class="chiprow">${[['people','People & roles'],['roles','What each role can do'],['platform','Platform settings']].map(([k,t])=>`<button class="chip ${f===k?'on':''}" data-f="perm" data-v="${k}">${t}</button>`).join('')}</div>${body}`;
}

/* ───────── router ───────── */
function parse(){
  const h=location.hash.replace(/^#\/?/,'')||'dashboard';
  const [path,qs]=h.split('?'); const parts=path.split('/').filter(Boolean);
  let key=parts[0]||'dashboard', sub=parts[1];
  if(key==='manage'||key==='admin'){ key=(key==='manage'?({join:'admin/applications',place:'admin/bookings',people:'admin/permissions',assistant:'admin/permissions'}[parts[1]]||'admin/applications'):'admin/'+parts[1]); sub=parts[2]; }
  key={blueprint:'about','our-place':'amenities','my-tasks':'dashboard'}[key]||key;
  return {key, sub, q:new URLSearchParams(qs||'')};
}
const PAGES={dashboard:pDashboard,about:pAbout,amenities:pAmenities,members:pMembers,circles:pCircles,calendar:pCalendar,operations:pOperations,agreements:pAgreements,meetings:pMeetings,governance:pGovernance,join:pJoin};
let lastKey='';
function render(keepScroll){
  const {key,sub}=parse();
  const view=$('#view'), y=view.scrollTop;
  const fn=key.startsWith('admin/')?()=>pAdmin(key):PAGES[key]||pDashboard;
  view.innerHTML=`<div class="view-in">${fn(sub)}</div>`;
  $('#side').innerHTML=navHTML(key);
  $('#tabbar').innerHTML=tabsHTML(key);
  $('#mtitle').textContent=sub&&key==='operations'?'Project':sub&&key==='governance'?'Proposal':(TITLES[key]||'Dashboard');
  document.title=(TITLES[key]||'Dashboard')+' · MyCoNet prototype';
  paint(document.body);
  wireBoards();
  const here=key+'/'+(sub||'');
  view.scrollTop = keepScroll||here===lastKey ? y : 0; lastKey=here;
  $('#roleSel').value=S.role;
  const ta=$('#topAv'); if(ta) ta.outerHTML=av('MO').replace('<span class="av','<a id="topAv" href="#/members/MO" class="av').replace(/<\/span>$/,'</a>').replace('style="','style="width:40px;height:40px;font-size:12px;box-shadow:none;');
}
window.addEventListener('hashchange',()=>{ closeLayer(); render(); });

/* ───────── drag and drop on boards ───────── */
function wireBoards(){
  document.querySelectorAll('.board').forEach(b=>{
    b.querySelectorAll('.pc[draggable=true]').forEach(c=>{
      c.addEventListener('dragstart',e=>{ e.dataTransfer.setData('text/plain',c.dataset.kind+':'+c.dataset.id); c.classList.add('dragging'); });
      c.addEventListener('dragend',()=>c.classList.remove('dragging'));
    });
    b.querySelectorAll('.col').forEach(col=>{
      col.addEventListener('dragover',e=>{e.preventDefault(); col.classList.add('over');});
      col.addEventListener('dragleave',()=>col.classList.remove('over'));
      col.addEventListener('drop',e=>{
        e.preventDefault(); col.classList.remove('over');
        const [kind,id]=e.dataTransfer.getData('text/plain').split(':'); const to=col.dataset.col;
        if(kind==='project'){ const p=proj(id), from=p.status; if(from===to) return; p.status=to; render(true); toast(`${p.name} moved to ${COL[to]}`,()=>{p.status=from;}); }
        else { const t=D.tasks.find(x=>x.id===id), from=t.status; if(from===to) return;
          if(to==='paused') return toast('A task can’t be paused. Only projects go in Paused.');
          if(to==='idea') return toast('Ideas is for project ideas. Use To do for a task.');
          t.status=to; render(true); toast(`Task moved to ${COL[to]}`,()=>{t.status=from;}); }
      });
    });
  });
}

/* ───────── overlays ───────── */
function openLayer(html, cls=''){ const l=$('#layer'); l.innerHTML=`<div class="backdrop" data-act="close"></div>${html}`; l.className='layer open '+cls; paint(l); return l; }
function closeLayer(){ const l=$('#layer'); l.className='layer'; l.innerHTML=''; }
const modal=(title,body,foot)=>`<div class="modal" role="dialog" aria-label="${esc(title)}"><div class="modal-head"><h2>${title}</h2><button class="iconbtn" style="background:#fff" data-act="close" aria-label="Close">${ic('x')}</button></div>${body}<div class="modal-foot">${foot}</div></div>`;
const opt=(v,t,sel)=>`<option value="${esc(v)}" ${sel?'selected':''}>${esc(t)}</option>`;

function taskModal(t, isNew){
  const teams=c=>Cn(c).teams.map(x=>x.name);
  const projOpts=D.projects.filter(p=>!['idea','done'].includes(p.status));
  const body=`<div class="field"><label>Task</label><input class="input" id="f-title" value="${esc(t.title)}" placeholder="What needs doing?"></div>
    <div class="fields2">
      <div class="field"><label>Status</label><select class="input" id="f-status">${['todo','doing','review','done'].map(s=>opt(s,COL[s],t.status===s)).join('')}</select></div>
      <div class="field"><label>Due</label><input class="input" id="f-due" value="${esc(t.due)}" placeholder="e.g. Fri 21 Nov"></div>
    </div>
    <div class="field"><label>Assigned to</label><select class="input" id="f-who">${opt('','Not assigned yet',!t.who)}${Object.keys(D.people).map(k=>opt(k,k==='MO'?who('MO').name+' (you)':who(k).name,t.who===k)).join('')}</select></div>
    <div class="field"><label>Project</label><select class="input" id="f-project">${opt('','No project · on the board',!t.project)}${projOpts.map(p=>opt(p.id,p.name,t.project===p.id)).join('')}</select><span class="hint">A task can live on the board without a project.</span></div>
    <div class="fields2">
      <div class="field"><label>Circle</label><select class="input" id="f-circle">${Object.entries(D.circles).map(([k,c])=>opt(k,c.name,t.circle===k)).join('')}</select></div>
      <div class="field"><label>Team</label><select class="input" id="f-team">${opt('','No team',!t.team)}${teams(t.circle).map(n=>opt(n,n,t.team===n)).join('')}</select></div>
    </div>`;
  const foot=`${isNew?'':'<button class="btn danger left" data-act="task-delete" data-id="'+t.id+'">Delete</button>'}<button class="btn secondary" data-act="close">Cancel</button><button class="btn primary" data-act="task-save" data-id="${t.id}">Save</button>`;
  const l=openLayer(modal(isNew?'+ Add task':'Task',body,foot));
  const fc=l.querySelector('#f-circle'), ft=l.querySelector('#f-team'), fp=l.querySelector('#f-project');
  fc.onchange=()=>{ ft.innerHTML=opt('','No team',true)+teams(fc.value).map(n=>opt(n,n)).join(''); };
  fp.onchange=()=>{ const p=proj(fp.value); if(p){ fc.value=p.circle; fc.onchange(); } };
  l._task=t; l._new=isNew;
}

function assistant(){
  const tab=S.assistTab;
  const askBody=S.chat.map(m=>`<div class="bubble ${m.me?'me':'bot'}">${m.t}</div>`).join('');
  const loose=D.tasks.find(t=>t.who==='MO'&&t.status!=='done')||D.tasks[0], fp=proj(D.featured||'seed-library'), ev=D.events[0]; S.doRefs={loose, fp, ev};
  const doBody=`<p class="muted small" style="margin:6px 0 10px">The assistant does things with your permissions. Every change is logged and can be undone.</p>
    ${S.pending?`<div class="confirm"><b>I’ll do this:</b>${S.pending.label}<div class="acts"><button class="btn primary sm" data-act="do-yes">Do it</button><button class="btn secondary sm" data-act="do-no">Cancel</button></div></div>`:''}
    <div class="group-label" style="margin-left:0">Try</div>
    <div class="rows">
      <button class="row click" style="width:100%;text-align:left" data-act="do" data-k="gutters"><span class="ico-soft">${ic('check')}</span><div class="main"><b>Mark “Clean the rain gutters” done</b><small>${loose.status==='done'?'Already done':'Your task · no project'}</small></div></button>
      <button class="row click" style="width:100%;text-align:left" data-act="do" data-k="labels"><span class="ico-soft">${ic('plus')}</span><div class="main"><b>Add “Order seed envelopes” to Seed library</b><small>New task, assigned to you</small></div></button>
      <button class="row click" style="width:100%;text-align:left" data-act="do" data-k="rsvp"><span class="ico-soft">${ic('calendar')}</span><div class="main"><b>Say I’m going to the Harvest gathering</b><small>RSVP for Saturday</small></div></button>
    </div>`;
  openLayer(`<aside class="panel-r" role="dialog" aria-label="The assistant">
    <div class="ph-r"><div class="brand"><span class="mark" style="background:var(--cobalt);color:var(--cream)">${ic('spark','sm')}</span><div><b>The assistant</b><small>Reads the second brain</small></div></div><button class="iconbtn" style="background:#fff" data-act="close" aria-label="Close">${ic('x')}</button></div>
    <div style="padding:0 16px 8px" class="chiprow"><button class="chip ${tab==='ask'?'on':''}" data-act="atab" data-v="ask">Ask</button><button class="chip ${tab==='do'?'on':''}" data-act="atab" data-v="do">Do</button></div>
    <div class="body" id="abody">${tab==='ask'?askBody:doBody}</div>
    ${tab==='ask'?`<form class="composer" id="ask"><input class="input" id="askq" placeholder="Ask about projects, people, decisions…" autocomplete="off"><button class="iconbtn" style="background:var(--ink);color:#fff" aria-label="Send">${ic('right')}</button></form>`:''}
  </aside>`);
  const b=$('#abody'); b.scrollTop=b.scrollHeight;
  const f=$('#ask'); if(f) f.onsubmit=e=>{ e.preventDefault(); const q=$('#askq').value.trim(); if(!q) return;
    S.chat.push({me:true,t:esc(q)}, {me:false,t:'In the real app I’d look this up in the second brain and link the notes I used. If I can’t find it, your question goes to <a href="#/manage/assistant">Assistant questions</a> so a lead can answer once.'}); assistant(); };
}

function bell(){
  openLayer(`<div class="pop">${D.notes.map(n=>`<a class="row click" href="${n.go}"><span class="ico-soft">${ic(n.ic)}</span><div class="main"><b style="white-space:normal">${n.t}</b><small>${n.when} ago</small></div></a>`).join('')}</div>`, 'clear');
  $('#layer .backdrop').style.background='transparent';
}

function menuSheet(){
  const {key}=parse();
  openLayer(`<div class="sheet"><div style="display:flex;justify-content:flex-end;margin-bottom:-38px"><button class="iconbtn" style="background:var(--bg-tint)" data-act="close" aria-label="Close menu">${ic('x')}</button></div>${navHTML(key)}</div>`);
  document.querySelectorAll('#layer .navi, #layer .me-row').forEach(a=>a.addEventListener('click',closeLayer));
}

/* ───────── clicks ───────── */
document.addEventListener('click',e=>{
  const go=e.target.closest('[data-go]');
  const a=e.target.closest('[data-act]');
  if(a && (!go || go.contains(a))) return act(a, e);
  if(go){ e.preventDefault(); closeLayer(); location.hash=go.dataset.go; return; }
  const f=e.target.closest('[data-f]');
  if(f){ S.f[f.dataset.f]=f.dataset.v; render(true); return; }
  const sa=e.target.closest('[data-scroll-ab]');
  if(sa){ const el=document.getElementById('ab-'+sa.dataset.scrollAb); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); return; }
  const sc=e.target.closest('[data-scroll]');
  if(sc){ e.preventDefault(); document.getElementById('bp-'+sc.dataset.scroll).scrollIntoView({behavior:'smooth',block:'start'}); }
});
document.addEventListener('change',e=>{
  const s=e.target.closest('[data-fsel]'); if(s){ S.f[s.dataset.fsel]=s.value; render(true); }
  if(e.target.matches('[data-act-change=role]')) toast('Role saved');
});

function act(a, e){
  const k=a.dataset.act, id=a.dataset.id;
  e.preventDefault(); e.stopPropagation();
  const R=()=>render(true);
  switch(k){
    case 'close': closeLayer(); break;
    case 'menu': menuSheet(); break;
    case 'assist': assistant(); break;
    case 'bell': bell(); break;
    case 'atab': S.assistTab=a.dataset.v; assistant(); break;
    case 'soon': toast(`${a.dataset.msg} would open here`); break;
    case 'how': openLayer(modal('How we decide',`<p class="prose">Every proposal gets four checks at the same time:</p><div class="rows" style="margin:12px 0">${CHECKS.map(([t,i],n)=>`<div class="row"><span class="ico-soft">${ic(i)}</span><div class="main"><b>${t}</b><small>${['Sociocracy: no circle lead objects','Democracy: more yes than no','Meritocracy: people who know review it','The assistant checks it fits the Blueprint'][n]}</small></div></div>`).join('')}</div><p class="muted small">It’s approved when enough checks pass. The exact rule is still being decided.</p>`,`<button class="btn primary" data-act="close">Close</button>`)); break;
    case 'task': { const t=D.tasks.find(x=>x.id===(id||a.closest('[data-id]').dataset.id)); taskModal(t,false); break; }
    case 'new-task': { const pid=a.dataset.project||null, p=pid?proj(pid):null; taskModal({id:'t'+Date.now(), title:'', project:pid, circle:p?p.circle:(D.defaultCircle||'food'), team:'', who:'', due:'', status:'todo'}, true); break; }
    case 'task-save': { const l=$('#layer'), t=l._task, v=s=>l.querySelector(s).value;
      if(!v('#f-title').trim()) { l.querySelector('#f-title').focus(); return toast('Give the task a name'); }
      Object.assign(t,{title:v('#f-title').trim(), status:v('#f-status'), due:v('#f-due'), who:v('#f-who'), project:v('#f-project')||null, circle:v('#f-circle'), team:v('#f-team')});
      if(l._new) D.tasks.push(t); closeLayer(); R(); toast(l._new?(t.project?'Task added to '+proj(t.project).name:'Task added to the board'):'Saved'); break; }
    case 'task-delete': { const i=D.tasks.findIndex(x=>x.id===id), t=D.tasks[i]; D.tasks.splice(i,1); closeLayer(); R(); toast('Task deleted',()=>D.tasks.splice(i,0,t)); break; }
    case 'suggest': openLayer(modal('+ Suggest a project',`<div class="field"><label>Name</label><input class="input" id="s-name" placeholder="e.g. Community bread oven"></div><div class="field"><label>Circle</label><select class="input" id="s-circle">${Object.entries(D.circles).map(([k,c])=>opt(k,c.name)).join('')}</select></div><div class="field"><label>What’s the idea?</label><textarea class="input" id="s-about" placeholder="Why it matters, and what you’d need"></textarea><span class="hint">It waits in Ideas until a circle lead moves it to To do.</span></div>`,`<button class="btn secondary" data-act="close">Cancel</button><button class="btn primary" data-act="suggest-send">Suggest</button>`)); break;
    case 'suggest-send': { const n=$('#s-name').value.trim(); if(!n) return toast('Give the project a name'); D.projects.push({id:'p'+Date.now(), name:n, circle:$('#s-circle').value, status:'idea', lead:'MO', team:['MO'], about:$('#s-about').value||'A new idea.'}); closeLayer(); S.f.opsView='board'; location.hash='#/operations'; R(); toast(`${n} is in Ideas`); break; }
    case 'offer': { const p=proj(id); openLayer(modal('Offer to help',`<p class="prose" style="margin-bottom:14px">An agreement with ${who(p.lead).name.split(' ')[0]}, the lead of <b>${p.name}</b>. When it’s accepted you’re on the team.</p><div class="field"><label>What you’ll contribute</label><textarea class="input" id="o-give">Design the seed packet labels and help sort on Saturdays</textarea></div><div class="field"><label>What you’d like back <span class="muted">(optional)</span></label><input class="input" id="o-get" placeholder="e.g. seeds for my garden"></div><div class="field"><label>Time</label><select class="input"><option>About 2 hours a week</option><option>Half a day a week</option><option>Just once</option></select></div>`,`<button class="btn secondary" data-act="close">Cancel</button><button class="btn next" data-act="offer-send" data-id="${id}">Send to ${who(p.lead).name.split(' ')[0]} <span class="go">${ic('right','sm')}</span></button>`)); break; }
    case 'offer-send': { const p=proj(id), ag={id:'a'+Date.now(), project:id, from:'MO', give:$('#o-give').value||'Help', get:$('#o-get').value, status:'proposed'}; D.agreements.push(ag); S.sent=true; closeLayer(); R(); toast(`Sent to ${who(p.lead).name.split(' ')[0]}. You’ll hear back soon.`);
      setTimeout(()=>{ if(ag.status!=='proposed') return; ag.status='accepted'; p.team.push('MO'); D.notes.unshift({ic:'party', t:`${who(p.lead).name.split(' ')[0]} accepted your agreement on ${p.name}`, when:'just now', go:'#/agreements'}); if(S.role==='joining'){ S.role='member'; saveRole(); } render(true); toast(`${who(p.lead).name.split(' ')[0]} accepted. You’re a member now.`); }, 3500); break; }
    case 'answer': { const kind=a.dataset.kind, v=a.dataset.v;
      if(kind==='agreement'){ const g=D.agreements.find(x=>x.id===id); g.status=v; if(v==='accepted'){ const p=proj(g.project); if(!p.team.includes(g.from)) p.team.push(g.from);} R(); toast(v==='accepted'?`Accepted. ${who(g.from).name.split(' ')[0]} is on the team.`:'Declined',()=>{g.status='proposed';}); }
      if(kind==='app'){ const i=D.applications.findIndex(x=>x.id===id), ap=D.applications[i]; D.applications.splice(i,1); R(); toast(v==='accepted'?`${ap.name.split(' ')[0]} is a joining member now`:'Declined',()=>D.applications.splice(i,0,ap)); }
      if(kind==='booking'){ const b=D.bookings.find(x=>x.id===id); b.status=v; R(); toast(v==='ok'?'Booked':'Declined',()=>{b.status='request';}); }
      if(kind==='circle'){ const i=D.circleRequests.findIndex(x=>x.id===id), r=D.circleRequests[i]; D.circleRequests.splice(i,1); if(v==='accepted'){ Cn(r.circle).members.push(r.who); who(r.who).circles.push(r.circle);} R(); toast(v==='accepted'?`${who(r.who).name.split(' ')[0]} is in ${Cn(r.circle).name} now`:'Declined'); }
      break; }
    case 'circle-ask': S.circleAsk[id]=!S.circleAsk[id]; R(); toast(S.circleAsk[id]?`Asked to join ${Cn(id).name}`:'Request withdrawn'); break;
    case 'add-member': { const c=Cn(id), outside=Object.keys(D.people).filter(k=>!c.members.includes(k)); openLayer(modal('+ Add member',`<div class="rows">${outside.map(k=>`<button class="row click" style="width:100%;text-align:left" data-act="add-member-pick" data-id="${id}" data-k="${k}">${av(k)}<div class="main"><b>${who(k).name}</b><small>${who(k).role}</small></div>${ic('plus')}</button>`).join('')}</div>`,`<button class="btn secondary" data-act="close">Cancel</button>`)); break; }
    case 'add-member-pick': { const c=Cn(id), m=a.dataset.k; c.members.push(m); who(m).circles.push(id); closeLayer(); R(); toast(`${who(m).name.split(' ')[0]} added to ${c.name}`); break; }
    case 'rsvp': S.rsvp[id]=!S.rsvp[id]; R(); toast(S.rsvp[id]?'You’re going':'RSVP removed'); break;
    case 'vote': S.vote[id]=a.dataset.v||undefined; R(); if(a.dataset.v) toast(`You voted ${a.dataset.v}`); break;
    case 'book': { const x=[...D.stay,...D.borrow].find(i=>i.id===id); openLayer(modal(`Book · ${x.name}`,`<div class="fields2"><div class="field"><label>From</label><input class="input" id="b-from" value="Sat 21 Nov"></div><div class="field"><label>To</label><input class="input" value="Sun 22 Nov"></div></div><div class="field"><label>Note <span class="muted">(optional)</span></label><input class="input" placeholder="What it’s for"></div>${x.approval?'<p class="muted small">This needs a yes from the Places circle, so it goes as a booking request.</p>':''}`,`<button class="btn secondary" data-act="close">Cancel</button><button class="btn primary" data-act="book-send" data-id="${id}">${x.approval?'Send booking request':'Book'}</button>`)); break; }
    case 'book-send': { const x=[...D.stay,...D.borrow].find(i=>i.id===id); D.bookings.push({id:'k'+Date.now(), item:x.name, who:'MO', when:$('#b-from').value, status:x.approval?'request':'ok'}); closeLayer(); S.f.place='mine'; R(); toast(x.approval?'Booking request sent':`${x.name} is booked`); break; }
    case 'to-board': { const m=D.meetings.find(x=>x.id===id), it=m.actions[+a.dataset.i]; it.moved=true; D.tasks.push({id:'t'+Date.now(), title:it.text, project:null, circle:m.circle, team:'', who:it.who, due:'', status:'todo'}); R(); toast('On the board as a task, no project yet'); break; }
    case 'answer-q': { const q=D.questions.find(x=>x.id===id); openLayer(modal('Answer once',`<p class="prose" style="margin-bottom:12px"><b>${q.q}</b></p><div class="field"><textarea class="input" placeholder="Your answer"></textarea><span class="hint">Saved to the second brain, so the assistant can answer it next time.</span></div>`,`<button class="btn secondary" data-act="close">Cancel</button><button class="btn primary" data-act="answer-q-save" data-id="${id}">Save</button>`)); break; }
    case 'answer-q-save': D.questions=D.questions.filter(x=>x.id!==id); closeLayer(); R(); toast('Saved to the second brain'); break;
    case 'pin': S.f.pin = (S.f.pin!=null && +S.f.pin===+a.dataset.i) ? null : a.dataset.i; R(); break;
    case 'am-tab': S.f.am=a.dataset.v; R(); break;
    case 'borrow': toast(`Borrow request for ${a.dataset.n} sent`); break;
    case 'perm': { if(!canEditPerms()) break; const i=+a.dataset.i, j=+a.dataset.j; S.perm[i][j]=S.perm[i][j]?0:1; R(); toast('Saved · logged'); break; }
    case 'set': if(!canEditPerms()) break; S.set[a.dataset.k]=S.set[a.dataset.k]?0:1; R(); toast('Saved · logged'); break;
    case 'toggle-chip': a.classList.toggle('on'); break;
    case 'join-next': S.joinStep++; R(); break;
    case 'join-back': S.joinStep--; R(); break;
    case 'join-send': if(!$('#bpok').checked) return toast('Tick the Blueprint box first'); S.role='joining'; saveRole(); S.joinStep=1; location.hash='#/dashboard'; R(); toast('Application sent. You’re a joining member.'); break;
    case 'do': { const {loose, fp, ev}=S.doRefs; const map={gutters:{label:` mark “${esc(loose.title)}” as Done.`, run:()=>{const f=loose.status; loose.status='done'; return ()=>{loose.status=f;};}},
      labels:{label:` add the task “Write a short update” to ${esc(fp.name)}, assigned to you.`, run:()=>{const t={id:'t'+Date.now(), title:'Write a short update', project:fp.id, circle:fp.circle, team:'', who:'MO', due:'', status:'todo'}; D.tasks.push(t); return ()=>{D.tasks=D.tasks.filter(x=>x!==t);};}},
      rsvp:{label:` RSVP you to ${esc(ev.title)} on ${ev.dow} ${ev.day} ${ev.month||'Nov'}.`, run:()=>{const f=S.rsvp[ev.id]; S.rsvp[ev.id]=true; return ()=>{S.rsvp[ev.id]=f;};}}};
      S.pending=map[a.dataset.k]; assistant(); break; }
    case 'do-yes': { const undo=S.pending.run(); S.pending=null; assistant(); render(true); toast('Done by the assistant · logged',undo); break; }
    case 'do-no': S.pending=null; assistant(); break;
  }
}

/* ───────── prototype bar ───────── */
function saveRole(){ try{ localStorage.setItem(ROLE_KEY,S.role); }catch(e){} }
$('#roleSel').onchange=e=>{ S.role=e.target.value; saveRole(); render(true); toast(`Viewing as ${ROLE_NAME[S.role]}`); };
const ds=$('#dataSel'); if(window.LIVE){ ds.value=D.live?'live':'sample'; ds.onchange=()=>{ try{ localStorage.setItem('myco-proto-data',ds.value); }catch(e){} location.reload(); }; } else ds.remove();
$('#phoneBtn').onclick=()=>{ document.body.classList.toggle('phone'); $('#phoneBtn').classList.toggle('on'); };
$('#resetBtn').onclick=()=>{ D=seed(); const r=S.role; S=freshState(); S.role=r; location.hash='#/dashboard'; render(); toast('Sample data reset'); };
$('#minBtn').onclick=()=>{ const p=$('#proto'); p.classList.toggle('min'); $('#minBtn').textContent=p.classList.contains('min')?'+':'–'; };
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeLayer(); });
if(window.innerWidth<640) $('#proto').classList.add('min');
render();
