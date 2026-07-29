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
import { useI18n, useT } from '../lib/i18n'
import { TEMPLATES } from '../templates'

/* ------------------------------------------------------------------- data */

/**
 * The page's content, as keys rather than as copy.
 *
 * Only the icon is a property of the design; every word belongs to whichever
 * language the visitor is reading in, so it lives in src/locales and is looked
 * up at render. That also means adding a language is a file, not an edit to
 * this page.
 */
const FEATURES = [
  { icon: Link2, key: 'link' },
  { icon: QrCodeIcon, key: 'qr' },
  { icon: LayoutTemplate, key: 'templates' },
  { icon: Share2, key: 'links' },
]

const STEPS = ['signup', 'fill', 'share']

const AUDIENCES = [
  { icon: Briefcase, key: 'freelancers' },
  { icon: PenTool, key: 'designers' },
  { icon: Code2, key: 'developers' },
  { icon: Camera, key: 'photographers' },
  { icon: Building2, key: 'consultants' },
  { icon: Home, key: 'agents' },
]

const FAQS = ['app', 'edit', 'cancel', 'domain', 'print']

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

/** Live answer to a media query, for layout decisions CSS can't express. */
function useMedia(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )

  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = (event) => setMatches(event.matches)
    setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

function Hero() {
  const t = useT()
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
  const staged = useMedia('(min-width: 1024px)')

  /**
   * The frame size, picked for legibility rather than for looks.
   *
   * Cards are laid out at a 375px design width and scaled to fit the screen
   * they are shown in, so a small frame is a downscaled card: at the 300px
   * `md` screen every glyph renders at 80% of the size it was drawn for, which
   * is exactly the soft, slightly muddy text this is fixing. The largest frame
   * that still fits the viewport is therefore the sharpest one — `xl` is 96%
   * of design size, near enough 1:1.
   *
   * Height is the constraint, not width: the `xl` body stands ~806px tall and
   * has to sit inside a pinned screen without being clipped.
   */
  const tallViewport = useMedia('(min-height: 900px)')
  const roomyPhone = useMedia('(min-width: 400px)')
  const frameScale = staged ? (tallViewport ? 'xl' : 'lg') : roomyPhone ? 'md' : 'sm'
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
  /**
   * Re-measured when the writing direction changes, and not only on resize.
   *
   * In Arabic the whole grid mirrors, so the phone rests on the other side of
   * the screen and has to travel the other way. The direction is also applied
   * a beat late — the provider writes `dir` on <html> in a passive effect,
   * which runs after this layout effect — so measuring once on mount reads the
   * left-to-right position and then holds a shift that points the wrong way.
   */
  const { dir } = useI18n()

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
    // And once more after the browser has laid the page out: fonts, a late
    // `dir` flip and the scrollbar all move the resting position, and all of
    // them land after this effect runs.
    const frame = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
    }
    // `frameScale` and `dir` too: either one is a different resting position.
  }, [staged, frameScale, dir])

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

  /**
   * The device starts smaller and reaches full size as it takes the stage.
   *
   * It grows *into* 1, rather than past it: this scales a composited layer, so
   * anything above 1 enlarges the card instead of redrawing it and costs
   * sharpness. Ending at exactly 1 means the state you actually read the card
   * in — centred, alone on screen — is the one rendered at full resolution,
   * and the small opening state is the only one paying for the effect.
   */
  const bodyScale = staged ? 0.78 + 0.22 * turned : 1

  /**
   * How far from square the device still is: 1 in the opening frame, 0 once it
   * has taken the stage.
   *
   * Held at a slight angle to start with — enough to show the rail and read as
   * an object on a table, not enough to skew the display — and square by the
   * time it reaches the middle, which is where it is meant to be read. Kept
   * off the phone layout, where there is no travel to straighten out of.
   */
  const rest = staged ? 1 - turned : 0

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
        'relative border-b border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900',
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
                {t('hero.badge')}
              </Badge>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-navy-900 dark:text-white text-balance sm:text-5xl lg:text-[3.4rem]">
                {t('hero.title')}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                {t('hero.subtitle')}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button as={Link} to="/signup" size="lg">
                  {t('hero.createCard')}
                  <ArrowRight size={17} aria-hidden="true" className="rtl-flip" />
                </Button>
                <Button as={Link} to={`/${DEMO_USERNAME}`} variant="secondary" size="lg">
                  <Smartphone size={17} aria-hidden="true" />
                  {t('hero.seeLiveCard')}
                </Button>
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                {[t('hero.freePlan'), t('hero.readyIn'), t('hero.worksEverywhere')].map((item) => (
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
                perspective: '900px',
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
                  scale={frameScale}
                  solid={staged}
                  chrome
                  progress={staged ? play : undefined}
                  bodyStyle={{
                    // The opening lean and the pointer lean are added, not
                    // chosen between: the device answers the cursor the whole
                    // way through, it just does it from a tilted rest pose at
                    // the start and a square one at the end.
                    /**
                     * One axis for the opening pose: the vertical one.
                     *
                     * Stacking a tip-back and a roll on top of the turn puts
                     * the axis on a diagonal, and a flat panel rotated about a
                     * diagonal reads as twisted — top-right going back while
                     * bottom-right comes forward. Turning about Y alone swings
                     * it like a door: one edge back, the other forward, the
                     * same the whole height of the device.
                     */
                    transform: [
                      `rotateY(${-9 * rest + lean.x * 2}deg)`,
                      `rotateX(${-lean.y * 1.4}deg)`,
                      `scale(${bodyScale})`,
                    ].join(' '),
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
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <ScanLine size={14} aria-hidden="true" />
                  {t('hero.scanToOpen')}
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
  const t = useT()
  return (
    <section id="features" className="scroll-mt-20 border-b border-slate-200 dark:border-navy-800 bg-slate-50 dark:bg-navy-950 py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('landing.features.eyebrow')}
          title={t('landing.features.title')}
          description={t('landing.features.description')}
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Panel key={feature.key} className="p-6 transition-shadow hover:shadow-[var(--shadow-lift)]">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-navy-900 text-white" aria-hidden="true">
                <feature.icon size={20} />
              </span>
              <h3 className="mt-5 text-base font-bold text-navy-900 dark:text-white">
                {t(`landing.features.${feature.key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {t(`landing.features.${feature.key}.body`, { domain: SITE_DOMAIN })}
              </p>
            </Panel>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const t = useT()
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-slate-200 dark:border-navy-800 py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('landing.steps.eyebrow')}
          title={t('landing.steps.title')}
          description={t('landing.steps.description')}
        />

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step} className="relative">
              <Panel className="h-full p-7">
                <span className="grid h-11 w-11 place-items-center rounded-md border border-accent-100 bg-accent-50 dark:bg-accent-900/30 text-lg font-extrabold text-accent-600 dark:text-accent-300">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-bold text-navy-900 dark:text-white">{t(`landing.steps.${step}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t(`landing.steps.${step}.body`)}</p>
              </Panel>
              {index < STEPS.length - 1 && (
                <ArrowRight
                  size={20}
                  // `-end-4` and the flip together: in Arabic the steps run
                  // right to left, so the connector has to move to the other
                  // side of the card *and* point the other way.
                  className="rtl-flip absolute -end-4 top-1/2 hidden -translate-y-1/2 text-slate-300 md:block"
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
  const t = useT()
  return (
    <section id="who-its-for" className="scroll-mt-20 border-b border-slate-200 dark:border-navy-800 bg-slate-50 dark:bg-navy-950 py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading eyebrow={t('landing.audiences.eyebrow')} title={t('landing.audiences.title')} />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.key}
              className="flex items-start gap-4 rounded-md border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 p-5 transition-colors hover:border-slate-300"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-300"
                aria-hidden="true"
              >
                <audience.icon size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-navy-900 dark:text-white">{t(`landing.audiences.${audience.key}.title`)}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t(`landing.audiences.${audience.key}.body`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TemplatesShowcase() {
  const t = useT()
  const previews = [
    { template: 'minimal', card: DEMO_CARDS.demo },
    { template: 'executive', card: DEMO_CARDS.demo },
    { template: 'darkpro', card: DEMO_CARDS.marcusdev },
    { template: 'photo', card: DEMO_CARDS.sarahkim },
  ]

  return (
    <section id="templates" className="scroll-mt-20 border-b border-slate-200 dark:border-navy-800 py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('landing.templates.eyebrow')}
          title={t('landing.templates.title')}
          description={t('landing.templates.description')}
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {previews.map(({ template, card }) => {
            const meta = TEMPLATES.find((t) => t.id === template)
            return (
              <div key={template} className="flex flex-col items-center">
                <div className="w-full overflow-hidden rounded-md border border-slate-200 dark:border-navy-800 bg-slate-50 dark:bg-navy-950 p-4 shadow-[var(--shadow-card)]">
                  {/* Scaled, not reflowed, so the preview matches the real card. */}
                  <div className="mx-auto h-[380px] w-full max-w-[240px] overflow-hidden rounded-md border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900">
                    <ScaledCard>
                      <CardView card={{ ...card, template }} interactive={false} />
                    </ScaledCard>
                  </div>
                </div>
                <h3 className="mt-4 text-sm font-bold text-navy-900 dark:text-white">{meta.name}</h3>
                <p className="mt-1 px-2 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">{meta.description}</p>
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
  const t = useT()
  return (
    <section id="pricing" className="scroll-mt-20 border-b border-slate-200 dark:border-navy-800 bg-slate-50 dark:bg-navy-950 py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('landing.pricing.eyebrow')}
          title={t('landing.pricing.title')}
          description={t('landing.pricing.description')}
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
                key={t(`plans.${plan.id}.name`)}
                className={cx(
                  'group relative flex flex-col overflow-hidden rounded-md p-7 lg:p-8',
                  'transition-transform duration-500 ease-out hover:rotate-0 motion-reduce:transform-none motion-reduce:transition-none',
                  index === 0 ? '-rotate-1' : 'rotate-1',
                  /**
                   * In the dark theme both cards would otherwise land on the
                   * same charcoal — the Pro card is navy by design and the
                   * neutral palette flattens the Free card onto it. Free takes
                   * a wash of the accent instead: enough blue to read as a
                   * different piece of card stock, still quiet enough that Pro
                   * keeps the emphasis.
                   */
                  dark
                    ? 'bg-navy-900 text-white shadow-[0_22px_48px_-16px_rgba(9,23,41,0.65)] ring-1 ring-navy-950'
                    : 'bg-white text-navy-900 shadow-[0_18px_40px_-18px_rgba(9,23,41,0.45)] ring-1 ring-slate-200 ' +
                      'dark:bg-accent-500/10 dark:text-white dark:ring-accent-500/25 ' +
                      'dark:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]'
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
                  // The foil edge: navy on white stock, accent on both dark
                  // cards — on charcoal a navy line is no line at all.
                  className={cx(
                    'pointer-events-none absolute inset-x-0 top-0 h-1',
                    dark ? 'bg-accent-500' : 'bg-navy-900 dark:bg-accent-400'
                  )}
                  aria-hidden="true"
                />

                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <h3
                      className={cx(
                        'text-[11px] font-bold uppercase tracking-[0.18em]',
                        dark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {t(`plans.${plan.id}.name`)}
                    </h3>
                    <p className="mt-3 flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                      <span className={cx('text-sm font-medium', dark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400')}>
                        {t(`plans.${plan.id}.cadence`)}
                      </span>
                    </p>
                  </div>

                  {/* Where a card carries its logo. Inverted on the navy stock
                      so the front card reads white against it. */}
                  <BrandMark invert={dark} className="h-11 w-11 shrink-0" />
                </div>

                <p className={cx('relative mt-4 text-sm', dark ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300')}>
                  {t(`plans.${plan.id}.description`)}
                </p>

                <span
                  className={cx('relative mt-6 block h-px', dark ? 'bg-white/15' : 'bg-slate-200 dark:bg-navy-800')}
                  aria-hidden="true"
                />

                <ul className="relative mt-6 flex-1 space-y-3">
                  {Array.from({ length: plan.featureCount }, (_, i) =>
                    t(`plans.${plan.id}.features.${i}`, { domain: SITE_DOMAIN })
                  ).map((feature) => (
                    <li
                      key={feature}
                      className={cx('flex items-start gap-2.5 text-sm', dark ? 'text-slate-200' : 'text-slate-700 dark:text-slate-200')}
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
                  {t(`plans.${plan.id}.cta`)}
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
  const t = useT()
  const [open, setOpen] = useState(0)

  return (
    <section id="faq" className="scroll-mt-20 py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading eyebrow={t('landing.faq.eyebrow')} title={t('landing.faq.title')} />

        <div className="mx-auto mt-12 max-w-3xl divide-y divide-slate-200 border-y border-slate-200 dark:border-navy-800">
          {FAQS.map((faq, index) => {
            const expanded = open === index
            return (
              <div key={faq}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? -1 : index)}
                    aria-expanded={expanded}
                    aria-controls={`faq-panel-${index}`}
                    id={`faq-trigger-${index}`}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className="text-base font-semibold text-navy-900 dark:text-white">{t(`landing.faq.${faq}.q`)}</span>
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
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t(`landing.faq.${faq}.a`)}</p>
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
  const t = useT()
  return (
    <section className="relative overflow-hidden bg-navy-900 py-16 lg:py-20">
      <AnimatedBackdrop tone="dark" />
      <div className="container-page relative flex flex-col items-center gap-7 text-center">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
          {t('cta.title')}
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-slate-300">{t('cta.subtitle')}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button as={Link} to="/signup" size="lg">
            {t('hero.createCard')}
            <ArrowRight size={17} aria-hidden="true" className="rtl-flip" />
          </Button>
          <Button as={Link} to={`/${DEMO_USERNAME}`} size="lg" variant="ghostOnDark">
            {t('cta.viewDemo')}
          </Button>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------- page */

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white dark:bg-navy-900">
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
