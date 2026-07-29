import { useEffect, useState } from 'react'
import { Check, Sparkles, X } from 'lucide-react'
import { Button, BrandMark, cx } from './ui'
import { PLANS } from '../data/plans'
import { SITE_DOMAIN } from '../data/mockData'
import { useT } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import { useToast } from './Toast'

/**
 * The plans, shown in place rather than by sending the user off to the
 * marketing page: they hit this from inside the dashboard with a design picked
 * and a job half done, so the offer comes to them and closing it puts them
 * back exactly where they were.
 *
 * `reason` is the one-line context — which template they were reaching for.
 */
export default function UpgradeDialog({ reason, onClose }) {
  const { setPlan } = useAuth()
  const toast = useToast()
  const t = useT()
  const [taking, setTaking] = useState(false)

  async function take() {
    setTaking(true)
    try {
      await setPlan('pro')
      toast('You’re on Pro — every template is unlocked')
      onClose?.()
    } catch (error) {
      toast(error.message || 'Could not switch your plan', 'info')
      setTaking(false)
    }
  }

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="animate-scrim-in fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-navy-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('editor.plans')}
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div className="animate-dialog-in my-auto w-full max-w-3xl overflow-hidden rounded-md border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 shadow-[var(--shadow-lift)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-navy-800 px-6 py-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-navy-900 dark:text-white">
              <Sparkles size={17} className="text-accent-600 dark:text-accent-300" aria-hidden="true" />
              Upgrade to Pro
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {reason || 'Unlock every template and the rest of the Pro toolkit.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('editor.close')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 dark:border-navy-800 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 hover:text-navy-900"
          >
            <X size={17} />
          </button>
        </div>

        {/* Printed on card stock, same as the pricing section: white for Free,
            navy for Pro. No tilt here — a dialog is a flat surface. */}
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {PLANS.map((plan, index) => {
            const dark = Boolean(plan.highlight)
            return (
              <div
                key={plan.id}
                // Staggered by index so the two cards arrive in reading order
                // rather than together, and the Pro card lands last.
                style={{ animationDelay: `${80 + index * 90}ms` }}
                className={cx(
                  'animate-plan-in relative overflow-hidden rounded-md p-5 transition-transform duration-300',
                  'hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none',
                  dark
                    ? 'bg-navy-900 text-white shadow-[0_16px_34px_-16px_rgba(9,23,41,0.6)] ring-1 ring-navy-950'
                    : 'bg-white text-navy-900 ring-1 ring-slate-200 ' +
                      // Same treatment as the pricing section: a wash of accent
                      // so the free card is not the same charcoal as the Pro one.
                      'dark:bg-accent-500/10 dark:text-white dark:ring-accent-500/25'
                )}
              >
                <span
                  className={cx(
                    'pointer-events-none absolute inset-x-0 top-0 h-1',
                    dark ? 'bg-accent-500' : 'bg-navy-900 dark:bg-accent-400'
                  )}
                  aria-hidden="true"
                />

                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={cx(
                      'text-[11px] font-bold uppercase tracking-[0.18em]',
                      dark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {t(`plans.${plan.id}.name`)}
                  </h3>
                  <BrandMark invert={dark} className="h-9 w-9 shrink-0" />
                </div>

                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className={cx('text-sm font-medium', dark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400')}>
                    {t(`plans.${plan.id}.cadence`)}
                  </span>
                </p>
                <p className={cx('mt-2 text-sm', dark ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300')}>
                  {t(`plans.${plan.id}.description`)}
                </p>

                <span
                  className={cx('mt-4 block h-px', dark ? 'bg-white/15' : 'bg-slate-200 dark:bg-navy-800')}
                  aria-hidden="true"
                />

                <ul className="mt-4 space-y-2">
                  {Array.from({ length: plan.featureCount }, (_, i) =>
                    t(`plans.${plan.id}.features.${i}`, { domain: SITE_DOMAIN })
                  ).map((feature) => (
                    <li
                      key={feature}
                      className={cx('flex items-start gap-2 text-sm', dark ? 'text-slate-200' : 'text-slate-600 dark:text-slate-300')}
                    >
                      <Check
                        size={15}
                        className={cx('mt-0.5 shrink-0', dark ? 'text-accent-400' : 'text-accent-600 dark:text-accent-300')}
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Takes the plan there and then. There is no checkout behind this
            yet — see PUT /api/me/plan — so it switches the account straight
            over; a payment step slots in front of the same call later. */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 dark:border-navy-800 bg-slate-50 dark:bg-navy-950 px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={taking}>
            Not now
          </Button>
          <Button type="button" onClick={take} loading={taking}>
            <Sparkles size={16} aria-hidden="true" />
            Take it
          </Button>
        </div>
      </div>
    </div>
  )
}
