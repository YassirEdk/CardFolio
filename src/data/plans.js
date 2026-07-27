import { SITE_DOMAIN } from './mockData'

/**
 * The plans, as advertised. Shared by the landing page's pricing section and
 * the upgrade dialog in the dashboard, so the two can't drift apart — a card
 * that says "all templates" in one place and something else in the other is
 * worse than either wording on its own.
 */
export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    description: 'Everything you need to replace a paper card.',
    cta: 'Create your free card',
    to: '/signup',
    variant: 'secondary',
    features: [
      'Personal link at ' + SITE_DOMAIN + '/yourname',
      'QR code download (PNG)',
      'The Minimal template',
      'Up to 4 social & platform links',
      'Save contact (.vcf) button',
      // Not "basic view counter" any more: every figure is behind Pro now, and
      // the plan card must not promise something the dashboard locks.
      'Edit and re-publish any time',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$6',
    cadence: 'per month',
    description: 'For professionals who share their card daily.',
    cta: 'Start 14-day free trial',
    to: '/signup',
    variant: 'primary',
    highlight: true,
    features: [
      'Everything in Free',
      'Unlimited social & platform links',
      'Connect your own custom domain',
      'Full analytics: views, clicks & scans',
      'Remove CardFolio branding',
      'All templates + custom accent colours',
      'Vector SVG QR export',
      'Priority support',
    ],
  },
]

export function getPlan(id) {
  return PLANS.find((plan) => plan.id === id) || PLANS[0]
}
