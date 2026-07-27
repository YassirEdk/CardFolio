import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Github,
  Dribbble,
  Music2,
  Palette,
  Briefcase,
  Send,
  Globe,
  Link as LinkIcon,
  Twitter,
} from 'lucide-react'

/**
 * Central registry of every platform a card can link to.
 * Each card link stores only { id, platform, url, label? } — the icon,
 * display name and brand tint are resolved from here so every template
 * renders links consistently.
 *
 * `base` is the fixed part of a profile URL. Where it exists the editor asks
 * for a handle and shows the base as a prefix, so nobody has to type or
 * remember "https://" — the stored value is still the full URL.
 * Website and custom links have no base: those are whole addresses.
 */
export const PLATFORMS = {
  instagram: { name: 'Instagram', icon: Instagram, color: '#E1306C', base: 'https://instagram.com/', placeholder: 'username' },
  facebook: { name: 'Facebook', icon: Facebook, color: '#1877F2', base: 'https://facebook.com/', placeholder: 'username' },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', base: 'https://linkedin.com/in/', placeholder: 'username' },
  x: { name: 'X', icon: Twitter, color: '#0F1419', base: 'https://x.com/', placeholder: 'username' },
  tiktok: { name: 'TikTok', icon: Music2, color: '#111111', base: 'https://tiktok.com/@', placeholder: 'username' },
  youtube: { name: 'YouTube', icon: Youtube, color: '#FF0000', base: 'https://youtube.com/@', placeholder: 'channel' },
  behance: { name: 'Behance', icon: Palette, color: '#1769FF', base: 'https://behance.net/', placeholder: 'username' },
  dribbble: { name: 'Dribbble', icon: Dribbble, color: '#EA4C89', base: 'https://dribbble.com/', placeholder: 'username' },
  github: { name: 'GitHub', icon: Github, color: '#181717', base: 'https://github.com/', placeholder: 'username' },
  fiverr: { name: 'Fiverr', icon: Briefcase, color: '#1DBF73', base: 'https://fiverr.com/', placeholder: 'username' },
  upwork: { name: 'Upwork', icon: Briefcase, color: '#14A800', base: 'https://upwork.com/freelancers/~', placeholder: 'id' },
  malt: { name: 'Malt', icon: Briefcase, color: '#FC5757', base: 'https://malt.fr/profile/', placeholder: 'username' },
  telegram: { name: 'Telegram', icon: Send, color: '#26A5E4', base: 'https://t.me/', placeholder: 'username' },
  website: { name: 'Website', icon: Globe, color: '#2E6BE6', placeholder: 'https://yoursite.com' },
  custom: { name: 'Custom link', icon: LinkIcon, color: '#475569', placeholder: 'https://…' },
}

export const PLATFORM_OPTIONS = Object.entries(PLATFORMS).map(([value, p]) => ({
  value,
  label: p.name,
}))

export function getPlatform(key) {
  return PLATFORMS[key] || PLATFORMS.custom
}

/** The base without its scheme — what the editor prints in front of the field. */
export function basePrefix(key) {
  const { base } = getPlatform(key)
  return base ? base.replace(/^https?:\/\//i, '') : ''
}

const stripScheme = (value) => String(value).trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '')

/**
 * Full stored URL → the handle to show in the editor.
 *
 * People paste as often as they type, so a pasted profile URL is accepted and
 * reduced to its handle rather than ending up doubled behind the prefix.
 */
export function toHandle(key, url) {
  const base = getPlatform(key).base
  if (!base || !url) return url || ''

  const bare = stripScheme(url)
  const bareBase = stripScheme(base)
  if (bare.toLowerCase().startsWith(bareBase.toLowerCase())) {
    // Profile links get copied with a trailing slash and share tracking on the
    // end (…/in/name/?utm=…); neither belongs to the handle.
    return bare.slice(bareBase.length).split(/[?#]/)[0].replace(/\/+$/, '')
  }

  // Not this platform's URL (often a paste after switching platform): keep the
  // last path segment, which is nearly always the handle.
  const segments = bare.split(/[/?#]/).filter(Boolean)
  const tail = segments.length ? segments[segments.length - 1] : bare
  return tail.replace(/^@+/, '')
}

/** Editor handle → the full URL that gets stored and linked. */
export function toUrl(key, handle) {
  const base = getPlatform(key).base
  const value = String(handle || '').trim()
  if (!base) return value

  // Tolerate a pasted URL — with or without a scheme — as well as a leading @.
  const pasted = /^https?:\/\//i.test(value) || value.includes('/')
  const cleaned = pasted ? toHandle(key, value) : value.replace(/^@+/, '')
  return cleaned ? base + cleaned : ''
}

/** Accent colours offered in the onboarding / template picker. */
export const ACCENT_COLORS = [
  { name: 'CardFolio Blue', value: '#2E6BE6' },
  { name: 'Deep Navy', value: '#0F2544' },
  { name: 'Emerald', value: '#0E9F6E' },
  { name: 'Amber', value: '#B45309' },
  { name: 'Crimson', value: '#BE123C' },
  { name: 'Violet', value: '#6D28D9' },
  { name: 'Teal', value: '#0F766E' },
  { name: 'Graphite', value: '#334155' },
]
