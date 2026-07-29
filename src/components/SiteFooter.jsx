import { Link } from 'react-router-dom'
import { Linkedin, Instagram, Github, Twitter, Youtube } from 'lucide-react'
import { useState } from 'react'
import { Logo } from './ui'
import LegalDialog from './LegalDialog'
import { DEMO_USERNAME } from '../data/mockData'
import { useT } from '../lib/i18n'

// Keys, not labels — the words come from src/locales at render time.
const FOOTER_COLUMNS = [
  {
    key: 'product',
    links: [
      // Same order as the page and the header nav.
      { key: 'features', to: '/#features' },
      { key: 'howItWorks', to: '/#how-it-works' },
      { key: 'templates', to: '/#templates' },
      { key: 'pricing', to: '/#pricing' },
      { key: 'demoCard', to: `/${DEMO_USERNAME}` },
    ],
  },
  {
    key: 'company',
    links: [
      { key: 'about', to: '/#who-its-for' },
      { key: 'blog', to: '/#faq' },
      { key: 'careers', to: '/#faq' },
      { key: 'contact', to: '/#faq' },
    ],
  },
  {
    key: 'resources',
    links: [
      { key: 'faq', to: '/#faq' },
      { key: 'help', to: '/#faq' },
      { key: 'status', to: '/#faq' },
    ],
  },
  {
    key: 'legal',
    links: [
      // These two open the documents in place; the rest are page anchors.
      { key: 'privacy', doc: 'privacy' },
      { key: 'terms', doc: 'terms' },
      { key: 'cookies', to: '/#faq' },
      { key: 'gdpr', to: '/#faq' },
    ],
  },
]

const SOCIALS = [
  { label: 'CardFolio on LinkedIn', icon: Linkedin },
  { label: 'CardFolio on X', icon: Twitter },
  { label: 'CardFolio on Instagram', icon: Instagram },
  { label: 'CardFolio on YouTube', icon: Youtube },
  { label: 'CardFolio on GitHub', icon: Github },
]

/**
 * A "/#section" link scrolls instead of navigating, so the address bar keeps
 * showing the site rather than a position within it — matching the header.
 * Anything else (a real route like /demo) is left to the router.
 */
function sectionJump(to) {
  return (event) => {
    if (!to.startsWith('/#') || window.location.pathname !== '/') return
    const target = document.getElementById(to.slice(2))
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export default function SiteFooter() {
  const t = useT()
  const [legalDoc, setLegalDoc] = useState(null)
  return (
    <footer className="border-t border-navy-800 bg-navy-900 text-slate-300">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo invert />
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              {t('hero.subtitle')}
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  className="grid h-9 w-9 place-items-center rounded-md border border-navy-700 text-slate-400 transition-colors hover:border-accent-500 hover:text-white"
                >
                  <social.icon size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.key}>
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
                {t(`footerNav.${column.key}`)}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.key}>
                    {link.doc ? (
                      <button
                        type="button"
                        onClick={() => setLegalDoc(link.doc)}
                        className="text-sm text-slate-400 transition-colors hover:text-white"
                      >
                        {t(`footerNav.${link.key}`)}
                      </button>
                    ) : (
                      <Link
                        to={link.to}
                        onClick={sectionJump(link.to)}
                        className="text-sm text-slate-400 transition-colors hover:text-white"
                      >
                        {t(`footerNav.${link.key}`)}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-navy-800 pt-6 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CardFolio. {t('landing.footer.rights')}</p>
          <p>{t('landing.footer.tagline')}</p>
        </div>
      </div>
      {legalDoc && <LegalDialog doc={legalDoc} onClose={() => setLegalDoc(null)} />}
    </footer>
  )
}
