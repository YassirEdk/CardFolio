import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { TEMPLATES } from '../templates'
import { DEMO_USERNAME } from '../data/mockData'
import { api } from '../lib/api'
import CardView from '../components/CardView'
import DesktopCard from '../desktop/DesktopCard'
import PhoneFrame from '../components/PhoneFrame'
import ViewToggle from '../components/ViewToggle'
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
   * Which layout to show. `wide` is the screen's opinion, `view` is the
   * visitor's — tracked with matchMedia rather than CSS classes because the two
   * layouts are different component trees, not one tree styled two ways.
   */
  const [view, setView] = useState('desktop')
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const onChange = (event) => setWide(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

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
  const isDemo = String(username).toLowerCase() === DEMO_USERNAME

  return (
    <div className="min-h-dvh bg-slate-100">
      {/* The toggle is a showcase control, so it rides on the demo card only:
          a real card should look like a card, not like a preview with chrome
          on it. It also needs a wide screen — on a phone there is no room for
          the desktop layout, so there would be nothing to switch to. */}
      {wide && isDemo && (
        <ViewToggle
          view={view}
          onChange={setView}
          className="fixed right-5 top-5 z-50"
        />
      )}

      {wide && (!isDemo || view === 'desktop') ? (
        <DesktopCard card={card} />
      ) : wide ? (
        // The phone layout on a big screen, shown in the device it was drawn
        // for rather than as a narrow column floating in the middle.
        <div className="flex min-h-dvh items-center justify-center py-10">
          <PhoneFrame scale="lg">
            <CardView card={card} />
          </PhoneFrame>
        </div>
      ) : (
        <main className="mx-auto min-h-dvh w-full max-w-md bg-white shadow-[var(--shadow-lift)]">
          <CardView card={card} />
        </main>
      )}
    </div>
  )
}
