import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Link2,
  QrCode as QrCodeIcon,
  LayoutTemplate,
  Share2,
  Check,
  ChevronDown,
  ArrowRight,
  Camera,
  Code2,
  PenTool,
  Briefcase,
  Building2,
  Home,
  ScanLine,
  Smartphone,
} from 'lucide-react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import PhoneFrame from '../components/PhoneFrame'
import { PLANS } from '../data/plans'
import AnimatedBackdrop from '../components/AnimatedBackdrop'
import QrCode from '../components/QrCode'
import CardView from '../components/CardView'
import ScaledCard from '../components/ScaledCard'
import { Button, Panel, SectionHeading, Badge, BrandMark, ScanCorners, cx } from '../components/ui'
import { DEMO_CARDS, DEMO_USERNAME, SITE_DOMAIN } from '../data/mockData'
import { TEMPLATES } from '../templates'

/* ------------------------------------------------------------------- data */

const FEATURES = [
  {
    icon: Link2,
    title: 'A personal link',
    body: `Claim ${SITE_DOMAIN}/yourname and put it in your email signature, bio or CV. It never changes, even when your job does.`,
  },
  {
    icon: QrCodeIcon,
    title: 'A downloadable QR code',
    body: 'Export a print-ready PNG or vector SVG for your storefront, packaging, name badge or slide deck.',
  },
  {
    icon: LayoutTemplate,
    title: 'Professional templates',
    body: 'Five designs built for business — pick one, set your accent colour and switch any time without a new link.',
  },
  {
    icon: Share2,
    title: 'All your links in one place',
    body: 'Instagram, Fiverr, Upwork, LinkedIn, WhatsApp and your portfolio site, as large tappable buttons.',
  },
]

const STEPS = [
  {
    title: 'Sign up',
    body: 'Create a free account and claim the username that becomes your permanent card URL.',
  },
  {
    title: 'Fill your info & pick a template',
    body: 'Add your photo, title, bio, contact details and links, then choose the design that fits your work.',
  },
  {
    title: 'Share your link or QR',
    body: 'Send the link, show the QR code, or let people tap “Save contact” to land straight in their phone.',
  },
]

const AUDIENCES = [
  { icon: Briefcase, title: 'Freelancers', body: 'Turn every conversation into a booked call.' },
  { icon: PenTool, title: 'Designers', body: 'Send your portfolio and socials in one tap.' },
  { icon: Code2, title: 'Developers', body: 'GitHub, LinkedIn and your rate card together.' },
  { icon: Camera, title: 'Photographers', body: 'Show your work at the venue, on the spot.' },
  { icon: Building2, title: 'Consultants', body: 'Look established from the first handshake.' },
  { icon: Home, title: 'Real-estate agents', body: 'A QR on every listing sign and window.' },
]

const FAQS = [
  {
    q: 'Do the people I share my card with need an app?',
    a: 'No. Your card is a normal web page. Anyone can open the link or scan the QR code with their phone camera — nothing to install on either side.',
  },
  {
    q: 'Can I change my details after I publish?',
    a: 'Yes, and that is the point. Edit anything from your dashboard and the change is live instantly. Your link and QR code stay exactly the same, so printed codes never go stale.',
  },
  {
    q: 'What happens to my card if I cancel Pro?',
    a: 'Your card stays online on the Free plan. You keep your username, your links and your QR code; the Pro-only extras such as analytics and custom domains are simply paused.',
  },
  {
    q: 'Can I use my own domain name?',
    a: 'On the Pro plan you can point a domain you own — for example card.yourstudio.com — at your CardFolio card. We issue the SSL certificate automatically.',
  },
  {
    q: 'Does the QR code work in print?',
    a: 'Yes. Download the vector SVG for anything printed — signage, packaging, roll-ups — or the 1024px PNG for slides and social posts. Both stay sharp at any size.',
  },
]

/* --------------------------------------------------------------- sections */

function Hero() {
  const card = DEMO_CARDS.demo

  // The hero fills the first screen and uses the full page width, rather than
  // sitting in the 1200px column the rest of the page is set in: it is the one
  // section whose job is the whole viewport. `100dvh - 4rem` is the screen
  // minus the sticky header, so nothing is cut off underneath it.
  return (
    <section className="relative flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden border-b border-slate-200 bg-white">
      <AnimatedBackdrop className="-z-10" />
      <div className="mx-auto grid w-full max-w-[1600px] items-center gap-14 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:px-12 lg:py-20 xl:px-16">
        <div className="animate-fade-up">
          <Badge tone="accent">
            <span className="h-1.5 w-1.5 rounded-md bg-accent-500" aria-hidden="true" />
            Trusted by 12,000+ professionals
          </Badge>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-navy-900 text-balance sm:text-5xl lg:text-[3.4rem]">
            Your business card should never run out.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            CardFolio turns your contact details, portfolio and social profiles into one professional digital card —
            shared with a personal link or a QR code, updated in seconds, never reprinted.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button as={Link} to="/signup" size="lg">
              Create your free card
              <ArrowRight size={17} aria-hidden="true" />
            </Button>
            <Button as={Link} to={`/${DEMO_USERNAME}`} variant="secondary" size="lg">
              <Smartphone size={17} aria-hidden="true" />
              See a live card
            </Button>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            {['Free plan, no card required', 'Ready in under 3 minutes', 'Works on every phone'].map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <Check size={15} className="text-accent-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* The row is pinned to the right edge, so widening the gap moves the
            phone left and leaves the QR where it is. */}
        <div className="flex items-center justify-center gap-6 lg:justify-end lg:gap-12 xl:gap-16">
          <PhoneFrame scale="md" chrome tilt className="animate-fade-up">
            <CardView card={card} interactive={false} />
          </PhoneFrame>

          <div className="hidden animate-fade-up flex-col items-center sm:flex">
            {/* Viewfinder corners rather than the address printed underneath:
                the URL only restated what the code already carries, and it
                wrapped badly on a long domain. */}
            <div className="relative p-2.5">
              <ScanCorners accent={card.accent} />
              <Panel className="p-4">
                <QrCode value={`https://${SITE_DOMAIN}/${card.username}`} size={132} />
              </Panel>
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <ScanLine size={14} aria-hidden="true" />
              Scan to open
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-b border-slate-200 bg-slate-50 py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="What you get"
          title="Everything a paper card can’t do"
          description="One card that holds your whole professional presence and updates the moment your details change."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Panel key={feature.title} className="p-6 transition-shadow hover:shadow-[var(--shadow-lift)]">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-navy-900 text-white" aria-hidden="true">
                <feature.icon size={20} />
              </span>
              <h3 className="mt-5 text-base font-bold text-navy-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.body}</p>
            </Panel>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-slate-200 py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="How it works"
          title="Live in three steps"
          description="No design skills, no developer, no printer."
        />

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative">
              <Panel className="h-full p-7">
                <span className="grid h-11 w-11 place-items-center rounded-md border border-accent-100 bg-accent-50 text-lg font-extrabold text-accent-600">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-bold text-navy-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </Panel>
              {index < STEPS.length - 1 && (
                <ArrowRight
                  size={20}
                  className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-slate-300 md:block"
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function WhoItsFor() {
  return (
    <section id="who-its-for" className="scroll-mt-20 border-b border-slate-200 bg-slate-50 py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="Who it’s for"
          title="Built for people who introduce themselves for a living"
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.title}
              className="flex items-start gap-4 rounded-md border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent-50 text-accent-600"
                aria-hidden="true"
              >
                <audience.icon size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-navy-900">{audience.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{audience.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TemplatesShowcase() {
  const previews = [
    { template: 'minimal', card: DEMO_CARDS.demo },
    { template: 'executive', card: DEMO_CARDS.demo },
    { template: 'darkpro', card: DEMO_CARDS.marcusdev },
    { template: 'photo', card: DEMO_CARDS.sarahkim },
  ]

  return (
    <section id="templates" className="scroll-mt-20 border-b border-slate-200 py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="Templates"
          title="Designs that look like you mean business"
          description="Every template shares the same information — switch whenever you like, your link stays the same."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {previews.map(({ template, card }) => {
            const meta = TEMPLATES.find((t) => t.id === template)
            return (
              <div key={template} className="flex flex-col items-center">
                <div className="w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-4 shadow-[var(--shadow-card)]">
                  {/* Scaled, not reflowed, so the preview matches the real card. */}
                  <div className="mx-auto h-[380px] w-full max-w-[240px] overflow-hidden rounded-md border border-slate-200 bg-white">
                    <ScaledCard>
                      <CardView card={{ ...card, template }} interactive={false} />
                    </ScaledCard>
                  </div>
                </div>
                <h3 className="mt-4 text-sm font-bold text-navy-900">{meta.name}</h3>
                <p className="mt-1 px-2 text-center text-xs leading-relaxed text-slate-500">{meta.description}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <Button as={Link} to="/signup" variant="navy" size="lg">
            Try every template free
          </Button>
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-b border-slate-200 bg-slate-50 py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free. Upgrade when it pays for itself."
          description="No setup fees, no per-scan charges, cancel any time."
        />

        {/* The product is a business card, so the plans are printed on one:
            Free on white stock, Pro on navy. They sit very slightly askew, as
            two cards dropped on a desk would, and straighten when you reach
            for one. */}
        <div className="mx-auto mt-14 grid max-w-4xl gap-7 lg:grid-cols-2" style={{ perspective: '1600px' }}>
          {PLANS.map((plan, index) => {
            const dark = Boolean(plan.highlight)
            return (
              <div
                key={plan.name}
                className={cx(
                  'group relative flex flex-col overflow-hidden rounded-md p-7 lg:p-8',
                  'transition-transform duration-500 ease-out hover:rotate-0 motion-reduce:transform-none motion-reduce:transition-none',
                  index === 0 ? '-rotate-1' : 'rotate-1',
                  dark
                    ? 'bg-navy-900 text-white shadow-[0_22px_48px_-16px_rgba(9,23,41,0.65)] ring-1 ring-navy-950'
                    : 'bg-white text-navy-900 shadow-[0_18px_40px_-18px_rgba(9,23,41,0.45)] ring-1 ring-slate-200'
                )}
              >
                {/* Card stock: a sheen across the corner, and the accent edge a
                    printer would foil. */}
                <span
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: dark
                      ? 'linear-gradient(135deg,rgba(255,255,255,0.10) 0%,transparent 42%)'
                      : 'linear-gradient(135deg,rgba(15,37,68,0.05) 0%,transparent 42%)',
                  }}
                  aria-hidden="true"
                />
                <span
                  className={cx('pointer-events-none absolute inset-x-0 top-0 h-1', dark ? 'bg-accent-500' : 'bg-navy-900')}
                  aria-hidden="true"
                />

                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <h3
                      className={cx(
                        'text-[11px] font-bold uppercase tracking-[0.18em]',
                        dark ? 'text-slate-400' : 'text-slate-500'
                      )}
                    >
                      {plan.name}
                    </h3>
                    <p className="mt-3 flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                      <span className={cx('text-sm font-medium', dark ? 'text-slate-400' : 'text-slate-500')}>
                        {plan.cadence}
                      </span>
                    </p>
                  </div>

                  {/* Where a card carries its logo. Inverted on the navy stock
                      so the front card reads white against it. */}
                  <BrandMark invert={dark} className="h-11 w-11 shrink-0" />
                </div>

                <p className={cx('relative mt-4 text-sm', dark ? 'text-slate-300' : 'text-slate-600')}>
                  {plan.description}
                </p>

                <span
                  className={cx('relative mt-6 block h-px', dark ? 'bg-white/15' : 'bg-slate-200')}
                  aria-hidden="true"
                />

                <ul className="relative mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={cx('flex items-start gap-2.5 text-sm', dark ? 'text-slate-200' : 'text-slate-700')}
                    >
                      <Check
                        size={16}
                        className={cx('mt-0.5 shrink-0', dark ? 'text-accent-400' : 'text-accent-500')}
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  as={Link}
                  to={plan.to}
                  variant={dark ? 'primary' : 'secondary'}
                  size="lg"
                  className="relative mt-8 w-full"
                >
                  {plan.cta}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)

  return (
    <section id="faq" className="scroll-mt-20 py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />

        <div className="mx-auto mt-12 max-w-3xl divide-y divide-slate-200 border-y border-slate-200">
          {FAQS.map((faq, index) => {
            const expanded = open === index
            return (
              <div key={faq.q}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? -1 : index)}
                    aria-expanded={expanded}
                    aria-controls={`faq-panel-${index}`}
                    id={`faq-trigger-${index}`}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className="text-base font-semibold text-navy-900">{faq.q}</span>
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={cx(
                        'shrink-0 text-slate-400 transition-transform duration-200',
                        expanded && 'rotate-180 text-accent-500'
                      )}
                    />
                  </button>
                </h3>
                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${index}`}
                  hidden={!expanded}
                  className="pb-5 pr-10"
                >
                  <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-navy-900 py-16 lg:py-20">
      <AnimatedBackdrop tone="dark" />
      <div className="container-page relative flex flex-col items-center gap-7 text-center">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
          Claim your username before someone else does
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-slate-300">
          It takes three minutes and costs nothing. Your next contact will be impressed.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button as={Link} to="/signup" size="lg">
            Create your free card
            <ArrowRight size={17} aria-hidden="true" />
          </Button>
          <Button
            as={Link}
            to={`/${DEMO_USERNAME}`}
            size="lg"
            variant="ghost"
            className="border-navy-700 text-slate-200 hover:bg-navy-800 hover:text-white"
          >
            View the demo
          </Button>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------- page */

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <WhoItsFor />
        <TemplatesShowcase />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}
