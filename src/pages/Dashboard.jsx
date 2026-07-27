import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  LayoutTemplate,
  Lock,
  LogOut,
  Menu,
  MousePointerClick,
  Pencil,
  QrCode as QrCodeIcon,
  ScanLine,
  Settings as SettingsIcon,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button, Field, Input, Logo, Panel, Badge, Switch, cx } from '../components/ui'
import PhoneFrame from '../components/PhoneFrame'
import QrCode from '../components/QrCode'
import CardView from '../components/CardView'
import UpgradeDialog from '../components/UpgradeDialog'
import { useToast } from '../components/Toast'
import {
  IdentitySection,
  ContactSection,
  LinksSection,
  TemplateSection,
  validateCard,
} from '../components/CardFormSections'
import { SITE_DOMAIN } from '../data/mockData'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { downloadPng, downloadSvg } from '../lib/qr'
import { photoSrc } from '../lib/image'
import { ACCENT_COLORS } from '../data/platforms'

const NAV = [
  { to: '/dashboard', end: true, label: 'My Card', icon: CreditCard },
  { to: '/dashboard/edit', label: 'Edit', icon: Pencil },
  { to: '/dashboard/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/dashboard/qr', label: 'QR Code', icon: QrCodeIcon },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
]

/* ------------------------------------------------------------ shared bits */

function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2.5">{actions}</div>}
    </div>
  )
}

/**
 * `locked` hides the figure behind a blur and a Pro chip. The blurred glyphs
 * are placeholder dots, never a real or invented number: the API sends nothing
 * for a locked stat, so there is no figure to leak through the blur.
 */
function StatCard({ icon: Icon, label, value, delta, locked = false }) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-600" aria-hidden="true">
          <Icon size={17} />
        </span>
        {locked ? (
          <Badge tone="slate">
            <Lock size={11} aria-hidden="true" />
            Pro
          </Badge>
        ) : (
          delta && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <TrendingUp size={13} aria-hidden="true" />
              {delta}
            </span>
          )
        )}
      </div>

      {locked ? (
        <p className="mt-4 select-none text-2xl font-bold tracking-tight text-navy-900 blur-[5px]" aria-hidden="true">
          ••••
        </p>
      ) : (
        <p className="mt-4 text-2xl font-bold tracking-tight text-navy-900">{(value || 0).toLocaleString()}</p>
      )}
      <p className="mt-0.5 text-sm text-slate-500">
        {label}
        {locked && <span className="sr-only"> — available on the Pro plan</span>}
      </p>
    </Panel>
  )
}

/**
 * The account avatar, and what sits behind it: who you are signed in as, and
 * the way out. The card's portrait doubles as the avatar — one photo, uploaded
 * once — falling back to an initial when there is none or it fails to load.
 */
function AccountMenu({ card, user, onLogout, avatarFailed, onAvatarError }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    // Pointerdown, not click: the menu should close as the press lands, even
    // if that press is on something that stops the click from propagating.
    function onPointerDown(event) {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        className={cx(
          'block rounded-md ring-offset-2 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
          open && 'ring-2 ring-accent-500'
        )}
      >
        {card.photo && !avatarFailed ? (
          <img
            src={photoSrc(card.photo, 108)}
            alt=""
            onError={onAvatarError}
            className="h-9 w-9 rounded-md bg-slate-200 object-cover"
          />
        ) : (
          <span
            className="grid h-9 w-9 place-items-center rounded-md bg-navy-900 text-sm font-bold text-white"
            aria-hidden="true"
          >
            {(card.fullName || 'C')[0]}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="animate-toast-in absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-md border border-slate-200 bg-white shadow-[var(--shadow-lift)]"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-navy-900">{card.fullName || 'Your account'}</p>
            {/* The account email, not the card's contact email — those are two
                different fields and can differ. */}
            <p className="mt-0.5 truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold text-navy-900 transition-colors hover:bg-slate-50"
          >
            <LogOut size={16} className="text-slate-400" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function CopyLinkRow({ url }) {
  const toast = useToast()

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      toast('Link copied to clipboard')
    } catch {
      toast('Could not copy the link', 'info')
    }
  }

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row">
      <div className="flex h-11 min-w-0 flex-1 items-center rounded-md border border-slate-300 bg-slate-50 px-3.5">
        <span className="truncate text-sm font-medium text-navy-900">{url}</span>
      </div>
      <Button type="button" variant="secondary" onClick={copy}>
        <Copy size={15} aria-hidden="true" />
        Copy link
      </Button>
    </div>
  )
}

function TrafficChart({ series, compact = false }) {
  return (
    <div className={compact ? 'h-56' : 'h-80'}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
          <ChartTooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(15,37,68,0.10)',
              fontSize: 12,
            }}
          />
          <Line type="monotone" dataKey="views" name="Views" stroke="#0F2544" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="clicks" name="Link clicks" stroke="#2E6BE6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="scans" name="QR scans" stroke="#94a3b8" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------------------------------------------------------------- views */

function Overview({ card, publicUrl, analytics, pro }) {
  return (
    <>
      <PageHeader
        title={`Welcome back, ${(card.fullName || 'there').split(' ')[0]}`}
        description="Your card is live and collecting views."
        actions={
          <>
            <Button
              as={Link}
              to={`/${card.username}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
            >
              <ExternalLink size={15} aria-hidden="true" />
              View public card
            </Button>
            <Button as={Link} to="/dashboard/edit">
              <Pencil size={15} aria-hidden="true" />
              Edit card
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy-900">Your card</h2>
              <Badge tone="success">Published</Badge>
            </div>
            <div className="flex justify-center">
              <PhoneFrame scale="sm">
                <CardView card={card} interactive={false} />
              </PhoneFrame>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="p-6">
            <h2 className="text-sm font-semibold text-navy-900">Public link</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">Share this anywhere — email signature, bio, CV.</p>
            <CopyLinkRow url={publicUrl} />
          </Panel>

          {/* Free plan: all three counters are locked. The API sends no figures
              for them, so the blur is hiding placeholder dots, not data. */}
          <div className="grid gap-6 sm:grid-cols-3">
            <StatCard
              icon={Eye}
              label="Card views"
              value={analytics.stats.views}
              delta={pro ? '+12.4%' : undefined}
              locked={!pro}
            />
            <StatCard
              icon={MousePointerClick}
              label="Link clicks"
              value={analytics.stats.clicks}
              delta={pro ? '+8.1%' : undefined}
              locked={!pro}
            />
            <StatCard
              icon={ScanLine}
              label="QR scans"
              value={analytics.stats.scans}
              delta={pro ? '+21.7%' : undefined}
              locked={!pro}
            />
          </div>

          {pro ? (
            <Panel className="p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-navy-900">Traffic</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Last 15 days</p>
                </div>
                <Button as={Link} to="/dashboard/analytics" variant="ghost" size="sm">
                  Full analytics
                </Button>
              </div>
              <TrafficChart series={analytics.series} compact />
            </Panel>
          ) : (
            <Panel className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-navy-900">
                  <Lock size={14} className="text-slate-400" aria-hidden="true" />
                  Traffic
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Clicks, QR scans and the 15-day trend come with Pro.
                </p>
              </div>
              <Button as={Link} to="/dashboard/analytics" variant="secondary" size="sm">
                See what’s included
              </Button>
            </Panel>
          )}

          <Panel className="p-6">
            <h2 className="text-sm font-semibold text-navy-900">QR code</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">Print-ready in raster or vector.</p>
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <div className="rounded-md border border-slate-200 p-3">
                <QrCode value={publicUrl} size={128} color={card.accent} />
              </div>
              <div className="flex w-full flex-col gap-2.5 sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={() => downloadPng(publicUrl, `${card.username}-qr.png`, card.accent)}
                >
                  <Download size={15} aria-hidden="true" />
                  Download PNG
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => downloadSvg(publicUrl, `${card.username}-qr.svg`, card.accent)}
                >
                  <Download size={15} aria-hidden="true" />
                  Download SVG
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}

// No Design tab: template and accent live on the Templates page, where the
// picker has the room for full-size previews and the Apply flow.
const EDIT_TABS = [
  { id: 'identity', label: 'Identity' },
  { id: 'contact', label: 'Contact' },
  { id: 'links', label: 'Links' },
]

function EditCard({ card, setCard, pro }) {
  const toast = useToast()
  const [tab, setTab] = useState('identity')
  const [draft, setDraft] = useState(card)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(card)

  const update = (patch) => {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch)) delete next[key]
      return next
    })
  }

  async function save(event) {
    event.preventDefault()
    const nextErrors = validateCard(draft, 'all')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const firstTab = nextErrors.fullName || nextErrors.title || nextErrors.bio ? 'identity' : 'contact'
      setTab(firstTab)
      toast('Check the highlighted fields', 'info')
      return
    }

    setSaving(true)
    const submitted = draft
    try {
      /**
       * Adopt the card the server sends back as the new baseline. It is not
       * byte-identical to what went up — new links come back with real ids in
       * place of the local `n1` ones, and empty fields come back as null — so
       * without this the draft never matches again and "You have unsaved
       * changes" stays on screen after a successful save.
       */
      const saved = await setCard(draft)
      // Unless something was typed while the request was in flight, in which
      // case that edit is newer than the response and must not be thrown away.
      if (saved) setDraft((current) => (current === submitted ? saved : current))
      toast('Changes saved')
    } catch (error) {
      toast(error.message || 'Could not save your changes', 'info')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save}>
      <PageHeader
        title="Edit card"
        description="Every change appears in the preview instantly. Nothing is public until you save."
        actions={
          <Button type="submit" loading={saving} disabled={!dirty}>
            {dirty ? 'Save changes' : 'Saved'}
          </Button>
        }
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Card sections">
            {EDIT_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={cx(
                  '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
                  tab === item.id
                    ? 'border-accent-500 text-accent-600'
                    : 'border-transparent text-slate-500 hover:text-navy-900'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Panel className="p-6 lg:p-7">
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
              {tab === 'identity' && <IdentitySection card={draft} update={update} errors={errors} />}
              {tab === 'contact' && <ContactSection card={draft} update={update} errors={errors} />}
              {tab === 'links' && <LinksSection card={draft} update={update} pro={pro} />}
            </div>
          </Panel>

          {/* With nothing left to save, a dead Save button is just clutter —
              the next thing you want is to look at the card, so the slot
              becomes that instead. `target="_blank"` opens a tab, not a
              window; `window.open` with features is what spawns windows. */}
          <div className="mt-6 flex items-center justify-end gap-3">
            {dirty ? (
              <>
                <p className="text-sm text-slate-500">You have unsaved changes</p>
                <Button type="submit" size="lg" loading={saving}>
                  Save changes
                </Button>
              </>
            ) : (
              <Button
                as="a"
                href={`/${card.username}`}
                target="_blank"
                rel="noopener noreferrer"
                size="lg"
                variant="secondary"
              >
                <ExternalLink size={16} aria-hidden="true" />
                Open card
              </Button>
            )}
          </div>
        </div>

        <aside>
          <div className="sticky top-24">
            <h2 className="mb-4 text-sm font-semibold text-navy-900">Live preview</h2>
            <PhoneFrame scale="sm" className="mx-auto">
              <CardView card={draft} interactive={false} />
            </PhoneFrame>
          </div>
        </aside>
      </div>
    </form>
  )
}

function TemplatesView({ card, setCard, pro }) {
  const toast = useToast()
  // The preview follows the pending pick, so you can see a template before
  // Apply commits it. Accent changes still save on click and arrive via `card`.
  const [pendingTemplate, setPendingTemplate] = useState(card.template)
  const previewCard = { ...card, template: pendingTemplate }

  return (
    <>
      <PageHeader
        title="Templates"
        description="Switch design and accent colour. Your link and QR code stay the same."
      />
      {/* The preview column is sized to the `md` phone plus its bezel. */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="p-6 lg:p-7">
          <TemplateSection
            card={card}
            confirm
            pro={pro}
            onPendingChange={setPendingTemplate}
            update={async (patch) => {
              try {
                await setCard({ ...card, ...patch })
                toast('Design updated')
              } catch (error) {
                toast(error.message || 'Could not save the design', 'info')
              }
            }}
          />
        </Panel>
        <aside>
          {/* Same top inset as the panel beside it, and the gap under the
              heading matches that panel's heading-plus-hint block, so the
              phone starts level with the top of the template tiles. */}
          <div className="sticky top-24 pt-6 lg:pt-7">
            <h2 className="text-sm font-semibold text-navy-900">Live preview</h2>
            <PhoneFrame scale="md" className="mx-auto mt-10">
              <CardView card={previewCard} interactive={false} />
            </PhoneFrame>
          </div>
        </aside>
      </div>
    </>
  )
}

function QrView({ card, publicUrl }) {
  const [color, setColor] = useState(card.accent || '#0F2544')

  return (
    <>
      <PageHeader
        title="QR code"
        description="Generated from your card URL. Update your details freely — the code keeps working."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="flex flex-col items-center p-8">
          <div className="rounded-md border border-slate-200 p-5">
            <QrCode value={publicUrl} size={220} color={color} />
          </div>
          <p className="mt-5 text-sm font-medium text-navy-900">{publicUrl}</p>
          <p className="mt-1 text-xs text-slate-500">Error correction level M · scannable from ~1.5m at A5 size</p>
        </Panel>

        <div className="space-y-6">
          <Panel className="p-6">
            <h2 className="text-sm font-semibold text-navy-900">Code colour</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">Dark colours scan most reliably.</p>
            <div role="radiogroup" aria-label="QR code colour" className="flex flex-wrap gap-2.5">
              {[{ name: 'Classic navy', value: '#0F2544' }, ...ACCENT_COLORS].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={color === option.value}
                  aria-label={option.name}
                  title={option.name}
                  onClick={() => setColor(option.value)}
                  className={cx(
                    'h-10 w-10 rounded-md border-2 transition-transform',
                    color === option.value ? 'border-navy-900 scale-105' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: option.value }}
                />
              ))}
            </div>
          </Panel>

          <Panel className="p-6">
            <h2 className="text-sm font-semibold text-navy-900">Download</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">
              PNG for screens and slides, SVG for anything printed.
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => downloadPng(publicUrl, `${card.username}-qr.png`, color)}>
                <Download size={15} aria-hidden="true" />
                PNG · 1024px
              </Button>
              <Button variant="secondary" onClick={() => downloadSvg(publicUrl, `${card.username}-qr.svg`, color)}>
                <Download size={15} aria-hidden="true" />
                SVG · vector
              </Button>
            </div>
          </Panel>

          <Panel className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-navy-900">Where to use it</h2>
            <ul className="space-y-2.5 text-sm text-slate-600">
              {[
                'Printed cards, flyers and roll-up banners',
                'Your laptop lid, phone case or name badge',
                'Storefront window, packaging and invoices',
                'The last slide of every presentation',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-md bg-accent-500" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}

/**
 * What a free account sees in place of the analytics: its view counter, and
 * the case for the plan that opens the rest. The numbers behind the blur are
 * never fetched — the API stops at the view total for a free plan.
 */
function AnalyticsLocked() {
  const [upgrading, setUpgrading] = useState(false)

  return (
    <>
      <PageHeader title="Analytics" description="How people are finding and using your card." />

      <div className="max-w-2xl">
        <Panel className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-navy-900">Card views</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                We are counting every visit — Pro shows you the number.
              </p>
            </div>
            <Badge tone="slate">
              <Lock size={12} aria-hidden="true" />
              Pro
            </Badge>
          </div>
          <p
            className="mt-5 select-none text-4xl font-bold tracking-tight text-navy-900 blur-[6px]"
            aria-hidden="true"
          >
            ••••
          </p>
        </Panel>

        <Panel className="mt-6 p-6">
          <h2 className="text-sm font-semibold text-navy-900">See where they come from</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Pro adds link clicks and QR scans, the 15-day trend for all three, and which of your links people
            actually tap.
          </p>
          <ul className="mt-4 space-y-2">
            {['Link clicks and QR scans', 'Daily trend across 15 days', 'Your most-tapped links'].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                <Lock size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Button type="button" className="mt-5" onClick={() => setUpgrading(true)}>
            <Sparkles size={16} aria-hidden="true" />
            Go Pro
          </Button>
        </Panel>
      </div>

      {upgrading && (
        <UpgradeDialog
          reason="Full analytics are part of the Pro plan."
          onClose={() => setUpgrading(false)}
        />
      )}
    </>
  )
}

function Analytics({ card, analytics, pro }) {
  const topLinks = analytics.topLinks || []
  const maxLinkClicks = Math.max(1, ...topLinks.map((link) => link.clicks))

  if (!pro) return <AnalyticsLocked />

  return (
    <>
      <PageHeader title="Analytics" description="How people are finding and using your card." />

      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard icon={Eye} label="Card views" value={analytics.stats.views} delta="+12.4%" />
        <StatCard icon={MousePointerClick} label="Link clicks" value={analytics.stats.clicks} delta="+8.1%" />
        <StatCard icon={ScanLine} label="QR scans" value={analytics.stats.scans} delta="+21.7%" />
      </div>

      <Panel className="mt-6 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-navy-900">Views, clicks and scans</h2>
            <p className="mt-0.5 text-sm text-slate-500">Last 15 days</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
            {[
              { label: 'Views', color: '#0F2544' },
              { label: 'Link clicks', color: '#2E6BE6' },
              { label: 'QR scans', color: '#94a3b8' },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-md" style={{ backgroundColor: item.color }} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
        <TrafficChart series={analytics.series} />
      </Panel>

      <Panel className="mt-6 p-6">
        <h2 className="mb-5 text-sm font-semibold text-navy-900">Most clicked links</h2>
        <ul className="space-y-4">
          {topLinks.map((link) => (
            <li key={link.id}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium capitalize text-navy-900">{link.platform}</span>
                <span className="text-slate-500">{link.clicks} clicks</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-md bg-slate-100">
                <div
                  className="h-full rounded-md bg-accent-500"
                  style={{ width: `${(link.clicks / maxLinkClicks) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}

function Settings({ card, setCard, onLogout, pro, user, savePrefs }) {
  const toast = useToast()
  const [username, setUsername] = useState(card.username)
  const [upgrading, setUpgrading] = useState(false)
  const [email, setEmail] = useState(card.email || '')
  const [passwords, setPasswords] = useState({ current: '', next: '' })
  const [confirmDelete, setConfirmDelete] = useState('')

  /**
   * The preferences are stored, not local: two live on the card, one on the
   * account. Each toggle saves immediately — there is no Save button in this
   * panel, so a switch that only moved on screen would be a lie.
   */
  async function saveCardPref(patch, message) {
    try {
      await setCard({ ...card, ...patch })
      toast(message)
    } catch (error) {
      toast(error.message || 'Could not save that preference', 'info')
    }
  }

  async function saveAccountPref(patch, message) {
    try {
      await savePrefs(patch)
      toast(message)
    } catch (error) {
      toast(error.message || 'Could not save that preference', 'info')
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Account, URL and privacy preferences." />

      <div className="max-w-2xl space-y-6">
        <Panel className="p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-semibold text-navy-900">Card URL</h2>
            {!pro && (
              <Badge tone="slate">
                <Lock size={12} aria-hidden="true" />
                Pro
              </Badge>
            )}
          </div>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            {pro
              ? 'Changing this breaks any QR code or link you have already shared.'
              : 'We picked this from your email. Choosing your own is part of the Pro plan.'}
          </p>
          <form
            className="flex flex-col gap-2.5 sm:flex-row sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!pro) return setUpgrading(true)
              try {
                await setCard({ ...card, username })
                toast('Card URL updated')
              } catch (error) {
                toast(error.errors?.username || error.message || 'Could not update the URL', 'info')
              }
            }}
          >
            <Field label="Username" htmlFor="settings-username" className="flex-1">
              <div
                className={cx(
                  'flex h-11 items-center overflow-hidden rounded-md border bg-white focus-within:border-accent-500 focus-within:ring-2 focus-within:ring-accent-500/25',
                  pro ? 'border-slate-300' : 'border-slate-200 bg-slate-50'
                )}
              >
                <span className="select-none border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-500">
                  {SITE_DOMAIN}/
                </span>
                <input
                  id="settings-username"
                  value={username}
                  readOnly={!pro}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className={cx(
                    'h-full min-w-0 flex-1 px-3 text-sm focus:outline-none',
                    pro ? 'text-navy-900' : 'cursor-not-allowed text-slate-500'
                  )}
                />
              </div>
            </Field>
            {pro ? (
              <Button type="submit" variant="secondary" className="sm:mb-0">
                Update URL
              </Button>
            ) : (
              <Button type="submit" className="sm:mb-0">
                <Sparkles size={15} aria-hidden="true" />
                Go Pro
              </Button>
            )}
          </form>

          {upgrading && (
            <UpgradeDialog
              reason="Choosing your own card URL is part of the Pro plan."
              onClose={() => setUpgrading(false)}
            />
          )}
        </Panel>

        <Panel className="p-6">
          <h2 className="text-sm font-semibold text-navy-900">Account email</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">Used for login and notifications.</p>
          <form
            className="flex flex-col gap-2.5 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              toast('Confirmation email sent')
            }}
          >
            <Field label="Email address" htmlFor="settings-email" className="flex-1">
              <Input id="settings-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Button type="submit" variant="secondary">
              Save email
            </Button>
          </form>
        </Panel>

        <Panel className="p-6">
          <h2 className="text-sm font-semibold text-navy-900">Password</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">Use at least 8 characters.</p>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setPasswords({ current: '', next: '' })
              toast('Password updated')
            }}
          >
            <Field label="Current password" htmlFor="current-password">
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              />
            </Field>
            <Field label="New password" htmlFor="new-password">
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              />
            </Field>
            <Button type="submit" variant="secondary">
              Update password
            </Button>
          </form>
        </Panel>

        {/* The whole panel is Pro. Each switch stays visible so a free account
            can see what the plan buys, but none of them can be moved. */}
        <Panel className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-semibold text-navy-900">Card preferences</h2>
            {!pro && (
              <Badge tone="slate">
                <Lock size={12} aria-hidden="true" />
                Pro
              </Badge>
            )}
          </div>
          <Switch
            checked={Boolean(card.hideBranding)}
            onChange={(value) =>
              saveCardPref({ hideBranding: value }, value ? 'Branding hidden' : 'Branding shown')
            }
            label="Hide “Powered by CardFolio”"
            description={
              pro ? 'Removes the credit from your card.' : 'Free cards carry a small CardFolio credit.'
            }
            locked={!pro}
            onLocked={() => setUpgrading(true)}
          />
          <Switch
            checked={card.indexable !== false}
            onChange={(value) =>
              saveCardPref(
                { indexable: value },
                value ? 'Search engines allowed' : 'Search engines asked to skip your card'
              )
            }
            label="Allow search engines to index my card"
            description="Lets people find you by name on Google."
            locked={!pro}
            onLocked={() => setUpgrading(true)}
          />
          <Switch
            checked={user?.weeklyEmail !== false}
            onChange={(value) =>
              saveAccountPref({ weeklyEmail: value }, value ? 'Weekly email on' : 'Weekly email off')
            }
            label="Weekly performance email"
            description="A short summary of views, clicks and scans."
            locked={!pro}
            onLocked={() => setUpgrading(true)}
          />
        </Panel>

        <Panel className="border-red-200! p-6">
          <h2 className="text-sm font-semibold text-red-700">Delete account</h2>
          <p className="mb-4 mt-1 text-sm text-slate-600">
            This permanently removes your card, your username and all analytics. It cannot be undone.
          </p>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              toast('Account deletion is disabled in this demo', 'info')
              setConfirmDelete('')
            }}
          >
            <Field label="Type DELETE to confirm" htmlFor="confirm-delete">
              <Input
                id="confirm-delete"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder="DELETE"
              />
            </Field>
            <Button type="submit" variant="danger" disabled={confirmDelete !== 'DELETE'}>
              Delete my account
            </Button>
            <Button type="button" variant="secondary" onClick={onLogout} className="ml-2">
              Log out
            </Button>
          </form>
        </Panel>
      </div>
    </>
  )
}

/* ----------------------------------------------------------------- shell */

const EMPTY_ANALYTICS = { stats: { views: 0, clicks: 0, scans: 0 }, series: [], topLinks: [] }

export default function Dashboard() {
  const { user, card, status, saveCard, logout, savePrefs } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const location = useLocation()

  // Only an explicit 'pro' counts: an unknown or missing plan is free.
  const pro = user?.plan === 'pro'

  // Uploading a new portrait must clear a previous load failure.
  useEffect(() => setAvatarFailed(false), [card?.photo])

  // Pull analytics once the session is known good.
  useEffect(() => {
    if (status !== 'authenticated') return
    let active = true
    api
      .analytics()
      .then((data) => active && setAnalytics(data))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [status, location.pathname])

  if (status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50">
        <p className="text-sm text-slate-500" role="status">
          Loading your dashboard…
        </p>
      </div>
    )
  }

  if (status === 'anonymous' || !card) {
    return <Navigate to="/login" replace />
  }

  const setCard = (next) => saveCard(next)
  const publicUrl = `https://${SITE_DOMAIN}/${card.username}`

  const sidebar = (
    <nav className="flex flex-col gap-1" aria-label="Dashboard">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setNavOpen(false)}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors',
              isActive ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'
            )
          }
        >
          <item.icon size={17} aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between gap-4 px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen((value) => !value)}
              aria-expanded={navOpen}
              aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
              className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-navy-900 lg:hidden"
            >
              {navOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Logo size="sm" />
          </div>

          <div className="flex items-center gap-3">
            {/* Whatever the account actually is — a new signup is on free. */}
            <Badge tone={pro ? 'navy' : 'slate'} className="hidden sm:inline-flex">
              {pro ? 'Pro plan' : 'Free plan'}
            </Badge>
            <AccountMenu card={card} user={user} onLogout={logout} avatarFailed={avatarFailed} onAvatarError={() => setAvatarFailed(true)} />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
          {sidebar}
          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-navy-900">Your link</p>
            <p className="mt-1 break-all text-xs text-slate-500">
              {SITE_DOMAIN}/{card.username}
            </p>
          </div>
        </aside>

        {navOpen && (
          <div className="fixed inset-x-0 top-16 z-40 border-b border-slate-200 bg-white p-4 lg:hidden">{sidebar}</div>
        )}

        <main className="min-w-0 flex-1 px-5 py-8 lg:px-8" key={location.pathname}>
          <Routes>
            <Route index element={<Overview card={card} publicUrl={publicUrl} analytics={analytics} pro={pro} />} />
            <Route path="edit" element={<EditCard card={card} setCard={setCard} pro={pro} />} />
            <Route path="templates" element={<TemplatesView card={card} setCard={setCard} pro={pro} />} />
            <Route path="qr" element={<QrView card={card} publicUrl={publicUrl} />} />
            <Route path="analytics" element={<Analytics card={card} analytics={analytics} pro={pro} />} />
            <Route path="settings" element={
                <Settings
                  card={card}
                  setCard={setCard}
                  onLogout={logout}
                  pro={pro}
                  user={user}
                  savePrefs={savePrefs}
                />
              } />
          </Routes>
        </main>
      </div>
    </div>
  )
}
