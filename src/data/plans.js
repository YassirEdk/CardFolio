/**
 * The plans, as advertised. Shared by the landing page's pricing section and
 * the upgrade dialog in the dashboard, so the two can't drift apart — a card
 * that says "all templates" in one place and something else in the other is
 * worse than either wording on its own.
 *
 * Prices and routes live here; every word lives in src/locales under
 * `plans.<id>` and is looked up where the plan is drawn. A price is a number
 * in every language — the sentence next to it is not.
 */
export const PLANS = [
  { id: 'free', price: '$0', to: '/signup', variant: 'secondary', featureCount: 6 },
  { id: 'pro', price: '$6', to: '/signup', variant: 'primary', highlight: true, featureCount: 8 },
]

export function getPlan(id) {
  return PLANS.find((plan) => plan.id === id) || PLANS[0]
}
