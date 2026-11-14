// Reads a community's website for the Blueprint import (used by /api/site-text).
// The whole site is read in small batches, so each server request stays within
// Cloudflare's per-request fetch limit: startSite finds the pages (the home page's
// links plus the sitemap), readPages reads up to BATCH of them, and lib/site-crawl.ts
// in the browser keeps asking until every page is read (or SITE_MAX_PAGES).
export const BATCH = 8
const MAX_SITEMAPS = 10
const MAX_BYTES = 2_000_000
const MAX_CHARS_PER_PAGE = 60_000
const TIMEOUT_MS = 12_000
export const USEFUL = /about|mission|vision|values|principles|story|who-?we|team|people|governance|membership|member|join|community|land|project|programs?|faq|how|charter|agreements|culture|economy|ecology|impact/i
const SKIP = /\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|docx?|xlsx?)(\?|$)|\/(wp-admin|wp-login|cart|checkout|login|signin|account|feed|tag|category|author)\b/i

// Public sites only: no local names or IP literals (blocks reaching internal services)
export function publicUrl(raw: string, base?: URL): URL | null {
  let u: URL
  try { u = new URL(raw, base) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  if (u.username || u.password) return null
  const h = u.hostname.toLowerCase()
  if (!h.includes('.') || h === 'localhost' || /\.(local|localhost|internal|lan|home|test)$/.test(h)) return null
  if (/^[\d.]+$/.test(h) || h.startsWith('[')) return null
  if (u.port && u.port !== '80' && u.port !== '443') return null
  u.hash = ''
  return u
}

// Follows redirects by hand so each hop is checked with publicUrl
async function fetchHtml(start: URL, type = 'html'): Promise<{ url: URL; html: string } | null> {
  let url = start
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'MyCoNet-Blueprint/1.0 (reads a community site to suggest answers)', accept: type === 'html' ? 'text/html' : '*/*' },
    })
    if (res.status >= 300 && res.status < 400) {
      const next = publicUrl(res.headers.get('location') ?? '', url)
      if (!next) return null
      url = next
      continue
    }
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes(type)) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BYTES) return null
    return { url, html: new TextDecoder().decode(buf) }
  }
  return null
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' }
const decode = (s: string) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)

function pageText(html: string): { title: string; description: string; text: string } {
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim()
  const description = decode(html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? '').trim()
  const body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article|\/header)[^>]*>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n## ')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, ' ')
  const text = decode(body)
    .split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l && l !== '-' && l !== '##')
    .join('\n')
  return { title, description, text: text.slice(0, MAX_CHARS_PER_PAGE) }
}

const sameSite = (a: URL, b: URL) => a.hostname.replace(/^www\./, '') === b.hostname.replace(/^www\./, '')

// One address per page: no query, fragment or trailing slash
export const pageKey = (u: string) => u.replace(/[?#].*$/, '').replace(/\/$/, '')

// A same-site page address worth reading, or null
function sitePage(raw: string, base: URL, site: URL): string | null {
  const u = publicUrl(decode(raw.trim()), base)
  if (!u || !sameSite(u, site) || SKIP.test(u.pathname)) return null
  u.search = ''
  return pageKey(u.href)
}

function links(html: string, base: URL, site: URL): string[] {
  const found = new Set<string>()
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi)) {
    const u = sitePage(m[1], base, site)
    if (u) found.add(u)
  }
  return [...found]
}

// Pages from the site's sitemaps (robots.txt's Sitemap lines, else /sitemap.xml), following sitemap indexes
async function sitemapPages(site: URL): Promise<string[]> {
  const queue: string[] = []
  const robots = await fetchHtml(new URL('/robots.txt', site), 'text').catch(() => null)
  for (const m of robots?.html.matchAll(/^sitemap:\s*(\S+)/gim) ?? []) queue.push(m[1])
  if (!queue.length) queue.push(new URL('/sitemap.xml', site).href, new URL('/sitemap_index.xml', site).href)
  const pages = new Set<string>()
  const seen = new Set<string>()
  while (queue.length && seen.size < MAX_SITEMAPS) {
    const at = publicUrl(queue.shift()!)
    if (!at || !sameSite(at, site) || seen.has(at.href)) continue
    seen.add(at.href)
    const xml = await fetchHtml(at, 'xml').catch(() => null)
    for (const m of xml?.html.matchAll(/<loc>\s*(?:<!\[CDATA\[)?([^<\]]+)/gi) ?? []) {
      const loc = decode(m[1].trim())
      if (/\.xml(\.gz)?$/i.test(loc)) queue.push(loc)
      else { const u = sitePage(loc, at, site); if (u) pages.add(u) }
    }
  }
  return [...pages]
}

// Pages whose address says what they're about come first, then shallow pages
export const byUsefulness = (a: string, b: string) => {
  const path = (u: string) => { try { return new URL(u).pathname } catch { return u } }
  const pa = path(a), pb = path(b)
  return Number(USEFUL.test(pb)) - Number(USEFUL.test(pa)) || pa.split('/').length - pb.split('/').length
}

export interface SitePage { url: string; title: string; description: string; text: string }

const read = (p: { url: URL; html: string }): SitePage => ({ url: pageKey(p.url.href), ...pageText(p.html) })

// The home page and every page the site lists or links to from it.
// Throws an Error with a message fit to show people.
export async function startSite(start: URL): Promise<{ site: string; home: SitePage; links: string[] }> {
  let home: { url: URL; html: string } | null = null
  try { home = await fetchHtml(start) } catch { home = null }
  if (!home) throw new Error(`Couldn’t open ${start.hostname}. Check the address, or upload a document instead.`)
  const fromSitemap = await sitemapPages(home.url).catch(() => [])
  const homeKey = pageKey(home.url.href)
  const all = [...new Set([...links(home.html, home.url, home.url), ...fromSitemap])].filter(u => u !== homeKey)
  return { site: home.url.hostname.replace(/^www\./, ''), home: read(home), links: all.sort(byUsefulness) }
}

// Reads up to BATCH pages of the site; returns each page and the new links it found
export async function readPages(site: URL, urls: string[]): Promise<{ pages: SitePage[]; links: string[] }> {
  const want = urls.map(u => publicUrl(u)).filter((u): u is URL => !!u && sameSite(u, site)).slice(0, BATCH)
  const fetched = await Promise.all(want.map(u => fetchHtml(u).catch(() => null)))
  const found = new Set<string>()
  const pages: SitePage[] = []
  for (const p of fetched) {
    if (!p) continue
    pages.push(read(p))
    for (const l of links(p.html, p.url, site)) found.add(l)
  }
  return { pages, links: [...found] }
}
