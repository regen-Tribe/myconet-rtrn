/**
 * Pulls the images out of an uploaded PDF and suggests which could be the
 * community's logo and banner (Blueprint import → Look & feel). The AI scan reads
 * text only, so this uses simple rules:
 *  - banner: a wide, high-resolution image (photos of the land, the people, the place)
 *  - logo: an image repeated across pages (headers, footers) or a small one on the cover
 * The admin always picks; nothing is uploaded until they apply the import.
 */

export interface PdfImage {
  id: string
  blob: Blob
  /** Object URL for thumbnails; revoke with releasePdfImages() */
  url: string
  width: number
  height: number
  /** Pages it appears on (1-based) */
  pages: number[]
  hasAlpha: boolean
}

export interface BrandingCandidates { logos: PdfImage[]; banners: PdfImage[] }

const MAX_PAGES = 30
// Big image-heavy PDFs: stop looking after this long and use what was found
const TIME_BUDGET_MS = 60_000
// Raw (undecoded) images bigger than this are skipped rather than copied pixel by pixel
const MAX_RAW_PIXELS = 12_000_000
const MAX_IMAGES = 40
const MIN_SIDE = 48
const MAX_UPLOAD_SIDE = 2400
const MAX_BYTES = 4.5 * 1024 * 1024

interface RawImage { width: number; height: number; bitmap?: ImageBitmap; data?: Uint8ClampedArray | Uint8Array; kind?: number }

/** pdf.js hands images over asynchronously; give up on one rather than hang the import */
function getObject(store: { get: (id: string, cb: (v: unknown) => void) => void }, id: string): Promise<RawImage | null> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), 4000)
    try {
      store.get(id, v => { clearTimeout(timer); resolve((v as RawImage) ?? null) })
    } catch {
      clearTimeout(timer); resolve(null)
    }
  })
}

/**
 * Draws a pdf.js image onto a canvas no bigger than MAX_UPLOAD_SIDE (big photos are
 * scaled while drawing, never copied at full size). Returns null for formats we skip.
 */
function toCanvas(img: RawImage): { canvas: HTMLCanvasElement; hasAlpha: boolean } | null {
  const { width: w, height: h } = img
  if (!w || !h) return null
  const scale = Math.min(1, MAX_UPLOAD_SIDE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0, canvas.width, canvas.height)
  } else if (img.data && (img.kind === 2 || img.kind === 3) && w * h <= MAX_RAW_PIXELS) {
    const full = document.createElement('canvas')
    full.width = w; full.height = h
    const fctx = full.getContext('2d')
    if (!fctx) return null
    const out = fctx.createImageData(w, h)
    const src = img.data
    if (img.kind === 3) {
      out.data.set(src.subarray(0, w * h * 4))
    } else {
      for (let i = 0, j = 0; i < w * h; i++, j += 3) {
        out.data[i * 4] = src[j]; out.data[i * 4 + 1] = src[j + 1]; out.data[i * 4 + 2] = src[j + 2]; out.data[i * 4 + 3] = 255
      }
    }
    fctx.putImageData(out, 0, 0)
    ctx.drawImage(full, 0, 0, canvas.width, canvas.height)
  } else {
    return null
  }
  // Transparent pixels hint at a logo: check a 64×64 copy rather than every pixel
  const probe = document.createElement('canvas')
  probe.width = 64; probe.height = 64
  const pctx = probe.getContext('2d')!
  pctx.drawImage(canvas, 0, 0, 64, 64)
  const px = pctx.getImageData(0, 0, 64, 64).data
  let hasAlpha = false
  for (let i = 3; i < px.length; i += 4) { if (px[i] < 250) { hasAlpha = true; break } }
  return { canvas, hasAlpha }
}

/** 8×8 average hash plus shape: the same image placed on several pages gets the same key */
function fingerprint(canvas: HTMLCanvasElement): string {
  const c = document.createElement('canvas')
  c.width = 8; c.height = 8
  const ctx = c.getContext('2d')!
  ctx.drawImage(canvas, 0, 0, 8, 8)
  const d = ctx.getImageData(0, 0, 8, 8).data
  const grey: number[] = []
  for (let i = 0; i < 64; i++) grey.push(d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11)
  const avg = grey.reduce((a, b) => a + b, 0) / 64
  return `${Math.round((canvas.width / canvas.height) * 10)}:${grey.map(g => (g > avg ? 1 : 0)).join('')}`
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

/** Keeps the file under the upload limit (PNG when transparent, else JPEG). */
async function encode(canvas: HTMLCanvasElement, hasAlpha: boolean): Promise<Blob | null> {
  const png = hasAlpha ? await toBlob(canvas, 'image/png') : null
  if (png && png.size <= MAX_BYTES) return png
  return toBlob(canvas, 'image/jpeg', 0.88)
}

/** `stop.current = true` (the Skip button) ends the search early; what was found is kept. */
export async function extractPdfImages(file: File, onProgress?: (page: number, total: number) => void, stop?: { current: boolean }): Promise<PdfImage[]> {
  const started = Date.now()
  const done = () => stop?.current || Date.now() - started > TIME_BUDGET_MS
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages = Math.min(pdf.numPages, MAX_PAGES)
  const IMAGE_OPS = new Set<number>([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintImageXObjectRepeat])
  const found = new Map<string, PdfImage>()

  for (let p = 1; p <= pages && found.size < MAX_IMAGES && !done(); p++) {
    onProgress?.(p, pages)
    const page = await pdf.getPage(p)
    const ops = await page.getOperatorList()
    const names = new Set<string>()
    ops.fnArray.forEach((fn, i) => { if (IMAGE_OPS.has(fn)) names.add(String(ops.argsArray[i][0])) })
    for (const name of names) {
      if (done()) break
      const store = (name.startsWith('g_') ? page.commonObjs : page.objs) as unknown as Parameters<typeof getObject>[0]
      const img = await getObject(store, name)
      if (!img || img.width < MIN_SIDE || img.height < MIN_SIDE) continue
      const drawn = toCanvas(img)
      if (!drawn) continue
      const key = fingerprint(drawn.canvas)
      const seen = found.get(key)
      if (seen) { if (!seen.pages.includes(p)) seen.pages.push(p); continue }
      const blob = await encode(drawn.canvas, drawn.hasAlpha)
      if (!blob) continue
      found.set(key, {
        id: key, blob, url: URL.createObjectURL(blob),
        width: img.width, height: img.height, pages: [p], hasAlpha: drawn.hasAlpha,
      })
      if (found.size >= MAX_IMAGES) break
    }
    page.cleanup()
  }
  await pdf.destroy()
  return [...found.values()]
}

/** Ranks the images: best logo and banner candidates first, up to six of each. */
export function suggestBranding(images: PdfImage[]): BrandingCandidates {
  const aspect = (i: PdfImage) => i.width / i.height
  const banners = images
    .filter(i => i.width >= 800 && aspect(i) >= 1.3)
    .map(i => ({ i, score: Math.min(i.width * i.height, 4e6) / 1e6 + (aspect(i) >= 2 ? 1 : 0) - (i.pages.length > 2 ? 2 : 0) }))
    .sort((a, b) => b.score - a.score).slice(0, 6).map(x => x.i)
  const logos = images
    .filter(i => aspect(i) >= 0.4 && aspect(i) <= 5 && (Math.max(i.width, i.height) <= 1600 || i.pages.length > 1))
    .map(i => ({
      i,
      score: (i.pages.length - 1) * 3 + (i.pages.includes(1) ? 2 : 0) + (i.hasAlpha ? 2 : 0)
        - (i.width * i.height > 1.5e6 ? 3 : 0) - (banners.includes(i) && i.pages.length === 1 ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score).slice(0, 6).map(x => x.i)
  return { logos, banners }
}

export function releasePdfImages(images: PdfImage[]) {
  images.forEach(i => URL.revokeObjectURL(i.url))
}

/**
 * Asks MiniMax-M3 (it reads images) which candidate is the logo and which is the best
 * banner. Returns null if the AI can't be reached; the rule-based guesses then stand.
 */
export async function aiPickBranding(candidates: PdfImage[]): Promise<{ logo: string | null; banner: string | null } | null> {
  const list = candidates.slice(0, 12)
  if (list.length === 0) return null
  try {
    const images = await Promise.all(list.map(async img => {
      const bmp = await createImageBitmap(img.blob)
      const scale = Math.min(1, 384 / Math.max(bmp.width, bmp.height))
      const c = document.createElement('canvas')
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(bmp, 0, 0, c.width, c.height)
      bmp.close()
      return c.toDataURL('image/jpeg', 0.8)
    }))
    const prompt = `These ${list.length} images come from a community's planning document, in order (image 0 is the first).
Which one is the community's LOGO (a symbol, emblem or wordmark — not a photo, chart or slide)?
Which one is the best BANNER for the top of their website (a wide, good-looking photo of their land, place or people — not a diagram, map, table or text-heavy slide)?
Use null when none fits. Return ONLY JSON: {"logo": <index or null>, "banner": <index or null>}`
    const resp = await fetch(process.env.NEXT_PUBLIC_AI_WORKER_URL || '/api/scan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, images, maxTokens: 2000 }),
    })
    if (!resp.ok) return null
    const parsed = JSON.parse((await resp.json() as { result: string }).result) as { logo?: unknown; banner?: unknown }
    const at = (v: unknown) => (typeof v === 'number' && list[v] ? list[v].id : null)
    return { logo: at(parsed.logo), banner: at(parsed.banner) }
  } catch {
    return null
  }
}
