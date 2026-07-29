import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { useT } from '../lib/i18n'
import { cx } from './ui'

/**
 * One button, not a three-way menu.
 *
 * The provider knows about `system` as well, and keeps honouring it if it was
 * chosen — but a control in a header has room for one decision, and the
 * decision people want to make there is "this is too bright, right now". The
 * icon shows what pressing it gives you, which is the convention every OS uses
 * for the same switch.
 */
export default function ThemeToggle({ className, bare = false }) {
  const { isDark, toggle } = useTheme()
  const t = useT()
  const label = isDark ? t('common.themeLight') : t('common.themeDark')

  return (
    <button
      type="button"
      onClick={toggle}
      title={`${t('common.theme')}: ${label}`}
      aria-label={label}
      className={cx(
        // `bare` drops the outline so this can sit inside a shared one — two
        // boxes touching read as two controls; one box with a divider reads as
        // a single group, which is what a header with this much in it needs.
        'grid h-10 w-10 place-items-center rounded-md text-slate-600 transition-colors',
        'hover:text-navy-900 dark:text-slate-300 dark:hover:text-white',
        !bare &&
          'border border-slate-200 hover:border-slate-300 dark:border-navy-700 dark:hover:border-navy-600',
        bare && 'hover:bg-slate-50 dark:hover:bg-navy-800',
        className
      )}
    >
      {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
    </button>
  )
}
