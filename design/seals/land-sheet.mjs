// The 13 circle seals "Of this land" (decision #33), drawn from web/src/core/components/v4/circle-land.ts.
// Usage: node design/seals/land-sheet.mjs out.html, then render it with Chrome headless (--screenshot).
import { writeFileSync } from 'node:fs'
import { LAND_GLYPHS, LAND_LABEL } from '../../web/src/core/components/v4/circle-land.ts'
const out = process.argv[2]
const SEAL = 'M20 2.6C30.6 2.2 37.9 9.7 37.5 20.4 37.1 30.7 29.7 37.7 19.5 37.5 9.3 37.3 2.3 30.1 2.5 19.7 2.7 9.5 9.9 3 20 2.6Z'
// Protopia's circles (instance/migrations/20261215000100_protopia_circle_seals.sql)
const CIRCLES = [
  ['Vision / Strategy', '#1F3FB8', 'spiral'], ['Farming', '#34893C', 'wheat'], ['Kitchen', '#BD4238', 'pot'],
  ['Hospitality', '#008796', 'key'], ['Community Hosting', '#6F4BAC', 'fire'],
  ['Infrastructure', '#88470D', 'hammer'], ['Marketing & Comms', '#B44E9B', 'megaphone'], ['Finance', '#A1790C', 'coins'],
  ['Cleaning', '#3389BA', 'broom'], ['Art', '#912946', 'brush'], ['Community', '#126052', 'ring'],
  ['Incubator', '#535F00', 'egg'], ['Shop', '#6C6158', 'bag'],
]
let uid = 0
const seal = (color, g, s) => { const id = 'c' + uid++; return `<svg viewBox="0 0 40 40" width="${s}" height="${s}" style="--seal:${color}"><defs><clipPath id="${id}"><path d="${SEAL}"/></clipPath></defs><path d="${SEAL}" fill="${color}"/><g clip-path="url(#${id})"><g transform="scale(.4)">${LAND_GLYPHS[g]}</g></g></svg>` }
const card = ([name, color, g], i) => `<div class="card${i < 5 ? '' : ' new'}">${i < 5 ? '' : '<span class="nw">New</span>'}${seal(color, g, 96)}<b>${name}</b><span class="lb">${LAND_LABEL[g]}</span><div class="sm">${seal(color, g, 40)}${seal(color, g, 24)}<span class="tag">${seal(color, g, 16)}${name.split(' / ')[0]}</span></div></div>`
writeFileSync(out, `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@400;500&display=swap">
<style>body{margin:0;background:#F1F4FC;font:14px Inter,system-ui,sans-serif;color:#111317;padding:36px 40px 40px;width:1330px}
h1{font:400 38px 'Inter Tight',sans-serif;letter-spacing:-.045em;margin:4px 0 6px}.eb{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#9AA0AD}
p.lead{color:#3A3F4A;font-size:15px;margin:0 0 22px;max-width:860px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.card{position:relative;background:#fff;border-radius:20px;padding:20px 14px 16px;display:grid;justify-items:center;gap:6px}
.card.new{box-shadow:inset 0 0 0 2px #111317}.nw{position:absolute;top:12px;left:12px;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;background:#111317;color:#fff;border-radius:999px;padding:3px 8px}
.card b{font:500 16px 'Inter Tight',sans-serif;letter-spacing:-.02em;margin-top:6px}.lb{font-size:12px;color:#6B7180}
.sm{display:flex;align-items:center;gap:10px;margin-top:8px}
.tag{height:26px;padding:0 10px 0 6px;border-radius:999px;box-shadow:inset 0 0 0 1px rgba(17,19,23,.11);font-size:11px;color:#3A3F4A;display:inline-flex;align-items:center;gap:6px}svg{display:block}</style>
<div class="eb">MyCoNet · circle seals · Of this land · 23 November 2026</div><h1>All 13 circles, of this land</h1>
<p class="lead">The five you picked (decision #33) and eight new ones in the same style, marked <b>New</b>. Each at 96, 40 and 24 pixels, and at 16 inside a tag, the size on member cards. Say which of the eight to change.</p>
<div class="grid">${CIRCLES.map(card).join('')}</div>`)
