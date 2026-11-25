#!/usr/bin/env node
// Builds web/public/places/towns.json for the "Where do you call home?" picker (decision #97) from GeoNames'
// cities15000.txt (every town over 15,000 people, plus capitals; CC BY 4.0, credit "GeoNames", geonames.org).
//
//   curl -O https://download.geonames.org/export/dump/cities15000.zip && unzip cities15000.zip
//   node scripts/build-towns.mjs path/to/cities15000.txt
//
// Each entry is [name, ascii name or "", country code], biggest first, one per name and country.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = process.argv[2]
if (!src) { console.error('Usage: node scripts/build-towns.mjs path/to/cities15000.txt'); process.exit(1) }
const rows = readFileSync(src, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'))
  .map(c => ({ name: c[1], ascii: c[2], cc: c[8], pop: Number(c[14]) || 0 }))
  .filter(r => r.name && r.cc)
  .sort((a, b) => b.pop - a.pop)
const seen = new Set()
const out = []
for (const r of rows) {
  const key = `${r.name}|${r.cc}`
  if (seen.has(key)) continue
  seen.add(key)
  out.push([r.name, r.ascii && r.ascii !== r.name ? r.ascii : '', r.cc])
}
const dest = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'places', 'towns.json')
mkdirSync(dirname(dest), { recursive: true })
writeFileSync(dest, JSON.stringify({ source: 'GeoNames cities15000, CC BY 4.0, https://www.geonames.org', towns: out }))
console.log(`${out.length} towns → ${dest}`)
