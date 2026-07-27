import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cx } from './ui'

/** The viewport every card template is laid out for — iPhone X logical width. */
export const DESIGN_WIDTH = 375

/**
 * Renders a card at its design width and scales the result down to whatever
 * space it is given.
 *
 * Previews are narrower than a phone, and letting a card reflow into them
 * produces a different card: wrapped names, truncated locations, squeezed
 * buttons. Scaling instead keeps a preview a faithful miniature of the live
 * page, which is the whole point of calling it a preview.
 *
 * Pass `width` when the caller already knows the box (PhoneFrame does);
 * otherwise the host element is measured. `minHeight` is in design pixels and
 * makes a short card fill its viewport, so the surface behind it never shows
 * through under the content. `as="span"` keeps the markup valid inside a
 * <button>, which may only contain phrasing content.
 */
export default function ScaledCard({ children, width, minHeight, className, as: Tag = 'div' }) {
  const hostRef = useRef(null)
  const cardRef = useRef(null)
  const [hostWidth, setHostWidth] = useState(width || 0)
  const [cardHeight, setCardHeight] = useState(0)

  // Track the box we have to fit into, unless the caller declared it.
  useLayoutEffect(() => {
    if (width) return setHostWidth(width)
    const el = hostRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setHostWidth(el.offsetWidth))
    observer.observe(el)
    setHostWidth(el.offsetWidth)
    return () => observer.disconnect()
  }, [width])

  /**
   * A CSS transform doesn't change layout height, so the scaled card still
   * reserves its full height. Measure it and give the wrapper the height the
   * card actually occupies, or scroll containers run on past the content.
   */
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setCardHeight(el.offsetHeight))
    observer.observe(el)
    setCardHeight(el.offsetHeight)
    return () => observer.disconnect()
  }, [])

  // Photo and cover load after the first measure and change the height.
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const remeasure = () => setCardHeight(el.offsetHeight)
    const images = Array.from(el.querySelectorAll('img'))
    images.forEach((img) => img.addEventListener('load', remeasure))
    return () => images.forEach((img) => img.removeEventListener('load', remeasure))
  }, [children])

  const ratio = hostWidth ? hostWidth / DESIGN_WIDTH : 1

  return (
    <Tag
      ref={hostRef}
      className={cx('block w-full', className)}
      style={{ height: cardHeight ? cardHeight * ratio : undefined }}
    >
      <Tag
        ref={cardRef}
        // Flex column + a grown child: `min-height` alone gives a template's
        // own `min-h-full` nothing to resolve against, so it would stay at its
        // content height and leave the frame bare underneath.
        //
        // `grow`, not `flex-1`: flex-1 zeroes the basis, so a card taller than
        // `minHeight` gets measured — and clipped — at exactly minHeight. With
        // basis:auto a short card grows to fill and a long one keeps its height.
        className={cx(minHeight ? 'flex flex-col [&>*]:grow' : 'block')}
        style={{
          width: DESIGN_WIDTH,
          minHeight,
          transform: `scale(${ratio})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </Tag>
    </Tag>
  )
}
