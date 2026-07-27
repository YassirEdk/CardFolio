import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button, Logo, cx } from './ui'
import { useAuth } from '../lib/auth'

// Listed in the order the sections actually appear on the page, so following
// the nav top to bottom walks the page top to bottom.
const NAV_LINKS = [
  { label: 'Features', id: 'features' },
  { label: 'How it works', id: 'how-it-works' },
  { label: 'Who it’s for', id: 'who-its-for' },
  { label: 'Templates', id: 'templates' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'FAQ', id: 'faq' },
]

/**
 * Which section is on screen, for the glow.
 *
 * An observer rather than scroll maths: the browser already knows what is
 * visible, and the top band is discounted so a section counts as "current"
 * once it is properly in view rather than as its first pixel appears.
 */
function useActiveSection(ids) {
  const [active, setActive] = useState(null)

  useEffect(() => {
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean)
    if (!sections.length) return

    const visible = new Map()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.intersectionRatio)
        const best = [...visible.entries()].sort((a, b) => b[1] - a[1])[0]
        setActive(best && best[1] > 0 ? best[0] : null)
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [ids])

  return active
}

const SECTION_IDS = NAV_LINKS.map((link) => link.id)

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [progress, setProgress] = useState(0)
  const location = useLocation()
  const active = useActiveSection(SECTION_IDS)
  const { status, logout } = useAuth()

  /**
   * Scrolls without writing to the URL: these are positions on one page, not
   * addresses, and "#pricing" left in the bar is a link that reopens the site
   * half way down. `scroll-mt` on each section keeps the sticky header clear.
   */
  const goToSection = (id) => (event) => {
    event.preventDefault()
    setOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const signedIn = status === 'authenticated'

  useEffect(() => {
    let frame = 0

    function measure() {
      frame = 0
      const y = Math.max(0, window.scrollY)
      const travel = document.documentElement.scrollHeight - window.innerHeight

      setScrolled(y > 8)
      setProgress(travel > 0 ? Math.min(100, (y / travel) * 100) : 0)
    }

    // Scroll fires far faster than the screen repaints; coalesce to one
    // measurement per frame so this can't become the reason scrolling stutters.
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => setOpen(false), [location])

  return (
    <header
      className={cx(
        'sticky top-0 z-50 border-b backdrop-blur-md',
        // `relative` seats the scroll-progress rule on the bottom edge.
        'relative',
        // The bar stays put at every scroll position; only its skin changes.
        'transition-[background-color,box-shadow,border-color] duration-300 ease-out',
        scrolled
          ? 'border-slate-200 bg-white/85 shadow-[0_4px_20px_rgba(15,37,68,0.08)]'
          : 'border-transparent bg-white/90'
      )}
    >
      {/* The bar tightens up once you leave the top of the page. */}
      <div
        className={cx(
          'container-page flex items-center justify-between gap-6 transition-[height] duration-300 ease-out',
          scrolled ? 'h-14' : 'h-16'
        )}
      >
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={`#${link.id}`}
              onClick={goToSection(link.id)}
              aria-current={active === link.id ? 'true' : undefined}
              className={cx(
                'group relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active === link.id ? 'nav-active font-semibold' : 'text-slate-600 hover:text-navy-900'
              )}
            >
              {link.label}
              {/* Rule wipes out from the centre on hover. */}
              <span
                className="absolute inset-x-3 bottom-1 h-px origin-center scale-x-0 bg-navy-900 transition-transform duration-200 ease-out group-hover:scale-x-100 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </a>
          ))}
        </nav>

        {/* While the stored token is being revalidated we render nothing here,
            so a signed-in visitor never sees Log in / Sign up flash past. */}
        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <>
              <Button as={Link} to="/dashboard" size="sm">
                Dashboard
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={logout}>
                Log out
              </Button>
            </>
          ) : (
            status === 'anonymous' && (
              <>
                <Button as={Link} to="/login" variant="ghost" size="sm">
                  Log in
                </Button>
                <Button as={Link} to="/signup" size="sm">
                  Sign up
                </Button>
              </>
            )
          )}
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-navy-900 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-slate-200 bg-white md:hidden">
          <nav className="container-page flex flex-col py-3" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={`#${link.id}`}
                onClick={goToSection(link.id)}
                aria-current={active === link.id ? 'true' : undefined}
                className={cx(
                  'rounded-md px-2 py-3 text-sm font-medium hover:bg-slate-50',
                  active === link.id ? 'nav-active font-semibold' : 'text-slate-700'
                )}
              >
                {link.label}
              </a>
            ))}
            {signedIn ? (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <Button as={Link} to="/dashboard">
                  Dashboard
                </Button>
                <Button type="button" variant="secondary" onClick={logout}>
                  Log out
                </Button>
              </div>
            ) : (
              status === 'anonymous' && (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                  <Button as={Link} to="/login" variant="secondary">
                    Log in
                  </Button>
                  <Button as={Link} to="/signup">
                    Sign up
                  </Button>
                </div>
              )
            )}
          </nav>
        </div>
      )}

      {/* How far down the page you are, drawn on the header's own bottom edge.
          Width is set inline because it is a continuous value, not a class. */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-accent-500/80 transition-opacity duration-300"
        style={{ transform: `scaleX(${progress / 100})`, opacity: scrolled ? 1 : 0 }}
        aria-hidden="true"
      />
    </header>
  )
}
