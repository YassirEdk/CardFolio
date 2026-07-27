import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from './ui'
import { COUNTRIES, POPULAR } from '../data/countries'

/**
 * Flag artwork, as SVG.
 *
 * Emoji flags are not an option: Windows ships no flag glyphs, so they render
 * as bare letters. These are fetched from flagcdn (public, free, SVG) rather
 * than bundled — 65 flags in the bundle is about a megabyte for decoration.
 * If a request fails the ISO code takes its place, so the row is never empty.
 */
function Flag({ iso, className }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span
        className={cx(
          'grid shrink-0 place-items-center rounded-xs bg-slate-100 text-[9px] font-bold text-slate-500',
          className
        )}
        aria-hidden="true"
      >
        {iso}
      </span>
    )
  }

  return (
    <img
      src={`https://flagcdn.com/${iso.toLowerCase()}.svg`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cx('shrink-0 rounded-xs object-cover ring-1 ring-black/5', className)}
    />
  )
}

/**
 * The country picker for a phone field: a flag and a dial code, over a
 * scrollable list of countries.
 *
 * Custom rather than a native <select> because an <option> can only hold text —
 * no images, no layout. The cost is having to rebuild the keyboard and
 * dismissal behaviour a select gives for free, which is what most of this file
 * is: Escape and outside-press close it, the arrows move through the list,
 * Enter picks, and typing a letter jumps to the first country starting with it.
 */
export default function DialCodeSelect({ value, onChange, id, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const typedRef = useRef({ text: '', at: 0 })

  // Common countries first, then everything, the way the old <optgroup> read.
  const popular = POPULAR.map((iso) => COUNTRIES.find((c) => c.iso === iso)).filter(Boolean)
  const options = [...popular, ...COUNTRIES.filter((c) => !POPULAR.includes(c.iso))]
  const selected = options.find((c) => c.dial === value) || options[0]

  useEffect(() => {
    if (!open) return

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Keep the highlighted row in view while arrowing or typing through the list.
  useEffect(() => {
    if (!open) return
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function choose(country) {
    onChange(country.dial)
    setOpen(false)
  }

  function onKeyDown(event) {
    if (!open && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
      event.preventDefault()
      setActive(Math.max(0, options.indexOf(selected)))
      setOpen(true)
      return
    }
    if (!open) return

    if (event.key === 'Escape') return setOpen(false)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      return setActive((i) => Math.min(options.length - 1, i + 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      return setActive((i) => Math.max(0, i - 1))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      return choose(options[active])
    }

    // Type-ahead: consecutive letters build a prefix, a pause starts over.
    if (/^[a-z]$/i.test(event.key)) {
      const now = Date.now()
      const text = now - typedRef.current.at > 800 ? event.key : typedRef.current.text + event.key
      typedRef.current = { text, at: now }
      const found = options.findIndex((c) => c.name.toLowerCase().startsWith(text.toLowerCase()))
      if (found >= 0) setActive(found)
    }
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          setActive(Math.max(0, options.indexOf(selected)))
          setOpen((value) => !value)
        }}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country dial code: ${selected?.name}`}
        className={cx(
          'flex h-11 w-[7.5rem] items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors',
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500'
            : 'bg-white text-navy-900',
          !disabled && (open ? 'border-accent-500 ring-2 ring-accent-500/25' : 'border-slate-300 hover:border-slate-400')
        )}
      >
        <Flag iso={selected.iso} className="h-4 w-6" />
        <span className="flex-1 text-left">{selected.dial}</span>
        <ChevronDown size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
      </button>

      {open && !disabled && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Country dial code"
          className="animate-toast-in absolute left-0 top-12 z-50 max-h-64 w-72 overflow-y-auto overscroll-contain rounded-md border border-slate-200 bg-white py-1 shadow-[var(--shadow-lift)]"
        >
          {options.map((country, index) => (
            <li key={country.iso}>
              <button
                type="button"
                role="option"
                aria-selected={country.dial === value}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(country)}
                className={cx(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm',
                  index === active ? 'bg-slate-100' : 'bg-white',
                  country.dial === value ? 'font-semibold text-navy-900' : 'text-slate-700'
                )}
              >
                <Flag iso={country.iso} className="h-4 w-6" />
                <span className="min-w-0 flex-1 truncate">{country.name}</span>
                <span className="shrink-0 text-xs text-slate-500">{country.dial}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
