import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Crop,
  ExternalLink,
  GripVertical,
  ImagePlus,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { Button, Field, Input, Textarea, Select, cx } from './ui'
import { PLATFORM_OPTIONS, getPlatform, basePrefix, toHandle, toUrl, ACCENT_COLORS } from '../data/platforms'
import { TEMPLATES, getTemplate, templateHasBanner, templateIsPro } from '../templates'
import CardView from './CardView'
import ScaledCard from './ScaledCard'
import { downscaleDataUrl } from '../lib/image'
import ImageCropper from './ImageCropper'
import UpgradeDialog from './UpgradeDialog'

const BIO_LIMIT = 200

/* ------------------------------------------------------------ file upload */

function ImageUpload({
  label,
  hint,
  value,
  onChange,
  round = false,
  id,
  wide = false,
  cropAspect,
  cropSafeRatio,
  cropOutputWidth,
  cropQuality,
  /** Must match how the card renders this image, or the preview lies. */
  fit = 'cover',
}) {
  const inputRef = useRef(null)
  // Holds the raw file while the crop dialog is open; null when closed.
  const [cropping, setCropping] = useState(null)

  function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      // Cropped images are encoded on apply. Uncropped ones (the logo) would
      // otherwise be stored exactly as they came off disk — routinely a
      // multi-megabyte PNG in a text column — so they get downscaled here.
      if (cropAspect) setCropping(reader.result)
      else onChange(await downscaleDataUrl(reader.result))
    }
    reader.readAsDataURL(file)
    // Reset so picking the same file twice still fires onChange.
    event.target.value = ''
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-semibold text-navy-900">{label}</span>
      <div className={cx('gap-4', wide ? 'space-y-3' : 'flex items-center')}>
        {/* When the image is cropped to a ratio, the preview uses that same
            ratio — otherwise the box would re-crop it and show you something
            different from what you framed. */}
        <div
          className={cx(
            'grid shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50',
            wide ? 'w-full' : 'h-20 w-20',
            wide && !(cropAspect && value) && 'h-24',
            round && 'rounded-md'
          )}
          style={wide && cropAspect && value ? { aspectRatio: String(cropAspect) } : undefined}
        >
          {value ? (
            <img src={value} alt="" className={cx('h-full w-full', fit === 'contain' ? 'object-contain p-1.5' : 'object-cover')} />
          ) : (
            <Camera size={22} className="text-slate-400" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
              <ImagePlus size={15} aria-hidden="true" />
              {value ? 'Replace' : 'Upload'}
            </Button>
            {value && cropAspect && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setCropping(value)}>
                <Crop size={15} aria-hidden="true" />
                Crop
              </Button>
            )}
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                <X size={15} aria-hidden="true" />
                Remove
              </Button>
            )}
          </div>
          {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
        </div>

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="sr-only"
          aria-label={label}
        />
      </div>

      {cropping && (
        <ImageCropper
          src={cropping}
          aspect={cropAspect}
          safeRatio={cropSafeRatio}
          outputWidth={cropOutputWidth}
          quality={cropQuality}
          title={`Crop ${label.replace(/ \(optional\)| image/gi, '').toLowerCase()}`}
          onCancel={() => setCropping(null)}
          onApply={(cropped) => {
            onChange(cropped)
            setCropping(null)
          }}
        />
      )}
    </div>
  )
}

/* --------------------------------------------------------- step: identity */

export function IdentitySection({ card, update, errors = {} }) {
  const bioLength = (card.bio || '').length

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName" error={errors.fullName} required>
          <Input
            id="fullName"
            value={card.fullName}
            onChange={(e) => update({ fullName: e.target.value })}
            placeholder="John Doe"
            autoComplete="name"
            invalid={Boolean(errors.fullName)}
          />
        </Field>

        <Field label="Professional title" htmlFor="title" error={errors.title} required>
          <Input
            id="title"
            value={card.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Senior Product Designer"
            autoComplete="organization-title"
            invalid={Boolean(errors.title)}
          />
        </Field>
      </div>

      <Field label="Company or studio" htmlFor="company" hint="Optional">
        <Input
          id="company"
          value={card.company}
          onChange={(e) => update({ company: e.target.value })}
          placeholder="Doe Studio"
          autoComplete="organization"
        />
      </Field>

      <Field
        label="Short bio"
        htmlFor="bio"
        error={errors.bio}
        hint={`${bioLength}/${BIO_LIMIT}`}
      >
        <Textarea
          id="bio"
          value={card.bio}
          maxLength={BIO_LIMIT}
          onChange={(e) => update({ bio: e.target.value.slice(0, BIO_LIMIT) })}
          placeholder="One or two sentences about what you do and who you do it for."
          invalid={Boolean(errors.bio)}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <ImageUpload
          id="photo"
          label="Profile photo"
          hint="Cropped to a square, the way it appears on your card."
          value={card.photo}
          onChange={(photo) => update({ photo })}
          round
          cropAspect={1}
          /* Photo-focus paints this full height on desktop, so it needs real
             pixels. The cropper never exceeds what the source actually has,
             so a small upload is stored at its own size rather than upscaled. */
          cropOutputWidth={1800}
          cropQuality={0.92}
        />
        <ImageUpload
          id="logo"
          label="Logo (optional)"
          hint="Shown whole, never cropped, on templates that support branding."
          value={card.logo}
          onChange={(logo) => update({ logo })}
          fit="contain"
        />
      </div>

      {/* Minimal and Photo-focus have nowhere to put a banner, so offering one
          would only produce an upload that never shows up on the card. The
          value is kept, not cleared — switching back restores it. */}
      {templateHasBanner(card.template) ? (
        <ImageUpload
          id="cover"
          label="Banner image (optional)"
          hint="Fills the banner behind your name. Cropped to 3:1 — on a phone the centre 2:1 is visible, so keep the subject there. Without one, the banner uses your accent colour."
          value={card.cover}
          onChange={(cover) => update({ cover })}
          wide
          cropAspect={3}
          cropSafeRatio={2}
        />
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-5 py-4">
          <p className="text-sm font-semibold text-navy-900">No banner on this template</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {getTemplate(card.template).name} is built without a banner image. Pick Executive, Split or Dark Pro
            in <span className="font-semibold text-navy-800">Design</span> to add one — your logo still shows here.
          </p>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------- step: contact */

export function ContactSection({ card, update, errors = {} }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Field label="Phone number" htmlFor="phone" error={errors.phone}>
        <Input
          id="phone"
          type="tel"
          value={card.phone}
          onChange={(e) => update({ phone: e.target.value })}
          placeholder="+1 415 555 0134"
          autoComplete="tel"
          invalid={Boolean(errors.phone)}
        />
      </Field>

      <Field label="Email address" htmlFor="cardEmail" error={errors.email} required>
        <Input
          id="cardEmail"
          type="email"
          value={card.email}
          onChange={(e) => update({ email: e.target.value })}
          placeholder="you@company.com"
          autoComplete="email"
          invalid={Boolean(errors.email)}
        />
      </Field>

      <Field label="WhatsApp number" htmlFor="whatsapp" hint="Optional">
        <Input
          id="whatsapp"
          type="tel"
          value={card.whatsapp}
          onChange={(e) => update({ whatsapp: e.target.value })}
          placeholder="+14155550134"
        />
      </Field>

      <Field label="City & country" htmlFor="location" hint="Optional">
        <Input
          id="location"
          value={card.location}
          onChange={(e) => update({ location: e.target.value })}
          placeholder="San Francisco, USA"
          autoComplete="address-level2"
        />
      </Field>

      <Field label="Website" htmlFor="website" error={errors.website} hint="Optional" className="sm:col-span-2">
        <Input
          id="website"
          type="url"
          value={card.website}
          onChange={(e) => update({ website: e.target.value })}
          placeholder="https://yoursite.com"
          autoComplete="url"
          invalid={Boolean(errors.website)}
        />
      </Field>
    </div>
  )
}

/* ------------------------------------------------------------ step: links */

let linkId = 100

/** How many links a free card may carry. Pro is unlimited. */
export const FREE_LINK_LIMIT = 4

export function LinksSection({ card, update, pro = true }) {
  const links = card.links || []
  const [upgrading, setUpgrading] = useState(false)

  // Existing links are never taken away — a card that came down from Pro keeps
  // what it has, it just can't grow until the plan does.
  const atLimit = !pro && links.length >= FREE_LINK_LIMIT

  function addLink() {
    if (atLimit) return setUpgrading(true)
    update({ links: [...links, { id: `n${++linkId}`, platform: 'instagram', url: '' }] })
  }

  function patchLink(id, patch) {
    update({ links: links.map((link) => (link.id === id ? { ...link, ...patch } : link)) })
  }

  function removeLink(id) {
    update({ links: links.filter((link) => link.id !== id) })
  }

  function move(index, direction) {
    const target = index + direction
    if (target < 0 || target >= links.length) return
    const next = [...links]
    ;[next[index], next[target]] = [next[target], next[index]]
    update({ links: next })
  }

  return (
    <div className="space-y-4">
      {links.length === 0 && (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-navy-900">No links yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Add the profiles you want people to reach — Instagram, LinkedIn, Fiverr, your portfolio, anything.
          </p>
          <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={addLink}>
            <Plus size={15} aria-hidden="true" />
            Add your first link
          </Button>
        </div>
      )}

      <ul className="space-y-3">
        {links.map((link, index) => {
          const platform = getPlatform(link.platform)
          return (
            <li
              key={link.id}
              className="rounded-md border border-slate-200 bg-white p-3 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-2 hidden text-slate-300 sm:block"
                  aria-hidden="true"
                  title="Use the arrows to reorder"
                >
                  <GripVertical size={16} />
                </span>

                <span
                  className="mt-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-md"
                  style={{ backgroundColor: `${platform.color}14`, color: platform.color }}
                  aria-hidden="true"
                >
                  <platform.icon size={17} />
                </span>

                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[170px_1fr]">
                  <Select
                    value={link.platform}
                    onChange={(e) => {
                      // Same person, different network: keep the handle and
                      // rebuild the URL on the new base.
                      const next = e.target.value
                      patchLink(link.id, {
                        platform: next,
                        url: toUrl(next, toHandle(link.platform, link.url)),
                      })
                    }}
                    aria-label={`Platform for link ${index + 1}`}
                  >
                    {PLATFORM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>

                  <div className="space-y-2">
                    {platform.base ? (
                      /* The base URL is fixed, so it is printed rather than typed —
                         the field only ever holds the part that is theirs. */
                      <div
                        className={cx(
                          'flex h-11 w-full items-stretch overflow-hidden rounded-md border border-slate-300 bg-white',
                          'transition-colors focus-within:border-accent-500 focus-within:ring-2 focus-within:ring-accent-500/25'
                        )}
                      >
                        <span
                          className="grid shrink-0 place-items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
                          aria-hidden="true"
                        >
                          {basePrefix(link.platform)}
                        </span>
                        <input
                          value={toHandle(link.platform, link.url)}
                          onChange={(e) => patchLink(link.id, { url: toUrl(link.platform, e.target.value) })}
                          placeholder={platform.placeholder}
                          aria-label={`${platform.name} username for link ${index + 1}`}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-navy-900 placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <Input
                        type="url"
                        value={link.url}
                        onChange={(e) => patchLink(link.id, { url: e.target.value })}
                        placeholder={platform.placeholder}
                        aria-label={`URL for link ${index + 1}`}
                      />
                    )}
                    {link.platform === 'custom' && (
                      <Input
                        value={link.label || ''}
                        onChange={(e) => patchLink(link.id, { label: e.target.value })}
                        placeholder="Button label, e.g. “Download my CV”"
                        aria-label={`Label for link ${index + 1}`}
                      />
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${platform.name} link up`}
                    className="grid h-9 w-9 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-900 disabled:opacity-35 disabled:hover:bg-transparent"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === links.length - 1}
                    aria-label={`Move ${platform.name} link down`}
                    className="grid h-9 w-9 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-900 disabled:opacity-35 disabled:hover:bg-transparent"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLink(link.id)}
                    aria-label={`Delete ${platform.name} link`}
                    className="grid h-9 w-9 place-items-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {links.length > 0 &&
        (atLimit ? (
          // At the cap the button stops being an add button: it says what the
          // limit is and offers the way past it.
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => setUpgrading(true)}>
              <Sparkles size={15} aria-hidden="true" />
              Go Pro to add more links
            </Button>
            <p className="text-sm text-slate-500">
              Free cards carry {FREE_LINK_LIMIT} links. Pro removes the limit.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={addLink}>
              <Plus size={15} aria-hidden="true" />
              Add another link
            </Button>
            {!pro && (
              <p className="text-sm text-slate-500">
                {links.length} of {FREE_LINK_LIMIT} links used
              </p>
            )}
          </div>
        ))}

      {upgrading && (
        <UpgradeDialog
          reason={`Free cards carry ${FREE_LINK_LIMIT} links. Pro removes the limit.`}
          onClose={() => setUpgrading(false)}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------- step: templates */

/**
 * `confirm` splits picking from saving: the thumbnails set a pending choice
 * and nothing changes on the live card until Apply. Onboarding leaves it off,
 * where a pick is part of a form the user saves at the end anyway.
 */
export function TemplateSection({ card, update, confirm = false, onPendingChange, pro = true }) {
  const [pending, setPending] = useState(card.template)
  const [applying, setApplying] = useState(false)
  const [upgrading, setUpgrading] = useState(false)

  // Follow the saved card: clears the pick after Apply, and after a save made
  // anywhere else (the editor's Design tab writes the same field).
  useEffect(() => {
    setPending(card.template)
    onPendingChange?.(card.template)
  }, [card.template]) // eslint-disable-line react-hooks/exhaustive-deps

  // The saved template is the truth; a save from anywhere else resets the pick.
  const chosen = confirm ? pending : card.template
  const dirty = chosen !== card.template
  // A locked pick can still be looked at — it just can't be applied.
  const lockedPick = !pro && templateIsPro(chosen)

  function choose(id) {
    // Locked templates stay pickable on purpose: picking one previews it, which
    // is the whole argument for upgrading. Apply is what refuses.
    if (!confirm) {
      // No Apply button here to refuse, so the click has to say why itself —
      // silently ignoring it just reads as a broken tile.
      if (!pro && templateIsPro(id)) return setUpgrading(true)
      return update({ template: id })
    }
    setPending(id)
    // Lets the host page preview the pick before it is applied.
    onPendingChange?.(id)
  }

  async function apply() {
    setApplying(true)
    try {
      await update({ template: pending })
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-navy-900">Card template</h3>
        <p className="mt-1 text-sm text-slate-500">Your link stays the same whichever design you pick.</p>

        <div
          role="radiogroup"
          aria-label="Card template"
          className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-5"
        >
          {TEMPLATES.map((template) => {
            const selected = chosen === template.id
            const locked = !pro && template.pro
            return (
              <button
                key={template.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(template.id)}
                title={locked ? `${template.name} is part of the Pro plan` : undefined}
                className={cx(
                  'group relative rounded-md border-2 bg-white p-2 text-left transition-all',
                  selected
                    ? 'border-accent-500 shadow-[var(--shadow-card)]'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                {/* Scaled, not reflowed — a thumbnail must match the real card.
                    A fixed aspect ratio rather than a fixed height: the card is
                    scaled to the tile's width, so height and scale rise
                    together and every tile shows the same slice of card — the
                    whole intro block — whether the grid is 3 or 5 columns. */}
                <span className="relative block aspect-[5/8] w-full overflow-hidden rounded-xs border border-slate-100 bg-white">
                  {/* The card is taller than the tile whatever the ratio, so
                      the bottom edge is softened rather than left as a hard cut
                      through a half-drawn row. The gradient only reaches 35%
                      transparency, so it reads as a soft edge and doesn't wash
                      out the content it covers.

                      `h-full`: the mask has to be measured against the tile,
                      not against the full height of the card inside it. */}
                  <span
                    className={cx(
                      'block h-full overflow-hidden [-webkit-mask-image:linear-gradient(180deg,#000_90%,rgba(0,0,0,0.35)_100%)] [mask-image:linear-gradient(180deg,#000_90%,rgba(0,0,0,0.35)_100%)]',
                      // Desaturated, not hidden: the design still has to sell
                      // the upgrade, so it stays legible behind the lock.
                      locked && 'opacity-60 grayscale'
                    )}
                  >
                    <ScaledCard as="span">
                      <CardView card={{ ...card, template: template.id }} interactive={false} />
                    </ScaledCard>
                  </span>

                  {locked && (
                    <span
                      className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-md bg-navy-900/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm"
                      aria-hidden="true"
                    >
                      <Lock size={12} />
                      Pro
                    </span>
                  )}
                </span>
                <span className="mt-2 flex items-center justify-between gap-2 px-1 pb-1">
                  <span className="text-xs font-bold text-navy-900">{template.name}</span>
                  {selected ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-accent-600">
                      Selected
                    </span>
                  ) : locked ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Pro
                    </span>
                  ) : (
                    // While a pick is pending, the live card is still on this
                    // one — worth saying, or Apply looks like it did nothing.
                    dirty &&
                    template.id === card.template && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Current
                      </span>
                    )
                  )}
                </span>
              </button>
            )
          })}
        </div>

      </div>

      <div>
        <h3 className="text-sm font-semibold text-navy-900">Accent colour</h3>
        <p className="mt-1 text-sm text-slate-500">Used for buttons, icons and highlights on your card.</p>

        <div role="radiogroup" aria-label="Accent colour" className="mt-4 flex flex-wrap gap-2.5">
          {ACCENT_COLORS.map((color) => {
            const selected = card.accent === color.value
            return (
              <button
                key={color.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={color.name}
                title={color.name}
                onClick={() => update({ accent: color.value })}
                className={cx(
                  'h-10 w-10 rounded-md border-2 transition-transform',
                  selected ? 'border-navy-900 scale-105' : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: color.value }}
              />
            )
          })}
        </div>
      </div>

      {/* Foot of the panel: the pick above is only a pick until Apply. */}
      {confirm && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
          {/* Only speaks up when there is something to say — a pending pick. */}
          {lockedPick ? (
            <p className="mr-auto text-sm text-slate-500">
              {getTemplate(chosen).name} is a Pro design. Preview it as much as you like — applying it
              needs the Pro plan.
            </p>
          ) : (
            dirty && (
              <p className="mr-auto text-sm text-slate-500">
                Not applied yet — your card still shows the current design.
              </p>
            )
          )}
          {/* Opens the real public card, with the pending template passed
              through so the tab shows what Apply would give you. */}
          <Button
            as="a"
            variant="secondary"
            href={`/${card.username}${dirty ? `?template=${chosen}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={16} aria-hidden="true" />
            Show preview
          </Button>
          {/* A locked pick can't be applied, so the primary action becomes the
              way to unlock it rather than a button that refuses. */}
          {lockedPick ? (
            <Button type="button" onClick={() => setUpgrading(true)}>
              <Sparkles size={16} aria-hidden="true" />
              Go Pro
            </Button>
          ) : (
            <Button type="button" onClick={apply} loading={applying} disabled={!dirty}>
              Apply
            </Button>
          )}
        </div>
      )}

      {upgrading && (
        <UpgradeDialog
          reason={
            templateIsPro(chosen)
              ? `${getTemplate(chosen).name} is part of the Pro plan.`
              : 'That template is part of the Pro plan.'
          }
          onClose={() => setUpgrading(false)}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------- validation */

export function validateCard(card, step) {
  const errors = {}
  if (step === 'identity' || step === 'all') {
    if (!card.fullName?.trim()) errors.fullName = 'Your name appears at the top of the card.'
    if (!card.title?.trim()) errors.title = 'Add the title people should know you by.'
    if ((card.bio || '').length > BIO_LIMIT) errors.bio = `Keep your bio under ${BIO_LIMIT} characters.`
  }
  if (step === 'contact' || step === 'all') {
    if (!card.email?.trim()) errors.email = 'An email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(card.email)) errors.email = 'Enter a valid email address.'
    if (card.website && !/^https?:\/\/.+\..+/.test(card.website))
      errors.website = 'Include the full URL, starting with https://'
  }
  return errors
}
