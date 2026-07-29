import { ArrowUpRight, Building2, Download, MapPin, Share2 } from 'lucide-react'
import {
  DesktopLogo,
  DesktopPortrait,
  DesktopFooter,
  HeroBanner,
  QrPanel,
  SaveContactPanel,
  SectionLabel,
  desktopContacts,
  desktopSocials,
  linkAttrs,
} from './parts'
import { useCardActions } from '../lib/useCardActions'
import { useT } from '../lib/i18n'

/**
 * Split on desktop — the phone template's idea at full width: a saturated
 * accent band on top, white below, with the portrait straddling the seam.
 *
 * A banner photo goes behind the band and keeps the accent tint over it, so
 * the header still reads as the card's colour rather than as a photograph.
 */
export default function DesktopSplit({ card }) {
  const accent = card.accent || '#2E6BE6'
  const t = useT()
  const contacts = desktopContacts(card, t)
  const socials = desktopSocials(card)
  const { publicUrl, onSaveContact, onShare } = useCardActions(card)

  return (
    <div className="min-h-dvh bg-white">
      {/* ------------------------------------------------------------- band */}
      <header className="relative overflow-hidden" style={{ backgroundColor: accent }}>
        <HeroBanner card={card} scrim={`linear-gradient(180deg, ${accent}66 0%, ${accent}A6 100%)`}>
          <>
            {/* A wash of white over the flat accent: at full strength this
                band is a wall of colour across the whole hero. It settles
                toward the bottom, where the white text and buttons sit. */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.38) 0%,rgba(255,255,255,0.14) 100%)' }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 opacity-[0.14]"
              style={{ backgroundImage: 'repeating-linear-gradient(135deg,#fff 0 1px,transparent 1px 18px)' }}
              aria-hidden="true"
            />
          </>
        </HeroBanner>

        <div className="container-page relative pb-28 pt-14">
          <div className="mx-auto flex max-w-6xl items-start justify-between gap-8">
            <div className="min-w-0 text-white">
              <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight">
                {card.fullName || 'Your name'}
              </h1>
              <p className="mt-4 text-xl font-medium text-white/90">
                {card.title || 'Your professional title'}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                {card.company && (
                  <span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-1.5 font-semibold">
                    <Building2 size={14} aria-hidden="true" />
                    {card.company}
                  </span>
                )}
                {card.location && (
                  <span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-1.5 font-medium">
                    <MapPin size={14} aria-hidden="true" />
                    {card.location}
                  </span>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onSaveContact}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-semibold transition-colors hover:bg-slate-100"
                  style={{ color: accent }}
                >
                  <Download size={16} aria-hidden="true" />
                  {t('card.saveContact')}
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/40 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <Share2 size={16} aria-hidden="true" />
                  {t('card.share')}
                </button>
              </div>
            </div>

            <DesktopLogo
              card={card}
              height={68}
              maxWidth={320}
              tone={card.logoPlate === false ? 'plain' : card.cover ? 'light' : 'dark'}
              className="shrink-0"
            />
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- body */}
      <main className="container-page">
        <div className="mx-auto max-w-6xl">
          {/* Portrait sits on the seam between the two halves. `relative` is
              load-bearing: the band above is positioned and clips its own
              overflow, so a static portrait would be painted behind it. */}
          <div className="relative -mt-20 flex items-end gap-6">
            <DesktopPortrait
              card={card}
              size={160}
              accent={accent}
              className="shrink-0 border-4 border-white shadow-[0_16px_44px_rgba(9,23,41,0.28)]"
            />
            {card.bio && (
              <p className="max-w-2xl pb-3 text-lg leading-relaxed text-slate-600">{card.bio}</p>
            )}
          </div>

          <div className="grid gap-8 py-14 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-10">
              {contacts.length > 0 && (
                <section aria-label="Contact details">
                  <SectionLabel>{t('card.contact')}</SectionLabel>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {contacts.map((item) => (
                      <a
                        key={item.key}
                        {...linkAttrs(item.href, item.external)}
                        className="group flex items-center gap-4 rounded-md bg-slate-50 p-5 transition-colors hover:bg-slate-100"
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
                          <span className="block truncate text-[15px] font-semibold text-navy-900">
                            {item.value}
                          </span>
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
                  <SectionLabel>{t('card.platforms')}</SectionLabel>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {socials.map((link) => (
                      <a
                        key={link.id}
                        {...linkAttrs(link.url)}
                        className="flex flex-col items-center gap-3 rounded-md border border-slate-200 px-3 py-6 text-center transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
                      >
                        <link.icon size={24} style={{ color: link.brand }} aria-hidden="true" />
                        <span className="w-full truncate text-sm font-semibold text-navy-900">{link.name}</span>
                        {link.handle && (
                          <span className="w-full truncate text-xs text-slate-500">{link.handle}</span>
                        )}
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="xl:sticky xl:top-8 xl:self-start">
              <div className="space-y-4">
                <QrPanel card={card} publicUrl={publicUrl} accent={accent} />
                <SaveContactPanel onSaveContact={onSaveContact} accent={accent} />
              </div>
            </aside>
          </div>

          <DesktopFooter card={card} />
        </div>
      </main>
    </div>
  )
}
