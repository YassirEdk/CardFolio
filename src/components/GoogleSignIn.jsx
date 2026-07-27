import { useEffect, useRef, useState } from 'react'
import { GoogleButton } from './AuthLayout'
import { cx } from './ui'

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

let scriptPromise = null

/** Loads Google Identity Services once, however many buttons ask for it. */
function loadGis() {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Google sign-in'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Renders Google's own sign-in button. We use theirs rather than our styled
 * one because Google's branding terms require it, and because the button has
 * to live in their iframe to hand back a credential.
 *
 * Falls back to the inert styled button when no client ID is configured, so
 * the page still looks right in an environment without Google set up.
 */
export default function GoogleSignIn({ onCredential, text = 'signup_with', onUnavailable }) {
  const holder = useRef(null)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [width, setWidth] = useState(0)
  const callback = useRef(onCredential)
  callback.current = onCredential

  /**
   * Google renders at a pixel width, so it has to be told the real one.
   * Stretching the result with CSS instead leaves its internal layout at the
   * old size — the logo pinned left, the label adrift in the middle.
   * Their maximum is 400.
   */
  useEffect(() => {
    const host = holder.current?.parentElement
    if (!host) return
    const measure = () => setWidth(Math.min(400, Math.round(host.getBoundingClientRect().width)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!CLIENT_ID || !width) return
    let cancelled = false

    loadGis()
      .then(() => {
        if (cancelled || !holder.current) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => callback.current?.(response.credential),
        })
        // renderButton appends; clear first or a re-measure stacks buttons.
        holder.current.replaceChildren()
        setReady(true)
        window.google.accounts.id.renderButton(holder.current, {
          theme: 'outline',
          size: 'large',
          text,
          // Rounded to match our own buttons, logo beside the label rather
          // than pinned to the far edge.
          shape: 'rectangular',
          logo_alignment: 'center',
          width,
        })
      })
      .catch(() => !cancelled && setFailed(true))

    return () => {
      cancelled = true
    }
  }, [text, width])

  if (!CLIENT_ID || failed) {
    return (
      <GoogleButton
        onClick={() =>
          onUnavailable?.(
            failed ? 'Could not reach Google — check your connection.' : 'Google sign-in is not configured.'
          )
        }
      />
    )
  }

  /**
   * The frame reserves the height of our own large buttons, so the form keeps
   * its rhythm while Google's script loads instead of jumping when it lands.
   * No width override: the button was rendered at this container's width.
   *
   * The animation is all on this wrapper — the button itself lives in Google's
   * iframe and can't be touched. A skeleton holds the slot until the script
   * answers, the button fades up in its place, and the whole thing lifts on
   * hover so it responds like the buttons around it.
   */
  return (
    <div className="relative flex h-12 items-center justify-center rounded-md">
      {!ready && (
        <span className="skeleton absolute inset-0 rounded-md" aria-hidden="true" />
      )}
      <div
        ref={holder}
        className={cx(
          'overflow-hidden rounded-md transition-all duration-300 ease-out',
          'hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]',
          'motion-reduce:transform-none motion-reduce:transition-none',
          ready ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
        )}
      />
    </div>
  )
}
