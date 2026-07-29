import { useEffect, useState } from 'react'
import { ArrowUpRight, Building2, Download, MapPin, Share2 } from 'lucide-react'
import {
  DesktopLogo,
  DesktopFooter,
  QrPanel,
  SaveContactPanel,
  SectionLabel,
  desktopContacts,
  desktopInitials,
  desktopSocials,
  linkAttrs,
} from './parts'
import { useCardActions } from '../lib/useCardActions'
import { photoSrc } from '../lib/image'
import { textOn } from '../lib/color'
import { useT } from '../lib/i18n'

/**
 * Photo-focus on desktop — the portrait takes a full sticky column on the left
 * and the content scrolls beside it, which is what the phone template's
 * full-bleed header becomes when there is width to spend.
 *
 * No banner here either: the portrait is the image, at the largest size any
 * template gives it.
 */
export default function DesktopPhotoFocus({ card }) {
  const accent = card.accent || '#2E6BE6'
  const t = useT()
  const contacts = desktopContacts(card, t)
  const socials = desktopSocials(card)
  const { publicUrl, onSaveContact, onShare } = useCardActions(card)

  const [photoFailed, setPhotoFailed] = useState(false)
  useEffect(() => setPhotoFailed(false), [card.photo])

  return (
    <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[minmax(0,44%)_minmax(0,1fr)]">
      {/* ---------------------------------------------------------- portrait */}
      <div className="relative h-[60vh] lg:sticky lg:top-0 lg:h-dvh">
        {card.photo && !photoFailed ? (
          <img
            // The largest any template paints a portrait: a full-height
            // column. Google avatars arrive as 96px thumbnails, so ask for the
            // full-size original rather than upscaling a menu-bar icon.
            src={photoSrc(card.photo, 2048)}
            alt={card.fullName ? `${card.fullName}, profile photo` : 'Profile photo'}
            onError={() => setPhotoFailed(true)}
            className="h-full w-full bg-slate-200 object-cover"
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-[7rem] font-bold text-white"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          >
            {desktopInitials(card.fullName) || 'CF'}
          </div>
        )}

        <div
          className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/35 to-transparent"
          aria-hidden="true"
        />

        <div className="absolute right-8 top-8">
          <DesktopLogo card={card} height={64} maxWidth={300} tone={card.logoPlate === false ? 'plain' : 'light'} />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight xl:text-5xl">
            {card.fullName || 'Your name'}
          </h1>
          <p className="mt-4 text-lg font-medium text-white/90">{card.title || 'Your professional title'}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
            {card.company && (
              <span className="inline-flex items-center gap-2">
                <Building2 size={15} aria-hidden="true" />
                {card.company}
              </span>
            )}
            {card.location && (
              <span className="inline-flex items-center gap-2">
                <MapPin size={15} aria-hidden="true" />
                {card.location}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------- content */}
      <main className="px-8 py-14 lg:px-14">
        <div className="mx-auto max-w-2xl space-y-12">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSaveContact}
              style={{ backgroundColor: accent, color: textOn(accent) }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md px-6 text-sm font-semibold transition-opacity hover:opacity-90"
            >
              <Download size={16} aria-hidden="true" />
              {t('card.saveContact')}
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300 px-6 text-sm font-semibold text-navy-900 transition-colors hover:bg-slate-50"
            >
              <Share2 size={16} aria-hidden="true" />
              {t('card.share')}
            </button>
          </div>

          {card.bio && (
            <section aria-label="About">
              <SectionLabel>{t('card.about')}</SectionLabel>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">{card.bio}</p>
            </section>
          )}

          {contacts.length > 0 && (
            <section aria-label="Contact details">
              <SectionLabel>{t('card.contact')}</SectionLabel>
              <div className="mt-4 space-y-3">
                {contacts.map((item) => (
                  <a
                    key={item.key}
                    {...linkAttrs(item.href, item.external)}
                    className="group flex items-center gap-4 rounded-md border border-slate-200 p-4 transition-all hover:border-slate-300 hover:shadow-[var(--shadow-card)]"
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-white"
                      style={{ backgroundColor: accent }}
                      aria-hidden="true"
                    >
                      <item.icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {item.label}
                      </span>
                      <span className="block truncate text-[15px] font-semibold text-navy-900">{item.value}</span>
                    </span>
                    <ArrowUpRight
                      size={16}
                      className="shrink-0 text-slate-300 transition-colors group-hover:text-slate-500"
                      aria-hidden="true"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          {socials.length > 0 && (
            <section aria-label="Profiles and portfolio">
              <SectionLabel>{t('card.portfolioSocial')}</SectionLabel>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {socials.map((link) => (
                  <a
                    key={link.id}
                    {...linkAttrs(link.url)}
                    className="inline-flex min-h-12 items-center gap-2.5 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-navy-900 transition-colors hover:bg-slate-50"
                  >
                    <link.icon size={17} style={{ color: link.brand }} aria-hidden="true" />
                    {link.name}
                  </a>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <QrPanel card={card} publicUrl={publicUrl} accent={accent} />
            <SaveContactPanel onSaveContact={onSaveContact} accent={accent} />
          </div>

          <DesktopFooter card={card} className="mt-0" />
        </div>
      </main>
    </div>
  )
}
