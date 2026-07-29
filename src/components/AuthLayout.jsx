import { Link } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { Logo } from './ui'
import AnimatedBackdrop from './AnimatedBackdrop'
import { DEMO_PHOTO } from '../data/mockData'

const PROOF = [
  'Your own link and QR code in minutes',
  'Five business-grade templates',
  'Update your details any time — the link never changes',
]

/** Centred auth card with a navy value-proposition panel on desktop. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="relative min-h-dvh bg-slate-50 dark:bg-navy-950 lg:grid lg:grid-cols-[1fr_460px]">
      <AnimatedBackdrop grid={false} />
      <div className="relative flex min-h-dvh flex-col px-5 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors hover:text-navy-900"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to home
          </Link>
        </div>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <div className="rounded-md border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 p-7 shadow-[var(--shadow-card)] sm:p-8">
              <h1 className="text-2xl font-bold tracking-tight text-navy-900 dark:text-white">{title}</h1>
              {subtitle && <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{subtitle}</p>}
              <div className="mt-7">{children}</div>
            </div>
            {footer && <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">{footer}</div>}
          </div>
        </main>
      </div>

      <aside className="relative hidden overflow-hidden bg-navy-900 p-12 lg:flex lg:flex-col lg:justify-center">
        <AnimatedBackdrop tone="dark" grid={false} />

        <div className="relative">
          <blockquote className="text-xl font-semibold leading-snug text-white text-balance">
            “I stopped ordering paper cards two years ago. One link, one QR code, and my portfolio is always current.”
          </blockquote>

          <div className="mt-6 flex items-center gap-3">
            <img src={DEMO_PHOTO} alt="" className="h-11 w-11 rounded-md object-cover" />
            <div>
              <p className="text-sm font-semibold text-white">John Doe</p>
              <p className="text-sm text-slate-400">Senior Product Designer</p>
            </div>
          </div>

          <ul className="mt-10 space-y-3 border-t border-navy-800 pt-8">
            {PROOF.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <Check size={16} className="mt-0.5 shrink-0 text-accent-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}

/** Shared "Continue with Google" button. */
export function GoogleButton({ children = 'Continue with Google', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-md border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm font-semibold text-navy-900 dark:text-white transition-colors hover:bg-slate-50"
    >
      <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.6-.15-3.15-.43-4.65H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.6 5.9c4.44-4.1 7.22-10.14 7.22-17.45z" />
        <path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
        <path fill="#34A853" d="M24 48c6.2 0 11.4-2.05 15.2-5.55l-7.6-5.9c-2.1 1.4-4.8 2.25-7.6 2.25-6.4 0-11.7-3.7-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
      </svg>
      {children}
    </button>
  )
}

export function Divider({ children = 'or' }) {
  return (
    <div className="my-6 flex items-center gap-4">
      <span className="h-px flex-1 bg-slate-200 dark:bg-navy-800" />
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{children}</span>
      <span className="h-px flex-1 bg-slate-200 dark:bg-navy-800" />
    </div>
  )
}
