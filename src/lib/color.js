/**
 * Contrast helpers for user-chosen accent colours.
 *
 * The accent is picked by the card's owner and reused as ink, as a button fill
 * and as an icon tint — on white, on near-black, and over whatever banner
 * photo they uploaded. Some combinations are unreadable by construction: Deep
 * Navy text on the Dark Pro surface is the same colour twice.
 *
 * So templates don't paint the raw accent onto a surface. They ask for a
 * version of it that can actually be read there, and only the lightness moves
 * — the hue the owner chose is preserved.
 */

function toRgb(hex) {
  const value = String(hex || '').trim().replace('#', '')
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  const int = Number.parseInt(full.slice(0, 6), 16)
  if (!Number.isFinite(int)) return { r: 46, g: 107, b: 230 } // CardFolio blue
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

const toHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')

/** WCAG relative luminance. */
export function luminance(hex) {
  const { r, g, b } = toRgb(hex)
  const channel = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function mix(hex, toward, amount) {
  const from = toRgb(hex)
  const to = toRgb(toward)
  return toHex({
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  })
}

/**
 * The accent, lightened or darkened just far enough to be legible on
 * `background`. Returns it untouched when it already passes.
 *
 * `target` is a WCAG ratio: 4.5 for text, 3 for icons and large type.
 */
export function readableOn(color, background, target = 4.5) {
  if (contrast(color, background) >= target) return color

  // Move away from the surface: lighten on dark, darken on light.
  const toward = luminance(background) > 0.4 ? '#000000' : '#ffffff'
  for (let amount = 0.1; amount < 1; amount += 0.1) {
    const candidate = mix(color, toward, amount)
    if (contrast(candidate, background) >= target) return candidate
  }
  return toward
}

/**
 * Ink for text sitting *on* a filled accent — a light accent needs dark text,
 * which hardcoded `text-white` gets wrong.
 */
export function textOn(background) {
  return contrast('#ffffff', background) >= 4.5 ? '#ffffff' : '#0B1424'
}
