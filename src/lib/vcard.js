/** Builds and downloads a vCard 3.0 file for a card. */

function escapeValue(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

export function buildVCard(card, publicUrl) {
  const [first = '', ...rest] = (card.fullName || '').split(' ')
  const last = rest.join(' ')

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeValue(last)};${escapeValue(first)};;;`,
    `FN:${escapeValue(card.fullName)}`,
  ]

  if (card.title) lines.push(`TITLE:${escapeValue(card.title)}`)
  if (card.company) lines.push(`ORG:${escapeValue(card.company)}`)
  if (card.phone) lines.push(`TEL;TYPE=CELL:${escapeValue(card.phone)}`)
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeValue(card.email)}`)
  if (card.website) lines.push(`URL:${escapeValue(card.website)}`)
  if (card.location) lines.push(`ADR;TYPE=WORK:;;;${escapeValue(card.location)};;;`)
  if (card.bio) lines.push(`NOTE:${escapeValue(card.bio)}`)
  if (publicUrl) lines.push(`URL;TYPE=CardFolio:${escapeValue(publicUrl)}`)

  for (const link of card.links || []) {
    lines.push(`X-SOCIALPROFILE;TYPE=${link.platform}:${escapeValue(link.url)}`)
  }

  lines.push('END:VCARD')
  return lines.join('\r\n')
}

export function downloadVCard(card, publicUrl) {
  const blob = new Blob([buildVCard(card, publicUrl)], { type: 'text/vcard;charset=utf-8' })
  triggerDownload(blob, `${card.username || 'contact'}.vcf`)
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
