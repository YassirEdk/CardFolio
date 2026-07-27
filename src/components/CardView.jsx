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
  return (
    <div className="select-none" aria-hidden="true" {...{ inert: '' }}>
      {card_}
    </div>
  )
}
