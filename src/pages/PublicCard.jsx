import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TEMPLATES } from '../templates'
import { DEMO_USERNAME } from '../data/mockData'
import { api } from '../lib/api'
import CardView from '../components/CardView'
import DesktopCard from '../desktop/DesktopCard'
import PhoneFrame from '../components/PhoneFrame'
import ViewToggle from '../components/ViewToggle'
import NotFound from './NotFound'
import { useI18n } from '../lib/i18n'
import { cx } from '../components/ui'

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
  const { lang, dir, t } = useI18n()
  const { username } = useParams()
  const [params, setParams] = useSearchParams()
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

  /**
   * How the visitor arrived. The QR encodes `?src=qr`, which is the only way
   * to tell a scan from someone opening the link — the request looks identical
   * otherwise. Read once on mount, then wiped from the address bar so a URL
   * copied off this page doesn't report every later visit as a scan.
   */
  const fromQr = params.get('src') === 'qr'

  useEffect(() => {
    if (!fromQr) return
    const next = new URLSearchParams(params)
    next.delete('src')
    // `replace`, so Back still leaves the card rather than returning to the
    // same page with the marker back in the URL.
    setParams(next, { replace: true })
    // Mount only: the point is to clean the address bar once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let active = true
    setState({ status: 'loading', card: null })
    api
      .getCard(username)
      .then((card) => {
        if (!active) return
        setState({ status: 'ready', card })
        // Record the visit. Failures are swallowed inside api.track, and the
        // server drops the event entirely when the owner is the one looking.
        api.track(username, fromQr ? 'scan' : 'view')
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

  /**
   * Records a link click, whichever template drew the link.
   *
   * Every template renders its own markup, so asking each one to report its
   * taps would mean the same three lines in ten files — and a new template
   * would silently stop counting. One capturing listener on the wrapper sees
   * every anchor inside instead.
   *
   * Only outbound links count: the credit in the footer points home, and
   * counting that as interest in the card would be a lie. A social link is
   * matched back to its row so the "top links" table has something to rank;
   * a phone or email tap has no row, and is counted as a click with no link.
   */
  function trackClick(event) {
    const anchor = event.target.closest?.('a[href]')
    if (!anchor || !state.card) return

    const href = anchor.getAttribute('href') || ''
    if (!href || href.startsWith('#')) return

    // Same-origin means app navigation, not a link off the card. `tel:` and
    // `mailto:` parse with a null origin, so they pass — which is right, a
    // tapped phone number is a click on the card.
    try {
      if (new URL(href, window.location.href).origin === window.location.origin) return
    } catch {
      return
    }

    const match = (state.card.links || []).find((link) => link.url && link.url === href)
    api.track(username, 'click', match?.id)
  }

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

  const base = override ? { ...state.card, template: override } : state.card
  const isDemo = String(username).toLowerCase() === DEMO_USERNAME

  /**
   * The demo card speaks the visitor's language; every other card does not.
   *
   * A real card's words were written by its owner, and translating them would
   * be putting words in someone's mouth — worse, it would make the product
   * look like it edits your card. The demo exists for a different reason: it
   * is there to show a stranger what a card looks like, and one they cannot
   * read shows them nothing.
   */
  const localised = isDemo && lang !== 'en'
  const card = localised
    ? {
        ...base,
        fullName: t('demo.fullName'),
        title: t('demo.title'),
        company: base.company ? t('demo.company') : base.company,
        bio: base.bio ? t('demo.bio') : base.bio,
        location: base.location ? t('demo.location') : base.location,
        /**
         * The contact details travel with the person.
         *
         * A card headed "الدار البيضاء، المغرب" carrying a San Francisco phone
         * number and an English studio address is not a translated card, it is
         * a half-translated one — and the details are the part a visitor reads
         * to decide whether the product is for them.
         */
        phone: base.phone ? t('demo.phone') : base.phone,
        whatsapp: base.whatsapp ? t('demo.phone') : base.whatsapp,
        email: base.email ? t('demo.email') : base.email,
        website: base.website ? t('demo.website') : base.website,
      }
    : base

  // The card is laid out for its own content, so a translated demo mirrors
  // with the language while a real English card stays left-to-right.
  const cardDir = localised ? dir : 'ltr'

  return (
    <div className="min-h-dvh bg-slate-100" onClickCapture={trackClick}>
      {/* The toggle is a showcase control, so it rides on the demo card only:
          a real card should look like a card, not like a preview with chrome
          on it. It also needs a wide screen — on a phone there is no room for
          the desktop layout, so there would be nothing to switch to. */}
      {/**
        * The way back.
        *
        * A public card is a dead end by design — it is somebody's card, not a
        * page of this site — but a visitor who arrived by tapping "see a live
        * card" is still inside the product and has no browser Back to lean on
        * if the link opened in a new tab. Floating, so it never becomes part
        * of the card it sits over.
        */}
      <Link
        to="/"
        className={cx(
          'fixed start-5 top-5 z-50 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold shadow-[var(--shadow-card)] backdrop-blur transition-colors',
          'border-slate-200 bg-white/90 text-navy-900 hover:bg-white',
          'dark:border-navy-700 dark:bg-navy-900/90 dark:text-white dark:hover:bg-navy-900'
        )}
      >
        <ArrowLeft size={16} aria-hidden="true" className="rtl-flip" />
        {t('publicCard.backHome')}
      </Link>

      {wide && isDemo && (
        <ViewToggle
          view={view}
          onChange={setView}
          className="fixed end-5 top-5 z-50"
        />
      )}

      {wide && (!isDemo || view === 'desktop') ? (
        // Same reason as ScaledCard: the card's layout is the card's, not the
        // visitor's interface language.
        <div dir={cardDir} className={cx(cardDir === 'rtl' && 'bidi-plaintext')}>
          <DesktopCard card={card} />
        </div>
      ) : wide ? (
        // The phone layout on a big screen, shown in the device it was drawn
        // for rather than as a narrow column floating in the middle.
        <div className="flex min-h-dvh items-center justify-center py-10">
          <PhoneFrame scale="lg" dir={cardDir}>
            <CardView card={card} />
          </PhoneFrame>
        </div>
      ) : (
        <main
          dir={cardDir}
          className={cx(
            'mx-auto min-h-dvh w-full max-w-md bg-white shadow-[var(--shadow-lift)]',
            cardDir === 'rtl' && 'bidi-plaintext'
          )}
        >
          <CardView card={card} />
        </main>
      )}
    </div>
  )
}
