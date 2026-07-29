import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, Loader2, MailCheck, MailX } from 'lucide-react'
import { Button, Logo } from '../components/ui'
import AnimatedBackdrop from '../components/AnimatedBackdrop'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'

/** How often the waiting page asks whether the link has been clicked yet. */
const POLL_MS = 4000

/**
 * One page, two jobs.
 *
 * With `?token=` it is the destination of the emailed link, and it does the
 * confirming. Without one it is where signup leaves you: the page that says
 * the email is on its way, waits for you to open it, and moves on by itself
 * when you do.
 *
 * They belong together because they are the two ends of the same minute — and
 * because the link is usually opened in a different browser from the one that
 * signed up, so the waiting tab has to learn about it by asking.
 */
export default function VerifyEmail() {
  const t = useT()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user, card, status, refresh } = useAuth()
  const token = params.get('token')

  const [state, setState] = useState(() => {
    if (token) return { status: 'checking', email: null }
    return { status: 'pending', email: null }
  })
  /**
   * Whether this tab ever actually waited for anything.
   *
   * Only a tab that arrived unconfirmed should move on by itself when the
   * confirmation lands — that is the signup flow continuing. Someone who typed
   * the URL, or came back later with a confirmed account, navigated here on
   * purpose and should be told where they are, not bounced somewhere else.
   */
  const waited = useRef(false)
  const [sending, setSending] = useState(false)

  // Strict Mode mounts effects twice in development, and this one spends a
  // single-use token — without the guard the second run reports "invalid".
  const started = useRef(false)

  /** Where a confirmed account belongs: the wizard, or the card it finished. */
  const onward = card?.published ? '/dashboard' : '/onboarding'

  useEffect(() => {
    if (!token || started.current) return
    started.current = true

    /**
     * No `active` flag here, deliberately.
     *
     * Strict Mode mounts, unmounts and remounts in development. The usual
     * ignore-if-unmounted guard, combined with the once-only guard above,
     * left the page spinning for good: the first mount fired the request and
     * was then torn down, so its result was discarded — and the second mount
     * saw `started` and never asked again. Nothing was left to resolve the
     * page.
     *
     * The request happens exactly once, so its result is always the right
     * one to apply. A `setState` after unmount is a no-op in React 18, which
     * is a far better failure than a spinner that never stops.
     */
    api
      .verifyEmail(token)
      .then((result) => {
        setState({ status: 'done', email: result.email })
        // Only worth re-reading the session if it is that account's link.
        refresh?.()
      })
      .catch((error) => {
        setState({ status: error.reason === 'expired' ? 'expired' : 'invalid', email: null })
      })
  }, [token, refresh])

  /**
   * While waiting, ask the server every few seconds.
   *
   * The link is opened wherever the inbox is — a phone, another browser — so
   * nothing tells this tab that it happened. Polling is what lets someone
   * click the link on their phone and watch this page carry on by itself.
   */
  useEffect(() => {
    if (state.status !== 'pending' || status !== 'authenticated') return
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh?.()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [state.status, status, refresh])

  // Remember that this tab was, at some point, genuinely waiting.
  useEffect(() => {
    if (state.status === 'pending' && user?.emailVerified === false) waited.current = true
  }, [state.status, user?.emailVerified])

  /**
   * Confirmed while this tab was waiting — including by a click in another
   * browser, which the poll above notices. That, and only that, advances.
   */
  useEffect(() => {
    if (state.status === 'pending' && user?.emailVerified && waited.current) {
      navigate(onward, { replace: true })
    }
  }, [user?.emailVerified, state.status, navigate, onward])

  async function resend() {
    setSending(true)
    try {
      /**
       * `sent` is the provider's answer, not ours.
       *
       * Reporting "link sent" when the provider refused it is how someone ends
       * up waiting for an email that was never accepted — which is exactly the
       * confusion Resend's test-mode restriction causes.
       */
      const result = await api.resendVerification()
      toast(result?.sent === false ? t('verify.notSent') : t('verify.sent'), result?.sent === false ? 'info' : undefined)
    } catch (error) {
      toast(error.reason === 'rate-limited' ? t('verify.rateLimited') : error.message, 'info')
    } finally {
      setSending(false)
    }
  }

  // Already confirmed and not mid-flow: say so rather than redirect.
  const settled = state.status === 'pending' && user?.emailVerified === true && !waited.current

  /** Signed in, but the link that was just spent belongs to another address. */
  const otherAccount =
    state.status === 'done' &&
    Boolean(user?.email) &&
    Boolean(state.email) &&
    user.email.toLowerCase() !== state.email.toLowerCase()

  const shown = settled ? 'already' : otherAccount ? 'done-other' : state.status

  const views = {
    checking: { icon: Loader2, tone: 'text-slate-400', title: t('verify.checking') },
    already: {
      icon: CheckCircle2,
      tone: 'text-emerald-600',
      title: t('verify.alreadyTitle'),
      body: t('verify.alreadyBody', { email: user?.email || '' }),
    },
    pending: {
      icon: MailCheck,
      tone: 'text-accent-500',
      /**
       * Two different situations wear this state.
       *
       * Straight after signing up there is nothing to lose yet, so the page
       * is an instruction: check your inbox. Arriving later — bounced out of
       * the editor — the person has a card they cannot change, and the honest
       * headline is what is locked and why, not "check your inbox" again.
       */
      title: card?.published ? t('verify.lockedTitle') : t('verify.pendingTitle'),
      body: card?.published
        ? t('verify.lockedBody', { email: user?.email || '' })
        : t('verify.pendingBody', { email: user?.email || '' }),
    },
    done: {
      icon: CheckCircle2,
      tone: 'text-emerald-600',
      title: t('verify.successTitle'),
      body: t('verify.successBody', { email: state.email || '' }),
    },
    /**
     * The link was for somebody else's account.
     *
     * A link opened in a browser already signed in as another account used to
     * report a flat "Email confirmed", which reads as *this* account being
     * confirmed — it is not, and the difference matters. The server was always
     * right; it confirms whoever the token belongs to. This says whose.
     */
    'done-other': {
      icon: MailCheck,
      tone: 'text-amber-600',
      title: t('verify.otherAccountTitle'),
      body: t('verify.otherAccountBody', {
        confirmed: state.email || '',
        current: user?.email || '',
      }),
    },
    expired: { icon: Clock, tone: 'text-amber-600', title: t('verify.expiredTitle'), body: t('verify.expiredBody') },
    invalid: { icon: MailX, tone: 'text-slate-500', title: t('verify.invalidTitle'), body: t('verify.invalidBody') },
  }
  const view = views[shown]
  const Icon = view.icon

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-slate-50 px-5 py-16 dark:bg-navy-950">
      <AnimatedBackdrop />
      <div className="relative w-full max-w-md text-center">
        <Logo className="mb-10 justify-center" />

        <div className="mx-auto grid h-14 w-14 place-items-center rounded-md border border-slate-200 bg-white shadow-[var(--shadow-card)] dark:border-navy-800 dark:bg-navy-900">
          <Icon
            size={24}
            className={`${view.tone} ${state.status === 'checking' ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-navy-900 dark:text-white" role="status">
          {view.title}
        </h1>
        {view.body && (
          <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">{view.body}</p>
        )}

        {shown === 'pending' && (
          <>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('verify.pendingHint')}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button type="button" size="lg" onClick={resend} loading={sending}>
                {t('verify.resend')}
              </Button>
              {/* A way past, deliberately quiet. The card is not published yet,
                  so nothing is lost by carrying on — and someone who cannot
                  receive the email right now should not be stuck on a page
                  with no exit. The dashboard keeps asking. */}
              <Button as={Link} to={onward} variant="secondary" size="lg">
                {t('verify.continueAnyway')}
              </Button>
            </div>
          </>
        )}

        {shown !== 'pending' && shown !== 'checking' && (
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {status === 'authenticated' ? (
              <Button as={Link} to={onward} size="lg">
                {t('verify.goToDashboard')}
              </Button>
            ) : (
              <Button as={Link} to="/login" size="lg">
                {t('verify.goToLogin')}
              </Button>
            )}
            <Button as={Link} to="/" variant="secondary" size="lg">
              {t('error404.backHome')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
