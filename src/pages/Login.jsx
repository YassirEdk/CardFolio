import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import AuthLayout, { Divider } from '../components/AuthLayout'
import GoogleSignIn from '../components/GoogleSignIn'
import { Button, Field, Input } from '../components/ui'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/auth'

export function validateEmail(value) {
  if (!value.trim()) return 'Enter your email address.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Enter a valid email address.'
  return null
}

export default function Login() {
  const navigate = useNavigate()
  const toast = useToast()
  const { login, loginWithGoogle } = useAuth()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const setField = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
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
    try {
      const { user } = await loginWithGoogle(credential)
      toast(`Welcome, ${user?.fullName?.split(' ')[0] || 'there'}`)
      navigate('/dashboard')
    } catch (error) {
      setErrors({ email: error.message })
    }
  }

  return (
    <AuthLayout
      title="Log in to CardFolio"
      subtitle="Manage your card, links and analytics."
      footer={
        <>
          Don’t have an account?{' '}
          <Link to="/signup" className="font-semibold text-accent-600 hover:text-accent-700">
            Create your free card
          </Link>
        </>
      }
    >
      <GoogleSignIn
        text="signin_with"
        onCredential={handleGoogle}
        onUnavailable={(message) => toast(message, 'info')}
      />
      <Divider>or log in with email</Divider>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password}
          required
          hint={
            <Link to="/login" className="font-semibold text-accent-600 hover:text-accent-700">
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
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition-colors hover:text-navy-900"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        <label className="flex items-center gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            defaultChecked
            className="h-4 w-4 rounded-xs border-slate-300 text-accent-500 focus:ring-accent-500"
          />
          Keep me signed in
        </label>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Log in
        </Button>
      </form>

      <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        <span className="font-semibold text-navy-900">Demo account:</span> john@doestudio.com / demo1234
      </p>
    </AuthLayout>
  )
}
