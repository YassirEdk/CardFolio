import { Link } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'
import { Button, Logo } from '../components/ui'
import AnimatedBackdrop from '../components/AnimatedBackdrop'
import { SITE_DOMAIN } from '../data/mockData'

/**
 * Doubles as the app-wide 404 and the "this username has no card yet" state
 * on the public route, which is a natural upsell moment.
 */
export default function NotFound({ context = 'page', username }) {
  const isCard = context === 'card'

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-slate-50 px-5 py-16">
      <AnimatedBackdrop />
      <div className="relative w-full max-w-md text-center">
        <Logo className="mb-10 justify-center" />

        <div className="mx-auto grid h-14 w-14 place-items-center rounded-md border border-slate-200 bg-white shadow-[var(--shadow-card)]">
          <SearchX size={24} className="text-accent-500" aria-hidden="true" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900">
          {isCard ? 'This card doesn’t exist' : 'Page not found'}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          {isCard ? (
            <>
              Nobody has claimed{' '}
              <span className="font-semibold text-navy-900">
                {SITE_DOMAIN}/{username}
              </span>{' '}
              yet. It could be yours.
            </>
          ) : (
            'The page you were looking for has moved or never existed.'
          )}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button as={Link} to="/signup" size="lg">
            {isCard ? 'Claim this username' : 'Create your card'}
          </Button>
          <Button as={Link} to="/" variant="secondary" size="lg">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to home
          </Button>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          Looking for the demo?{' '}
          <Link to="/demo" className="font-semibold text-accent-600 hover:text-accent-700">
            View a live card
          </Link>
        </p>
      </div>
    </div>
  )
}
