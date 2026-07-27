import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { TEMPLATES } from '../templates'
import { api } from '../lib/api'
import CardView from '../components/CardView'
import DesktopCard from '../desktop/DesktopCard'
import NotFound from './NotFound'

/** Skeleton shown while the card is loading — mirrors the card's real rhythm. */
function CardSkeleton() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-white px-6 pt-12" aria-hidden="true">
      <div className="flex flex-col items-center">
        <div className="skeleton h-[92px] w-[92px] rounded-md" />
        <div className="skeleton mt-5 h-6 w-44 rounded-md" />
        <div className="skeleton mt-2.5 h-4 w-32 rounded-md" />
        <div className="skeleton mt-4 h-3 w-full rounded-md" />
        <div className="skeleton mt-2 h-3 w-4/5 rounded-md" />
      </div>
      <div className="mt-7 grid grid-cols-2 gap-2.5">
        <div className="skeleton h-12 rounded-md" />
        <div className="skeleton h-12 rounded-md" />
      </div>
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-14 rounded-md" />
        ))}
      </div>
    </div>
  )
}

export default function PublicCard() {
  const { username } = useParams()
  const [params] = useSearchParams()
  const [state, setState] = useState({ status: 'loading', card: null })

  /**
   * `?template=` lets the dashboard open this page as a preview of a design it
   * hasn't applied yet. It only overrides the rendering — nothing is saved —
   * and an unknown id is ignored, so the parameter can't break a public card.
   */
  const previewTemplate = params.get('template')
  const override = TEMPLATES.some((t) => t.id === previewTemplate) ? previewTemplate : null

  useEffect(() => {
    let active = true
    setState({ status: 'loading', card: null })
    api
      .getCard(username)
      .then((card) => {
        if (!active) return
        setState({ status: 'ready', card })
        // Record the visit. Failures are swallowed inside api.track.
        api.track(username, 'view')
      })
      .catch(() => {
        if (active) setState({ status: 'missing', card: null })
      })
    return () => {
      active = false
    }
  }, [username])

  useEffect(() => {
    if (state.card) {
      document.title = `${state.card.fullName} — ${state.card.title} | CardFolio`
    }
    return () => {
      document.title = 'CardFolio — Your digital business card'
    }
  }, [state.card])

  /**
   * "Allow search engines to index my card", off. A meta tag is what a crawler
   * reads on a client-rendered page; a real deployment should send the
   * `X-Robots-Tag` header too, since not every crawler runs the JS that puts
   * this here.
   */
  useEffect(() => {
    if (!state.card || state.card.indexable !== false) return
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [state.card])

  if (state.status === 'loading') {
    return (
      <div className="min-h-dvh bg-slate-100">
        <p className="sr-only" role="status">
          Loading card
        </p>
        <CardSkeleton />
      </div>
    )
  }

  if (state.status === 'missing') {
    return <NotFound context="card" username={username} />
  }

  const card = override ? { ...state.card, template: override } : state.card

  return (
    <div className="min-h-dvh bg-slate-100">
      {/* No chrome on a visitor's card — the layout follows the screen alone.
          Below lg the desktop layout is hidden and the phone card shown, so
          small screens always get the layout built for them. */}
      <div className="hidden lg:block">
        <DesktopCard card={card} />
      </div>
      <main className="mx-auto min-h-dvh w-full max-w-md bg-white shadow-[var(--shadow-lift)] lg:hidden">
        <CardView card={card} />
      </main>
    </div>
  )
}
