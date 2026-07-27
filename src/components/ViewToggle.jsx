import { Monitor, Smartphone } from 'lucide-react'
import { cx } from './ui'

/**
 * Switches the public card between its desktop layout and the phone
 * presentation. Rendered as a two-option radiogroup so it is keyboard
 * navigable and announces the active view.
 */
export default function ViewToggle({ view, onChange, className }) {
  const options = [
    { id: 'desktop', label: 'Desktop version', short: 'Desktop', icon: Monitor },
    { id: 'phone', label: 'Phone version', short: 'Phone', icon: Smartphone },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Card layout"
      className={cx(
        'inline-flex gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-[var(--shadow-card)]',
        className
      )}
    >
      {options.map((option) => {
        const active = view === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`View ${option.label}`}
            onClick={() => onChange(option.id)}
            className={cx(
              'inline-flex items-center gap-2 rounded-xs px-3 py-2 text-sm font-semibold transition-colors',
              active ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'
            )}
          >
            <option.icon size={15} aria-hidden="true" />
            {option.short}
          </button>
        )
      })}
    </div>
  )
}
