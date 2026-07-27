import { DEFAULT_DIAL, DIAL_CODES } from '../data/countries'

/**
 * Phone-number formatting for the editor.
 *
 * Deliberately light: this groups digits for readability, it does not validate
 * or look numbers up. A real validator (libphonenumber) is 150kB and knows
 * every national numbering plan; that is worth adding when numbers have to be
 * *correct*, not merely tidy.
 */

/**
 * Splits a stored number into the dial code and the national part, so the
 * editor can show a country picker beside a field holding only the local
 * digits. An unrecognised or missing code falls back to `fallback`, and
 * whatever digits are there are treated as national.
 */
export function splitPhone(value, fallback = DEFAULT_DIAL) {
  const raw = String(value ?? '').trim()
  if (!raw) return { dial: fallback, national: '' }

  const digits = raw.replace(/\D/g, '')
  if (/^[^\d]*\+/.test(raw)) {
    const match = DIAL_CODES.find((code) => digits.startsWith(code.slice(1)))
    if (match) return { dial: match, national: digits.slice(match.length - 1) }
  }
  return { dial: fallback, national: digits }
}

/** Dial code + national digits → the single string a card stores. */
export function joinPhone(dial, national) {
  const digits = String(national ?? '').replace(/\D/g, '')
  if (!digits) return ''
  const head = digits.slice(0, 3)
  const tail = digits.slice(3)
  return tail ? `${dial} ${head}-${tail}` : `${dial} ${head}`
}

/** The national part, grouped for display: "4155550134" → "415-5550134". */
export function formatNational(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length <= 3) return digits
  return `${digits.slice(0, 3)}-${digits.slice(3)}`
}

/**
 * Whether two numbers are the same line, compared on digits alone: "+212
 * 682-546896" and "+212682546896" are one number written two ways.
 */
export function sameNumber(a, b) {
  const digits = (value) => String(value ?? '').replace(/\D/g, '')
  return Boolean(digits(a)) && digits(a) === digits(b)
}

/** The same number as a dialable href: digits and a leading + only. */
export function telHref(value) {
  const raw = String(value ?? '')
  const digits = raw.replace(/\D/g, '')
  return /^[^\d]*\+/.test(raw) ? `tel:+${digits}` : `tel:${digits}`
}
