const DEFAULT_DIAL="+212"; const DIAL_CODES=["+1","+7","+20","+27","+31","+32","+33","+34","+39","+44","+49","+52","+55","+61","+81","+86","+90","+91","+212","+213","+216","+234","+254","+351","+966","+971"].sort((a,b)=>b.length-a.length);
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
function splitPhone(value, fallback = DEFAULT_DIAL) {
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
function joinPhone(dial, national) {
  const digits = String(national ?? '').replace(/\D/g, '')
  if (!digits) return ''
  const head = digits.slice(0, 3)
  const tail = digits.slice(3)
  return tail ? `${dial} ${head}-${tail}` : `${dial} ${head}`
}

/** The national part, grouped for display: "4155550134" → "415-5550134". */
function formatNational(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length <= 3) return digits
  return `${digits.slice(0, 3)}-${digits.slice(3)}`
}

/**
 * How each country groups its national digits, keyed by dial code.
 *
 * These are reading conventions, not numbering plans: how someone from that
 * country writes their own number down. A number that groups the way its
 * owner would write it is read as a phone number at a glance; the same digits
 * in one unbroken run have to be parsed.
 *
 * Only the lengths that have one obvious grouping are listed. Where a country
 * writes mobiles and landlines differently, the mobile form wins — this is a
 * business card, and the number on it is almost always a mobile.
 */
const GROUPS = {
  '+212': [3, 6], // Morocco     682-546896
  '+213': [3, 2, 2, 2], // Algeria
  '+216': [2, 3, 3], // Tunisia
  '+1': [3, 3, 4], // US / Canada
  '+20': [3, 3, 4], // Egypt
  '+27': [2, 3, 4], // South Africa
  '+31': [1, 4, 4], // Netherlands
  '+32': [3, 2, 2, 2], // Belgium
  '+33': [1, 2, 2, 2, 2], // France
  '+34': [3, 3, 3], // Spain
  '+39': [3, 3, 4], // Italy
  '+44': [4, 6], // United Kingdom
  '+49': [3, 8], // Germany
  '+52': [2, 4, 4], // Mexico
  '+55': [2, 5, 4], // Brazil
  '+61': [3, 3, 3], // Australia
  '+7': [3, 3, 2, 2], // Russia / Kazakhstan
  '+81': [2, 4, 4], // Japan
  '+86': [3, 4, 4], // China
  '+90': [3, 3, 2, 2], // Türkiye
  '+91': [5, 5], // India
  '+234': [3, 3, 4], // Nigeria
  '+254': [3, 3, 3], // Kenya
  '+351': [3, 3, 3], // Portugal
  '+966': [2, 3, 4], // Saudi Arabia
  '+971': [2, 3, 4], // United Arab Emirates
}

/** Splits `digits` into runs of the given lengths, keeping any remainder. */
function chunk(digits, sizes) {
  const parts = []
  let rest = digits
  for (const size of sizes) {
    if (!rest) break
    parts.push(rest.slice(0, size))
    rest = rest.slice(size)
  }
  if (rest) parts.push(rest)
  return parts.filter(Boolean)
}

/**
 * A stored number, written the way its own country writes it:
 * "+212682546896" → "+212 682-546896", "+33612345678" → "+33 6 12 34 56 78".
 *
 * The pattern only applies when the digits actually fit it — a number one
 * short of the national length would otherwise be regrouped into something
 * that looks authoritative and is wrong. Anything unrecognised falls back to
 * a plain three-then-rest split, which is never wrong, only plain.
 */
function formatPhone(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const { dial, national } = splitPhone(raw, '')
  if (!national) return raw
  if (!dial) return formatNational(national)

  const sizes = GROUPS[dial]
  const expected = sizes?.reduce((total, size) => total + size, 0)
  const parts = sizes && national.length === expected ? chunk(national, sizes) : chunk(national, [3])

  // Two groups read better hyphenated — "682-546896" — and three or more read
  // better spaced, which is how those countries write them anyway.
  return `${dial} ${parts.length === 2 ? parts.join('-') : parts.join(' ')}`
}

/**
 * Whether two numbers are the same line, compared on digits alone: "+212
 * 682-546896" and "+212682546896" are one number written two ways.
 */
function sameNumber(a, b) {
  const digits = (value) => String(value ?? '').replace(/\D/g, '')
  return Boolean(digits(a)) && digits(a) === digits(b)
}

/** The same number as a dialable href: digits and a leading + only. */
function telHref(value) {
  const raw = String(value ?? '')
  const digits = raw.replace(/\D/g, '')
  return /^[^\d]*\+/.test(raw) ? `tel:+${digits}` : `tel:${digits}`
}

module.exports={formatPhone}