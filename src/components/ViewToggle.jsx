import { Monitor, Smartphone } from 'lucide-react'
import { cx } from './ui'
import { useT } from '../lib/i18n'

/**
 * Switches the public card between its desktop layout and the phone
 * presentation. Rendered as a two-option radiogroup so it is keyboard
 * navigable and announces the active view.
 */
export default function ViewToggle({ view, onChange, className }) {
  const t = useT()
  const options = [
    { id: 'desktop', key: 'card.desktopView', icon: Monitor },
    { id: 'phone', key: 'card.phoneView', icon: Smartphone },
  ]

  return (
    <div
      role="radiogroup"
      aria-label={t('card.layout')}
      className={cx(
        'inline-flex gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-[var(--shadow-card)]',
        'dark:border-navy-800 dark:bg-navy-900',
        className
      )}
    >
      {options.map((option) => {
        const active = view === option.id
        const label = t(option.key)
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => onChange(option.id)}
            className={cx(
              'inline-flex items-center gap-2 rounded-xs px-3 py-2 text-sm font-semibold transition-colors',
              /**
               * The selected option is filled with the accent, not with ink.
               *
               * It used to be `bg-navy-900`, which reads as "selected" on a
               * white toggle — but the dark theme paints the toggle itself in
               * that same near-black, so the fill and the surface became one
               * colour and nothing looked selected at all. The accent is the
               * one colour that is deliberately distinct from both surfaces.
               */
              active
                ? 'bg-accent-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900 dark:text-slate-300 dark:hover:bg-navy-800 dark:hover:text-white'
            )}
          >
            <option.icon size={15} aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
