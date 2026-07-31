/**
 * Thin client for the CardFolio API. In dev, Vite proxies /api to the Express
 * server (see vite.config.js), so the same relative paths work in production
 * when both are served from one origin.
 */

const TOKEN_KEY = 'cardfolio.token'
/** Keys used before the renames. Renaming must not sign everybody out. */
const LEGACY_TOKEN_KEYS = ['presento.token', 'cardflow.token']

export function getToken() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) return token

    // Carry a session over from an old key exactly once, then retire it.
    for (const key of LEGACY_TOKEN_KEYS) {
      const legacy = localStorage.getItem(key)
      if (legacy) {
        localStorage.setItem(TOKEN_KEY, legacy)
        localStorage.removeItem(key)
        return legacy
      }
    }
    return null
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else {
      localStorage.removeItem(TOKEN_KEY)
      for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key)
    }
  } catch {
    /* private mode — the session simply won't persist */
  }
}

/** Thrown for any non-2xx response; `errors` carries per-field messages. */
export class ApiError extends Error {
  constructor(message, { status, errors, reason, payload } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors || null
    /** The response body, for the odd field a caller needs (an email, an id). */
    this.payload = payload || null
    /**
     * A machine-readable cause, where the server sends one. The message is
     * written in English on the server and cannot be translated after the
     * fact; a code can be, so the interface says it in the visitor's language.
     */
    this.reason = reason || null
  }
}

/**
 * Where the API lives.
 *
 * Empty in dev and in same-origin deployments, so calls stay relative and
 * Vite's proxy (or the host's rewrite) handles them. Set VITE_API_URL when the
 * front end is hosted apart from the server — a static host has no proxy, and
 * a relative /api call there just returns the SPA's own HTML, which every
 * caller then reads as "not found".
 */
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running?', { status: 0 })
  }

  const isJson = (response.headers.get('content-type') || '').includes('application/json')
  const payload = isJson ? await response.json().catch(() => ({})) : {}

  if (!response.ok) {
    // A route the server doesn't have answers in HTML, so there is no
    // `payload.error` to show — say what actually happened rather than the
    // bare "Request failed" that sent the last debugging session sideways.
    const fallback =
      response.status === 404
        ? `${method} ${path} is not available on the API (404) — restart it if you just changed the routes.`
        : `Request failed (${response.status})`

    throw new ApiError(payload.error || fallback, {
      status: response.status,
      errors: payload.errors,
      reason: payload.reason,
      payload,
    })
  }
  return payload
}

export const api = {
  health: () => request('/health'),

  signup: (data) => request('/auth/signup', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  /** `mode: 'login'` refuses to create an account for an unknown address. */
  google: (credential, mode) => request('/auth/google', { method: 'POST', body: { credential, mode } }),
  me: () => request('/auth/me', { auth: true }),

  /** Unauthenticated on purpose: the link is opened wherever the inbox is. */
  verifyEmail: (token) => request('/auth/verify', { method: 'POST', body: { token } }),
  resendVerification: () => request('/auth/verify/resend', { method: 'POST', auth: true }),

  checkUsername: (username) =>
    request(`/usernames/${encodeURIComponent(username)}/available`).then((r) => r.available),

  /** Account-level preferences (currently just the weekly email opt-in). */
  setPrefs: (prefs) => request('/me/prefs', { method: 'PUT', body: prefs, auth: true }).then((r) => r.user),

  /**
   * Downgrades the signed-in account. Only 'free' is accepted — Pro comes
   * from the billing webhook, so there is nothing here that can grant it.
   */
  setPlan: (plan) => request('/me/plan', { method: 'PUT', body: { plan }, auth: true }).then((r) => r.user),

  /** Paddle's own screens for changing the card or cancelling. */
  billingPortal: () => request('/billing/portal', { auth: true }),

  /** Permanent: the card, its links and its analytics go with the account. */
  deleteAccount: () => request('/me', { method: 'DELETE', auth: true }),

  getCard: (username) => request(`/cards/${encodeURIComponent(username)}`).then((r) => r.card),
  updateCard: (patch) => request('/me/card', { method: 'PUT', body: patch, auth: true }).then((r) => r.card),
  analytics: () => request('/me/analytics', { auth: true }),

  /**
   * Fire-and-forget: analytics must never break the page.
   *
   * `auth: true` attaches the session when there is one — visitors are still
   * anonymous, but it lets the server recognise the owner of the card and drop
   * the event. Your own previews and link tests shouldn't move your numbers.
   */
  track: (username, type, linkId) =>
    request(`/cards/${encodeURIComponent(username)}/events`, {
      method: 'POST',
      body: { type, linkId },
      auth: true,
    }).catch(() => {}),
}
