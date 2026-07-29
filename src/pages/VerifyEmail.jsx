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
  const [sending, setSending] = useState(false)

  // Strict Mode mounts effects twice in development, and this one spends a
  // single-use token — without the guard the second run reports "invalid".
  const started = useRef(false)

  /** Where a confirmed account belongs: the wizard, or the card it finished. */
  const onward = card?.published ? '/dashboard' : '/onboarding'

  useEffect(() => {
    if (!token || started.current) return
    started.current = true

    let active = true
    api
      .verifyEmail(token)
      .then((result) => {
        if (!active) return
        setState({ status: 'done', email: result.email })
        refresh?.()
      })
      .catch((error) => {
        if (!active) return
        setState({ status: error.reason === 'expired' ? 'expired' : 'invalid', email: null })
      })
    return () => {
      active = false
    }
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

  // Confirmed — whether by this tab or by the poll noticing another one.
  useEffect(() => {
    if (user?.emailVerified && state.status === 'pending') {
      navigate(onward, { replace: true })
    }
  }, [user?.emailVerified, state.status, navigate, onward])

  async function resend() {
    setSending(true)
    try {
      await api.resendVerification()
      toast(t('verify.sent'))
    } catch (error) {
      toast(error.reason === 'rate-limited' ? t('verify.rateLimited') : error.message, 'info')
    } finally {
      setSending(false)
    }
  }

  const views = {
    checking: { icon: Loader2, tone: 'text-slate-400', title: t('verify.checking') },
    pending: {
      icon: MailCheck,
      tone: 'text-accent-500',
      title: t('verify.pendingTitle'),
      body: t('verify.pendingBody', { email: user?.email || '' }),
    },
    done: {
      icon: CheckCircle2,
      tone: 'text-emerald-600',
      title: t('verify.successTitle'),
      body: t('verify.successBody', { email: state.email || '' }),
    },
    expired: { icon: Clock, tone: 'text-amber-600', title: t('verify.expiredTitle'), body: t('verify.expiredBody') },
    invalid: { icon: MailX, tone: 'text-slate-500', title: t('verify.invalidTitle'), body: t('verify.invalidBody') },
  }
  const view = views[state.status]
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

        {state.status === 'pending' && (
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

        {state.status !== 'pending' && state.status !== 'checking' && (
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
