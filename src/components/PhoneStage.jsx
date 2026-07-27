import { useState } from 'react'
import { Check, Copy, Download, ScanLine, Share2, Smartphone } from 'lucide-react'
import PhoneFrame from './PhoneFrame'
import AnimatedBackdrop from './AnimatedBackdrop'
import CardView from './CardView'
import QrCode from './QrCode'
import { useCardActions } from '../lib/useCardActions'
import { useToast } from './Toast'
import { SITE_DOMAIN } from '../data/mockData'

/**
 * How the phone version of a card is presented on a large screen: the live,
 * fully interactive card in a device frame, with a hand-off panel beside it.
 * On an actual phone this is never used — you just get the card itself.
 */
export default function PhoneStage({ card }) {
  const accent = card.accent || '#2E6BE6'
  const { publicUrl, onSaveContact, onShare } = useCardActions(card)
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Could not copy the link', 'info')
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-navy-900">
      <AnimatedBackdrop tone="dark" />

      <div className="container-page relative py-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-14 xl:flex-row xl:items-center xl:justify-center">
          <div className="flex flex-col items-center">
            <PhoneFrame scale="xl" chrome>
              <CardView card={card} />
            </PhoneFrame>
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400">
              <Smartphone size={15} aria-hidden="true" />
              Live preview — every button works
            </p>
          </div>

          <div className="w-full max-w-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Phone version</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-white">
              This is what people see when they scan your code
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              {card.fullName?.split(' ')[0] || 'Your'}
              {card.fullName ? '’s' : ''} card is built for a phone screen first — large tap targets, one thumb, no
              pinching.
            </p>

            <div className="mt-8 rounded-md border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-white p-2">
                  <QrCode value={publicUrl} size={92} color="#0F2544" />
                </div>
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                    <ScanLine size={14} aria-hidden="true" />
                    Scan to open
                  </p>
                  <p
                    title={`${SITE_DOMAIN}/${card.username}`}
                    className="mt-1 max-w-full truncate text-xs text-slate-400"
                  >
                    {SITE_DOMAIN}/{card.username}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={onSaveContact}
                style={{ backgroundColor: accent }}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
              >
                <Download size={16} aria-hidden="true" />
                Save contact
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onShare}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/20 text-sm font-semibold text-white transition-colors hover:bg-white/10 active:bg-white/20"
                >
                  <Share2 size={15} aria-hidden="true" />
                  Share
                </button>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/20 text-sm font-semibold text-white transition-colors hover:bg-white/10 active:bg-white/20"
                >
                  {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
