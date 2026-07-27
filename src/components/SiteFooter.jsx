import { Link } from 'react-router-dom'
import { Linkedin, Instagram, Github, Twitter, Youtube } from 'lucide-react'
import { Logo } from './ui'

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      // Same order as the page and the header nav.
      { label: 'Features', to: '/#features' },
      { label: 'How it works', to: '/#how-it-works' },
      { label: 'Templates', to: '/#templates' },
      { label: 'Pricing', to: '/#pricing' },
      { label: 'Live demo card', to: '/demo' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/#who-its-for' },
      { label: 'Blog', to: '/#faq' },
      { label: 'Careers', to: '/#faq' },
      { label: 'Contact', to: '/#faq' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQ', to: '/#faq' },
      { label: 'Help centre', to: '/#faq' },
      { label: 'Status', to: '/#faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', to: '/#faq' },
      { label: 'Terms of service', to: '/#faq' },
      { label: 'Cookie policy', to: '/#faq' },
      { label: 'GDPR', to: '/#faq' },
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

export default function SiteFooter() {
  return (
    <footer className="border-t border-navy-800 bg-navy-900 text-slate-300">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo invert />
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              One link and one QR code that carry your whole professional identity — no paper, no reprints.
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
            <div key={column.title}>
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-slate-400 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-navy-800 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CardFolio. All rights reserved.</p>
          <p>Made for people who hate reprinting business cards.</p>
        </div>
      </div>
    </footer>
  )
}
