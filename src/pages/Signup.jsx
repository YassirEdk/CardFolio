import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import AuthLayout, { Divider } from '../components/AuthLayout'
import GoogleSignIn from '../components/GoogleSignIn'
import { Button, Field, Input, cx } from '../components/ui'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/auth'
import { validateEmail } from './Login'

function passwordStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

export default function Signup() {
  const navigate = useNavigate()
  const toast = useToast()
  const { signup, loginWithGoogle, status, card } = useAuth()
  const [values, setValues] = useState({ fullName: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
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
      navigate('/onboarding')
    } catch (error) {
      setErrors(error.errors || { email: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle(credential) {
    try {
      const { user } = await loginWithGoogle(credential)
      toast(`Welcome, ${user?.fullName?.split(' ')[0] || 'there'}`)
      navigate('/onboarding')
    } catch (error) {
      setErrors({ email: error.message })
    }
  }

  return (
    <AuthLayout
      title="Create your free card"
      subtitle="No credit card required. Your card is live in under three minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent-600 hover:text-accent-700">
            Log in
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
        <Field label="Full name" htmlFor="fullName" error={errors.fullName} required>
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

        <Field label="Email address" htmlFor="email" error={errors.email} required>
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

        <Field label="Password" htmlFor="password" error={errors.password} required>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="pr-11"
              value={values.password}
              onChange={setField('password')}
              invalid={Boolean(errors.password)}
              aria-describedby="password-strength"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                        : 'bg-slate-200'
                    )}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-slate-500">
                {strength <= 1 ? 'Weak' : strength === 2 ? 'Fair' : strength === 3 ? 'Good' : 'Strong'}
              </span>
            </div>
          )}
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create my card
        </Button>

        <p className="text-center text-xs leading-relaxed text-slate-500">
          By signing up you agree to our{' '}
          <a href="#" className="font-medium text-slate-600 underline underline-offset-2 hover:text-navy-900">
            Terms
          </a>{' '}
          and{' '}
          <a href="#" className="font-medium text-slate-600 underline underline-offset-2 hover:text-navy-900">
            Privacy Policy
          </a>
          .
        </p>
      </form>
    </AuthLayout>
  )
}
