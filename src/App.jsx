import { useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import PublicCard from './pages/PublicCard'
import NotFound from './pages/NotFound'
import VerifyEmail from './pages/VerifyEmail'

/**
 * Reserved first-path segments. The public card route is `/:username`, so any
 * word listed here belongs to the app and must never be treated as a card.
 */
const RESERVED = new Set([
  'login',
  'signup',
  'onboarding',
  'dashboard',
  'verify',
  '404',
  'about',
  'pricing',
  'templates',
  'features',
  'settings',
  'admin',
  'api',
  'help',
])

/** Guards `/:username` so app paths can never be shadowed by a card. */
function UsernameRoute() {
  const location = useLocation()
  const segment = location.pathname.split('/')[1]?.toLowerCase()
  if (RESERVED.has(segment)) return <NotFound />
  return <PublicCard />
}

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  const location = useLocation()
  // Keyed on the first path segment only: transitions fire between top-level
  // pages, but moving around inside /dashboard/* doesn't remount the shell.
  const section = location.pathname.split('/')[1] || 'home'

  return (
    <div key={section} className="animate-page-in">
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/404" element={<NotFound />} />
        {/* Public card — matched last so every app route wins first. */}
        <Route path="/:username" element={<UsernameRoute />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </div>
  )
}
