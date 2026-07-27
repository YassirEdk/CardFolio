import { ArrowUpRight, Building2, Download, MapPin, Share2 } from 'lucide-react'
import {
  DesktopLogo,
  DesktopPortrait,
  DesktopFooter,
  HeroBanner,
  QrPanel,
  SaveContactPanel,
  desktopContacts,
  desktopSocials,
  linkAttrs,
} from './parts'
import { useCardActions } from '../lib/useCardActions'
import { readableOn, textOn } from '../lib/color'

/** The page surface, and the plate the hero text sits over once scrimmed. */
const SURFACE = '#0B1424'

/** Section heading in the dark palette — the light one would disappear here. */
function DarkLabel({ children }) {
  return <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{children}</h2>
}

/**
 * Dark Pro on desktop — near-black surface, hairline borders, accent used
 * sparingly as signal rather than decoration.
 *
 * The banner is scrimmed harder than on the light templates: at this size a
 * bright photo would overpower everything under it.
 */
export default function DesktopDarkPro({ card }) {
  const accent = card.accent || '#2E6BE6'
  const contacts = desktopContacts(card)
  const socials = desktopSocials(card)
  const { publicUrl, onSaveContact, onShare } = useCardActions(card)

  /**
   * This template's surface is near-black, and the accent can be too — Deep
   * Navy on navy is invisible. `ink` is the same hue raised until it reads;
   * `onAccent` keeps button labels legible if the accent is pale instead.
   */
  const ink = readableOn(accent, SURFACE, 4.5)
  const onAccent = textOn(accent)

  return (
    <div className="min-h-dvh bg-navy-950 text-white">
      {/* -------------------------------------------------------------- hero */}
      <header className="relative overflow-hidden border-b border-white/10">
        <HeroBanner card={card} scrim="linear-gradient(180deg,rgba(4,10,20,0.62) 0%,rgba(4,10,20,0.95) 100%)">
          <>
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(90% 130% at 85% -25%, ${ink}40 0%, transparent 60%)` }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{ backgroundImage: 'repeating-linear-gradient(135deg,#fff 0 1px,transparent 1px 15px)' }}
              aria-hidden="true"
            />
          </>
        </HeroBanner>

        <div className="container-page relative py-16">
          <div className="mx-auto max-w-6xl">
            {card.logo && (
              <div className="mb-10 flex justify-end">
                <DesktopLogo card={card} height={64} maxWidth={320} tone={card.logoPlate === false ? 'plain' : card.cover ? 'light' : 'dark'} />
              </div>
            )}

            <div className="flex items-center gap-10">
              <DesktopPortrait
                card={card}
                size={156}
                accent={accent}
                className="shrink-0 border border-white/15 shadow-[0_16px_44px_rgba(0,0,0,0.6)]"
              />

              <div className="min-w-0 flex-1">
                <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight xl:text-5xl">
                  {card.fullName || 'Your name'}
                </h1>
                <p className="mt-4 text-lg font-semibold" style={{ color: ink }}>
                  {card.title || 'Your professional title'}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
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

                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onSaveContact}
                    style={{ backgroundColor: accent, color: onAccent }}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md px-6 text-sm font-semibold ring-1 ring-inset ring-white/15 transition-opacity hover:opacity-90"
                  >
                    <Download size={16} aria-hidden="true" />
                    Save contact
                  </button>
                  <button
                    type="button"
                    onClick={onShare}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <Share2 size={16} aria-hidden="true" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------- body */}
      <main className="container-page py-14">
        <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-10">
            {card.bio && (
              <section aria-label="About">
                <DarkLabel>About</DarkLabel>
                <p className="mt-4 max-w-prose text-lg leading-relaxed text-slate-300">{card.bio}</p>
              </section>
            )}

            {contacts.length > 0 && (
              <section aria-label="Contact details">
                <DarkLabel>Contact</DarkLabel>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {contacts.map((item) => (
                    <a
                      key={item.key}
                      {...linkAttrs(item.href, item.external)}
                      className="group flex items-center gap-4 rounded-md border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.08]"
                    >
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-md"
                        style={{ backgroundColor: `${ink}24`, color: ink }}
                        aria-hidden="true"
                      >
                        <item.icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[15px] font-semibold text-white">
                          {item.value}
                        </span>
                      </span>
                      <ArrowUpRight
                        size={15}
                        className="shrink-0 text-slate-600 transition-colors group-hover:text-slate-300"
                        aria-hidden="true"
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {socials.length > 0 && (
              <section aria-label="Profiles and portfolio">
                <DarkLabel>Elsewhere</DarkLabel>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {socials.map((link) => (
                    <a
                      key={link.id}
                      {...linkAttrs(link.url)}
                      className="group flex items-center gap-4 rounded-md border border-white/10 p-4 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                    >
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/10"
                        style={{ color: link.brand }}
                        aria-hidden="true"
                      >
                        <link.icon size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-white">{link.name}</span>
                        {link.handle && <span className="block truncate text-xs text-slate-500">{link.handle}</span>}
                      </span>
                      <ArrowUpRight
                        size={16}
                        className="shrink-0 text-slate-600 transition-colors group-hover:text-slate-300"
                        aria-hidden="true"
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="xl:sticky xl:top-8 xl:self-start">
            <div className="space-y-4">
              <QrPanel card={card} publicUrl={publicUrl} accent={accent} tone="dark" />
              <SaveContactPanel onSaveContact={onSaveContact} accent={accent} tone="dark" />
            </div>
          </aside>
        </div>

        <DesktopFooter card={card} tone="dark" />
      </main>
    </div>
  )
}
