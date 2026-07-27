import { useEffect, useState } from 'react'
import { toDataUrl } from '../lib/qr'
import { cx } from './ui'

/** Client-side QR rendered from the card URL. */
export default function QrCode({ value, size = 180, color = '#0F2544', className, alt }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    let active = true
    toDataUrl(value, { size: size * 2, dark: color })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(null))
    return () => {
      active = false
    }
  }, [value, size, color])

  return (
    <div
      className={cx('grid place-items-center rounded-md bg-white', className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} width={size} height={size} alt={alt || `QR code linking to ${value}`} className="h-full w-full" />
      ) : (
        <div className="skeleton h-full w-full rounded-md" aria-hidden="true" />
      )}
    </div>
  )
}
