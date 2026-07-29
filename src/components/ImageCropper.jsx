import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Move, RotateCcw, X, ZoomIn } from 'lucide-react'
import { Button } from './ui'
import { encodeCanvas } from '../lib/image'
import { API_BASE } from '../lib/api'

/**
 * A dependency-free image cropper with a fixed aspect frame.
 *
 * The preview and the exported file share one transform model: the image is
 * scaled to *cover* the frame, then panned. Because both use the same maths,
 * what you see in the frame is exactly what gets written to the canvas.
 */

/** Zoom bounds, shared by the slider and the wheel. */
const ZOOM_MIN = 1
const ZOOM_MAX = 3

export default function ImageCropper({
  src,
  aspect = 3,
  /** Narrower ratio actually visible on the smallest surface, drawn as a guide. */
  safeRatio,
  outputWidth = 1600,
  /** WebP quality for the exported crop. */
  quality = 0.9,
  title,
  /** Zoom/offset to resume from, as handed back by a previous `onApply`. */
  initialTransform,
  onCancel,
  onApply,
}) {
  const frameRef = useRef(null)
  const imageRef = useRef(null)
  const dragRef = useRef(null)

  const [natural, setNatural] = useState(null) // { w, h }
  const [frame, setFrame] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(initialTransform?.zoom ?? 1)
  const [offset, setOffset] = useState(initialTransform?.offset ?? { x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)

  /**
   * Remote images are loaded through this origin (see GET /api/image). The
   * canvas is exported on apply, and a cross-origin image taints it — asking
   * the browser to negotiate CORS worked in theory and failed in practice
   * against cached copies, so the bytes come from here instead.
   *
   * Data URLs are already ours; they are used untouched.
   */
  const source = /^https?:/i.test(src) ? `${API_BASE}/api/image?url=${encodeURIComponent(src)}` : src

  // Scale needed for the image to cover the frame, before user zoom.
  const coverScale = natural && frame.w ? Math.max(frame.w / natural.w, frame.h / natural.h) : 1
  const scale = coverScale * zoom

  /** Keeps the image covering the frame — no empty gutters at any pan/zoom. */
  const clamp = useCallback(
    (next, activeScale = scale) => {
      // Nothing measured yet, so there are no bounds to clamp to. Returning
      // {0,0} here would recentre a restored framing before the image had
      // even loaded — the effect below runs on mount, and it runs again once
      // the measurements land, which is when clamping actually means anything.
      if (!natural || !frame.w) return next
      const maxX = Math.max(0, (natural.w * activeScale - frame.w) / 2)
      const maxY = Math.max(0, (natural.h * activeScale - frame.h) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      }
    },
    [natural, frame, scale]
  )

  useEffect(() => {
    function measure() {
      if (!frameRef.current) return
      const rect = frameRef.current.getBoundingClientRect()
      setFrame({ w: rect.width, h: rect.width / aspect })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [aspect])

  useEffect(() => setOffset((current) => clamp(current)), [zoom, clamp])

  /**
   * Wheel to zoom, within the same 1–3 range as the slider.
   *
   * Registered natively with `passive: false` rather than as an onWheel prop:
   * React attaches wheel listeners passively, where preventDefault is ignored
   * and the page scrolls behind the dialog while you are zooming.
   *
   * The step scales with the current zoom so the gesture feels even — a fixed
   * step crawls when zoomed out and lurches when zoomed in.
   */
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    function onWheel(event) {
      event.preventDefault()
      const direction = event.deltaY > 0 ? -1 : 1
      setZoom((current) => {
        const next = current * (1 + direction * 0.12)
        return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(next.toFixed(3))))
      })
    }

    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  function onPointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, startX: offset.x, startY: offset.y }
  }

  function onPointerMove(event) {
    const drag = dragRef.current
    if (!drag) return
    setOffset(
      clamp({
        x: drag.startX + (event.clientX - drag.pointerX),
        y: drag.startY + (event.clientY - drag.pointerY),
      })
    )
  }

  function onPointerUp() {
    dragRef.current = null
  }

  async function apply() {
    if (!natural || !frame.w) return
    setBusy(true)
    setFailure(null)
    try {
      // Map the visible frame back into natural image coordinates.
      const sw = frame.w / scale
      const sh = frame.h / scale
      const sx = (natural.w - sw) / 2 - offset.x / scale
      const sy = (natural.h - sh) / 2 - offset.y / scale

      /**
       * Never write more pixels than the crop actually contains. Rendering a
       * 900px selection into a 1600px canvas invents nothing — it just stores
       * a blurry upscale at several times the bytes. Capping keeps a big
       * photo sharp and a small one honest.
       */
      const width = Math.min(outputWidth, Math.round(sw))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = Math.round(width / aspect)
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(imageRef.current, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

      // The transform travels with the result so the next open can resume
      // from this framing rather than resetting to the centre.
      onApply(encodeCanvas(canvas, { quality }), { zoom, offset })
    } catch {
      // A source that refuses CORS still taints the canvas. Say so rather than
      // leaving the button to click with nothing happening.
      setFailure('This image can’t be cropped here. Upload it from your device instead.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Crop image'}
      onMouseDown={(event) => event.target === event.currentTarget && onCancel?.()}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-md border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 shadow-[var(--shadow-lift)]">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-navy-800 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-navy-900 dark:text-white">{title || 'Crop image'}</h2>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Move size={12} aria-hidden="true" />
              Drag to reposition, scroll to zoom
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-900"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-5">
          <div
            ref={frameRef}
            className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-md bg-slate-900 active:cursor-grabbing"
            style={{ aspectRatio: String(aspect) }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              ref={imageRef}
              key={source}
              src={source}
              alt=""
              draggable={false}
              onLoad={(event) =>
                setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })
              }
              onError={() => setFailure('This image could not be loaded.')}
              className="absolute left-1/2 top-1/2 max-w-none origin-center"
              style={{
                width: natural ? natural.w * scale : 'auto',
                height: natural ? natural.h * scale : 'auto',
                transform: `translate(-50%,-50%) translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
            {/* Rule-of-thirds guides */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/40" />
            </div>

            {/* Phone-safe area: a card banner is nearer 2:1, so the outer
                thirds are trimmed on a phone. Keep the subject inside this. */}
            {safeRatio && (
              <div
                className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 border-x border-dashed border-amber-300/70"
                style={{ width: `${(safeRatio / aspect) * 100}%` }}
                aria-hidden="true"
              >
                <span className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-md bg-amber-300/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-900 dark:text-white">
                  Visible on phone
                </span>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <ZoomIn size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Zoom"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-md bg-slate-200 dark:bg-navy-800 accent-accent-500"
            />
            <button
              type="button"
              onClick={() => {
                setZoom(1)
                setOffset({ x: 0, y: 0 })
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-900"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 dark:border-navy-800 bg-slate-50 dark:bg-navy-950 px-5 py-4">
          {failure && (
            <p role="alert" className="mr-auto text-xs font-medium text-red-600">
              {failure}
            </p>
          )}
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={apply} loading={busy} disabled={!natural}>
            <Check size={15} aria-hidden="true" />
            Apply crop
          </Button>
        </div>
      </div>
    </div>
  )
}
