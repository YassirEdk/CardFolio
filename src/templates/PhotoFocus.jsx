import { useEffect, useState } from 'react'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { ActionRow, PoweredBy, LogoMark, contactItems, socialItems, initials, linkProps } from './shared'
import { photoSrc } from '../lib/image'

/**
 * Photo-focus — full-bleed portrait header. Built for creatives.
 *
 * No banner by design: the portrait already is the header image, and a second
 * one would only compete with it. The logo rides on top of the portrait.
 */
export default function PhotoFocus({ card, onSaveContact, onShare }) {
  const accent = card.accent || '#2E6BE6'
  const contacts = contactItems(card)
  const socials = socialItems(card)
  // Falls back to the initials block if the portrait fails to load.
  const [photoFailed, setPhotoFailed] = useState(false)
  useEffect(() => setPhotoFailed(false), [card.photo])

  return (
    <div className="min-h-full bg-white">
      <header className="relative h-72 overflow-hidden">
        {card.photo && !photoFailed ? (
          <img
            src={photoSrc(card.photo, 1024)}
            alt={card.fullName ? `${card.fullName}, profile photo` : 'Profile photo'}
            onError={() => setPhotoFailed(true)}
            className="h-full w-full bg-slate-200 object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-5xl font-bold text-white" style={{ backgroundColor: accent }}>
            {initials(card.fullName) || 'CF'}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/45 to-transparent" aria-hidden="true" />

        {/* Light plate: the portrait behind it can be any colour. */}
        <div className="absolute right-5 top-[calc(1.25rem+var(--phone-safe-top,0px))]">
          <LogoMark card={card} height={38} maxWidth={168} tone={card.logoPlate === false ? 'plain' : 'light'} />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <h1 className="text-2xl font-bold leading-tight tracking-tight">{card.fullName || 'Your name'}</h1>
          <p className="mt-1 text-sm font-medium text-white/85">{card.title || 'Your professional title'}</p>
          {card.location && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/70">
              <MapPin size={12} aria-hidden="true" />
              {card.location}
            </p>
          )}
        </div>
      </header>

      <div className="px-6 pt-6">
        {card.bio && <p className="text-sm leading-relaxed text-slate-600">{card.bio}</p>}
        {card.company && <p className="mt-2 text-sm font-semibold text-navy-900">{card.company}</p>}

        <ActionRow onSaveContact={onSaveContact} onShare={onShare} accent={accent} className="mt-6" />

        {contacts.length > 0 && (
          <section className="mt-7 space-y-2.5" aria-label="Contact details">
            {contacts.map((item) => (
              <a
                key={item.key}
                {...linkProps(item.href, item.external)}
                className="flex min-h-14 items-center gap-3.5 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-navy-900 transition-all hover:border-slate-300 hover:shadow-[var(--shadow-card)] active:bg-slate-50"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white"
                  style={{ backgroundColor: accent }}
                  aria-hidden="true"
                >
                  <item.icon size={16} />
                </span>
                <span className="min-w-0 flex-1 break-words leading-snug">{item.value}</span>
              </a>
            ))}
          </section>
        )}

        {socials.length > 0 && (
          <section className="mt-7" aria-label="Social profiles">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Portfolio & social</h2>
            {/* Tiles rather than chips: this template leads with a full-bleed
                portrait, so the profiles under it should carry some weight
                too. Each one takes its platform's colour — the edge, the icon
                plate — which makes the grid scannable by colour alone. */}
            <div className="grid grid-cols-2 gap-2.5">
              {socials.map((link) => (
                <a
                  key={link.id}
                  {...linkProps(link.url)}
                  className="group relative overflow-hidden rounded-md border border-slate-200 p-3.5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[var(--shadow-card)] active:bg-slate-50"
                >
                  {/* The platform's colour, painted down the leading edge. */}
                  <span
                    className="absolute inset-y-0 left-0 w-1"
                    style={{ backgroundColor: link.brand }}
                    aria-hidden="true"
                  />
                  <span
                    className="grid h-9 w-9 place-items-center rounded-md"
                    style={{ backgroundColor: `${link.brand}1A`, color: link.brand }}
                    aria-hidden="true"
                  >
                    <link.icon size={17} />
                  </span>
                  <span className="mt-2.5 block truncate text-sm font-semibold text-navy-900">{link.name}</span>
                  <span className="block truncate text-xs text-slate-500">{link.handle || 'Open'}</span>
                  <ArrowUpRight
                    size={14}
                    className="absolute right-3 top-3 text-slate-300 transition-colors group-hover:text-slate-500"
                    aria-hidden="true"
                  />
                </a>
              ))}
            </div>
          </section>
        )}
      </div>

      <PoweredBy card={card} />
    </div>
  )
}
