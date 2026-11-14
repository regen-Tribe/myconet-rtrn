// Reads a whole website for the Blueprint import, in the browser: asks /api/site-text
// for the home page and the site's page list, then for the rest in batches, adding
// the links each batch finds, until every page is read or a cap is reached.
// Returns plain text with [Page n] markers (cited by path in the review), like a PDF.
import { BATCH, byUsefulness, pageKey, type SitePage } from './site-text'

export const SITE_MAX_PAGES = 300
// The scan reads up to 1,200,000 characters; past that more pages wouldn't be read
const MAX_CHARS = 1_200_000
// Addresses that fail (timeouts, files, huge pages) don't add pages, so tries and time are capped
// too: a big sitemap full of dead links must not keep the scan going for an hour
const MAX_TRIES = 450
const MAX_MS = 5 * 60_000
const BATCH_TIMEOUT_MS = 45_000

export interface SiteCrawl { site: string; title: string; pages: { url: string; title: string }[]; text: string; capped: boolean }

async function call<T>(body: object, timeoutMs?: number): Promise<T> {
  const res = await fetch('/api/site-text', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
  return json as T
}

export async function crawlSite(
  url: string,
  onProgress?: (read: number, found: number, tried: number) => void,
  stop?: { current: boolean },
): Promise<SiteCrawl> {
  const start = await call<{ site: string; home: SitePage; links: string[] }>({ url })
  const pages: SitePage[] = [start.home]
  const seen = new Set<string>([pageKey(start.home.url), ...start.links])
  const queue = [...start.links]
  let chars = start.home.text.length
  let capped = false
  let tried = 1
  const startedAt = Date.now()
  onProgress?.(1, seen.size, tried)

  while (queue.length && !stop?.current) {
    if (pages.length >= SITE_MAX_PAGES || chars >= MAX_CHARS || tried >= MAX_TRIES || Date.now() - startedAt > MAX_MS) { capped = true; break }
    queue.sort(byUsefulness)
    const batch = queue.splice(0, BATCH)
    tried += batch.length
    let got: { pages: SitePage[]; links: string[] }
    try { got = await call({ url: start.home.url, pages: batch }, BATCH_TIMEOUT_MS) } catch { onProgress?.(pages.length, Math.min(seen.size, SITE_MAX_PAGES), tried); continue } // a failed batch is skipped, not fatal
    for (const p of got.pages) {
      if (pages.length >= SITE_MAX_PAGES) { capped = true; break }
      pages.push(p)
      chars += p.text.length
    }
    for (const l of got.links) if (!seen.has(l)) { seen.add(l); queue.push(l) }
    onProgress?.(pages.length, Math.min(seen.size, SITE_MAX_PAGES), tried)
  }
  if (queue.length && !stop?.current) capped = true

  // Drop empty pages and repeats (the same page under two addresses)
  const kept = pages.filter((p, i) => p.text.length > 80 && pages.findIndex(q => q.text === p.text) === i)
  if (!kept.length) throw new Error(`${start.site} has no readable text (it may build its pages with JavaScript). Try uploading a document instead.`)
  const text = kept.map((p, i) =>
    `[Page ${i + 1}]\n${p.url}\n${p.title ? `# ${p.title}\n` : ''}${p.description ? `${p.description}\n` : ''}${p.text}`).join('\n\n')
  return { site: start.site, title: kept[0].title, pages: kept.map(p => ({ url: p.url, title: p.title })), text, capped }
}
