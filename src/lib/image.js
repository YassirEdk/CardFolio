/**
 * Image encoding for card artwork.
 *
 * Every image on a card is stored as a data URL in a text column, so bytes are
 * the budget — but a photo that is too small for the surface it lands on looks
 * soft, and Photo-focus paints the portrait full height on desktop. WebP is
 * what resolves that: measured on a real portrait, 1200px WebP q0.82 costs
 * 93 KB against 129 KB for the 800px JPEG this app used to write. Sharper and
 * smaller at the same time.
 *
 * WebP also keeps transparency, which matters for logos.
 */

/** Longest edge kept for an uncropped image (logos). */
const LOGO_MAX_EDGE = 512

/**
 * Google account avatars arrive from sign-in sized for a menu bar — the URL
 * ends in `=s96-c`, i.e. 96×96 — and a card can paint that portrait a full
 * screen tall. Google serves the same image at any size from the same URL, so
 * asking for a bigger one costs nothing stored and fixes the blur.
 *
 * Anything that isn't a recognised Google avatar URL is returned untouched.
 */
export function photoSrc(url, size = 1024) {
  if (typeof url !== 'string' || !url.includes('googleusercontent.com')) return url

  // Modern form: the sizing token is a suffix, "=s96-c" or "=s96-c-k-no".
  if (/=s\d+/.test(url)) return url.replace(/=s\d+/, `=s${size}`)
  // Older form: the token sits in the path, ".../s96-c/photo.jpg".
  if (/\/s\d+-c\//.test(url)) return url.replace(/\/s\d+-c\//, `/s${size}-c/`)
  // No token at all: append one.
  return `${url}=s${size}`
}

/**
 * Encodes a canvas, preferring WebP.
 *
 * An encoder that doesn't know the requested type silently returns a PNG data
 * URL instead of failing — several times larger — so the result is checked
 * rather than assumed. `alpha` picks the fallback: logos may be transparent
 * and must not fall back to JPEG, which would flatten them onto black.
 */
export function encodeCanvas(canvas, { quality = 0.82, alpha = false } = {}) {
  const webp = canvas.toDataURL('image/webp', quality)
  if (webp.startsWith('data:image/webp')) return webp
  return alpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.9)
}

/**
 * Downscales a data URL so its longest edge is at most `maxEdge`, preserving
 * aspect ratio and transparency. Used for images that skip the cropper — a
 * logo picked straight from disk is routinely a multi-megabyte PNG, and
 * storing it whole is the single most expensive thing a card can do.
 *
 * Images already within the limit are re-encoded anyway: a 400px PNG from a
 * design tool still costs several times its WebP equivalent.
 */
export function downscaleDataUrl(dataUrl, maxEdge = LOGO_MAX_EDGE) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))

      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const encoded = encodeCanvas(canvas, { quality: 0.9, alpha: true })
      // Never make a file bigger: tiny or already-optimal images can encode
      // larger than they arrived.
      resolve(encoded.length < dataUrl.length ? encoded : dataUrl)
    }
    // A file the browser can't decode is stored as-is rather than lost.
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
