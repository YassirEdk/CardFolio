import { useEffect } from 'react'
import { FileText, ShieldCheck, X } from 'lucide-react'
import { Button, cx } from './ui'
import { useI18n } from '../lib/i18n'

/**
 * The terms and the privacy policy, shown where they are agreed to.
 *
 * Sending someone to a separate page to read what they are about to accept
 * means leaving a half-filled signup form behind, which is why almost nobody
 * does it. In a dialog the form is still there when they close it.
 *
 * `doc` is 'terms' or 'privacy'; both live in src/locales as a list of
 * sections, so they are translated like everything else rather than being a
 * slab of English pasted into the markup.
 */
export default function LegalDialog({ doc = 'terms', onClose }) {
  const { t, raw } = useI18n()
  const sections = raw(`legal.${doc}.sections`) || []
  const Icon = doc === 'privacy' ? ShieldCheck : FileText

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="animate-scrim-in fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-navy-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-title"
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div className="animate-dialog-in my-auto flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-[var(--shadow-lift)] dark:border-navy-800 dark:bg-navy-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-navy-800">
          <div className="min-w-0">
            <h2
              id="legal-title"
              className="flex items-center gap-2 text-base font-bold text-navy-900 dark:text-white"
            >
              <Icon size={17} className="text-accent-600 dark:text-accent-300" aria-hidden="true" />
              {t(`legal.${doc}.title`)}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(`legal.${doc}.intro`)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('legal.close')}
            className={cx(
              'grid h-9 w-9 shrink-0 place-items-center rounded-md border text-slate-500 transition-colors',
              'border-slate-200 hover:bg-slate-50 hover:text-navy-900',
              'dark:border-navy-800 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white'
            )}
          >
            <X size={17} />
          </button>
        </div>

        {/* The body scrolls, the header and footer do not: the close button and
            the date stay reachable however long the document is. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <ol className="space-y-5">
            {sections.map((section, index) => (
              <li key={section.h}>
                <h3 className="text-sm font-bold text-navy-900 dark:text-white">
                  {index + 1}. {section.h}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{section.p}</p>
              </li>
            ))}
          </ol>

          {/* Said plainly rather than buried: this is a template, not counsel. */}
          <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {t('legal.disclaimer')}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4 dark:border-navy-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('legal.updated')}</p>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            {t('legal.close')}
          </Button>
        </div>
      </div>
    </div>
  )
}
