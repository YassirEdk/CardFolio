import { useEffect, useRef, useState } from 'react'
import { GoogleButton } from './AuthLayout'

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
  const callback = useRef(onCredential)
  callback.current = onCredential

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false

    loadGis()
      .then(() => {
        if (cancelled || !holder.current) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => callback.current?.(response.credential),
        })
        window.google.accounts.id.renderButton(holder.current, {
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 400,
        })
      })
      .catch(() => !cancelled && setFailed(true))

    return () => {
      cancelled = true
    }
  }, [text])

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

  // Google's button renders at a fixed pixel width; this keeps it centred and
  // clipped to our column instead of overflowing the card.
  return <div ref={holder} className="flex justify-center overflow-hidden [&>div]:!w-full" />
}
