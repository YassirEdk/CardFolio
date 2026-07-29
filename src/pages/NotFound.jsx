import { Link } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'
import { Button, Logo } from '../components/ui'
import { DEMO_USERNAME } from '../data/mockData'
import AnimatedBackdrop from '../components/AnimatedBackdrop'
import { SITE_DOMAIN } from '../data/mockData'
import { useT } from '../lib/i18n'

/**
 * Doubles as the app-wide 404 and the "this username has no card yet" state
 * on the public route, which is a natural upsell moment.
 */
export default function NotFound({ context = 'page', username }) {
  const t = useT()
  const isCard = context === 'card'

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-slate-50 dark:bg-navy-950 px-5 py-16">
      <AnimatedBackdrop />
      <div className="relative w-full max-w-md text-center">
        <Logo className="mb-10 justify-center" />

        <div className="mx-auto grid h-14 w-14 place-items-center rounded-md border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 shadow-[var(--shadow-card)]">
          <SearchX size={24} className="text-accent-500" aria-hidden="true" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('error404.label')}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 dark:text-white">
          {isCard ? t('error404.cardTitle') : t('error404.pageTitle')}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
          {isCard
            ? t('error404.cardBody', { url: `${SITE_DOMAIN}/${username}` })
            : t('error404.pageBody')}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button as={Link} to="/signup" size="lg">
            {isCard ? t('error404.claim') : t('error404.createCard')}
          </Button>
          <Button as={Link} to="/" variant="secondary" size="lg">
            <ArrowLeft size={16} aria-hidden="true" />
            {t('error404.backHome')}
          </Button>
        </div>

        <p className="mt-10 text-sm text-slate-500 dark:text-slate-400">
          {t('error404.lookingForDemo')}{' '}
          <Link to={`/${DEMO_USERNAME}`} className="font-semibold text-accent-600 dark:text-accent-300 hover:text-accent-700">
            {t('error404.viewLiveCard')}
          </Link>
        </p>
      </div>
    </div>
  )
}
