import { ArrowUpRight, Building2, Download, MapPin, Share2 } from 'lucide-react'
import {
  DesktopLogo,
  DesktopPortrait,
  DesktopFooter,
  QrPanel,
  SaveContactPanel,
  SectionLabel,
  desktopContacts,
  desktopSocials,
  linkAttrs,
} from './parts'
import { useCardActions } from '../lib/useCardActions'

/**
 * Executive on desktop — the original CardFolio desktop design, kept as this
 * template's own: a full-bleed navy hero carrying identity and primary
 * actions, then a two-column body with a sticky contact rail on the right.
 */
export default function DesktopExecutive({ card }) {
  const accent = card.accent || '#2E6BE6'
  const contacts = desktopContacts(card)
  const socials = desktopSocials(card)
  const { publicUrl, onSaveContact, onShare } = useCardActions(card)

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* ---------------------------------------------------------- hero */}
      <header className="relative overflow-hidden bg-navy-900">
        {card.cover ? (
          <>
            <img src={card.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {/* Heavier scrim than the phone banner: this hero carries body text. */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(9,23,41,0.72) 0%, rgba(9,23,41,0.86) 100%)' }}
              aria-hidden="true"
            />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(80% 130% at 78% -25%, ${accent}55 0%, transparent 58%)` }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{ backgroundImage: 'repeating-linear-gradient(135deg,#fff 0 1px,transparent 1px 16px)' }}
              aria-hidden="true"
            />
          </>
        )}

        <div className="container-page relative py-16">
          {card.logo && (
            <div className="mx-auto mb-10 flex max-w-6xl justify-end">
              <DesktopLogo card={card} height={40} tone={card.cover ? 'light' : 'dark'} />
            </div>
          )}
          <div className="mx-auto flex max-w-6xl items-center gap-12">
            <DesktopPortrait
              card={card}
              size={168}
              accent={accent}
              className="shrink-0 border-4 border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
            />

            <div className="min-w-0 flex-1">
              <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white xl:text-5xl">
                {card.fullName || 'Your name'}
              </h1>
              <span
                className="mt-4 block h-1 w-14 rounded-md"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              />
              <p className="mt-4 text-lg font-medium text-white/85">
                {card.title || 'Your professional title'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
                {card.company && (
                  <span className="inline-flex items-center gap-2">
                    <Building2 size={15} className="text-slate-400" aria-hidden="true" />
                    {card.company}
                  </span>
                )}
                {card.location && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={15} className="text-slate-400" aria-hidden="true" />
                    {card.location}
                  </span>
                )}
              </div>

              {/* White CTAs: guaranteed contrast whichever accent is chosen. */}
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onSaveContact}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-semibold text-navy-900 transition-colors hover:bg-slate-100"
                >
                  <Download size={16} aria-hidden="true" />
                  Save contact
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <Share2 size={16} aria-hidden="true" />
                  Share
                </button>
              </div>

              {socials.length > 0 && (
                <nav className="mt-7 flex flex-wrap gap-2" aria-label="Social profiles, quick access">
                  {socials.map((link) => (
                    <a
                      key={link.id}
                      {...linkAttrs(link.url)}
                      title={link.name}
                      aria-label={link.name}
                      className="grid h-10 w-10 place-items-center rounded-md border border-white/15 text-slate-300 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white"
                    >
                      <link.icon size={17} aria-hidden="true" />
                    </a>
                  ))}
                </nav>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- body */}
      <main className="container-page py-14">
        <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-10">
            {card.bio && (
              <section aria-label="About">
                <SectionLabel>About</SectionLabel>
                <p className="mt-4 max-w-prose text-lg leading-relaxed text-slate-700">{card.bio}</p>
              </section>
            )}

            {contacts.length > 0 && (
              <section aria-label="Contact details">
                <SectionLabel>Contact</SectionLabel>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {contacts.map((item) => (
                    <a
                      key={item.key}
                      {...linkAttrs(item.href, item.external)}
                      className="group relative rounded-md border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[var(--shadow-card)] active:bg-slate-50"
                    >
                      <span
                        className="grid h-10 w-10 place-items-center rounded-md"
                        style={{ backgroundColor: `${accent}14`, color: accent }}
                        aria-hidden="true"
                      >
                        <item.icon size={18} />
                      </span>
                      <span className="mt-4 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {item.label}
                      </span>
                      <span className="block truncate text-[15px] font-semibold text-navy-900">{item.value}</span>
                      <ArrowUpRight
                        size={15}
                        className="absolute right-4 top-4 text-slate-300 transition-colors group-hover:text-slate-500"
                        aria-hidden="true"
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {socials.length > 0 && (
              <section aria-label="Profiles and portfolio">
                <SectionLabel>Profiles & portfolio</SectionLabel>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {socials.map((link) => (
                    <a
                      key={link.id}
                      {...linkAttrs(link.url)}
                      className="group flex items-center gap-4 rounded-md border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[var(--shadow-card)] active:bg-slate-50"
                    >
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-md"
                        style={{ backgroundColor: `${link.brand}14`, color: link.brand }}
                        aria-hidden="true"
                      >
                        <link.icon size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-navy-900">{link.name}</span>
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

          {/* ------------------------------------------------ sticky rail */}
          <aside className="xl:sticky xl:top-8 xl:self-start">
            <div className="space-y-4">
              <QrPanel card={card} publicUrl={publicUrl} accent={accent} />
              <SaveContactPanel onSaveContact={onSaveContact} accent={accent} />
            </div>
          </aside>
        </div>

        <DesktopFooter card={card} />
      </main>
    </div>
  )
}
