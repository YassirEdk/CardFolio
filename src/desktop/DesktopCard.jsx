import DesktopMinimal from './DesktopMinimal'
import DesktopExecutive from './DesktopExecutive'
import DesktopSplit from './DesktopSplit'
import DesktopDarkPro from './DesktopDarkPro'
import DesktopPhotoFocus from './DesktopPhotoFocus'

/**
 * The desktop registry — one layout per template, keyed the same way as
 * templates/index.jsx.
 *
 * Desktop is a design of its own, not a widened phone card, but it is still
 * the *same* template: someone who picks Dark Pro should not land on a white
 * page when they open the link on a laptop. So each phone template has a
 * desktop counterpart that keeps its palette, its structure and its promise.
 */
const DESKTOP_TEMPLATES = {
  minimal: DesktopMinimal,
  executive: DesktopExecutive,
  split: DesktopSplit,
  darkpro: DesktopDarkPro,
  photo: DesktopPhotoFocus,
}

export function getDesktopTemplate(id) {
  return DESKTOP_TEMPLATES[id] || DesktopExecutive
}

/** Renders the desktop layout belonging to the card's chosen template. */
export default function DesktopCard({ card }) {
  const Layout = getDesktopTemplate(card.template)
  return <Layout card={card} />
}
