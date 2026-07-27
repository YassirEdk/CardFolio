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
import { Button, Checkbox, Field, Input, Textarea, Select, cx } from './ui'
import { PLATFORM_OPTIONS, getPlatform, basePrefix, toHandle, toUrl, ACCENT_COLORS } from '../data/platforms'
import { TEMPLATES, getTemplate, templateHasBanner, templateIsPro } from '../templates'
import CardView from './CardView'
import ScaledCard from './ScaledCard'
import { downscaleDataUrl } from '../lib/image'
import { splitPhone, joinPhone, formatNational } from '../lib/phone'
import DialCodeSelect from './DialCodeSelect'
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

  /**
   * The image as uploaded, kept so Crop reopens on the whole picture rather
   * than on the last crop of it — otherwise each visit crops the crop, and the
   * parts you framed out are gone for good.
   *
   * It lives in memory only: the card stores the cropped result, so after a
   * reload Crop falls back to that. Keeping originals across sessions means
   * storing a second copy of every image on the server.
   */
  const originalRef = useRef(null)
  const transformRef = useRef(null)

  function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      originalRef.current = reader.result
      // A new file starts from the middle, not from the last file's framing.
      transformRef.current = null
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
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCropping(originalRef.current || value)}
              >
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
          // Only resume the framing when reopening the same original — a
          // crop of a different image would land somewhere arbitrary.
          initialTransform={cropping === originalRef.current ? transformRef.current : null}
          onCancel={() => setCropping(null)}
          onApply={(cropped, transform) => {
            transformRef.current = transform
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
        <div>
          <ImageUpload
            id="logo"
            label="Logo (optional)"
            hint="Shown whole, never cropped, on templates that support branding."
            value={card.logo}
            onChange={(logo) => update({ logo })}
            fit="contain"
          />

        </div>
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

/**
 * A dial-code picker beside the national number, stored as one string
 * ("+1 415-5550134"). A native <select> rather than a custom listbox: it
 * scrolls, filters by typing and behaves like the platform expects, on a phone
 * as well as a desktop.
 */
function PhoneField({ id, label, hint, error, value, onChange, autoComplete, disabled = false, required = false }) {
  const parsed = splitPhone(value)

  /**
   * The chosen country is held here as well as in the value, because an empty
   * number has nowhere to keep it: `joinPhone` returns '' when there are no
   * digits, and that parses back to the default code — so picking a country
   * before typing appeared to do nothing at all.
   *
   * The stored value stays empty until there are digits; this only decides
   * what the button shows.
   */
  const [dial, setDial] = useState(parsed.dial)

  // Follow the card when it carries a code of its own (loaded, or edited
  // elsewhere). A value without digits can't, so the local choice stands.
  useEffect(() => {
    if (parsed.national) setDial(parsed.dial)
  }, [parsed.dial, parsed.national])

  const national = parsed.national

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} required={required}>
      {/* min-w-0 on the input wrapper: a flex item defaults to its intrinsic
          minimum, which for a text input is wide enough to push the row over
          and squeeze the field. */}
      <div className="flex gap-2">
        <DialCodeSelect
          disabled={disabled}
          value={dial}
          onChange={(next) => {
            setDial(next)
            // Only rewrite the card when there is a number to rewrite.
            if (national) onChange(joinPhone(next, national))
          }}
        />
        <div className="min-w-0 flex-1">
          <Input
            id={id}
            type="tel"
            value={formatNational(national)}
            onChange={(e) => onChange(joinPhone(dial, e.target.value))}
            placeholder="415-5550134"
            autoComplete={autoComplete}
            disabled={disabled}
            invalid={Boolean(error)}
          />
        </div>
      </div>
    </Field>
  )
}

export function ContactSection({ card, update, errors = {} }) {
  /**
   * Most people use one number for both, so WhatsApp follows the phone field
   * until this is ticked. Seeded from the card: a saved WhatsApp number that
   * differs from the phone means the box was ticked when it was saved.
   */
  const [separateWhatsapp, setSeparateWhatsapp] = useState(
    () => Boolean(card.whatsapp) && card.whatsapp !== card.phone
  )

  function setPhone(phone) {
    // While the numbers are linked, one edit writes both.
    update(separateWhatsapp ? { phone } : { phone, whatsapp: phone })
  }

  function toggleSeparate(on) {
    setSeparateWhatsapp(on)
    // Unticking re-links: whatever WhatsApp held is replaced by the phone.
    if (!on) update({ whatsapp: card.phone })
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <PhoneField
        id="phone"
        label="Phone number"
        error={errors.phone}
        value={card.phone}
        onChange={setPhone}
        autoComplete="tel"
        required
      />

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

      {/* The checkbox belongs to the phone row above, so it spans the grid and
          sits tight under it — pulled up out of the row gap. The field it
          reveals is a normal grid cell, which keeps the columns paired
          (WhatsApp beside Location) instead of leaving a hole. */}
      <div className="-mt-2 sm:col-span-2">
        <Checkbox
          id="separate-whatsapp"
          checked={separateWhatsapp}
          onChange={toggleSeparate}
          label="I use a different number for WhatsApp"
          hint={
            separateWhatsapp
              ? 'Shown as the WhatsApp button on your card.'
              : 'WhatsApp uses the phone number above.'
          }
        />
      </div>

      {/* Always visible, so the card's WhatsApp number is never a mystery —
          but locked to the phone number until the box above is ticked. */}
      <PhoneField
        id="whatsapp"
        label="WhatsApp number"
        value={card.whatsapp}
        onChange={(whatsapp) => update({ whatsapp })}
        disabled={!separateWhatsapp}
      />

      <Field label="City & country" htmlFor="location" hint="Optional">
        <Input
          id="location"
          value={card.location}
          onChange={(e) => update({ location: e.target.value })}
          placeholder="San Francisco, USA"
          autoComplete="address-level2"
        />
      </Field>

      <Field
        label="Website"
        htmlFor="website"
        error={errors.website}
        hint="Optional"
        className="sm:col-span-2"
      >
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

/** The row shown when a card has no links yet — a real row, not a prompt. */
const BLANK_LINK = { id: 'blank', platform: 'instagram', url: '' }

export function LinksSection({ card, update, pro = true }) {
  const links = card.links || []
  const [upgrading, setUpgrading] = useState(false)

  /**
   * An empty card still shows one editable row. The old empty state made you
   * click "Add your first link" before you could type anything — a step that
   * only ever had one answer.
   *
   * The blank row is display-only until it is touched: nothing is written to
   * the card, so the form isn't dirty and no empty link gets saved.
   */
  const rows = links.length ? links : [BLANK_LINK]

  // Existing links are never taken away — a card that came down from Pro keeps
  // what it has, it just can't grow until the plan does.
  const atLimit = !pro && links.length >= FREE_LINK_LIMIT

  function addLink() {
    if (atLimit) return setUpgrading(true)
    update({ links: [...links, { id: `n${++linkId}`, platform: 'instagram', url: '' }] })
  }

  function patchLink(id, patch) {
    // Editing the blank row is what creates the first real link.
    if (id === BLANK_LINK.id) {
      return update({ links: [{ ...BLANK_LINK, ...patch, id: `n${++linkId}` }] })
    }
    update({ links: links.map((link) => (link.id === id ? { ...link, ...patch } : link)) })
  }

  function removeLink(id) {
    if (id === BLANK_LINK.id) return
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
      <ul className="space-y-3">
        {rows.map((link, index) => {
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
                    disabled={index === rows.length - 1}
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

      {atLimit ? (
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
            {links.length ? 'Add another link' : 'Add a second link'}
          </Button>
          {!pro && (
            <p className="text-sm text-slate-500">
              {links.length} of {FREE_LINK_LIMIT} links used
            </p>
          )}
        </div>
      )}

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

      {/* Only Photo-focus, Dark Pro and Split put the logo over artwork, so
          the plate is the only thing keeping a dark logo legible there — and
          the only thing in the way of one drawn for dark surfaces. It lives
          here with the other design settings, and appears once there is a
          logo for it to sit behind. */}
      {card.logo && (
        <div>
          <h3 className="text-sm font-semibold text-navy-900">Logo</h3>
          <div className="mt-4">
            <Checkbox
              id="logo-plate"
              checked={card.logoPlate !== false}
              onChange={(logoPlate) => update({ logoPlate })}
              label="Add a plate behind my logo"
              hint="Turn this off if your logo already works on a dark background."
            />
          </div>
        </div>
      )}

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
    // Digits only: the field stores a formatted string, and a country code on
    // its own ("+212") is not a number anyone can call.
    const phoneDigits = String(card.phone ?? '').replace(/\D/g, '')
    if (!phoneDigits) errors.phone = 'A phone number is required.'
    else if (phoneDigits.length < 6) errors.phone = 'That number looks too short.'

    if (!card.email?.trim()) errors.email = 'An email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(card.email)) errors.email = 'Enter a valid email address.'
    if (card.website && !/^https?:\/\/.+\..+/.test(card.website))
      errors.website = 'Include the full URL, starting with https://'
  }
  return errors
}
