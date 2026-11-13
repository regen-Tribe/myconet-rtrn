'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react'

const FRAME = 260      // on-screen size of the square crop window (px)
const OUTPUT = 512     // size of the saved square image (px)
const MAX_ZOOM = 4

type Offset = { x: number; y: number }

/**
 * A lightweight, dependency-free avatar cropper.
 *
 * The user pans (drag) and zooms (slider / buttons / wheel) a photo inside a
 * circular square frame; on confirm we render exactly that square to a
 * {@link OUTPUT}px canvas and hand back a JPEG blob. Because the result is a
 * centred square, every avatar surface in the app (all `object-fit: cover`
 * circles) shows an identical crop.
 */
export function AvatarCropper({
  file,
  busy = false,
  onCancel,
  onCropped,
}: {
  file: File
  busy?: boolean
  onCancel: () => void
  onCropped: (blob: Blob) => void
}) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [src, setSrc] = useState<string>('')
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  // The browser couldn't decode the file (often an iPhone HEIC photo outside Safari)
  const [failed, setFailed] = useState(false)
  const frameRef = useRef<HTMLDivElement | null>(null)

  // Load the chosen file into an object URL and read its natural size.
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setNat(null)
    setFailed(false)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // At zoom 1 the shorter edge exactly fills the frame (cover).
  const baseCover = nat ? FRAME / Math.min(nat.w, nat.h) : 1
  const dispScale = baseCover * zoom
  const dispW = nat ? nat.w * dispScale : 0
  const dispH = nat ? nat.h * dispScale : 0

  const clamp = useCallback(
    (o: Offset): Offset => {
      const maxX = Math.max(0, (dispW - FRAME) / 2)
      const maxY = Math.max(0, (dispH - FRAME) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      }
    },
    [dispW, dispH],
  )

  // Re-clamp whenever zoom changes so the frame is always fully covered.
  useEffect(() => {
    setOffset(o => clamp(o))
  }, [zoom, nat, clamp])

  // ── Drag to pan ──────────────────────────────────────────────────────────
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setOffset(
      clamp({
        x: drag.current.ox + (e.clientX - drag.current.x),
        y: drag.current.oy + (e.clientY - drag.current.y),
      }),
    )
  }
  const endDrag = () => { drag.current = null }

  // Wheel zooms the photo, not the page behind: React's onWheel is passive and
  // can't preventDefault, so this listens natively.
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => Math.min(MAX_ZOOM, Math.max(1, z - e.deltaY * 0.002)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Produce the cropped blob ─────────────────────────────────────────────
  const apply = () => {
    const img = imgRef.current
    if (!img || !nat) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Top-left of the displayed image within the frame's coordinate space.
    const x0 = (FRAME - dispW) / 2 + offset.x
    const y0 = (FRAME - dispH) / 2 + offset.y
    // Map the frame back into source-image pixels.
    const sSize = FRAME / dispScale
    const sx = -x0 / dispScale
    const sy = -y0 / dispScale

    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT)
    canvas.toBlob(b => { if (b) onCropped(b) }, 'image/jpeg', 0.9)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Position your photo"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={() => { if (!busy) onCancel() }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 340, background: 'var(--surface)',
          border: '1px solid var(--rule)', borderRadius: 14, padding: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: '0 0 2px' }}>
          Position your photo
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: '0 0 16px' }}>
          Drag to move, zoom to fit. This crop is used everywhere.
        </p>

        {/* Crop window */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            style={{
              position: 'relative', width: FRAME, height: FRAME,
              borderRadius: '50%', overflow: 'hidden',
              background: 'var(--bg-2)', touchAction: 'none',
              cursor: drag.current ? 'grabbing' : 'grab',
              boxShadow: 'inset 0 0 0 1px var(--rule)',
            }}
          >
            {src && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                onError={() => setFailed(true)}
                onLoad={e => {
                  const el = e.currentTarget
                  setNat({ w: el.naturalWidth, h: el.naturalHeight })
                }}
                style={{
                  position: 'absolute', left: '50%', top: '50%',
                  width: dispW || undefined, height: dispH || undefined,
                  maxWidth: 'none',
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  userSelect: 'none', pointerEvents: 'none',
                  opacity: nat ? 1 : 0,
                }}
              />
            )}
            {!nat && !failed && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                <Loader2 className="animate-spin" style={{ width: 22, height: 22, color: 'var(--ink-4)' }} />
              </div>
            )}
          </div>
        </div>

        {failed && (
          <p role="alert" style={{ fontSize: 13, lineHeight: 1.5, color: '#b91c1c', background: 'color-mix(in srgb, #dc2626 8%, var(--surface))', border: '1px solid color-mix(in srgb, #dc2626 30%, var(--rule))', borderRadius: 8, padding: '8px 10px', margin: '0 0 14px' }}>
            This photo’s format can’t be opened here. iPhone photos are often HEIC: try a JPG or PNG
            instead (on iPhone, a screenshot of the photo works, or set Settings › Camera › Formats
            to “Most Compatible”).
          </p>
        )}

        {/* Zoom control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom(z => Math.max(1, z - 0.25))}
            style={zoomBtn}
          >
            <ZoomOut style={{ width: 16, height: 16 }} />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            style={{ flex: 1, accentColor: 'var(--accent)' }}
          />
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.25))}
            style={zoomBtn}
          >
            <ZoomIn style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} disabled={busy} style={btnGhost}>
            Cancel
          </button>
          <button type="button" onClick={apply} disabled={busy || !nat} style={btnPrimary}>
            {busy
              ? <><Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Saving…</>
              : 'Use photo'}
          </button>
        </div>
      </div>
    </div>
  )
}

const zoomBtn: React.CSSProperties = {
  display: 'grid', placeItems: 'center', width: 30, height: 30, flexShrink: 0,
  borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--bg-2)',
  color: 'var(--ink-2)', cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8,
  border: '1px solid var(--rule)', background: 'var(--surface)',
  color: 'var(--ink-2)', cursor: 'pointer',
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8,
  border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer',
}
