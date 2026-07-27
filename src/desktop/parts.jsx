import { useEffect, useState } from 'react'
import { Mail, Phone, MessageCircle, Globe, User, ScanLine, Copy, Check, Download } from 'lucide-react'
import { getPlatform } from '../data/platforms'
import { photoSrc } from '../lib/image'
import { telHref, sameNumber } from '../lib/phone'
import { readableOn, textOn } from '../lib/color'
import { cx, ScanCorners } from '../components/ui'
import QrCode from '../components/QrCode'
import { useToast } from '../components/Toast'

/**
 * Building blocks owned by the desktop layout.
 *
 * These deliberately mirror nothing from templates/shared.jsx: the desktop
 * presentation is free to label, order and render card data its own way
 * without a change here rippling into the phone templates.
 */

/** Contact methods, desktop wording (full labels rather than button verbs). */
export function desktopContacts(card) {
  const items = []
  // One line used for both is one row, not the same number printed twice.
  const oneNumber = sameNumber(card.phone, card.whatsapp)

  if (card.email)
    items.push({ key: 'email', icon: Mail, label: 'Email', value: card.email, href: `mailto:${card.email}` })
  if (card.phone)
    items.push({
      key: 'phone',
      icon: Phone,
      label: oneNumber ? 'Phone & WhatsApp' : 'Phone',
      value: card.phone,
      // Digits and a leading + only: the display value carries a dash.
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

export function desktopSocials(card) {
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

/** "https://instagram.com/john.doe" → "@john.doe" — desktop shows the handle. */
function handleFromUrl(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop()
    if (!path) return null
    return path.startsWith('@') ? path : `@${path}`
  } catch {
    return null
  }
}

export function desktopInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/** Large portrait for the desktop hero, falling back to a monogram. */
export function DesktopPortrait({ card, size = 160, accent = '#2E6BE6', className }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [card.photo])

  const style = { width: size, height: size }

  if (card.photo && !failed) {
    return (
      <img
        src={photoSrc(card.photo, Math.max(512, size * 3))}
        alt={card.fullName ? `${card.fullName}, profile photo` : 'Profile photo'}
        style={style}
        onError={() => setFailed(true)}
        className={cx('rounded-md object-cover', className)}
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
        <span style={{ fontSize: size / 3 }}>{desktopInitials(card.fullName)}</span>
      ) : (
        <User size={size / 2.4} />
      )}
    </div>
  )
}

/** Section heading used down the desktop content column. */
export function SectionLabel({ children, className }) {
  return (
    <h2 className={cx('text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400', className)}>
      {children}
    </h2>
  )
}

export function linkAttrs(href, external = true) {
  return external ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href }
}

/**
 * The uploaded logo at desktop size. `tone` picks the plate behind it — logo
 * artwork is usually dark, so over a photo or a dark surface it needs one.
 */
export function DesktopLogo({ card, height = 40, maxWidth = 220, tone = 'plain', className }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [card.logo])

  if (!card.logo || failed) return null

  const plate = {
    plain: '',
    light: 'rounded-md bg-white/92 p-2.5 shadow-[0_4px_18px_rgba(9,23,41,0.22)] backdrop-blur-sm',
    dark: 'rounded-md border border-white/15 bg-white/10 p-2.5 backdrop-blur-sm',
  }[tone]

  return (
    <img
      src={card.logo}
      alt={card.company ? `${card.company} logo` : 'Logo'}
      onError={() => setFailed(true)}
      // px, not %: these sit in absolutely-positioned or shrink-to-fit
      // corners, where a percentage cap collapses the image to nothing.
      style={{ height, maxWidth }}
      className={cx('w-auto object-contain', plate, className)}
    />
  )
}

/**
 * Banner behind a desktop hero. Templates differ in what they want underneath
 * when no banner is uploaded, so the fallback is passed in rather than assumed.
 */
export function HeroBanner({ card, scrim, children }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [card.cover])

  if (!card.cover || failed) return children || null

  return (
    <>
      <img
        src={card.cover}
        alt=""
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: scrim }} aria-hidden="true" />
    </>
  )
}

/** Copy-link behaviour, shared by every desktop layout's QR panel. */
export function useCopyLink(publicUrl) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  return {
    copied,
    async copyLink() {
      try {
        await navigator.clipboard.writeText(publicUrl)
        setCopied(true)
        toast('Link copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
      } catch {
        toast('Could not copy the link', 'info')
      }
    },
  }
}

/**
 * "Open on your phone" QR panel. `tone="dark"` swaps the surface for the dark
 * templates; the QR itself always keeps a light quiet zone so it stays scannable.
 */
export function QrPanel({ card, publicUrl, accent, tone = 'light', className }) {
  const { copied, copyLink } = useCopyLink(publicUrl)
  const dark = tone === 'dark'

  return (
    <div
      className={cx(
        'rounded-md border p-6 text-center',
        dark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white shadow-[var(--shadow-card)]',
        className
      )}
    >
      <p className={cx('inline-flex items-center gap-2 text-sm font-bold', dark ? 'text-white' : 'text-navy-900')}>
        <ScanLine size={15} aria-hidden="true" />
        Open on your phone
      </p>
      <p className={cx('mt-1.5 text-xs leading-relaxed', dark ? 'text-slate-400' : 'text-slate-500')}>
        Scan this code to carry the card with you.
      </p>
      {/* Scanner brackets instead of the printed URL: the address was long
          enough on some domains to wrap badly, and it said nothing the code
          doesn't already carry. The corners frame the code the way a camera
          viewfinder does, so it reads as "point your phone here". */}
      <div className="mt-5 flex justify-center">
        <div className="relative p-2.5">
          <ScanCorners dark={dark} accent={accent} />
          <div className={cx('rounded-md bg-white p-3', dark ? 'border border-white/10' : 'border border-slate-200')}>
            {/* The code sits on white and has to survive a phone camera, so the
                modules are darkened when the accent is too pale to scan. */}
            <QrCode value={publicUrl} size={168} color={readableOn(accent, '#ffffff', 4.5)} />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={copyLink}
        className={cx(
          'mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-semibold transition-colors',
          dark
            ? 'border-white/20 text-white hover:bg-white/10'
            : 'border-slate-300 text-navy-900 hover:bg-slate-50'
        )}
      >
        {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  )
}

/** "Add to your contacts" panel — the .vcf download, explained. */
export function SaveContactPanel({ onSaveContact, accent, tone = 'light', className }) {
  const dark = tone === 'dark'

  return (
    <div
      className={cx(
        'rounded-md border p-6',
        dark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white shadow-[var(--shadow-card)]',
        className
      )}
    >
      <p className={cx('text-sm font-bold', dark ? 'text-white' : 'text-navy-900')}>Add to your contacts</p>
      <p className={cx('mt-1.5 text-xs leading-relaxed', dark ? 'text-slate-400' : 'text-slate-500')}>
        Downloads a .vcf file that opens straight in your address book.
      </p>
      <button
        type="button"
        onClick={onSaveContact}
        style={{ backgroundColor: accent, color: textOn(accent) }}
        className={cx(
          'mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90',
          // On the dark surface an accent close to the background needs an edge.
          dark && 'ring-1 ring-inset ring-white/15'
        )}
      >
        <Download size={16} aria-hidden="true" />
        Save contact
      </button>
    </div>
  )
}

export function DesktopFooter({ card, tone = 'light', className }) {
  // Pro can take the credit off the card entirely.
  if (card?.hideBranding) return null

  return (
    <p className={cx('mt-12 text-center', className)}>
      <a
        href="/"
        className={cx(
          'text-xs font-medium transition-colors',
          tone === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-navy-900'
        )}
      >
        Powered by <span className="font-bold">CardFolio</span>
      </a>
    </p>
  )
}
