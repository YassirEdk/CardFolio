/**
 * Paddle checkout, loaded only when someone actually opens the upgrade dialog.
 *
 * Paddle.js is a third-party script on every page that imports it eagerly, so
 * it is fetched on demand instead: the overwhelming majority of sessions never
 * reach a paywall, and none of them should pay for the download or hand the
 * visitor to a tracker they had no reason to meet.
 */

const PADDLE_JS = 'https://cdn.paddle.com/paddle/v2/paddle.js'

const TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || ''
const PRICE_ID = import.meta.env.VITE_PADDLE_PRICE_ID || ''
/** Sandbox unless explicitly told otherwise, so a misconfigured build cannot charge anyone. */
const ENV = import.meta.env.VITE_PADDLE_ENV === 'production' ? 'production' : 'sandbox'

/** Whether checkout can run at all. Lets the UI explain rather than fail. */
export const billingConfigured = Boolean(TOKEN && PRICE_ID)

/** The in-flight or finished load, so concurrent callers share one script tag. */
let loading = null

function loadScript() {
  if (window.Paddle) return Promise.resolve(window.Paddle)
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = PADDLE_JS
    script.async = true
    script.onload = () => (window.Paddle ? resolve(window.Paddle) : reject(new Error('Paddle failed to initialise')))
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure for good —
      // this fails on flaky connections and on ad blockers, and neither is
      // permanent.
      loading = null
      reject(new Error('Could not load the payment form'))
    }
    document.head.appendChild(script)
  })
  return loading
}

async function paddle() {
  const sdk = await loadScript()
  if (!paddle.ready) {
    if (ENV === 'sandbox') sdk.Environment.set('sandbox')
    sdk.Initialize({ token: TOKEN })
    paddle.ready = true
  }
  return sdk
}

/**
 * Opens the overlay checkout for Pro.
 *
 * `customData.user_id` is the thread back to the account: the webhook has no
 * session to read and this is the only thing tying a payment to a user the
 * first time they subscribe. The email is passed so nobody is asked to type
 * an address the app already knows.
 *
 * Resolves when the overlay closes, which is not a promise that anything was
 * paid — Paddle tells the server that, not the browser. The caller should
 * re-read the session rather than assume.
 */
/**
 * Pulls something readable out of a Paddle error event.
 *
 * The shape is not documented and has changed between versions, so every place
 * the reason has been seen to travel is checked in turn rather than trusting
 * one of them. Falls back to the raw JSON: an unreadable string still names the
 * problem, which the overlay's own wording never does.
 */
function describeError(event) {
  const error = event?.error || event?.data?.error || event
  const parts = [error?.code || error?.type, error?.detail || error?.message || error?.reason]
    .filter(Boolean)
    .join(' — ')
  if (parts) return parts
  try {
    return JSON.stringify(error)
  } catch {
    return 'Paddle refused the checkout without saying why'
  }
}

export async function openProCheckout({ user, onClose, onError }) {
  if (!billingConfigured) throw new Error('Billing is not configured')
  if (!user?.id) throw new Error('Sign in before upgrading')

  const sdk = await paddle()
  sdk.Checkout.open({
    items: [{ priceId: PRICE_ID, quantity: 1 }],
    customer: user.email ? { email: user.email } : undefined,
    customData: { user_id: String(user.id) },
    settings: {
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      // Keeps the person inside the dashboard; the overlay closes over the
      // page they were already on rather than navigating away from it.
      displayMode: 'overlay',
    },
    eventCallback: (event) => {
      /**
       * Paddle's overlay says "Something went wrong" for every refusal it
       * has — an unapproved domain, an account still in review, a price from
       * the other environment — and the reason travels in the event rather
       * than on the screen. Logged in full, and handed to the caller as a
       * sentence, because without it the only information available is a
       * message that fits all three.
       */
      if (event?.name === 'checkout.error' || event?.error) {
        console.error('[paddle] checkout error:', event?.error || event, '\nfull event:', event)
        onError?.(describeError(event))
      }
      if (event?.name === 'checkout.closed' || event?.name === 'checkout.completed') onClose?.(event)
    },
  })
}
