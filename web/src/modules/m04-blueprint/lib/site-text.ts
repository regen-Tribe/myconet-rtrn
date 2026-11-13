// Reads a community's website for the Blueprint import (used by /api/site-text).
// readSite: the page given plus up to MAX_PAGES - 1 pages it links to on the same site,
// most useful first (about, mission, governance…), as plain text with [Page n] markers,
// like a PDF import.
const MAX_PAGES = 8
const MAX_BYTES = 2_000_000
const MAX_CHARS_PER_PAGE = 60_000
const TIMEOUT_MS = 12_000
const USEFUL = /about|mission|vision|values|principles|story|who-?we|team|people|governance|membership|member|join|community|land|project|programs?|faq|how|charter|agreements|culture|economy|ecology|impact/i
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
async function fetchHtml(start: URL): Promise<{ url: URL; html: string } | null> {
  let url = start
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'MyCoNet-Blueprint/1.0 (reads a community site to suggest answers)', accept: 'text/html' },
    })
    if (res.status >= 300 && res.status < 400) {
      const next = publicUrl(res.headers.get('location') ?? '', url)
      if (!next) return null
      url = next
      continue
    }
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return null
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

function links(html: string, base: URL): URL[] {
  const found = new Map<string, URL>()
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi)) {
    const u = publicUrl(decode(m[1]), base)
    if (!u || u.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) continue
    if (SKIP.test(u.pathname)) continue
    u.search = ''
    if (u.pathname.replace(/\/$/, '') === base.pathname.replace(/\/$/, '')) continue
    found.set(u.href.replace(/\/$/, ''), u)
  }
  // Pages whose address says what they're about come first, then shallow pages
  return [...found.values()].sort((a, b) =>
    Number(USEFUL.test(b.pathname)) - Number(USEFUL.test(a.pathname))
    || a.pathname.split('/').length - b.pathname.split('/').length)
}

export interface SiteText { site: string; title: string; pages: { url: string; title: string }[]; text: string }

// Throws an Error with a message fit to show people
export async function readSite(start: URL): Promise<SiteText> {
  let home: { url: URL; html: string } | null = null
  try { home = await fetchHtml(start) } catch { home = null }
  if (!home) throw new Error(`Couldn’t open ${start.hostname}. Check the address, or upload a document instead.`)

  const others = links(home.html, home.url).slice(0, MAX_PAGES - 1)
  const fetched = await Promise.all(others.map(u => fetchHtml(u).catch(() => null)))
  const pages = [home, ...fetched.filter((p): p is { url: URL; html: string } => !!p)]
    .map(p => ({ url: p.url.href, ...pageText(p.html) }))
    .filter((p, i, all) => p.text.length > 80 && all.findIndex(q => q.text === p.text) === i)
  if (!pages.length) throw new Error(`${start.hostname} has no readable text (it may build its pages with JavaScript). Try uploading a document instead.`)

  // Page markers let the scan cite where each answer came from, as with PDFs
  const text = pages.map((p, i) =>
    `[Page ${i + 1}]\n${p.url}\n${p.title ? `# ${p.title}\n` : ''}${p.description ? `${p.description}\n` : ''}${p.text}`).join('\n\n')
  return {
    site: home.url.hostname.replace(/^www\./, ''),
    title: pages[0].title,
    pages: pages.map(p => ({ url: p.url, title: p.title })),
    text,
  }
}
