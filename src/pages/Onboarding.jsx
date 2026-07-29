import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Copy, Download, PartyPopper, Rocket } from 'lucide-react'
import { Button, Logo, Panel, cx } from '../components/ui'
import { useT } from '../lib/i18n'
import PhoneFrame from '../components/PhoneFrame'
import QrCode from '../components/QrCode'
import CardView from '../components/CardView'
import { useToast } from '../components/Toast'
import {
  IdentitySection,
  ContactSection,
  LinksSection,
  TemplateSection,
  validateCard,
} from '../components/CardFormSections'
import { EMPTY_CARD, SITE_DOMAIN } from '../data/mockData'
import { useAuth } from '../lib/auth'
import { downloadPng, downloadSvg } from '../lib/qr'

const STEPS = [
  { id: 'identity', label: 'Identity', title: 'Who are you?', subtitle: 'This is the first thing people see on your card.' },
  { id: 'contact', label: 'Contact', title: 'How can people reach you?', subtitle: 'Each one becomes a tappable button on your card.' },
  { id: 'links', label: 'Links', title: 'Where else can they find you?', subtitle: 'Add your profiles and portfolio in the order you want them shown.' },
  { id: 'template', label: 'Template', title: 'Pick your design', subtitle: 'Choose a template and an accent colour. You can change both later.' },
  { id: 'publish', label: 'Publish', title: 'Ready to go live', subtitle: 'Here is your card, your link and your QR code.' },
]

const STEP_KEY = 'cardfolio.onboarding.step'

function ProgressBar({ index }) {
  const t = useT()
  const percent = ((index + 1) / STEPS.length) * 100

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <p className="font-semibold text-navy-900 dark:text-white">
          Step {index + 1} of {STEPS.length}
          <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">{STEPS[index].label}</span>
        </p>
        <p className="text-slate-500 dark:text-slate-400">{Math.round(percent)}% complete</p>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-md bg-slate-200 dark:bg-navy-800"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-label={t('editor.progress')}
      >
        <div
          className="h-full rounded-md bg-accent-500 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol className="mt-4 hidden gap-2 sm:grid sm:grid-cols-5">
        {STEPS.map((step, i) => (
          <li
            key={step.id}
            className={cx(
              'flex items-center gap-2 text-xs font-semibold',
              i < index ? 'text-accent-600 dark:text-accent-300' : i === index ? 'text-navy-900 dark:text-white' : 'text-slate-400'
            )}
          >
            <span
              className={cx(
                'grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[10px]',
                i < index
                  ? 'border-accent-500 bg-accent-500 text-white'
                  : i === index
                    ? 'border-navy-900 text-navy-900 dark:text-white'
                    : 'border-slate-300 dark:border-navy-700'
              )}
              aria-hidden="true"
            >
              {i < index ? <Check size={11} strokeWidth={3} /> : i + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  )
}

function PublishStep({ card, publicUrl }) {
  const t = useT()
  const toast = useToast()

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast('Link copied to clipboard')
    } catch {
      toast('Could not copy the link', 'info')
    }
  }

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <h3 className="text-sm font-semibold text-navy-900 dark:text-white">{t('editor.yourCardLink')}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('editor.yourCardLinkHint')}</p>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <div className="flex h-11 min-w-0 flex-1 items-center rounded-md border border-slate-300 dark:border-navy-700 bg-slate-50 dark:bg-navy-950 px-3.5">
            <span className="truncate text-sm font-medium text-navy-900 dark:text-white">{publicUrl}</span>
          </div>
          <Button type="button" variant="secondary" onClick={copyLink}>
            <Copy size={15} aria-hidden="true" />
            Copy link
          </Button>
        </div>
      </Panel>

      <Panel className="p-6">
        <h3 className="text-sm font-semibold text-navy-900 dark:text-white">{t('editor.yourQrCode')}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Print it on signage, packaging or a name badge — scanning opens your card.
        </p>

        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
          <div className="rounded-md border border-slate-200 dark:border-navy-800 p-3">
            <QrCode value={publicUrl} size={150} color={card.accent} />
          </div>
          <div className="flex w-full flex-col gap-2.5 sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={() => downloadPng(publicUrl, `${card.username}-qr.png`, card.accent)}
            >
              <Download size={15} aria-hidden="true" />
              Download PNG
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => downloadSvg(publicUrl, `${card.username}-qr.svg`, card.accent)}
            >
              <Download size={15} aria-hidden="true" />
              Download SVG
            </Button>
          </div>
        </div>
      </Panel>

      <div className="rounded-md border border-accent-100 bg-accent-50 dark:bg-accent-900/30 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-accent-800">
          <PartyPopper size={16} aria-hidden="true" />
          Everything is ready
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-accent-900/80">
          Publishing makes your card visible to anyone with the link. You can edit it any time from your dashboard.
        </p>
      </div>
    </div>
  )
}

export default function Onboarding() {
  const t = useT()
  const navigate = useNavigate()
  const toast = useToast()
  const { user, card: authCard, saveCard, status } = useAuth()
  /**
   * The step survives a refresh too. Session storage, not local: it belongs to
   * this sitting, and a user coming back next week should start at the top
   * rather than on step four of a form they don't remember.
   */
  const [index, setIndex] = useState(() => {
    try {
      const saved = Number(sessionStorage.getItem(STEP_KEY))
      return Number.isInteger(saved) ? Math.min(Math.max(saved, 0), STEPS.length - 1) : 0
    } catch {
      return 0
    }
  })
  const [card, setCard] = useState({ ...EMPTY_CARD, ...(authCard || {}) })
  const [errors, setErrors] = useState({})
  const [publishing, setPublishing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adopted, setAdopted] = useState(Boolean(authCard))

  // The session resolves after mount, so fold the real card in once — and only
  // once, or every keystroke would be overwritten by the server copy.
  useEffect(() => {
    if (adopted || !authCard) return
    setCard((current) => ({ ...EMPTY_CARD, ...authCard, ...(current.fullName ? current : {}) }))
    setAdopted(true)
  }, [authCard, adopted])

  useEffect(() => {
    try {
      sessionStorage.setItem(STEP_KEY, String(index))
    } catch {
      /* private mode — the step simply won't persist */
    }
  }, [index])

  const step = STEPS[index]
  const publicUrl = useMemo(
    () => `https://${SITE_DOMAIN}/${card.username || 'yourname'}`,
    [card.username]
  )

  const update = (patch) => {
    setCard((current) => ({ ...current, ...patch }))
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch)) delete next[key]
      return next
    })
  }

  /**
   * Continue saves the step before advancing, so a refresh (or a closed tab)
   * resumes from the server copy instead of an empty form. The card row already
   * exists — signup creates it — so this is an update, and `published` stays
   * false until the last step.
   */
  async function goNext() {
    const stepErrors = validateCard(card, step.id)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) return

    setSaving(true)
    try {
      const saved = await saveCard(card)
      // Adopt the server's copy: it fills in ids for new links and normalises
      // empty fields, so the next step edits what is actually stored.
      if (saved) setCard(saved)
    } catch (error) {
      toast(error.message || 'Could not save this step', 'info')
      return
    } finally {
      setSaving(false)
    }

    setIndex((value) => Math.min(value + 1, STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    setIndex((value) => Math.max(value - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /**
   * Skip the rest of the wizard.
   *
   * It publishes as well as saves: an unpublished card is sent back here from
   * everywhere, so skipping without publishing would be a door that opens onto
   * the same room. Whatever has been filled in goes live, and the dashboard is
   * where the rest gets finished.
   */
  async function skipSetup() {
    setSaving(true)
    try {
      await saveCard({ ...card, published: true })
      try {
        sessionStorage.removeItem(STEP_KEY)
      } catch {
        /* nothing to clean up */
      }
      // The dashboard reads this and explains where the rest gets filled in.
      navigate('/dashboard', { state: { skipped: true } })
    } catch (error) {
      toast(error.message || 'Could not skip setup', 'info')
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    setPublishing(true)
    try {
      await saveCard({ ...card, published: true })
      try {
        sessionStorage.removeItem(STEP_KEY)
      } catch {
        /* nothing to clean up */
      }
      toast('Your card is live 🎉')
      navigate('/dashboard')
    } catch (error) {
      toast(error.message || 'Could not publish your card', 'info')
    } finally {
      setPublishing(false)
    }
  }

  if (status === 'anonymous') return <Navigate to="/signup" replace />
  /**
   * An unconfirmed address cannot start building a card.
   *
   * Not because the wizard needs the address, but because everything after it
   * does: the card is published at a URL tied to an account we cannot return
   * to its owner if the email is wrong. Better to catch a typo before there is
   * work to lose than after. Accounts from before verification existed are
   * flagged verified, so this only ever stops new signups.
   */
  if (user?.emailVerified === false) return <Navigate to="/verify" replace />

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-navy-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            {/* Secondary, not ghost: a bordered control reads as something you
                can press. As a ghost button it looked like the label beside
                it, which is why it was easy to miss. */}
            <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">Setting up your card or</span>
            <Button type="button" variant="secondary" size="sm" loading={saving} onClick={skipSetup}>
              Skip for now
              <ArrowRight size={15} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container-page py-8 lg:py-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <ProgressBar index={index} />

            <div className="mt-8">
              <h1 className="text-2xl font-bold tracking-tight text-navy-900 dark:text-white">{step.title}</h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{step.subtitle}</p>
            </div>

            <form
              className="mt-7"
              onSubmit={(event) => {
                event.preventDefault()
                if (index === STEPS.length - 1) publish()
                else goNext()
              }}
            >
              <Panel className="p-6 lg:p-7">
                {step.id === 'identity' && <IdentitySection card={card} update={update} errors={errors} />}
                {step.id === 'contact' && <ContactSection card={card} update={update} errors={errors} />}
                {step.id === 'links' && <LinksSection card={card} update={update} pro={user?.plan === 'pro'} />}
                {/* A new account is on free, so the Pro designs are locked here too. */}
                {step.id === 'template' && (
                  <TemplateSection card={card} update={update} pro={user?.plan === 'pro'} />
                )}
                {step.id === 'publish' && <PublishStep card={card} publicUrl={publicUrl} />}
              </Panel>

              {/* Pinned to the bottom of the viewport: the identity step is
                  long enough that Back and Continue sat below the fold, so the
                  way forward was only findable by scrolling past the form. It
                  sits on a translucent bar so the fields stay readable
                  underneath as they pass behind it. */}
              <div className="sticky bottom-0 z-30 mt-6 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-navy-800 bg-slate-50/85 py-4 backdrop-blur-sm">
                <Button type="button" variant="secondary" size="lg" onClick={goBack} disabled={index === 0}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  Back
                </Button>

                {index === STEPS.length - 1 ? (
                  <Button type="submit" size="lg" loading={publishing}>
                    <Rocket size={16} aria-hidden="true" />
                    Publish my card
                  </Button>
                ) : (
                  <Button type="submit" size="lg" loading={saving}>
                    Continue
                    <ArrowRight size={16} aria-hidden="true" />
                  </Button>
                )}
              </div>
            </form>

          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-navy-900 dark:text-white">{t('dashboard.livePreview')}</h2>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{SITE_DOMAIN}/{card.username || 'yourname'}</span>
              </div>
              <PhoneFrame scale="md" className="mx-auto">
                <CardView card={card} interactive={false} />
              </PhoneFrame>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
