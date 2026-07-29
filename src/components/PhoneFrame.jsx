import { useEffect, useRef, useState } from 'react'
import { cx } from './ui'
import ScaledCard, { DESIGN_WIDTH } from './ScaledCard'

/**
 * Slices used to fake the device's thickness. Enough that the wall reads as
 * solid at the angles the hero turns to; more is just more layers to composite.
 */
const DEPTH_SLICES = 8

/**
 * A phone-shaped viewport used for every live card preview.
 * Content scrolls inside the frame so long cards stay contained.
 *
 * `chrome` draws the iPhone-X style hardware — notch, side buttons, home
 * indicator and screen gloss — and is on by default so every preview reads as
 * the same device. Its detail is proportional to `scale`, so the small editor
 * previews stay believable. `tilt` adds a 3D perspective rotation and is kept
 * for showcase surfaces only, where rotating the card is the point.
 *
 * Note: the device body deliberately uses large corner radii. The 8px ceiling
 * is a rule for UI chrome; this is an illustration of a physical object.
 */
export default function PhoneFrame({
  children,
  className,
  scale = 'md',
  chrome = true,
  tilt = false,
  /**
   * 0–1: how far through the card to show, driven from outside. Supplying it
   * turns the screen's own scrolling off — the page is the scrollbar now, and
   * two scroll surfaces fighting over one wheel is what makes those hero
   * animations feel broken.
   */
  progress,
  /** Extra transform on the device body, e.g. a scroll-driven rotation. */
  bodyStyle,
  /**
   * Whether the device has a body behind its face. `false` draws the flat
   * face every small preview wants; `true` extrudes a side wall so a rotated
   * frame reads as an object with a back, rather than as a photograph of a
   * phone on a sheet of paper. Only worth paying for where the device is
   * actually turned — it costs a stack of composited layers.
   */
  solid = false,
  /** The writing direction of the card inside, not of the app around it. */
  dir = 'ltr',
  /**
   * Pointer position as {x, y} in -1..1, used to slide a specular highlight
   * across the glass. Real glass catches the light from wherever you are
   * standing; a fixed sheen just looks like a gradient painted on.
   */
  glare,
}) {
  // Widths track the iPhone X 375×812 ratio (≈0.462) so proportions stay honest.
  const sizes = {
    sm: { width: 240, height: 520 },
    md: { width: 300, height: 650 },
    lg: { width: 330, height: 715 },
    xl: { width: 360, height: 780 },
  }
  const screen = sizes[scale]
  // The screen height expressed in the card's own design pixels, so a short
  // card is stretched to fill the phone rather than stopping mid-screen.
  // Hardware detail is proportional to the device: fixed pixel radii and a
  // fixed notch look right at one size only, and cartoonish at the others.
  /**
   * Measured off the device rather than chosen by eye.
   *
   * On an iPhone the black border around the display is about 2.7% of the body
   * width — roughly 2mm on a 71mm body — and it is the same on all four sides.
   * The old value was half again as thick, which is the single detail that
   * makes a drawn phone read as a phone-shaped box.
   */
  const bezel = Math.max(2, Math.round(screen.width * 0.027))
  const screenRadius = Math.round(screen.width * 0.125)
  const bodyRadius = screenRadius + bezel
  // 209pt of a 375pt width, and 30pt tall: the notch is a known quantity.
  const notchWidth = Math.round(screen.width * 0.557)
  const notchHeight = Math.round(screen.width * 0.08)
  /**
   * Thickness, as a share of the device's width rather than a fixed number of
   * pixels. A phone is about 8mm thick against 71mm wide — a ninth — and a
   * body thinner than that reads as a screen protector rather than a phone,
   * however carefully the side wall is shaded.
   */
  const wall = solid ? Math.round(screen.width * 0.11) : 0
  /** How far the display sits behind the glass. Small, but it is the whole cue. */
  const glass = solid ? Math.max(2, Math.round(screen.width * 0.012)) : 0

  // The card fills the screen edge to edge: a cover photo runs under the notch
  // and the card's own surface reaches the bottom rounding, as on the device.
  const minCardHeight = Math.round((screen.height * DESIGN_WIDTH) / screen.width)

  /**
   * Safe areas handed to the card as CSS variables, in its design pixels so
   * they hold at every frame scale. The card keeps the hardware clear by
   * padding its own content — never by leaving a band of device black, which
   * would read as a hole in the lighter templates.
   */
  /**
   * How far the card can travel inside the screen, measured rather than
   * assumed: card height depends on the template and on how much the person
   * filled in.
   */
  const scrollRef = useRef(null)
  const [travel, setTravel] = useState(0)
  const driven = typeof progress === 'number'

  useEffect(() => {
    const el = scrollRef.current
    if (!driven || !el) return
    const measure = () => setTravel(Math.max(0, el.scrollHeight - el.clientHeight))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [driven, children])

  const toDesignPx = (value) => Math.round((value * DESIGN_WIDTH) / screen.width)
  const safeAreas = chrome
    ? {
        '--phone-safe-top': `${toDesignPx(notchHeight)}px`,
        '--phone-safe-bottom': `${toDesignPx(Math.round(screen.width * 0.05))}px`,
      }
    : undefined

  const body = (
    <div
      className={cx(
        // w-fit: the screen inside is a fixed size, so the body must hug it —
        // left to stretch, it paints bare device gradient beside the screen.
        'relative w-fit',
        /**
         * A solid device paints no background of its own.
         *
         * Under `preserve-3d` this element's fill is painted in its own plane,
         * in front of any child pushed back in Z — so a filled body would hide
         * the recessed screen behind it entirely. The face is drawn instead as
         * a ring below, which has a hole in it for the display to show through.
         */
        !wall && 'bg-gradient-to-b from-[#2c3a4f] via-[#131f33] to-[#050c17]',
        !chrome && 'rounded-md',
        !wall && tilt && 'shadow-[0_2px_0_rgba(255,255,255,0.10)_inset,0_50px_90px_-20px_rgba(3,10,20,0.75)]',
        !wall && !tilt && 'shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,var(--shadow-lift)]'
      )}
      style={{
        padding: bezel,
        /**
         * A product-shot shadow: three layers, all of them soft.
         *
         * One tight and dark right under the body for contact, one mid-range
         * for the bulk of it, and one very wide and very faint so the falloff
         * never ends on a visible edge. All straight down — a diffused overhead
         * source, the way a phone is lit on a white table.
         */
        boxShadow: wall
          ? `0 1px 2px rgba(10,16,28,0.10),
             0 10px 20px -6px rgba(10,16,28,0.16),
             0 34px 60px -20px rgba(10,16,28,0.26)`
          : undefined,
        borderRadius: chrome ? bodyRadius : undefined,
        // The extruded slices below are positioned in Z and must not be
        // flattened into this element's own plane.
        transformStyle: wall ? 'preserve-3d' : undefined,
        ...bodyStyle,
      }}
    >
      {/**
       * The body of the device, built as a stack of slices pushed back in Z.
       *
       * A rotated rectangle is still a rectangle — with a front face alone the
       * frame turns like a card, not like a phone. Each slice is the same
       * rounded outline a little further away, so the gap between them shows
       * as a side wall the moment the device is off-square, and closes to
       * nothing as it comes square again.
       *
       * Darker with distance: the far edge of a real body catches less light.
       */}
      {wall > 0 &&
        Array.from({ length: DEPTH_SLICES }, (_, i) => {
          const t = (i + 1) / DEPTH_SLICES
          return (
            <span
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: bodyRadius,
                transform: `translateZ(${-wall * t}px)`,
                /**
                 * Brushed aluminium, lit from above and slightly in front.
                 *
                 * A rail is a curved surface, so the light on it is a narrow
                 * band rather than a wash: bright at the top where it turns
                 * toward the light, falling away through the middle, with a
                 * faint bounce near the bottom off whatever it is standing on.
                 * The two flat stops at 32% and 34% are the antenna line —
                 * barely visible, and the sort of detail whose absence is what
                 * makes a render look drawn.
                 */
                background: `linear-gradient(
                  to bottom,
                  hsl(214 16% ${52 - 34 * t}%) 0%,
                  hsl(214 18% ${38 - 25 * t}%) 14%,
                  hsl(215 20% ${25 - 16 * t}%) 32%,
                  hsl(215 22% ${28 - 18 * t}%) 34%,
                  hsl(215 26% ${17 - 10 * t}%) 66%,
                  hsl(215 30% ${22 - 14 * t}%) 88%,
                  hsl(216 32% ${12 - 7 * t}%) 100%
                )`,
              }}
            />
          )
        })}

      {/**
       * The face of the device, drawn as a ring rather than a filled panel.
       *
       * The border is exactly the bezel, so its inner edge lands on the screen
       * opening and its hole leaves the recessed display visible — a filled
       * rectangle here would sit in front of the screen and black it out. Being
       * in front is the point: this is the lip that covers a sliver of the card
       * as the device turns.
       */}
      {wall > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: bodyRadius,
            // A border, not a masked fill: a border is a ring by construction,
            // with the inner radius worked out for free and nothing that can
            // fail to a filled rectangle over the screen.
            borderStyle: 'solid',
            borderWidth: bezel,
            /**
             * The black border of the display, not a painted frame: on a real
             * device this is glass over black, so it stays near-neutral and
             * matte. Colour comes from the rail behind it, which is the part
             * that is actually metal.
             */
            borderColor: '#0a0d12',
            /**
             * Two hairlines and nothing else. The outer one is the polished
             * chamfer where the glass meets the rail — the brightest thing on
             * the device, and only a pixel of it. The inner one is the edge of
             * the display cut, which keeps the screen from bleeding into the
             * border.
             */
            boxShadow: `
              inset 0 0 0 1px rgba(255,255,255,0.05),
              0 0 0 1px rgba(255,255,255,0.22),
              0 0 0 2px rgba(10,14,22,0.35)
            `,
          }}
        />
      )}

      {/**
       * Polished metal rim.
       *
       * Full-bleed, so it is only safe while the screen shares its plane and
       * paints over it. On a solid body the screen sits behind this, and the
       * bright corners of the gradient would wash across the card — the ring
       * above carries its own highlight there instead.
       */}
      {chrome && !wall && (
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: bodyRadius,
            background:
              'linear-gradient(135deg,rgba(255,255,255,0.35) 0%,transparent 22%,transparent 78%,rgba(255,255,255,0.18) 100%)',
            WebkitMaskImage: 'linear-gradient(#000,#000)',
          }}
          aria-hidden="true"
        />
      )}

      {/**
       * The glass itself: a pane on the front plane, over the recessed screen.
       *
       * With the display pushed back, this is the surface the light actually
       * hits — and the hairline where it meets the chamfer is what tells you
       * there is a sheet there at all once the device is turned.
       */}
      {glass > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-30"
          style={{
            inset: bezel,
            borderRadius: screenRadius,
            // The glass sits a hair proud of the black border, and casts the
            // faintest shadow into the recess behind it. Nothing more.
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), 0 1px ${Math.max(2, bezel)}px rgba(6,12,22,0.35)`,
            /**
             * One reflection, off-axis, and weak.
             *
             * A product shot is lit by a large soft source, so the glass shows
             * a single broad gradient across one corner — not the two crossed
             * streaks that read as "3D render". 7% is enough to tell you the
             * surface is glass and little enough to leave the card readable.
             */
            background:
              'linear-gradient(118deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.02) 22%,transparent 46%)',
          }}
        />
      )}

      <div
        // Device black rather than white behind the card: on the rare frame a
        // card can't fill — mid-measure, or while a photo loads — the seam
        // reads as switched-off screen instead of a hole in the layout.
        className={cx('relative overflow-hidden bg-[#050c17]', !chrome && 'rounded-xs')}
        style={{
          width: screen.width,
          height: screen.height,
          borderRadius: chrome ? screenRadius : undefined,
          /**
           * The screen sits *under* the glass, not on the front face.
           *
           * Coplanar with the bezel, the card turns with the body but shows no
           * parallax against the frame around it — which is what makes a
           * turned device read as artwork printed on the front rather than as
           * a panel behind a sheet of glass. A few pixels of depth is all it
           * takes: the near lip then covers a sliver of the card, exactly as
           * it would on the desk in front of you.
           */
          transform: glass ? `translateZ(${-glass}px)` : undefined,
        }}
      >
        <div
          ref={scrollRef}
          /*
           * Driven by the page: the screen must not scroll on its own, or a
           * wheel over the phone moves the card *and* the page moves it again.
           * `touch-action: pan-y` hands vertical drags to the page for the
           * same reason on a touchscreen.
           *
           * Otherwise it scrolls itself, and `overscroll-contain` stops a wheel
           * that reaches the end of the card from carrying on into the page.
           */
          className={cx(
            'no-scrollbar h-full w-full overflow-x-hidden',
            driven ? 'touch-pan-y overflow-y-hidden' : 'overflow-y-auto overscroll-contain'
          )}
          style={safeAreas}
        >
          <div
            style={
              driven
                ? { transform: `translate3d(0, ${-travel * progress}px, 0)`, willChange: 'transform' }
                : undefined
            }
          >
            <ScaledCard width={screen.width} minHeight={minCardHeight} dir={dir}>
              {children}
            </ScaledCard>
          </div>
        </div>

        {chrome ? (
          <>
            {/* Notch. It sits on the safe-area strip, which is the same black,
                so a hairline edge is what keeps it reading as a cutout. */}
            <div
              className="absolute left-1/2 top-0 z-20 flex -translate-x-1/2 items-center justify-center bg-[#05080d]"
              style={{
                width: notchWidth,
                height: notchHeight,
                gap: Math.round(notchWidth * 0.09),
                borderRadius: `0 0 ${Math.round(notchHeight * 0.62)}px ${Math.round(notchHeight * 0.62)}px`,
              }}
              aria-hidden="true"
            >
              {/* Earpiece grille and front camera, at the sizes they are on the
                  device: the speaker is a thin slot, the lens a small circle
                  with a faint blue cast off the coating. */}
              <span
                className="rounded-full bg-[#171c24]"
                style={{ height: Math.max(2, Math.round(notchHeight * 0.13)), width: Math.round(notchWidth * 0.3) }}
              />
              <span
                className="aspect-square rounded-full bg-[#0d1420]"
                style={{
                  height: Math.round(notchHeight * 0.3),
                  boxShadow: 'inset 0 0 0 1px rgba(120,150,190,0.28), inset 0 1px 1px rgba(150,190,240,0.20)',
                }}
              />
            </div>
            {/* Home indicator. It lies over the card itself, which may be white
                or near-black, so `difference` blending is what keeps it visible
                on both instead of picking one and losing the other. */}
            <span
              className="pointer-events-none absolute bottom-[1.5%] left-1/2 z-20 h-[4px] w-[36%] -translate-x-1/2 rounded-full bg-white/60 mix-blend-difference"
              aria-hidden="true"
            />
            {/* Screen gloss, and a highlight that tracks the pointer. */}
            <span
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                // Kept for flat frames, where nothing else draws the glass.
                // On a solid body the pane above owns the reflection, so this
                // stays faint rather than stacking a second highlight on it.
                background: wall
                  ? 'linear-gradient(118deg,rgba(255,255,255,0.05) 0%,transparent 34%)'
                  : 'linear-gradient(118deg,rgba(255,255,255,0.16) 0%,rgba(255,255,255,0.05) 26%,transparent 48%)',
              }}
              aria-hidden="true"
            />
            {glare && (
              <span
                className="pointer-events-none absolute inset-0 z-10 transition-[background] duration-200"
                style={{
                  background: `radial-gradient(38% 30% at ${50 + glare.x * 45}% ${50 + glare.y * 45}%, rgba(255,255,255,0.22) 0%, transparent 70%)`,
                }}
                aria-hidden="true"
              />
            )}
          </>
        ) : (
          <div
            className="absolute left-1/2 top-0 z-20 h-5 w-24 -translate-x-1/2 rounded-b-md bg-navy-900"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Hardware buttons, sitting on the outer edge of the body */}
      {chrome && (
        <>
          {/**
           * Percentages of the body height, so the switch and volume keys keep
           * their iPhone X positions at every frame size.
           *
           * Pushed halfway into the thickness on a solid body: a key modelled
           * on the front plane would ride on the glass as the device turns,
           * which is the detail that gives a fake away. On a flat frame the
           * offset is 0 and they sit where they always did.
           */}
          {[
            { side: 'left', top: '16%', height: '4.3%' },
            { side: 'left', top: '23%', height: '7.4%' },
            { side: 'left', top: '32.3%', height: '7.4%' },
            { side: 'right', top: '26%', height: '12.3%' },
          ].map((key, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cx(
                'absolute',
                key.side === 'left'
                  ? '-left-[2px] rounded-l-[2px] bg-gradient-to-r from-[#39414c] to-[#161c25]'
                  : '-right-[2px] rounded-r-[2px] bg-gradient-to-l from-[#39414c] to-[#161c25]'
              )}
              style={{
                top: key.top,
                height: key.height,
                // Machined into the rail: proud of it by a hair, no more.
                width: 2,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
                transform: wall ? `translateZ(${-wall / 2}px)` : undefined,
              }}
            />
          ))}
        </>
      )}
    </div>
  )

  if (!tilt) return <div className={cx('relative w-fit shrink-0', className)}>{body}</div>

  return (
    <div className={cx('relative w-fit shrink-0', className)} style={{ perspective: '1800px' }}>
      <div
        className="transition-transform duration-700 ease-out hover:[transform:rotateY(-4deg)_rotateX(2deg)]"
        style={{ transform: 'rotateY(-17deg) rotateX(7deg) rotate(1deg)', transformStyle: 'preserve-3d' }}
      >
        {body}
      </div>
    </div>
  )
}
