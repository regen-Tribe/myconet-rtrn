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

const MAX_PAGES = 20
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

/** Draws a pdf.js image onto a canvas. Returns null for formats we skip (1-bit masks). */
function toCanvas(img: RawImage): { canvas: HTMLCanvasElement; hasAlpha: boolean } | null {
  const { width: w, height: h } = img
  if (!w || !h) return null
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0)
  } else if (img.data && (img.kind === 2 || img.kind === 3)) {
    const out = ctx.createImageData(w, h)
    const src = img.data
    if (img.kind === 3) {
      out.data.set(src.subarray(0, w * h * 4))
    } else {
      for (let i = 0, j = 0; i < w * h; i++, j += 3) {
        out.data[i * 4] = src[j]; out.data[i * 4 + 1] = src[j + 1]; out.data[i * 4 + 2] = src[j + 2]; out.data[i * 4 + 3] = 255
      }
    }
    ctx.putImageData(out, 0, 0)
  } else {
    return null
  }
  // Transparent pixels hint at a logo (sample a grid rather than every pixel)
  const px = ctx.getImageData(0, 0, w, h).data
  const step = Math.max(1, Math.floor((w * h) / 4000))
  let hasAlpha = false
  for (let i = 0; i < w * h; i += step) { if (px[i * 4 + 3] < 250) { hasAlpha = true; break } }
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

/** Scales large images down and keeps the file under the upload limit. */
async function encode(canvas: HTMLCanvasElement, hasAlpha: boolean): Promise<Blob | null> {
  let src = canvas
  const scale = Math.min(1, MAX_UPLOAD_SIDE / Math.max(canvas.width, canvas.height))
  if (scale < 1) {
    src = document.createElement('canvas')
    src.width = Math.round(canvas.width * scale); src.height = Math.round(canvas.height * scale)
    src.getContext('2d')!.drawImage(canvas, 0, 0, src.width, src.height)
  }
  const png = hasAlpha ? await toBlob(src, 'image/png') : null
  if (png && png.size <= MAX_BYTES) return png
  return toBlob(src, 'image/jpeg', 0.88)
}

export async function extractPdfImages(file: File, onProgress?: (page: number, total: number) => void): Promise<PdfImage[]> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages = Math.min(pdf.numPages, MAX_PAGES)
  const IMAGE_OPS = new Set<number>([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintImageXObjectRepeat])
  const found = new Map<string, PdfImage>()

  for (let p = 1; p <= pages && found.size < MAX_IMAGES; p++) {
    onProgress?.(p, pages)
    const page = await pdf.getPage(p)
    const ops = await page.getOperatorList()
    const names = new Set<string>()
    ops.fnArray.forEach((fn, i) => { if (IMAGE_OPS.has(fn)) names.add(String(ops.argsArray[i][0])) })
    for (const name of names) {
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
