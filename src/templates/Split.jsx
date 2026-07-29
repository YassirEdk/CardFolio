import { Avatar, ActionRow, PoweredBy, LogoMark, contactItems, socialItems, linkProps } from './shared'
import { useT } from '../lib/i18n'
import { MapPin } from 'lucide-react'

/**
 * Split — a solid accent top half against a white lower half.
 *
 * A banner photo replaces the flat accent fill, tinted with the accent so the
 * header still reads as the card's colour rather than as someone's snapshot.
 */
export default function Split({ card, onSaveContact, onShare }) {
  const accent = card.accent || '#2E6BE6'
  const t = useT()
  const contacts = contactItems(card, t)
  const socials = socialItems(card)

  return (
    <div className="min-h-full bg-white">
      <header
        className="relative overflow-hidden px-6 pb-8 pt-[calc(2.75rem+var(--phone-safe-top,0px))] text-center text-white"
        style={{ backgroundColor: accent }}
      >
        {card.cover && (
          <>
            <img src={card.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div
              className="absolute inset-0"
              // 0x59 ≈ 35% at the top, 0x99 ≈ 60% behind the text below.
              style={{ background: `linear-gradient(180deg, ${accent}59 0%, ${accent}99 100%)` }}
              aria-hidden="true"
            />
          </>
        )}
        {/* Positioned so the cover scrim above can never paint over the text. */}
        <div className="relative">
          <div className="absolute right-0 top-0">
            {/* Narrower cap than the other templates: the portrait is centred
                directly below, and a wider plate reaches across into it. */}
            <LogoMark
              card={card}
              height={36}
              maxWidth={140}
              tone={card.logoPlate === false ? 'plain' : card.cover ? 'light' : 'dark'}
            />
          </div>
          <div className="flex justify-center">
            <Avatar card={card} size={88} accent="#ffffff33" className="border-4 border-white/25" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{card.fullName || 'Your name'}</h1>
          <p className="mt-1 text-sm font-medium text-white/85">{card.title || 'Your professional title'}</p>
          {card.company && <p className="mt-0.5 text-sm text-white/70">{card.company}</p>}
          {card.location && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 text-xs font-medium">
              <MapPin size={12} aria-hidden="true" />
              {card.location}
            </p>
          )}
        </div>
      </header>

      <div className="px-6 pt-6">
        {card.bio && (
          <p className="border-l-2 pl-3.5 text-sm leading-relaxed text-slate-600" style={{ borderColor: accent }}>
            {card.bio}
          </p>
        )}

        <ActionRow onSaveContact={onSaveContact} onShare={onShare} accent={accent} className="mt-6" />

        {contacts.length > 0 && (
          <section className="mt-7 space-y-2.5" aria-label="Contact details">
            {contacts.map((item) => (
              <a
                key={item.key}
                {...linkProps(item.href, item.external)}
                className="flex items-center gap-3.5 rounded-md bg-slate-50 px-4 py-3.5 transition-colors hover:bg-slate-100 active:bg-slate-200"
              >
                <item.icon size={18} style={{ color: accent }} className="shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {item.label}
                  </span>
                  <span className="block break-words text-sm font-medium leading-snug text-navy-900">
                    {item.value}
                  </span>
                </span>
              </a>
            ))}
          </section>
        )}

        {socials.length > 0 && (
          <section className="mt-7" aria-label="Social profiles">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{t('card.platforms')}</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {socials.map((link) => (
                <a
                  key={link.id}
                  {...linkProps(link.url)}
                  className="flex flex-col items-center gap-2 rounded-md border border-slate-200 px-2 py-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] active:bg-slate-50"
                >
                  <link.icon size={20} style={{ color: link.brand }} aria-hidden="true" />
                  <span className="w-full truncate text-center text-[11px] font-semibold text-slate-600">
                    {link.name}
                  </span>
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
