import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserCheck } from 'lucide-react'
import AuthLayout, { Divider } from '../components/AuthLayout'
import LegalDialog from '../components/LegalDialog'
import GoogleSignIn from '../components/GoogleSignIn'
import { Button, Field, Input, cx } from '../components/ui'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { validateEmail } from './Login'

function passwordStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

/**
 * Told plainly, and given the door.
 *
 * The field error under the email box is easy to miss — especially after the
 * Google button, where nothing was typed into that field for the message to
 * attach to. This is the one signup failure with an obvious next step, so it
 * says so and offers it.
 */
function AccountExistsDialog({ email, onClose }) {
  const t = useT()

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
      aria-labelledby="account-exists-title"
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div className="animate-dialog-in my-auto w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-[var(--shadow-lift)] dark:border-navy-800 dark:bg-navy-900">
        <div className="flex items-start gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
            aria-hidden="true"
          >
            <UserCheck size={19} />
          </span>
          <div className="min-w-0">
            <h2 id="account-exists-title" className="text-base font-bold text-navy-900 dark:text-white">
              {t('authPage.emailTakenTitle')}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {email ? t('authPage.emailTakenBody', { email }) : t('authPage.emailTakenBodyPlain')}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          {/* The account exists, so logging in is the thing they came to do —
              it leads, and the email is carried across so the form is filled. */}
          <Button as={Link} to="/login" state={{ email }} className="sm:flex-1">
            {t('authPage.goToLogin')}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} className="sm:flex-1">
            {t('authPage.useAnotherEmail')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Turns a failed signup into per-field messages.
 *
 * The duplicate-account case is the one worth singling out: it is the most
 * common way a signup fails, and the only description the server can give is
 * in English. Keying on the reason code lets the form say it in the visitor's
 * language — and covers the Google button, where the failure arrives with no
 * field attached at all.
 */
function isAccountExists(error) {
  return error.reason === 'account-exists' || (error.status === 409 && Boolean(error.errors?.email))
}

function errorFields(error, t) {
  if (isAccountExists(error)) return { email: t('authPage.emailTaken') }
  return error.errors || { email: error.message }
}

export default function Signup() {
  const t = useT()
  const navigate = useNavigate()
  const toast = useToast()
  const { signup, loginWithGoogle, status, card } = useAuth()
  const [values, setValues] = useState({ fullName: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  /**
   * Set when the server says the account already exists.
   *
   * An object, not the address: the Google path often cannot name the address,
   * and a bare `null` for "exists but unnamed" is indistinguishable from
   * "nothing happened" — which is precisely why the dialog never appeared.
   */
  const [existingAccount, setExistingAccount] = useState(null)
  /** 'terms' | 'privacy' | null — which document is open, if any. */
  const [legalDoc, setLegalDoc] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const strength = passwordStrength(values.password)

  const setField = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  /**
   * Already signed in? This page has nothing to offer — going Back to it after
   * signing up used to show the form again, as if the account hadn't been
   * created. Where to send them depends on how far they got: an unpublished
   * card means onboarding was never finished.
   */
  if (status === 'authenticated') {
    return <Navigate to={card?.published ? '/dashboard' : '/onboarding'} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {
      fullName: values.fullName.trim().length >= 2 ? null : 'Enter your full name.',
      email: validateEmail(values.email),
      password:
        values.password.length >= 8 ? null : 'Use at least 8 characters, with a number and a capital letter.',
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    setSubmitting(true)
    try {
      // No username here: the server derives one from the email. Choosing a
      // custom card URL is a Pro feature, offered from the dashboard.
      await signup({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      })
      toast('Account created — let’s build your card')
      // The inbox first: an address nobody confirms is an account nobody can
      // recover, and the moment right after signing up is the only one where
      // the person is still expecting to hear from us.
      navigate('/verify')
    } catch (error) {
      setErrors(errorFields(error, t))
      if (isAccountExists(error)) setExistingAccount({ email: values.email })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle(credential) {
    try {
      // `signup`: this button creates accounts, it does not adopt one that
      // already exists — see the route for why that matters.
      const { user, card: signedInCard } = await loginWithGoogle(credential, 'signup')
      toast(`Welcome, ${user?.fullName?.split(' ')[0] || 'there'}`)
      /**
       * Onboarding is for accounts that have no card yet.
       *
       * Sending everyone there meant someone who already had a published card
       * — an older server that still links Google to an existing account, or
       * simply a second visit — was dropped into the setup wizard for a card
       * they finished months ago. Where to go is a property of the account, so
       * it is read from the account.
       */
      navigate(signedInCard?.published ? '/dashboard' : '/onboarding')  // Google verified the address already
    } catch (error) {
      setErrors(errorFields(error, t))
      // The Google flow never touched the email field, so the address comes
      // back from the server with the refusal — or not at all, on an older one.
      if (isAccountExists(error)) setExistingAccount({ email: error.payload?.email || null })
    }
  }

  return (
    <AuthLayout
      title={t('authPage.signupTitle')}
      subtitle={t('authPage.signupSubtitle')}
      footer={
        <>
          {t('authPage.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-accent-600 dark:text-accent-300 hover:text-accent-700">
            {t('common.login')}
          </Link>
        </>
      }
    >
      <GoogleSignIn
        text="signup_with"
        onCredential={handleGoogle}
        onUnavailable={(message) => toast(message, 'info')}
      />
      <Divider>or sign up with email</Divider>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label={t('auth.fullName')} htmlFor="fullName" error={errors.fullName} required>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            placeholder="John Doe"
            value={values.fullName}
            onChange={setField('fullName')}
            invalid={Boolean(errors.fullName)}
          />
        </Field>

        <Field label={t('auth.email')} htmlFor="email" error={errors.email} required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={values.email}
            onChange={setField('email')}
            invalid={Boolean(errors.email)}
          />
        </Field>

        <Field label={t('auth.password')} htmlFor="password" error={errors.password} required>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('authPage.passwordHint')}
              className="pr-11"
              value={values.password}
              onChange={setField('password')}
              invalid={Boolean(errors.password)}
              aria-describedby="password-strength"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? t('authPage.hidePassword') : t('authPage.showPassword')}
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition-colors hover:text-navy-900"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {values.password && (
            <div id="password-strength" className="flex items-center gap-2 pt-1">
              <div className="flex flex-1 gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cx(
                      'h-1 flex-1 rounded-xs transition-colors',
                      i < strength
                        ? strength <= 1
                          ? 'bg-red-400'
                          : strength === 2
                            ? 'bg-amber-400'
                            : 'bg-emerald-500'
                        : 'bg-slate-200 dark:bg-navy-800'
                    )}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {strength <= 1
                  ? t('authPage.strengthWeak')
                  : strength === 2
                    ? t('authPage.strengthFair')
                    : strength === 3
                      ? t('authPage.strengthGood')
                      : t('authPage.strengthStrong')}
              </span>
            </div>
          )}
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {t('authPage.createMyCard')}
        </Button>

        <p className="text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {/* Buttons, not links: they open the text here rather than
              navigating away from a half-filled form. */}
          {t('authPage.agreeIntro')}{' '}
          <button
            type="button"
            onClick={() => setLegalDoc('terms')}
            className="font-medium text-slate-600 underline underline-offset-2 hover:text-navy-900 dark:text-slate-300 dark:hover:text-white"
          >
            {t('authPage.terms')}
          </button>{' '}
          {t('authPage.and')}{' '}
          <button
            type="button"
            onClick={() => setLegalDoc('privacy')}
            className="font-medium text-slate-600 underline underline-offset-2 hover:text-navy-900 dark:text-slate-300 dark:hover:text-white"
          >
            {t('authPage.privacy')}
          </button>
          .
        </p>
      </form>

      {existingAccount && (
        <AccountExistsDialog email={existingAccount.email} onClose={() => setExistingAccount(null)} />
      )}

      {legalDoc && <LegalDialog doc={legalDoc} onClose={() => setLegalDoc(null)} />}
    </AuthLayout>
  )
}
