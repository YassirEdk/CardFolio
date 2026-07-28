import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

/**
 * Time constant of the scroll glide, in seconds: how long the stage takes to
 * cover about two thirds of the distance to where the scrollbar says it should
 * be. Higher is smoother and looser; too high and the phone visibly lags the
 * page under it.
 */
const GLIDE_TAU = 0.14

/**
 * Scroll progress through an element, 0 while its top is at the top of the
 * viewport and 1 once it has been scrolled past its own extra height.
 *
 * Read in a rAF callback rather than on every scroll event: scroll fires far
 * more often than the screen repaints, and this drives a transform.
 */
function useScrollProgress(ref) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let frame = 0
    let target = 0
    let current = 0
    let last = 0

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function read() {
      const rect = el.getBoundingClientRect()
      const runway = rect.height - window.innerHeight
      target = runway <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / runway))
    }

    /**
     * Chase the target instead of jumping to it.
     *
     * A wheel arrives in coarse steps — often 100px at a time — and mapping
     * those straight onto a transform makes the card lurch. Closing part of
     * the remaining distance each frame turns the steps into motion, and the
     * loop stops once it arrives so nothing runs while the page is still.
     *
     * The fraction is derived from the time since the last frame rather than
     * being a constant: a fixed 18% per frame is a different speed on every
     * display — twice as fast at 120Hz as at 60Hz, and faster still when a
     * frame is dropped, which is exactly when the motion should hold its
     * line. `1 - e^(-dt/TAU)` is the same glide on all of them.
     *
     * `dt` is capped so returning to a backgrounded tab eases in from where
     * the animation was, instead of arriving in a single jump.
     */
    function tick(now) {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60)
      last = now

      const delta = target - current
      const k = 1 - Math.exp(-dt / GLIDE_TAU)
      current = Math.abs(delta) < 0.0005 ? target : current + delta * k
      setProgress(current)

      if (current === target) {
        frame = 0
        last = 0
      } else {
        frame = requestAnimationFrame(tick)
      }
    }

    function onScroll() {
      read()
      // Reduced motion asks for less movement, not for a laggier version of
      // it: follow the scrollbar exactly and run no animation loop at all.
      if (reduceMotion) {
        current = target
        setProgress(target)
        return
      }
      if (!frame) frame = requestAnimationFrame(tick)
    }

    read()
    current = target
    setProgress(current)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ref])

  return progress
}

/** True on screens wide enough for the scroll stage — see Hero. */
function useWideScreen() {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const onChange = (event) => setWide(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return wide
}

function Hero() {
  const card = DEMO_CARDS.demo
  const stageRef = useRef(null)
  const rawProgress = useScrollProgress(stageRef)

  /**
   * The scroll stage is a desktop idea. On a phone the copy and the device
   * are already stacked, there is no room to move the phone "into the middle"
   * of anything, and pinning 220vh of runway means a visitor scrolls three
   * screens of animation before reaching the first section. Below lg the hero
   * is a plain hero: everything visible, nothing pinned.
   */
  const staged = useWideScreen()
  const progress = staged ? rawProgress : 0

  /**
   * Pointer parallax: the device leans a degree or two toward the cursor.
   *
   * Kept this small on purpose — the earlier fixed three-quarter turn read as
   * an italic slant. A couple of degrees that track the pointer read as depth
   * instead, because they respond to you.
   */
  const [lean, setLean] = useState({ x: 0, y: 0 })
  const leanFrom = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setLean({
      x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
      y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
    })
  }

  /**
   * Two acts on one scrollbar. The phone straightens and moves to the middle
   * of an emptying stage first; only once it is upright does the card start
   * playing through it, so the two motions read as cause and effect rather
   * than as everything moving at once.
   */
  /**
   * How far the phone must travel to sit in the middle of the screen.
   *
   * Measured rather than guessed: the column it rests in is sized in `fr`
   * units against the copy beside it, so the distance to the centre is a
   * different number at every window width — a fixed percentage lands it in
   * the middle of one screen and off-centre on the next.
   *
   * The element's own applied shift is subtracted, so this reads its resting
   * position no matter how far through the animation the page happens to be.
   */
  const phoneRef = useRef(null)
  const appliedShift = useRef(0)
  const [centerShift, setCenterShift] = useState(0)

  useLayoutEffect(() => {
    if (!staged) return setCenterShift(0)

    const measure = () => {
      const el = phoneRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const restCenter = rect.left + rect.width / 2 - appliedShift.current
      setCenterShift(window.innerWidth / 2 - restCenter)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [staged])

  const clamp = (t) => Math.min(1, Math.max(0, t))
  const ease = (t) => 1 - Math.pow(1 - t, 3)
  /** Eases in *and* out, so a motion neither starts nor stops abruptly. */
  const smooth = (t) => t * t * (3 - 2 * t)

  const turn = clamp(progress / 0.42)
  /**
   * The copy leaves on its own, shorter clock.
   *
   * Shorter than the phone's travel, so the stage is clear before the device
   * finishes arriving — but measured against a runway three viewports tall,
   * which is what keeps it from being a blink. The two motions overlap enough
   * to read as one.
   */
  const faded = ease(clamp(progress / 0.24))
  /**
   * Finishes at 86%, not at the very end: the last stretch of the pin is a
   * beat where the card is already still, so it is not braking at the moment
   * the page starts scrolling away underneath it. Smoothstepped rather than
   * linear — the card easing to a stop is what makes the last frame of the
   * pin and the first frame of the page scroll read as one movement.
   */
  const play = smooth(clamp((progress - 0.42) / 0.44))
  const turned = ease(turn)

  /**
   * The hand-off. Over the final stretch of the runway the stage lifts and
   * fades a little, so the pin releases into motion that is already underway
   * instead of cutting from a held frame to a scrolling page.
   */
  const exit = smooth(clamp((progress - 0.86) / 0.14))

  // What the phone is currently offset by, for the measurement above.
  appliedShift.current = centerShift * turned



  // The hero fills the first screen and uses the full page width, rather than
  // sitting in the 1200px column the rest of the page is set in: it is the one
  // section whose job is the whole viewport. `100dvh - 4rem` is the screen
  // minus the sticky header, so nothing is cut off underneath it.
  return (
    /**
     * Twice the viewport tall: the extra height is the runway the pinned stage
     * inside it scrolls through. Take it away and there is nothing to drive
     * the animation with.
     */
    <section
      ref={stageRef}
      className={cx(
        'relative border-b border-slate-200 bg-white',
        /**
         * `svh`, not `dvh`, off the stage. A phone's dynamic viewport grows as
         * the address bar rolls away mid-scroll, and a centred hero taller than
         * one screen then shifts under the finger that is scrolling it — which
         * lands the tap next to the button instead of on it. The small viewport
         * unit is the one height that does not move while you scroll.
         */
        staged ? 'h-[320vh]' : 'min-h-[calc(100svh-4rem)]'
      )}
    >
      <div
        className={cx(
          'flex',
          // Centred only where it fits: below lg the hero is taller than the
          // screen, and centring overflow crops the top of it.
          staged ? 'sticky top-0 h-dvh items-center overflow-hidden' : 'min-h-[calc(100svh-4rem)] items-center py-14'
        )}
      >
        <AnimatedBackdrop className="-z-10" />

        {/* The stage leaves under its own power over the last of the runway,
            so the release of the pin lands mid-movement rather than on a
            held frame. Off the stage `exit` is 0 and this is inert. */}
        <div
          className="mx-auto grid w-full max-w-[1600px] items-center gap-14 px-5 lg:grid-cols-[1.05fr_1fr] lg:px-12 xl:px-16"
          style={
            staged
              ? {
                  transform: `translate3d(0, ${-56 * exit}px, 0)`,
                  opacity: 1 - 0.55 * exit,
                  willChange: exit > 0 && exit < 1 ? 'transform, opacity' : undefined,
                }
              : undefined
          }
        >
          {/**
           * The copy clears out of the way as the phone takes the stage.
           *
           * Two elements, and they must stay two: a CSS animation wins over an
           * inline style for the properties it animates, so the entrance
           * animation and the scroll-driven opacity/transform cannot live on
           * the same node — the entrance would hold this at "fully arrived"
           * for good and the fade-out would never render. `pointer-events` is
           * not animated, though, so it *would* still apply: the copy stayed
           * visible while quietly refusing every click on the buttons.
           *
           * `relative z-10` keeps this column above the phone, which animates a
           * transform and so paints in a stacking context of its own.
           */}
          <div
            className="relative z-10"
            style={{
              opacity: 1 - faded,
              transform: `translate3d(${-40 * faded}px, 0, 0)`,
              // Promoted while it is moving only: a layer that never comes
              // back costs memory on every later scroll for nothing.
              willChange: staged && faded < 1 ? 'transform, opacity' : undefined,
              // Only the pinned stage fades the copy out; below lg `faded` is
              // pinned at 0, so the buttons stay live however far you scroll.
              pointerEvents: faded > 0.6 ? 'none' : undefined,
            }}
          >
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
          </div>

          <div className="flex items-center justify-center gap-6 lg:justify-end lg:gap-12 xl:gap-16">
            {/* Upright throughout: the three-quarter turn read as an italic
                slant mid-scroll and fought the card's own layout. It just
                slides into the middle of the stage as the copy leaves.
                The travel is on the outside and the float on the inside for
                the same reason the copy is split in two — one transform per
                element, or the animation swallows the other. */}
            <div
              ref={phoneRef}
              className="relative"
              style={{
                transform: `translate3d(${centerShift * turned}px, 0, 0)`,
                perspective: '1400px',
                willChange: staged && turned < 1 ? 'transform' : undefined,
              }}
              onPointerMove={staged ? leanFrom : undefined}
              onPointerLeave={() => setLean({ x: 0, y: 0 })}
            >
              <div className="animate-phone-float relative">
                <span
                  className="animate-phone-float-shadow absolute -bottom-8 left-1/2 h-6 w-2/3 -translate-x-1/2 rounded-[50%] bg-navy-950/30 blur-2xl"
                  aria-hidden="true"
                />
                <PhoneFrame
                  // Narrower frame on small screens: the `md` body is 322px wide
                  // with its bezel, which overflows a 360px viewport once the
                  // page gutters are taken out.
                  scale={staged ? 'md' : 'sm'}
                  chrome
                  progress={staged ? play : undefined}
                  bodyStyle={{
                    // Grows as it takes the stage: once it is the only thing
                    // on screen it should read as the subject, not as the same
                    // phone that was sitting in the corner a moment ago.
                    transform: `rotateY(${lean.x * 2.5}deg) rotateX(${-lean.y * 2}deg) scale(${1 + 0.18 * turned})`,
                    transformStyle: 'preserve-3d',
                    transition: 'transform 220ms ease-out',
                  }}
                  glare={lean}
                >
                  <CardView card={card} interactive={false} />
                </PhoneFrame>
              </div>
            </div>

            {/* The QR belongs to the opening frame, not to the model. */}
            <div
              className="hidden sm:block"
              style={{
                opacity: 1 - Math.min(1, faded * 1.6),
                willChange: staged && faded < 1 ? 'opacity' : undefined,
              }}
            >
              <div className="animate-fade-up flex flex-col items-center">
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
