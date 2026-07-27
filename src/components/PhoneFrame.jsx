import { cx } from './ui'
import ScaledCard, { DESIGN_WIDTH } from './ScaledCard'

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
export default function PhoneFrame({ children, className, scale = 'md', chrome = true, tilt = false }) {
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
  const bezel = Math.round(screen.width / 27)
  const screenRadius = Math.round(screen.width * 0.14)
  const bodyRadius = screenRadius + bezel
  const notchHeight = Math.round(screen.width * 0.087)

  // The card fills the screen edge to edge: a cover photo runs under the notch
  // and the card's own surface reaches the bottom rounding, as on the device.
  const minCardHeight = Math.round((screen.height * DESIGN_WIDTH) / screen.width)

  /**
   * Safe areas handed to the card as CSS variables, in its design pixels so
   * they hold at every frame scale. The card keeps the hardware clear by
   * padding its own content — never by leaving a band of device black, which
   * would read as a hole in the lighter templates.
   */
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
        'relative w-fit bg-gradient-to-b from-[#2c3a4f] via-[#131f33] to-[#050c17]',
        !chrome && 'rounded-md',
        tilt
          ? 'shadow-[0_2px_0_rgba(255,255,255,0.10)_inset,0_50px_90px_-20px_rgba(3,10,20,0.75)]'
          : 'shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,var(--shadow-lift)]'
      )}
      style={{ padding: bezel, borderRadius: chrome ? bodyRadius : undefined }}
    >
      {/* Polished metal rim */}
      {chrome && (
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

      <div
        // Device black rather than white behind the card: on the rare frame a
        // card can't fill — mid-measure, or while a photo loads — the seam
        // reads as switched-off screen instead of a hole in the layout.
        className={cx('relative overflow-hidden bg-[#050c17]', !chrome && 'rounded-xs')}
        style={{
          width: screen.width,
          height: screen.height,
          borderRadius: chrome ? screenRadius : undefined,
        }}
      >
        <div
          /* `overscroll-contain`: without it, a wheel that reaches the end of
             the card carries on into the page, so scrolling inside the phone
             suddenly throws the whole landing page. The scroll now stops at
             the frame's edge — while the card still has somewhere to go. */
          className="no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain"
          style={safeAreas}
        >
          <ScaledCard width={screen.width} minHeight={minCardHeight}>
            {children}
          </ScaledCard>
        </div>

        {chrome ? (
          <>
            {/* Notch. It sits on the safe-area strip, which is the same black,
                so a hairline edge is what keeps it reading as a cutout. */}
            <div
              className="absolute left-1/2 top-0 z-20 flex w-[52%] -translate-x-1/2 items-center justify-center gap-[8%] bg-[#050c17] shadow-[0_1px_0_rgba(255,255,255,0.07)]"
              style={{ height: notchHeight, borderRadius: `0 0 ${Math.round(notchHeight / 2)}px ${Math.round(notchHeight / 2)}px` }}
              aria-hidden="true"
            >
              <span className="h-[15%] w-[32%] rounded-full bg-[#1c2838]" />
              <span className="aspect-square h-[27%] rounded-full bg-[#131f33] ring-1 ring-[#26374d]" />
            </div>
            {/* Home indicator. It lies over the card itself, which may be white
                or near-black, so `difference` blending is what keeps it visible
                on both instead of picking one and losing the other. */}
            <span
              className="pointer-events-none absolute bottom-[1.5%] left-1/2 z-20 h-[4px] w-[36%] -translate-x-1/2 rounded-full bg-white/60 mix-blend-difference"
              aria-hidden="true"
            />
            {/* Screen gloss */}
            <span
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                background:
                  'linear-gradient(118deg,rgba(255,255,255,0.16) 0%,rgba(255,255,255,0.05) 26%,transparent 48%)',
              }}
              aria-hidden="true"
            />
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
          {/* Percentages of the body height, so the switch and volume keys keep
              their iPhone X positions at every frame size. */}
          <span className="absolute -left-[3px] top-[16%] h-[4.3%] w-[3px] rounded-l-md bg-gradient-to-r from-[#0b1626] to-[#33435c]" aria-hidden="true" />
          <span className="absolute -left-[3px] top-[23%] h-[7.4%] w-[3px] rounded-l-md bg-gradient-to-r from-[#0b1626] to-[#33435c]" aria-hidden="true" />
          <span className="absolute -left-[3px] top-[32.3%] h-[7.4%] w-[3px] rounded-l-md bg-gradient-to-r from-[#0b1626] to-[#33435c]" aria-hidden="true" />
          <span className="absolute -right-[3px] top-[26%] h-[12.3%] w-[3px] rounded-r-md bg-gradient-to-l from-[#0b1626] to-[#33435c]" aria-hidden="true" />
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
