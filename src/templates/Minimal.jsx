import { ChevronRight } from 'lucide-react'
import { Avatar, ActionRow, PoweredBy, LogoMark, contactItems, socialItems, LocationLine, linkProps } from './shared'

/**
 * Minimal — white, airy, generous type. The safe default.
 *
 * No banner by design: the white space is the design. A logo is welcome, but
 * it sits quietly above the portrait rather than on a coloured band.
 */
export default function Minimal({ card, onSaveContact, onShare }) {
  const accent = card.accent || '#2E6BE6'
  const contacts = contactItems(card)
  const socials = socialItems(card)

  return (
    <div className="min-h-full bg-white px-6 pt-[calc(3rem+var(--phone-safe-top,0px))]">
      <header className="text-center">
        {card.logo && (
          <div className="mb-7 flex justify-center">
            <LogoMark card={card} height={30} />
          </div>
        )}
        <div className="flex justify-center">
          <Avatar card={card} size={92} accent={accent} />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-navy-900">
          {card.fullName || 'Your name'}
        </h1>
        <p className="mt-1 text-sm font-semibold" style={{ color: accent }}>
          {card.title || 'Your professional title'}
        </p>
        {card.company && <p className="mt-0.5 text-sm text-slate-500">{card.company}</p>}
        <LocationLine card={card} className="mt-3 text-slate-500" />
        {card.bio && <p className="mt-4 text-sm leading-relaxed text-slate-600">{card.bio}</p>}
      </header>

      <div className="mt-7">
        <ActionRow onSaveContact={onSaveContact} onShare={onShare} accent={accent} />
      </div>

      {contacts.length > 0 && (
        <section className="mt-8" aria-label="Contact details">
          <ul className="divide-y divide-slate-100 border-y border-slate-100">
            {contacts.map((item) => (
              <li key={item.key}>
                <a
                  {...linkProps(item.href, item.external)}
                  className="flex items-center gap-3.5 py-3.5 transition-colors hover:bg-slate-50 active:bg-slate-100"
                >
                  <item.icon size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {item.label}
                    </span>
                    <span className="block break-words text-sm font-medium leading-snug text-navy-900">
                      {item.value}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-slate-300" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {socials.length > 0 && (
        <section className="mt-8" aria-label="Social profiles">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Find me on</h2>
          <div className="space-y-2.5">
            {socials.map((link) => (
              <a
                key={link.id}
                {...linkProps(link.url)}
                className="flex items-center gap-3 rounded-md border border-slate-200 px-4 py-3.5 text-sm font-semibold text-navy-900 transition-all hover:border-slate-300 hover:shadow-[var(--shadow-card)] active:bg-slate-50"
              >
                <link.icon size={18} style={{ color: link.brand }} aria-hidden="true" />
                {link.name}
                <ChevronRight size={16} className="ml-auto text-slate-300" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      )}

      <PoweredBy card={card} />
    </div>
  )
}
