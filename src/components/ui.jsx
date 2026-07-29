import { forwardRef, useId } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Loader2, Lock } from 'lucide-react'
import { readableOn } from '../lib/color'

export function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

/* ------------------------------------------------------------------ Button */

const BUTTON_VARIANTS = {
  primary:
    'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 border border-transparent shadow-sm',
  // On a dark page the navy button would vanish into the surface, so it
  // borrows the accent there — same weight in the hierarchy, still visible.
  navy:
    'bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950 border border-transparent shadow-sm ' +
    'dark:bg-accent-500 dark:hover:bg-accent-600',
  secondary:
    'bg-white dark:bg-navy-900 text-navy-900 dark:text-white border border-slate-300 dark:border-navy-700 ' +
    'hover:bg-slate-50 hover:border-slate-400 dark:hover:bg-navy-800 dark:hover:border-navy-600 shadow-sm',
  ghost:
    'bg-transparent text-slate-600 dark:text-slate-300 border border-transparent ' +
    'hover:bg-slate-100 hover:text-navy-900 dark:hover:bg-navy-800 dark:hover:text-white',
  /**
   * The quiet button on a navy section. A variant rather than utilities passed
   * to `ghost`: both set the same properties, and which one wins is decided by
   * the order Tailwind emits them, not by the order they are written here —
   * which is how this button ended up near-invisible against the dark panel.
   */
  ghostOnDark:
    'bg-transparent text-white border border-white/35 hover:bg-white/10 hover:border-white/60 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm',
  dangerOutline: 'bg-white dark:bg-navy-900 text-red-600 border border-red-300 hover:bg-red-50',
}

const BUTTON_SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

export const Button = forwardRef(function Button(
  { as, variant = 'primary', size = 'md', className, loading, children, disabled, ...props },
  ref
) {
  const Component = as || 'button'
  return (
    <Component
      ref={ref}
      disabled={Component === 'button' ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center rounded-md font-semibold transition-colors duration-150',
        'disabled:opacity-55 disabled:pointer-events-none whitespace-nowrap',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </Component>
  )
})

/* ------------------------------------------------------------------- Field */

export function Field({ label, hint, error, required, children, htmlFor, className }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-navy-900 dark:text-white">
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
        {hint && <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

const CONTROL_BASE =
  'w-full rounded-md border bg-white dark:bg-navy-900 px-3.5 text-sm text-navy-900 dark:text-white placeholder:text-slate-400 transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-accent-500/25 focus:border-accent-500 ' +
  'disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-navy-950 dark:disabled:text-slate-500'

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL_BASE, 'h-11', invalid ? 'border-red-400' : 'border-slate-300 dark:border-navy-700', className)}
      {...props}
    />
  )
})

export const Textarea = forwardRef(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL_BASE, 'py-2.5 min-h-24 resize-y', invalid ? 'border-red-400' : 'border-slate-300 dark:border-navy-700', className)}
      {...props}
    />
  )
})

export const Select = forwardRef(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(
        CONTROL_BASE,
        'h-11 pr-9 appearance-none cursor-pointer',
        invalid ? 'border-red-400' : 'border-slate-300 dark:border-navy-700',
        className
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
      }}
      {...props}
    >
      {children}
    </select>
  )
})

/* -------------------------------------------------------------------- Card */

export function Panel({ className, children, ...props }) {
  return (
    <div
      className={cx('rounded-md border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 shadow-[var(--shadow-card)]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function Badge({ children, tone = 'accent', className }) {
  const tones = {
    accent: 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 border-accent-100',
    navy: 'bg-navy-50 dark:bg-navy-900 text-navy-800 dark:text-slate-100 border-navy-100',
    slate: 'bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-navy-800',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function SectionHeading({ eyebrow, title, description, align = 'center', className }) {
  return (
    <div className={cx('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600 dark:text-accent-300 mb-3">{eyebrow}</p>
      )}
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy-900 dark:text-white text-balance">{title}</h2>
      {description && <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>}
    </div>
  )
}

/* ------------------------------------------------------------ Scan corners */

/**
 * Viewfinder corners around a QR code — the frame a camera app draws, which
 * says "point your phone here" without printing the URL underneath.
 *
 * `dark` raises the accent until it reads on a near-black surface, the same
 * treatment the dark templates give it. Put this inside a `relative` box with
 * a little padding around the code.
 */
export function ScanCorners({ accent = '#2E6BE6', dark = false }) {
  const color = dark ? readableOn(accent, '#0B1424', 4.5) : accent
  const corners = [
    'left-0 top-0 border-l-2 border-t-2 rounded-tl-md',
    'right-0 top-0 border-r-2 border-t-2 rounded-tr-md',
    'left-0 bottom-0 border-b-2 border-l-2 rounded-bl-md',
    'right-0 bottom-0 border-b-2 border-r-2 rounded-br-md',
  ]

  return (
    <>
      {corners.map((position) => (
        <span
          key={position}
          className={cx('pointer-events-none absolute h-5 w-5', position)}
          style={{ borderColor: color }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}

/* --------------------------------------------------------------- Brand mark */

/** The two brand colours, as used by every gradient in the mark. */
export const BRAND_FROM = '#3B6BF5'
export const BRAND_TO = '#8B5CF6'

/**
 * The brand mark: the identity card in front, the QR card behind. Drawn inline
 * rather than loaded from /logo-mark.svg so `invert` can reverse it for dark
 * surfaces and it never flashes in after the page paints. public/logo.svg
 * holds the same artwork for anything outside the app.
 *
 * The QR face is deliberately coarser than the source artwork: at 28px in a
 * header, a faithful module grid turns into grey mush, so it keeps the three
 * finder squares and a handful of cells that still read as a code.
 */
export function BrandMark({ invert = false, className }) {
  // One gradient id per instance: duplicated ids across inline SVGs collide,
  // and the second mark on a page would silently paint with the first's fill.
  const id = useId()
  const card = invert ? '#ffffff' : '#111A2E'
  const onCard = invert ? '#111A2E' : `url(#${id})`

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={invert ? '#5B87FF' : BRAND_FROM} />
          <stop offset="100%" stopColor={invert ? '#A78BFA' : BRAND_TO} />
        </linearGradient>
      </defs>

      {/* Back card: the QR face */}
      <rect x="30" y="11" width="26" height="42" rx="6" fill={`url(#${id})`} />
      <g fill="#ffffff">
        <path d="M34 16h7v7h-7zm1.6 1.6v3.8h3.8v-3.8z" fillRule="evenodd" />
        <path d="M46 16h7v7h-7zm1.6 1.6v3.8h3.8v-3.8z" fillRule="evenodd" />
        <path d="M34 28h7v7h-7zm1.6 1.6v3.8h3.8v-3.8z" fillRule="evenodd" />
        <rect x="43" y="25.5" width="2" height="2" />
        <rect x="46.5" y="25.5" width="2" height="2" />
        <rect x="50" y="27.5" width="2" height="2" />
        <rect x="43.5" y="29" width="2" height="2" />
        <rect x="47" y="30.5" width="2" height="2" />
        <rect x="43" y="33" width="2" height="2" />
        <rect x="46.5" y="34.5" width="2" height="2" />
        <rect x="41" y="39.5" width="2" height="2" />
        <rect x="44.5" y="38" width="2" height="2" />
      </g>

      {/* Front card: the identity face */}
      <rect x="8" y="7" width="32" height="46" rx="6" fill={card} />
      <circle cx="20.5" cy="20" r="4.6" fill={onCard} />
      <path d="M13.6 32.4a6.9 6.9 0 0 1 13.8 0z" fill={onCard} />
      <rect x="13.6" y="35.6" width="15.5" height="2.6" rx="1.3" fill={onCard} />
      <rect x="13.6" y="40" width="10.5" height="2.6" rx="1.3" fill={onCard} />
      <g
        fill="none"
        stroke={onCard}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18.4 45.4 16 47.8l2.4 2.4" />
        <path d="m26 45.4 2.4 2.4-2.4 2.4" />
        <path d="M23.6 44.6 20.8 51" />
      </g>
    </svg>
  )
}

export function Logo({ to = '/', className, invert = false, size = 'md' }) {
  const mark = (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark invert={invert} className={cx('shrink-0', size === 'sm' ? 'h-7 w-7' : 'h-8 w-8')} />
      <span className={cx('font-bold tracking-tight', size === 'sm' ? 'text-base' : 'text-lg')}>
        {/* "Card" in ink, "Folio" in the brand gradient — as drawn. */}
        <span className={invert ? 'text-white' : 'text-navy-900 dark:text-white'}>Card</span>
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: `linear-gradient(90deg, ${BRAND_FROM}, ${BRAND_TO})` }}
        >
          Folio
        </span>
      </span>
    </span>
  )

  if (!to) return <span className={className}>{mark}</span>
  return (
    <Link to={to} className={cx('inline-flex', className)} aria-label="CardFolio home">
      {mark}
    </Link>
  )
}

/* ---------------------------------------------------------------- Checkbox */

export function Checkbox({ id, checked, onChange, label, hint }) {
  const generated = useId()
  const inputId = id || generated

  return (
    <div className="flex items-start gap-2.5">
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-xs border-slate-300 dark:border-navy-700 accent-accent-500"
      />
      <span className="min-w-0">
        <label htmlFor={inputId} className="block text-sm font-medium text-navy-900 dark:text-white">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ Toggle */

/**
 * `locked` marks a setting the plan doesn't include: the label carries a Pro
 * chip, the track is dimmed, and the click is handed to `onLocked` — the
 * upgrade path — instead of toggling something that wouldn't take effect.
 */
export function Switch({ checked, onChange, label, description, locked = false, onLocked }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <label htmlFor={id} className="inline-flex items-center gap-2 text-sm font-semibold text-navy-900 dark:text-white">
          {label}
          {locked && (
            <Badge tone="slate">
              <Lock size={11} aria-hidden="true" />
              Pro
            </Badge>
          )}
        </label>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={locked ? false : checked}
        aria-label={locked ? `${label} — available on the Pro plan` : label}
        onClick={() => (locked ? onLocked?.() : onChange(!checked))}
        className={cx(
          'relative h-6 w-11 shrink-0 rounded-md border transition-colors',
          locked
            ? 'border-slate-200 dark:border-navy-800 bg-slate-100 dark:bg-navy-800'
            : checked
              ? 'bg-accent-500 border-accent-500'
              : 'bg-slate-200 dark:bg-navy-800 border-slate-300 dark:border-navy-700'
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-4 w-4 rounded-xs bg-white dark:bg-navy-900 shadow transition-all',
            // A locked switch always reads as off, whatever was stored.
            !locked && checked ? 'left-6' : 'left-0.5'
          )}
        />
      </button>
    </div>
  )
}
