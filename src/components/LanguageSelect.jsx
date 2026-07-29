import { useEffect, useRef, useState } from 'react'
import { Check, Globe } from 'lucide-react'
import { LANGUAGES, useI18n } from '../lib/i18n'
import { cx } from './ui'

/**
 * The language picker, drawn rather than delegated to the browser.
 *
 * A native `<select>` would be less code and is what this started as, but the
 * option list is painted by the operating system: it ignores the app's theme
 * entirely, so on a dark page it drops a white system menu into the middle of
 * the design. Everything else in this header is a menu we draw — this is now
 * the same one.
 *
 * Each language is named in its own script, never translated. Someone looking
 * for "العربية" is, by definition, not reading the English word "Arabic".
 */
export default function LanguageSelect({ className, align = 'end', bare = false }) {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const current = LANGUAGES.find((language) => language.code === lang) || LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    // Pointerdown, not click: the menu should close as the press lands, even
    // on something that stops the click from propagating.
    function onPointerDown(event) {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={cx('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
        className={cx(
          'inline-flex h-10 w-full items-center gap-2 rounded-md px-2.5 text-sm font-semibold transition-colors',
          'text-slate-600 hover:text-navy-900 dark:text-slate-300 dark:hover:text-white',
          !bare && 'border border-slate-200 hover:border-slate-300 dark:border-navy-700 dark:hover:border-navy-600',
          !bare && open && 'border-slate-300 dark:border-navy-600',
          bare && 'hover:bg-slate-50 dark:hover:bg-navy-800',
          open && 'text-navy-900 dark:text-white'
        )}
      >
        <Globe size={16} aria-hidden="true" className="shrink-0" />
        {/* The badge, not the name. In the header this control sits next to a
            row of nav labels, and "Français" beside "FAQ" reads as a seventh
            link rather than as a setting — two characters cannot. The full
            name is in the menu, which is where you are choosing. */}
        <span className={cx(bare ? 'inline' : 'hidden sm:inline')}>{bare ? current.short : current.name}</span>
        <span className={cx('uppercase', bare ? 'hidden' : 'sm:hidden')}>{current.short}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('common.language')}
          className={cx(
            'absolute top-full z-50 mt-1.5 min-w-[10rem] overflow-hidden rounded-md border p-1 shadow-[var(--shadow-lift)]',
            'border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-900',
            // `end`/`start`, not left/right: in Arabic the whole header is
            // mirrored and the menu has to hang off the same edge as its button.
            align === 'end' ? 'end-0' : 'start-0'
          )}
        >
          {LANGUAGES.map((language) => {
            const active = language.code === lang
            return (
              <li key={language.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  lang={language.code}
                  dir={language.dir}
                  onClick={() => {
                    setLang(language.code)
                    setOpen(false)
                  }}
                  className={cx(
                    'flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                    active
                      ? 'bg-accent-50 font-semibold text-accent-700 dark:bg-accent-500/15 dark:text-accent-200'
                      : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-navy-900 dark:text-slate-300 dark:hover:bg-navy-800 dark:hover:text-white'
                  )}
                >
                  {language.name}
                  {active && <Check size={15} aria-hidden="true" className="shrink-0" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
