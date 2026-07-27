import QRCode from 'qrcode'
import { triggerDownload } from './vcard'

const BASE_OPTIONS = {
  errorCorrectionLevel: 'M',
  margin: 1,
}

/** Renders the QR as a data URL suitable for an <img> tag. */
export function toDataUrl(text, { size = 320, dark = '#0F2544', light = '#FFFFFF' } = {}) {
  return QRCode.toDataURL(text, {
    ...BASE_OPTIONS,
    width: size,
    color: { dark, light },
  })
}

export function toSvgString(text, { dark = '#0F2544', light = '#FFFFFF' } = {}) {
  return QRCode.toString(text, {
    ...BASE_OPTIONS,
    type: 'svg',
    color: { dark, light },
  })
}

/** Downloads a high-resolution PNG (1024px) of the QR code. */
export async function downloadPng(text, filename = 'cardfolio-qr.png', color = '#0F2544') {
  const dataUrl = await toDataUrl(text, { size: 1024, dark: color })
  const blob = await (await fetch(dataUrl)).blob()
  triggerDownload(blob, filename)
}

export async function downloadSvg(text, filename = 'cardfolio-qr.svg', color = '#0F2544') {
  const svg = await toSvgString(text, { dark: color })
  triggerDownload(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename)
}
