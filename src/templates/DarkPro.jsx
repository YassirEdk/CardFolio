import { ArrowUpRight, MapPin } from 'lucide-react'
import { Avatar, ActionRow, PoweredBy, LogoMark, contactItems, socialItems, linkProps } from './shared'
import { readableOn } from '../lib/color'

/** The near-black surface this template paints on. */
const SURFACE = '#050B16'

/**
 * Dark Pro — near-black surface, high contrast, developer/agency feel.
 *
 * The banner is deliberately dimmer than on the lighter templates: this card
 * lives on near-black, and a bright photo at the top would tear a hole in it.
 * Without a banner the header keeps its flat surface with a low accent wash.
 */
export default function DarkPro({ card, onSaveContact, onShare }) {
  const accent = card.accent || '#2E6BE6'
  const contacts = contactItems(card)
  const socials = socialItems(card)

  /**
   * Accent as ink, raised until it reads on near-black. A dark accent — Deep
   * Navy, Graphite — is otherwise the same colour as the card it's printed on.
   */
  const ink = readableOn(accent, SURFACE, 4.5)

  return (
    <div className="min-h-full bg-navy-950 text-white">
      <div className="relative h-36 overflow-hidden">
        {card.cover ? (
          <>
            <img src={card.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg,rgba(4,10,20,0.55) 0%,rgba(4,10,20,0.94) 100%)' }}
              aria-hidden="true"
            />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(120% 140% at 82% -30%, ${ink}4D 0%, transparent 62%)` }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: 'repeating-linear-gradient(135deg,#fff 0 1px,transparent 1px 13px)' }}
              aria-hidden="true"
            />
          </>
        )}
        {/* `--phone-safe-top` is the notch inset when this card is being shown
            inside a phone frame, and 0 on a real page. */}
        <div className="absolute right-5 top-[calc(1.25rem+var(--phone-safe-top,0px))]">
          <LogoMark
            card={card}
            height={36}
            maxWidth={168}
            tone={card.logoPlate === false ? 'plain' : card.cover ? 'light' : 'dark'}
          />
        </div>
        {/* Hairline in the accent, seating the header on the body. */}
        <span
          className="absolute inset-x-0 bottom-0 h-px opacity-60"
          style={{ backgroundColor: ink }}
          aria-hidden="true"
        />
      </div>

      <div className="px-6">
        {/* Portrait straddles the banner edge, as on a letterhead. `relative`
            is load-bearing: the banner above is positioned, so a static header
            would be painted underneath it. */}
        <header className="relative -mt-9">
          <div className="flex items-end gap-4">
            <Avatar
              card={card}
              size={72}
              accent={accent}
              className="shrink-0 border-2 border-navy-950 shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
            />
            <div className="min-w-0 pb-1">
              <h1 className="truncate text-xl font-bold tracking-tight">{card.fullName || 'Your name'}</h1>
              <p className="truncate text-sm font-medium" style={{ color: ink }}>
                {card.title || 'Your professional title'}
              </p>
            </div>
          </div>

          {card.location && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin size={12} aria-hidden="true" />
              {card.location}
            </p>
          )}

          {card.bio && <p className="mt-4 text-sm leading-relaxed text-slate-300">{card.bio}</p>}
          {card.company && (
            <p className="mt-3 inline-block rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300">
              {card.company}
            </p>
          )}
        </header>

        <ActionRow onSaveContact={onSaveContact} onShare={onShare} accent={accent} tone="dark" className="mt-6" />

      {contacts.length > 0 && (
        <section className="mt-7 space-y-2" aria-label="Contact details">
          {contacts.map((item) => (
            <a
              key={item.key}
              {...linkProps(item.href, item.external)}
              className="flex items-center gap-3.5 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3.5 transition-colors hover:border-white/25 hover:bg-white/[0.08] active:bg-white/[0.14]"
            >
              <item.icon size={17} style={{ color: ink }} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </span>
                <span className="block break-words text-sm font-medium leading-snug text-white">{item.value}</span>
              </span>
              <ArrowUpRight size={15} className="shrink-0 text-slate-500" aria-hidden="true" />
            </a>
          ))}
        </section>
      )}

      {socials.length > 0 && (
        <section className="mt-7" aria-label="Social profiles">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Elsewhere</h2>
          <div className="space-y-2">
            {socials.map((link) => (
              <a
                key={link.id}
                {...linkProps(link.url)}
                className="flex items-center gap-3 rounded-md border border-white/10 px-4 py-3.5 text-sm font-semibold transition-colors hover:border-white/25 hover:bg-white/[0.06] active:bg-white/[0.12]"
              >
                <link.icon size={17} className="text-slate-300" aria-hidden="true" />
                {link.name}
                <ArrowUpRight size={15} className="ml-auto text-slate-500" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      )}

        <PoweredBy card={card} tone="dark" />
      </div>
    </div>
  )
}
