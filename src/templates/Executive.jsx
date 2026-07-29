import { ArrowUpRight, MapPin } from 'lucide-react'
import { Avatar, ActionRow, PoweredBy, LogoMark, contactItems, socialItems, linkProps } from './shared'
import { useT } from '../lib/i18n'
import { cx } from '../components/ui'

/**
 * Contact tiles size themselves to their content: short values (a phone
 * number) sit two-up, long ones (email, website) take the full row and lay
 * out horizontally — at half-width an email would break mid-word.
 *
 * Narrow tiles are then paired off, and any that can't find a partner in its
 * own row is widened. Otherwise a lone phone number followed by a full-width
 * email leaves half a row of empty grid beside it.
 */
function layoutContacts(items) {
  const laid = items.map((item) => ({
    item,
    wide: String(item.value).length > 16,
  }))

  let unpaired = null
  for (const entry of laid) {
    if (entry.wide) {
      // A wide tile starts its own row, so anything still waiting for a
      // partner never gets one.
      if (unpaired) unpaired.wide = true
      unpaired = null
    } else if (unpaired) {
      unpaired = null // the pair is complete
    } else {
      unpaired = entry
    }
  }
  if (unpaired) unpaired.wide = true

  return laid
}

/** Section heading with a rule running out to the edge — letterhead stationery. */
function SectionRule({ children }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
      {children}
      <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
    </h2>
  )
}

function ContactTile({ item, accent, wide }) {
  const chip = (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
      style={{ backgroundColor: `${accent}14`, color: accent }}
      aria-hidden="true"
    >
      <item.icon size={16} />
    </span>
  )

  const label = (
    <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
      {item.label}
    </span>
  )

  return (
    <a
      {...linkProps(item.href, item.external)}
      className={cx(
        'group relative rounded-md border border-slate-200 bg-white p-3.5 transition-all',
        'hover:-translate-y-px hover:border-slate-300 hover:shadow-[var(--shadow-card)] active:bg-slate-50',
        wide && 'col-span-2 flex items-center gap-3.5'
      )}
    >
      {chip}
      <span className={cx('min-w-0', wide ? 'flex-1' : 'mt-2.5 block')}>
        {label}
        {/* Wide tiles have room to truncate gracefully. Narrow ones wrap
            instead — only short, space-separated values land there, so they
            break at spaces and never mid-word the way an email would. */}
        <span
          className={cx(
            'block font-semibold text-navy-900',
            wide ? 'truncate text-[13px] leading-snug' : 'break-words text-[13px] leading-tight'
          )}
        >
          {item.value}
        </span>
      </span>
      <ArrowUpRight
        size={13}
        className={cx(
          'shrink-0 text-slate-300 transition-colors group-hover:text-slate-500',
          !wide && 'absolute right-3 top-3'
        )}
        aria-hidden="true"
      />
    </a>
  )
}

/**
 * Executive — a letterhead banner over a raised white card. The most formal
 * template: corporate hierarchy, generous rules, no decoration for its own sake.
 */
export default function Executive({ card, onSaveContact, onShare }) {
  const accent = card.accent || '#2E6BE6'
  const t = useT()
  const contacts = contactItems(card, t)
  const socials = socialItems(card)

  return (
    <div className="min-h-full bg-slate-100 pb-1">
      {/* One sheet, full-bleed: the letterhead is the card's own top band, and
          both run edge to edge rather than sitting on a margin of backdrop.
          The band absorbs the notch inset so the cover fills it. */}
      <article className="overflow-hidden border-b border-slate-200 bg-white">
        <header className="relative h-[calc(7rem+var(--phone-safe-top,0px))] overflow-hidden bg-navy-900">
          {card.cover ? (
            <>
              <img src={card.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
              {/* Scrim keeps the logo badge and portrait border legible over any photo. */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(180deg, rgba(9,23,41,0.35) 0%, rgba(9,23,41,0.65) 100%)',
                }}
                aria-hidden="true"
              />
            </>
          ) : (
            <>
              {/* Base: lit at the top-left, deepening toward the card below. */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(158deg,#17325a 0%,#0f2544 52%,#091729 100%)',
                }}
                aria-hidden="true"
              />
              {/* Accent glow, thrown in from the top-right corner. */}
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(95% 120% at 90% -18%, ${accent}6B 0%, transparent 58%)`,
                }}
                aria-hidden="true"
              />
              {/* A pool of light so the portrait sits in something, not on it. */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(42% 68% at 20% 38%, rgba(255,255,255,0.11) 0%, transparent 72%)',
                }}
                aria-hidden="true"
              />
              {/* Pin-stripes that fade out before they reach the card edge. */}
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage: 'repeating-linear-gradient(135deg,#fff 0 1px,transparent 1px 14px)',
                  maskImage: 'linear-gradient(180deg,#000 0%,#000 45%,transparent 88%)',
                  WebkitMaskImage: 'linear-gradient(180deg,#000 0%,#000 45%,transparent 88%)',
                }}
                aria-hidden="true"
              />
              {/* Vignette along the bottom edge to seat the white card. */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(180deg,transparent 58%,rgba(6,17,31,0.55) 100%)',
                }}
                aria-hidden="true"
              />
            </>
          )}

          {card.logo ? (
            // LogoMark rather than a bare <img>: the letterhead is dark or a
            // photo, so the logo needs the same plate the other templates give
            // it — and the same switch to turn that plate off.
            <div className="absolute right-5 top-[calc(1.25rem+var(--phone-safe-top,0px))]">
              <LogoMark
                card={card}
                height={32}
                maxWidth={168}
                tone={card.logoPlate === false ? 'plain' : 'light'}
              />
            </div>
          ) : (
            card.company && (
              <span className="absolute right-5 top-[calc(1.25rem+var(--phone-safe-top,0px))] inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/80 backdrop-blur-sm">
                <span
                  className="h-1.5 w-1.5 rounded-md"
                  style={{ backgroundColor: accent }}
                  aria-hidden="true"
                />
                {card.company}
              </span>
            )
          )}

          {/* Accent rule seating the band on the sheet — the one line of colour
            the template allows itself. */}
          <span
            className="absolute inset-x-0 bottom-0 h-[3px]"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
        </header>

        {/* `relative` is load-bearing: the band's artwork above is absolutely
              positioned, and positioned elements paint over the content of a
              static sibling — the portrait would be painted on. */}
        <div className="relative px-5 pb-5">
          {/* Portrait straddles the rule, with the name set against it. */}
          <div className="-mt-10 flex items-end gap-3.5">
            <Avatar
              card={card}
              size={78}
              accent={accent}
              className="shrink-0 border-4 border-white shadow-[0_10px_28px_rgba(9,23,41,0.28)]"
            />
            {card.company && (
              <span className="min-w-0 truncate pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {card.company}
              </span>
            )}
          </div>
          <h1 className="mt-3.5 text-[1.4rem] font-bold leading-tight tracking-tight text-navy-900">
            {card.fullName || 'Your name'}
          </h1>
          <p className="mt-1 text-sm font-semibold" style={{ color: accent }}>
            {card.title || 'Your professional title'}
          </p>

          {/* Company has moved up beside the portrait, so this rail carries
                the location alone. */}
          {card.location && (
            <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500">
              {card.location && (
                <div className="flex min-w-0 items-center gap-1.5">
                  <dt className="sr-only">Location</dt>
                  <MapPin size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
                  <dd className="truncate">{card.location}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {card.bio && (
          <p className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-sm leading-relaxed text-slate-600">
            {card.bio}
          </p>
        )}
      </article>

      {/* Everything below the sheet keeps its gutters — the tiles are separate
          objects on the backdrop, which is what the letterhead is set against. */}
      <div className="px-5 pt-5">
        <ActionRow onSaveContact={onSaveContact} onShare={onShare} accent={accent} />

        {contacts.length > 0 && (
          <section className="mt-6" aria-label="Contact details">
            <SectionRule>{t('card.contact')}</SectionRule>
            <div className="grid grid-cols-2 gap-2.5">
              {layoutContacts(contacts).map(({ item, wide }) => (
                <ContactTile key={item.key} item={item} accent={accent} wide={wide} />
              ))}
            </div>
          </section>
        )}

        {socials.length > 0 && (
          <section className="mt-6" aria-label="Social profiles">
            <SectionRule>{t('card.profiles')}</SectionRule>
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
              {socials.map((link, index) => (
                <a
                  key={link.id}
                  {...linkProps(link.url)}
                  className={`group flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-navy-900 transition-colors hover:bg-slate-50 active:bg-slate-100 ${
                    index > 0 ? 'border-t border-slate-100' : ''
                  }`}
                >
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
                    style={{
                      backgroundColor: `${link.brand}14`,
                      color: link.brand,
                    }}
                    aria-hidden="true"
                  >
                    <link.icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{link.name}</span>
                  <ArrowUpRight
                    size={15}
                    className="shrink-0 text-slate-300 transition-colors group-hover:text-slate-500"
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
