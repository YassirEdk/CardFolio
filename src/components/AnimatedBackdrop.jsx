import { cx } from './ui'

/**
 * Ambient blue depth behind a section: three blurred fields drifting on long,
 * offset cycles so the motion never loops visibly.
 *
 * Purely decorative — it sits behind content, ignores pointer events, and the
 * animation is gated on `prefers-reduced-motion` in index.css, so a user who
 * asks for less motion gets the same colours, held still.
 *
 * `tone="light"` for white sections, `"dark"` over navy.
 */
export default function AnimatedBackdrop({ tone = 'light', className, grid = true }) {
  const dark = tone === 'dark'

  return (
    <div className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      {grid && (
        <div
          className={dark ? 'absolute inset-0 opacity-[0.05]' : 'absolute inset-0 opacity-[0.5]'}
          style={{
            backgroundImage: dark
              ? 'linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)'
              : 'linear-gradient(to right,#0f254408 1px,transparent 1px),linear-gradient(to bottom,#0f254408 1px,transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      )}

      <div
        className="backdrop-blob-a absolute -left-[15%] -top-[25%] h-[70vmax] w-[70vmax] rounded-full blur-3xl"
        style={{
          background: dark
            ? 'radial-gradient(circle, rgba(46,107,230,0.30) 0%, transparent 62%)'
            : 'radial-gradient(circle, rgba(46,107,230,0.13) 0%, transparent 62%)',
        }}
      />
      <div
        className="backdrop-blob-b absolute -right-[20%] top-[5%] h-[60vmax] w-[60vmax] rounded-full blur-3xl"
        style={{
          background: dark
            ? 'radial-gradient(circle, rgba(15,37,68,0.85) 0%, transparent 60%)'
            : 'radial-gradient(circle, rgba(143,174,211,0.22) 0%, transparent 60%)',
        }}
      />
      <div
        className="backdrop-blob-c absolute bottom-[-30%] left-[25%] h-[55vmax] w-[55vmax] rounded-full blur-3xl"
        style={{
          background: dark
            ? 'radial-gradient(circle, rgba(95,139,250,0.22) 0%, transparent 65%)'
            : 'radial-gradient(circle, rgba(95,139,250,0.10) 0%, transparent 65%)',
        }}
      />
    </div>
  )
}
