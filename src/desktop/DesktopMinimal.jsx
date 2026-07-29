import { ArrowUpRight } from 'lucide-react'
import {
  DesktopLogo,
  DesktopPortrait,
  DesktopFooter,
  QrPanel,
  SaveContactPanel,
  desktopContacts,
  desktopSocials,
  linkAttrs,
} from './parts'
import { useCardActions } from '../lib/useCardActions'
import { textOn } from '../lib/color'
import { useT } from '../lib/i18n'

/**
 * Minimal on desktop — an editorial single column on white.
 *
 * No banner and no hero band: the phone version's promise is white space and
 * type, and widening it shouldn't turn it into a different template. Scale
 * comes from the typography, and rules do the work borders would elsewhere.
 */
export default function DesktopMinimal({ card }) {
  const accent = card.accent || '#2E6BE6'
  const t = useT()
  const contacts = desktopContacts(card, t)
  const socials = desktopSocials(card)
  const { publicUrl, onSaveContact, onShare } = useCardActions(card)

  return (
    <div className="min-h-dvh bg-white">
      <main className="container-page py-20">
        <div className="mx-auto max-w-5xl">
          {/* ------------------------------------------------------ masthead */}
          <header className="border-b border-slate-200 pb-14">
            {card.logo && (
              <div className="mb-12 flex justify-center">
                <DesktopLogo card={card} height={44} />
              </div>
            )}

            <div className="flex flex-col items-center text-center">
              <DesktopPortrait card={card} size={132} accent={accent} className="ring-1 ring-slate-200" />

              <h1 className="mt-8 text-5xl font-extrabold leading-[1.05] tracking-tight text-navy-900">
                {card.fullName || 'Your name'}
              </h1>
              <p className="mt-4 text-lg font-semibold" style={{ color: accent }}>
                {card.title || 'Your professional title'}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-slate-500">
                {card.company && <span className="font-medium text-navy-800">{card.company}</span>}
                {card.company && card.location && <span aria-hidden="true">·</span>}
                {card.location && <span>{card.location}</span>}
              </div>

              {card.bio && (
                <p className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-600">{card.bio}</p>
              )}

              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={onSaveContact}
                  style={{ backgroundColor: accent, color: textOn(accent) }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md px-7 text-sm font-semibold transition-opacity hover:opacity-90"
                >
                  {t('card.saveContact')}
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300 px-7 text-sm font-semibold text-navy-900 transition-colors hover:bg-slate-50"
                >
                  {t('card.share')}
                </button>
              </div>
            </div>
          </header>

          {/* ---------------------------------------------------- two columns */}
          <div className="grid gap-16 pt-14 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-12">
              {contacts.length > 0 && (
                <section aria-label="Contact details">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('card.contact')}</h2>
                  <ul className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
                    {contacts.map((item) => (
                      <li key={item.key}>
                        <a
                          {...linkAttrs(item.href, item.external)}
                          className="group flex items-center gap-5 py-5 transition-colors hover:bg-slate-50"
                        >
                          <item.icon size={19} className="shrink-0 text-slate-400" aria-hidden="true" />
                          <span className="w-28 shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            {item.label}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-lg font-medium text-navy-900">
                            {item.value}
                          </span>
                          <ArrowUpRight
                            size={17}
                            className="shrink-0 text-slate-300 transition-colors group-hover:text-slate-500"
                            aria-hidden="true"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {socials.length > 0 && (
                <section aria-label="Social profiles">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('card.findMeOn')}</h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {socials.map((link) => (
                      <a
                        key={link.id}
                        {...linkAttrs(link.url)}
                        className="group flex items-center gap-3.5 rounded-md border border-slate-200 px-5 py-4 transition-all hover:border-slate-300 hover:shadow-[var(--shadow-card)]"
                      >
                        <link.icon size={19} style={{ color: link.brand }} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-navy-900">{link.name}</span>
                          {link.handle && (
                            <span className="block truncate text-xs text-slate-500">{link.handle}</span>
                          )}
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
            </div>

            <aside className="lg:sticky lg:top-8 lg:self-start">
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
