import Minimal from './Minimal'
import Executive from './Executive'
import Split from './Split'
import DarkPro from './DarkPro'
import PhotoFocus from './PhotoFocus'

/**
 * The template registry. Every entry is a component taking the same props
 * ({ card, publicUrl, onSaveContact, onShare }), so switching templates is
 * only ever a change of `card.template`.
 *
 * `banner` says whether the design has somewhere to put a banner image. Two
 * deliberately don't: Minimal is built on white space, and Photo-focus already
 * leads with a full-bleed portrait — a second image would fight it. The editor
 * reads this flag so it never offers a banner that nothing would render.
 * Every template shows a logo.
 *
 * `pro` marks a template as part of the paid plan. Minimal is the free one, so
 * an account that never upgrades still has a complete, presentable card.
 */
export const TEMPLATES = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'White, airy and typographic. Works for any profession.',
    component: Minimal,
    banner: false,
    pro: false,
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Navy banner with an overlapping portrait. Corporate and formal.',
    component: Executive,
    banner: true,
    pro: true,
  },
  {
    id: 'split',
    name: 'Split',
    description: 'A bold accent header over a clean white body.',
    component: Split,
    banner: true,
    pro: true,
  },
  {
    id: 'darkpro',
    name: 'Dark Pro',
    description: 'High-contrast dark surface. Popular with developers.',
    component: DarkPro,
    banner: true,
    pro: true,
  },
  {
    id: 'photo',
    name: 'Photo-focus',
    description: 'Full-bleed portrait header. Built for creatives.',
    component: PhotoFocus,
    banner: false,
    pro: true,
  },
]

/** Whether `id` needs a paid plan. Unknown ids fall back to the free default. */
export function templateIsPro(id) {
  return Boolean(getTemplate(id).pro)
}

/** Whether the chosen template renders a banner image at all. */
export function templateHasBanner(id) {
  return Boolean(getTemplate(id).banner)
}

export function getTemplate(id) {
  return TEMPLATES.find((template) => template.id === id) || TEMPLATES[0]
}

/** Renders a card with whichever template it has selected. */
export function CardRenderer({ card, ...props }) {
  const Template = getTemplate(card.template).component
  return <Template card={card} {...props} />
}
