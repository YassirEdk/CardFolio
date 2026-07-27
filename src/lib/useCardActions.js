import { useCallback, useMemo } from 'react'
import { downloadVCard } from './vcard'
import { SITE_DOMAIN } from '../data/mockData'
import { useToast } from '../components/Toast'

/**
 * Card behaviour shared by every presentation: vCard download and native share
 * with a clipboard fallback.
 *
 * This lives in lib/ rather than in either presentation so the phone templates
 * and the desktop layout stay independent of one another — neither imports the
 * other, they both import this.
 */
export function useCardActions(card, interactive = true) {
  const toast = useToast()
  const publicUrl = useMemo(
    () => `https://${SITE_DOMAIN}/${card.username || 'yourname'}`,
    [card.username]
  )

  const onSaveContact = useCallback(() => {
    if (!interactive) return
    downloadVCard(card, publicUrl)
    toast('Contact downloaded')
  }, [card, interactive, publicUrl, toast])

  const onShare = useCallback(async () => {
    if (!interactive) return
    const data = {
      title: card.fullName || 'Digital business card',
      text: `${card.fullName} — ${card.title}`,
      url: publicUrl,
    }
    if (navigator.share) {
      try {
        await navigator.share(data)
        return
      } catch {
        /* user dismissed the share sheet — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast('Link copied to clipboard')
    } catch {
      toast('Could not copy the link', 'info')
    }
  }, [card, interactive, publicUrl, toast])

  return { publicUrl, onSaveContact, onShare }
}
