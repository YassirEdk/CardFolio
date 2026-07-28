import { useEffect, useState } from 'react'
import { Mail, Phone, MessageCircle, Globe, MapPin, Download, Share2, User } from 'lucide-react'
import { getPlatform } from '../data/platforms'
import { photoSrc } from '../lib/image'
import { telHref, sameNumber } from '../lib/phone'
import { textOn } from '../lib/color'
import { cx } from '../components/ui'

/**
 * Every template receives the same props:
 *   { card, publicUrl, onSaveContact, onShare }
 * The helpers below normalise a card into the two lists templates render:
 * direct contact methods and social/platform links.
 */

export function contactItems(card) {
  const items = []
  // One line used for both is one row, not the same number printed twice.
  const oneNumber = sameNumber(card.phone, card.whatsapp)

  if (card.phone)
    items.push({
      key: 'phone',
      icon: Phone,
      label: oneNumber ? 'Call & WhatsApp' : 'Call',
      value: card.phone,
      href: telHref(card.phone),
    })
  if (card.whatsapp && !oneNumber)
    items.push({
      key: 'whatsapp',
      icon: MessageCircle,
      label: 'WhatsApp',
      value: card.whatsapp,
      href: `https://wa.me/${String(card.whatsapp).replace(/[^0-9]/g, '')}`,
      external: true,
    })
  if (card.email) items.push({ key: 'email', icon: Mail, label: 'Email', value: card.email, href: `mailto:${card.email}` })
  if (card.website)
    items.push({
      key: 'website',
      icon: Globe,
      label: 'Website',
      value: String(card.website).replace(/^https?:\/\//, ''),
      href: card.website,
      external: true,
    })
  return items
}

export function socialItems(card) {
  return (card.links || [])
    .filter((link) => link.url)
    .map((link) => {
      const platform = getPlatform(link.platform)
      return {
        ...link,
        name: link.label || platform.name,
        icon: platform.icon,
        brand: platform.color,
        handle: handleFromUrl(link.url),
      }
    })
}

/** "https://instagram.com/john.doe" → "@john.doe", or null if there is none. */
function handleFromUrl(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop()
    if (!path) return null
    return path.startsWith('@') ? path : `@${path}`
  } catch {
    return null
  }
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/**
 * Avatar that falls back to initials when no photo is uploaded — or when the
 * photo fails to load, so a missing file never leaves a blank hole in the card.
 */
export function Avatar({ card, size = 96, className, ring, accent = '#2E6BE6' }) {
  const style = { width: size, height: size }
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [card.photo])

  if (card.photo && !failed) {
    return (
      <img
        // Request ~3× the CSS size so the avatar stays crisp on a phone's
        // high-density screen.
        src={photoSrc(card.photo, Math.max(256, size * 3))}
        alt={card.fullName ? `${card.fullName}, profile photo` : 'Profile photo'}
        style={style}
        onError={() => setFailed(true)}
        className={cx('rounded-md bg-slate-200 object-cover', ring && 'ring-4', className)}
      />
    )
  }
  return (
    <div
      style={{ ...style, backgroundColor: accent }}
      className={cx('grid place-items-center rounded-md font-bold text-white', className)}
      aria-hidden="true"
    >
      {card.fullName ? (
        <span style={{ fontSize: size / 2.8 }}>{initials(card.fullName)}</span>
      ) : (
        <User size={size / 2.2} />
      )}
    </div>
  )
}

/**
 * The uploaded logo, shown whole and never cropped.
 *
 * `tone` picks the plate it sits on: a logo is usually dark artwork on a
 * transparent background, so over a photo or a dark surface it needs a light
 * plate to stay readable. Returns null when there's no logo — templates place
 * it absolutely and shouldn't reserve space for nothing.
 */
export function LogoMark({ card, height = 28, maxWidth = 132, tone = 'plain', className }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [card.logo])

  if (!card.logo || failed) return null

  const plate = {
    plain: '',
    light: 'rounded-md bg-white/90 p-1.5 shadow-[0_2px_8px_rgba(9,23,41,0.18)] backdrop-blur-sm',
    dark: 'rounded-md border border-white/15 bg-white/10 p-1.5 backdrop-blur-sm',
  }[tone]

  return (
    <img
      src={card.logo}
      alt={card.company ? `${card.company} logo` : 'Logo'}
      onError={() => setFailed(true)}
      // The cap is in px, not %: every template but Minimal places this
      // absolutely, and a percentage against a shrink-to-fit parent collapses
      // the image to nothing — leaving a visible but empty plate.
      style={{ height, maxWidth }}
      className={cx('w-auto object-contain', plate, className)}
    />
  )
}

export function LocationLine({ card, className }) {
  if (!card.location) return null
  return (
    <p className={cx('inline-flex items-center gap-1.5 text-sm', className)}>
      <MapPin size={14} aria-hidden="true" />
      {card.location}
    </p>
  )
}

/** Save contact + Share pair, tinted to the template's palette. */
export function ActionRow({ onSaveContact, onShare, accent, tone = 'light', className }) {
  const shareBase =
    tone === 'dark'
      ? 'border-white/20 bg-white/5 text-white hover:bg-white/10 active:bg-white/20'
      : 'border-slate-300 bg-white text-navy-900 hover:bg-slate-50 active:bg-slate-100'

  return (
    <div className={cx('grid grid-cols-2 gap-2.5', className)}>
      <button
        type="button"
        onClick={onSaveContact}
        // A pale accent needs dark text; `text-white` would be unreadable.
        style={{ backgroundColor: accent, color: textOn(accent) }}
        className={cx(
          'inline-flex h-12 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-80',
          // On a dark card an accent near the surface colour needs an edge.
          tone === 'dark' && 'ring-1 ring-inset ring-white/15'
        )}
      >
        <Download size={16} aria-hidden="true" />
        Save contact
      </button>
      <button
        type="button"
        onClick={onShare}
        className={cx(
          'inline-flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition-colors',
          shareBase
        )}
      >
        <Share2 size={16} aria-hidden="true" />
        Share
      </button>
    </div>
  )
}

/** The clearance this block owns: breathing room plus the home-indicator inset. */
const CARD_BOTTOM_INSET = 'pb-[calc(2rem+var(--phone-safe-bottom,0px))]'

export function PoweredBy({ card, tone = 'light', className }) {
  /**
   * Pro can take the credit off the card entirely — but not the space under
   * it. This block is the last thing on every card, so it also carries the
   * bottom clearance; dropping the whole element would leave the final section
   * flush against the bottom edge, and under the home indicator on a phone.
   */
  if (card?.hideBranding) {
    return <div aria-hidden="true" className={cx(CARD_BOTTOM_INSET, className)} />
  }

  // The clearance is painted in the card's own colour this way, instead of
  // showing as a strip of device black inside the phone frame.
  return (
    <div className={cx('pt-6 text-center', CARD_BOTTOM_INSET, className)}>
      <a
        href="/"
        className={cx(
          'text-xs font-medium transition-colors',
          tone === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-navy-900'
        )}
      >
        Powered by <span className="font-bold">CardFolio</span>
      </a>
    </div>
  )
}

/** Shared anchor props so every link behaves the same across templates. */
export function linkProps(href, external = true) {
  return external
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { href }
}
