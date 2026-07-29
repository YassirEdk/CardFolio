import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import AuthLayout, { Divider } from '../components/AuthLayout'
import GoogleSignIn from '../components/GoogleSignIn'
import { Button, Field, Input } from '../components/ui'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'

export function validateEmail(value) {
  if (!value.trim()) return 'Enter your email address.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Enter a valid email address.'
  return null
}

export default function Login() {
  const t = useT()
  const navigate = useNavigate()
  const toast = useToast()
  const { login, loginWithGoogle, status, card } = useAuth()
  /**
   * Arriving from the "you already have an account" dialog carries the address
   * with it, so the field is already filled: the point of sending someone here
   * is that they were about to type it again.
   */
  const location = useLocation()
  const [values, setValues] = useState({ email: location.state?.email || '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [noAccount, setNoAccount] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
      email: validateEmail(values.email),
      password: values.password ? null : 'Enter your password.',
    }
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.password) return

    setSubmitting(true)
    try {
      const { user } = await login({ email: values.email, password: values.password })
      toast(`Welcome back, ${user?.fullName?.split(' ')[0] || 'there'}`)
      navigate('/dashboard')
    } catch (error) {
      setErrors({ password: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle(credential) {
    setNoAccount(false)
    try {
      // 'login' so an unknown Google address is refused rather than quietly
      // turned into a new account — signing up is a different intent.
      const { user } = await loginWithGoogle(credential, 'login')
      toast(`Welcome, ${user?.fullName?.split(' ')[0] || 'there'}`)
      navigate('/dashboard')
    } catch (error) {
      if (error.status === 404) return setNoAccount(true)
      setErrors({ email: error.message })
    }
  }

  return (
    <AuthLayout
      title={t('authPage.loginTitle')}
      subtitle={t('authPage.loginSubtitle')}
      footer={
        <>
          {t('authPage.noAccountYet')}{' '}
          <Link to="/signup" className="font-semibold text-accent-600 dark:text-accent-300 hover:text-accent-700">
            {t('authPage.createFreeCard')}
          </Link>
        </>
      }
    >
      {/* Google signed the person in, but no account here uses that address —
          so point at the door they actually want rather than showing a plain
          error next to the email field they never touched. */}
      {noAccount && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">{t('authPage.noGoogleAccountTitle')}</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/80">{t('authPage.noGoogleAccountBody')}</p>
          <Button as={Link} to="/signup" size="sm" className="mt-3">
            Create your free card
            <ArrowRight size={15} aria-hidden="true" />
          </Button>
        </div>
      )}

      <GoogleSignIn
        text="signin_with"
        onCredential={handleGoogle}
        onUnavailable={(message) => toast(message, 'info')}
      />
      <Divider>or log in with email</Divider>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

        <Field
          label={t('auth.password')}
          htmlFor="password"
          error={errors.password}
          required
          hint={
            <Link to="/login" className="font-semibold text-accent-600 dark:text-accent-300 hover:text-accent-700">
              Forgot password?
            </Link>
          }
        >
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-11"
              value={values.password}
              onChange={setField('password')}
              invalid={Boolean(errors.password)}
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
        </Field>

        <label className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            defaultChecked
            className="h-4 w-4 rounded-xs border-slate-300 dark:border-navy-700 text-accent-500 focus:ring-accent-500"
          />
          {t('authPage.keepSignedIn')}
        </label>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {t('common.login')}
        </Button>
      </form>
    </AuthLayout>
  )
}
