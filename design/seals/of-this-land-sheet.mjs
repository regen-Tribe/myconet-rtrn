// Second sheet for decision #32: more "Of this land" seals (plants and fire from Protopia), 3 variants per circle.
import { writeFileSync } from 'node:fs'
const out = process.argv[2]
const SEAL = 'M20 2.6C30.6 2.2 37.9 9.7 37.5 20.4 37.1 30.7 29.7 37.7 19.5 37.5 9.3 37.3 2.3 30.1 2.5 19.7 2.7 9.5 9.9 3 20 2.6Z'
const K = '#F3EAD7'
const rot = (n, f, a0 = 0) => Array.from({ length: n }, (_, i) => f(a0 + i * 360 / n)).join('')
const st = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
const fl = (d, c, extra = '') => `<path d="${d}" fill="${c}" ${extra}/>`
const FLAME = 'M50 10C58 25 73 33 73 52A23 23 0 0 1 27 52C27 42 33 37 37 29C39 37 43 40 46 40C44 30 46 19 50 10Z'
const CORE = 'M50 45C56 52 61 56 61 63A11 11 0 0 1 39 63C39 56 45 53 50 45Z'
const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s}) translate(-50 -50)">${inner}</g>`

// First Of-this-land sketches (v4-icons session), for reference
const FIRST = [
  c => `<path d="M56 90C56 70 74 62 74 44A22 22 0 0 0 30 44A15 15 0 0 0 60 44A9 9 0 0 0 42 44A4.5 4.5 0 0 0 51 44" fill="none" stroke="${K}" stroke-width="7.5" stroke-linecap="round"/><ellipse cx="76" cy="66" rx="7.5" ry="3.4" fill="${K}" transform="rotate(-28 76 66)"/><ellipse cx="69" cy="78" rx="7.5" ry="3.4" fill="${K}" transform="rotate(-20 69 78)"/><ellipse cx="50" cy="76" rx="6.5" ry="3.2" fill="${K}" transform="rotate(200 50 76)"/>`,
  c => `<g transform="rotate(28 50 50)"><path d="M50 8C74 24 78 58 50 86C22 58 26 24 50 8Z" fill="${K}"/><path d="M50 84V97" stroke="${K}" stroke-width="5.5" stroke-linecap="round"/><path d="M50 16V84" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>${[32, 44, 56, 68].map(y => `<path d="M50 ${y}L${y < 40 ? 64 : 69} ${y - 11}M50 ${y}L${y < 40 ? 36 : 31} ${y - 11}" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`).join('')}<path d="M73 47l-10 2 9 4zM28 58l10-3-8-4z" fill="${c}"/></g>`,
  c => `<g transform="rotate(-18 50 50)"><path d="M50 9C61 9 65 24 70 39C77 58 71 87 50 89C29 87 23 58 30 39C35 24 39 9 50 9Z" fill="${K}"/><path d="M50 33C59 38 63 52 61 64C59 77 41 77 39 64C37 52 41 38 50 33Z" fill="${c}"/>${[[50, 45], [45.5, 53], [54.5, 53], [50, 60], [44.5, 65], [55.5, 65], [50, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="${K}"/>`).join('')}</g>`,
  c => `${rot(5, a => `<path d="M50 50C35 40 33 20 50 11C67 20 65 40 50 50Z" fill="${K}" stroke="${c}" stroke-width="2.2" stroke-linejoin="round" transform="rotate(${a} 50 50)"/>`)}<circle cx="50" cy="50" r="5.5" fill="${c}"/><path d="M50 50V25" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/><circle cx="50" cy="23" r="2.6" fill="${c}"/><circle cx="45.5" cy="27" r="2.2" fill="${c}"/><circle cx="54.5" cy="27" r="2.2" fill="${c}"/>`,
  c => `${fl(FLAME, K)}${fl(CORE, c)}<path d="M27 80L73 90M73 80L27 90" stroke="${K}" stroke-width="7" stroke-linecap="round"/>`,
]

const CIRCLES = [
  { name: 'Vision / Strategy', color: '#1F3FB8', first: 'Fern curl', v: [
    ['Seed opening', c => `${fl('M50 94C33 94 25 82 27 68C29 56 39 50 50 50C61 50 71 56 73 68C75 82 67 94 50 94Z', K)}${st('M50 52L45 64L55 74L48 92', c, 3)}${st('M50 52V30', K, 5)}${fl('M50 38C39 38 29 31 27 18C40 17 49 25 50 38Z', K)}${fl('M50 31C59 29 67 20 68 9C57 9 50 18 50 31Z', K)}`],
    ['Ceiba tree', c => `${fl('M45 94C47 82 48 66 48 50H52C52 66 53 82 55 94Z', K)}${st('M45 94C40 91 32 91 26 94M55 94C60 91 68 91 74 94M50 58L38 48M50 62L63 50', K, 4)}${[[28, 42, 13], [50, 30, 17], [72, 42, 13], [39, 48, 11], [61, 48, 11], [38, 30, 11], [62, 30, 11]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${K}"/>`).join('')}`],
    ['Sun of leaves', c => `${rot(8, a => `<path d="M50 6C56 12 56 20 50 26C44 20 44 12 50 6Z" fill="${K}" transform="rotate(${a} 50 50)"/>`)}<circle cx="50" cy="50" r="17" fill="${K}"/>${st('M50 38V62M40 46L50 54L60 46', c, 2.6)}`],
  ] },
  { name: 'Farming', color: '#34893C', first: 'Torn leaf', v: [
    ['Cacao pod', c => `<g transform="rotate(-25 50 50)">${fl('M50 10C66 15 73 34 73 52C73 74 63 89 50 93C37 89 27 74 27 52C27 34 34 15 50 10Z', K)}${st('M41 19C35 40 35 68 42 86M59 19C65 40 65 68 58 86M50 12V91', c, 2.4)}${st('M50 10V1', K, 5)}</g>`],
    ['Corn', c => `${fl('M50 8C60 8 64 25 64 45C64 63 58 75 50 77C42 75 36 63 36 45C36 25 40 8 50 8Z', K)}${[43, 50, 57].map(x => [18, 26, 34, 42, 50, 58, 66].map(y => `<circle cx="${x}" cy="${y + (x === 50 ? 0 : 3)}" r="2.1" fill="${c}"/>`).join('')).join('')}${fl('M48 94C29 88 20 64 25 38C31 58 40 71 49 79Z', K)}${fl('M52 94C71 88 80 64 75 38C69 58 60 71 51 79Z', K)}${st('M50 92V102', K, 5)}`],
    ['Roots and shoot', c => `${st('M12 58H88', K, 4.5)}${st('M50 58V34', K, 5)}${fl('M50 42C38 42 28 34 26 21C39 20 49 29 50 42Z', K)}${fl('M50 36C61 35 70 26 72 14C59 14 51 23 50 36Z', K)}${st('M50 60V92M50 64C48 74 42 80 34 86M50 66C52 76 58 82 66 86M50 76C46 80 42 82 38 90M50 78C54 82 58 84 62 92', K, 3.2)}`],
  ] },
  { name: 'Kitchen', color: '#BD4238', first: 'Papaya', v: [
    ['Bananas', c => `<g transform="translate(-9 6)">${[-26, -4, 18].map(a => `<path d="M42 32C38 58 52 82 84 86C87 82 85 79 81 77C59 71 50 55 50 32Z" fill="${K}" stroke="${c}" stroke-width="2.4" stroke-linejoin="round" transform="rotate(${a} 46 30)"/>`).join('')}${st('M44 32L50 14', K, 6.5)}</g>`],
    ['Avocado', c => `${fl('M50 7C62 7 66 22 70 38C76 54 80 64 78 74C76 88 64 94 50 94C36 94 24 88 22 74C20 64 24 54 30 38C34 22 38 7 50 7Z', K)}${at(50, 52, .8, fl('M50 7C62 7 66 22 70 38C76 54 80 64 78 74C76 88 64 94 50 94C36 94 24 88 22 74C20 64 24 54 30 38C34 22 38 7 50 7Z', c))}<circle cx="50" cy="67" r="15" fill="${K}"/>`],
    ['Chili', c => `${fl('M30 34C26 58 42 84 80 90C63 79 51 63 47 36Z', K)}${fl('M24 32C29 24 43 24 50 31C45 38 31 38 24 32Z', K)}${st('M37 27C36 18 41 11 49 8', K, 4.2)}${st('M36 44C36 58 44 72 58 80', c, 2.6)}`],
  ] },
  { name: 'Hospitality', color: '#008796', first: 'Hibiscus', v: [
    ['Frangipani', c => `${rot(5, a => `<path d="M50 50C40 42 36 24 47 11C60 14 62 34 50 50Z" fill="${K}" stroke="${c}" stroke-width="2.2" stroke-linejoin="round" transform="rotate(${a} 50 50)"/>`)}<circle cx="50" cy="50" r="6" fill="${c}"/>`],
    ['Heliconia', c => `${st('M50 14V96', K, 4.2)}${[[30, -1], [46, 1], [62, -1], [78, 1]].map(([y, s]) => fl(`M50 ${y}C${50 - s * 10} ${y - 2} ${50 - s * 22} ${y - 8} ${50 - s * 27} ${y - 19}C${50 - s * 15} ${y - 18} ${50 - s * 4} ${y - 11} 50 ${y}Z`, K)).join('')}${fl('M50 18C46 13 46 8 50 3C54 8 54 13 50 18Z', K)}`],
    ['Palm shade', c => `${st('M55 96C53 78 51 62 50 46', K, 5.5)}${[0, 42, 90, 138, 180].map(a => `<path d="M50 46C40 34 25 31 9 38C25 43 38 46 50 46Z" fill="${K}" transform="rotate(${a} 50 46)"/>`).join('')}<circle cx="45" cy="52" r="4.5" fill="${K}"/><circle cx="55" cy="53" r="4.5" fill="${K}"/>${st('M10 96H90', K, 3)}`],
  ] },
  { name: 'Community Hosting', color: '#6F4BAC', first: 'Bonfire', v: [
    ['Fire ring', c => `${[200, 230, 260, 290, 320, 340].map(a => { const r = a * Math.PI / 180; return `<ellipse cx="${(50 + 33 * Math.cos(r)).toFixed(1)}" cy="${(74 + 9 * Math.sin(r)).toFixed(1)}" rx="5" ry="3.6" fill="${K}" opacity=".75"/>` }).join('')}${at(50, 50, .72, fl(FLAME, K) + fl(CORE, c))}${[0, 30, 60, 90, 120, 150, 180].map(a => { const r = a * Math.PI / 180; return `<ellipse cx="${(50 + 33 * Math.cos(r)).toFixed(1)}" cy="${(76 + 10 * Math.sin(r)).toFixed(1)}" rx="6.5" ry="4.6" fill="${K}" stroke="${c}" stroke-width="1.6"/>` }).join('')}`],
    ['Leaf flame', c => `${fl('M50 8C62 24 64 46 50 76C36 46 38 24 50 8Z', K)}${fl('M47 76C30 70 20 54 22 34C34 42 44 56 47 76Z', K)}${fl('M53 76C70 70 80 54 78 34C66 42 56 56 53 76Z', K)}${st('M50 18V70M45 70C38 62 32 54 29 44M55 70C62 62 68 54 71 44', c, 2.4)}${st('M28 88H72', K, 6)}`],
    ['Fireflies', c => `${at(50, 64, .62, fl(FLAME, K) + fl(CORE, c))}${st('M32 92H68', K, 5.5)}${[[24, 30, 4.2], [38, 16, 3.2], [64, 20, 4.4], [78, 36, 3.2], [30, 50, 2.8], [72, 52, 2.6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${K}"/>`).join('')}`],
  ] },
]
let uid = 0
const seal = (color, art, s) => { const id = 'c' + uid++; return `<svg viewBox="0 0 100 100" width="${s}" height="${s}"><defs><clipPath id="${id}"><path d="${SEAL}" transform="scale(2.5)"/></clipPath></defs><path d="${SEAL}" transform="scale(2.5)" fill="${color}"/><g clip-path="url(#${id})">${art(color)}</g></svg>` }
const short = n => n.split(' / ')[0]
const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@400;500&display=swap">
<style>body{margin:0;background:#F1F4FC;font:14px Inter,system-ui,sans-serif;color:#111317;padding:36px 40px 44px;width:1330px}
h1{font:400 38px 'Inter Tight',sans-serif;letter-spacing:-.045em;margin:4px 0 6px}.eb{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#9AA0AD}
p.lead{color:#3A3F4A;font-size:15px;margin:0 0 22px;max-width:820px}
.row{background:#fff;border-radius:20px;padding:18px 24px;margin-bottom:12px;display:grid;grid-template-columns:150px 112px 18px repeat(3,112px) 1fr;gap:12px;align-items:center}
.row h2{font:500 19px 'Inter Tight',sans-serif;letter-spacing:-.03em;margin:0}
.sep{width:1px;height:96px;background:rgba(17,19,23,.1);justify-self:center}
figure{margin:0;display:grid;justify-items:center;gap:7px}figcaption{font-size:11px;color:#6B7180;text-align:center}figcaption b{color:#111317;font-weight:600}
.first{opacity:.55}
.small{display:grid;gap:8px;justify-items:end;padding-left:12px;border-left:1px solid rgba(17,19,23,.1)}
.line{display:flex;align-items:center;gap:9px}.line i{font-style:normal;font-size:11px;color:#9AA0AD;width:14px;text-align:right}
.tag{height:26px;padding:0 10px 0 6px;border-radius:999px;box-shadow:inset 0 0 0 1px rgba(17,19,23,.11);font-size:11px;color:#3A3F4A;display:inline-flex;align-items:center;gap:6px}svg{display:block}</style>
<div class="eb">MyCoNet · circle seals · Of this land · 22 November 2026</div><h1>Of this land: three more for each circle</h1>
<p class="lead">Plants and fire from Protopia, three new ones per circle, beside the first sketch (faded). On the right, each new one at 40 and 24 pixels and at 16 inside a tag, the size on member cards. Pick one per circle, or say what to change.</p>
${CIRCLES.map(C => `<div class="row"><h2>${C.name}</h2><figure class="first">${seal(C.color, FIRST[CIRCLES.indexOf(C)], 96)}<figcaption>First: ${C.first}</figcaption></figure><span class="sep"></span>${C.v.map(([n, f], i) => `<figure>${seal(C.color, f, 96)}<figcaption><b>${i + 1}</b> · ${n}</figcaption></figure>`).join('')}<div class="small">${C.v.map(([n, f], i) => `<div class="line"><i>${i + 1}</i>${seal(C.color, f, 40)}${seal(C.color, f, 24)}<span class="tag">${seal(C.color, f, 16)}${short(C.name)}</span></div>`).join('')}</div></div>`).join('')}`
writeFileSync(out, html)
