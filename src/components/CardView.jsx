import { CardRenderer } from '../templates'
import { useCardActions } from '../lib/useCardActions'

/** Renders a card with its chosen template — the phone-shaped presentation. */
export default function CardView({ card, interactive = true }) {
  const { publicUrl, onSaveContact, onShare } = useCardActions(card, interactive)

  const card_ = <CardRenderer card={card} publicUrl={publicUrl} onSaveContact={onSaveContact} onShare={onShare} />

  if (interactive) return card_

  /**
   * A preview is a picture of a card, not a card. `interactive={false}` used to
   * disable only save/share, leaving every contact and social link live — so
   * clicking the mockup on the landing page would dial a number or navigate off
   * the site. `inert` covers pointer, keyboard and assistive tech; scrolling
   * still works because the scroll container lives outside this wrapper.
   */
  /**
   * `flex flex-col [&>*]:grow` continues the stretch chain. The frame makes
   * this wrapper fill the screen, but a template's own `min-h-full` is a
   * percentage, and a percentage resolves against a parent's *height* — which
   * here is auto. So a short card (an empty onboarding form, say) stopped at
   * its content and left the device black showing underneath. Growing the
   * child is a length, not a percentage, so there is nothing to resolve.
   */
  return (
    <div className="flex select-none flex-col [&>*]:grow" aria-hidden="true" {...{ inert: '' }}>
      {card_}
    </div>
  )
}
