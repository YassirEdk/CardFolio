import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  KeyRound,
  LayoutTemplate,
  Link as LinkIcon,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Menu,
  Pencil,
  QrCode as QrCodeIcon,
  ScanLine,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingDown,
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
import ScaledCard from '../components/ScaledCard'
import ViewToggle from '../components/ViewToggle'
import DesktopCard from '../desktop/DesktopCard'
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
  { to: '/dashboard', end: true, label: 'My Card', icon: CreditCard, tab: true },
  { to: '/dashboard/edit', label: 'Edit', icon: Pencil, tab: true },
  { to: '/dashboard/templates', label: 'Templates', icon: LayoutTemplate, tab: true },
  { to: '/dashboard/qr', label: 'QR Code', icon: QrCodeIcon, tab: true },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
]

/**
 * The four everyday destinations, always on screen on a phone.
 *
 * `tab: true` above picks them; Analytics and Settings stay behind the menu
 * button, because five or six tabs in a row stop being tappable. Fixed to the
 * bottom, where a thumb already is, and padded for the home indicator.
 */
function MobileTabs() {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="grid grid-cols-4">
        {NAV.filter((item) => item.tab).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cx(
                'flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-semibold transition-colors',
                isActive ? 'text-accent-600' : 'text-slate-500'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cx(
                    'grid h-8 w-14 place-items-center rounded-md transition-colors',
                    isActive ? 'bg-accent-50' : 'bg-transparent'
                  )}
                >
                  <item.icon size={18} aria-hidden="true" />
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

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

/** The spans a stat tile can be read over. `total` is every event ever. */
const STAT_RANGES = [
  { id: 'day', label: 'Today', short: 'Today' },
  { id: 'month', label: 'This month', short: 'Month' },
  { id: 'total', label: 'All time', short: 'All time' },
]

/**
 * Pulls one stat out of every span, in the shape StatCard's `values` wants.
 * Undefined when the API sent no ranges — a free account, or an older payload
 * — and the tile then shows its all-time figure with no picker.
 */
function statValues(analytics, key) {
  const ranges = analytics.ranges
  if (!ranges) return undefined
  return { day: ranges.day[key], month: ranges.month[key], total: ranges.total[key] }
}

/**
 * `locked` hides the figure behind a blur and a Pro chip. The blurred glyphs
 * are placeholder dots, never a real or invented number: the API sends nothing
 * for a locked stat, so there is no figure to leak through the blur.
 *
 * `values` carries the same stat over each span — pass it and the tile grows a
 * range picker in the corner. Without it the tile shows `value` and no picker,
 * which is what a locked (free) tile wants.
 */
function StatCard({ icon: Icon, label, value, values, delta, locked = false }) {
  const [range, setRange] = useState('total')
  const filterable = Boolean(values) && !locked
  const shown = filterable ? values[range] : value

  // Only a real measurement earns the arrow: the API sends null when the week
  // before saw nothing, and there is no trend to draw from no history. It
  // describes the last seven days, so it belongs to the all-time reading only.
  const trend = typeof delta === 'number' && Number.isFinite(delta) ? delta : null
  const showTrend = trend !== null && (!filterable || range === 'total')
  const up = trend !== null && trend >= 0

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-600" aria-hidden="true">
          <Icon size={17} />
        </span>
        {locked ? (
          <Badge tone="slate">
            <Lock size={11} aria-hidden="true" />
            Pro
          </Badge>
        ) : (
          filterable && (
            <div className="relative shrink-0">
              {/* A native select: it is one tap on a phone, keyboard-operable
                  for free, and three buttons would crowd a tile this size. */}
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                aria-label={`${label} — time range`}
                className="h-7 cursor-pointer appearance-none rounded-md border border-slate-200 bg-white pl-2.5 pr-6 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40"
              >
                {STAT_RANGES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.short}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                aria-hidden="true"
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          )
        )}
      </div>

      {locked ? (
        <p className="mt-4 select-none text-2xl font-bold tracking-tight text-navy-900 blur-[5px]" aria-hidden="true">
          ••••
        </p>
      ) : (
        <p className="mt-4 flex items-baseline gap-2 text-2xl font-bold tracking-tight text-navy-900">
          {(shown || 0).toLocaleString()}
          {showTrend && (
            <span
              title="Compared with the seven days before"
              className={cx(
                'inline-flex items-center gap-0.5 text-xs font-semibold',
                up ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {up ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}
              {up ? '+' : ''}
              {trend}%
              <span className="sr-only"> versus the previous seven days</span>
            </span>
          )}
        </p>
      )}
      <p className="mt-0.5 text-sm text-slate-500">
        {label}
        {filterable && range !== 'total' && (
          <span className="text-slate-400">
            {' · '}
            {STAT_RANGES.find((option) => option.id === range).label.toLowerCase()}
          </span>
        )}
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

/**
 * Shown once, when someone skips the setup wizard.
 *
 * The card is already live at that point, so the thing they need to know is
 * where the rest of it gets filled in. Everything behind is blurred so the one
 * lit control — Edit — is the only place to go.
 */
function SkipNotice({ onClose }) {
  const navigate = useNavigate()

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="animate-scrim-in fixed inset-0 z-[90] flex items-center justify-center bg-navy-950/45 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skip-notice-title"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="animate-dialog-in w-full max-w-md rounded-md border border-slate-200 bg-white p-6 text-center shadow-[var(--shadow-lift)]">
        <span
          className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-accent-50 text-accent-600"
          aria-hidden="true"
        >
          <Pencil size={22} />
        </span>
        <h2 id="skip-notice-title" className="mt-4 text-lg font-bold text-navy-900">
          Your card is live
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          You skipped the rest of the setup, which is fine — nothing is locked in. Your photo, contact
          details, links and design all live under <span className="font-semibold text-navy-900">Edit</span>,
          and every change is published the moment you save it.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            type="button"
            size="lg"
            onClick={() => {
              onClose()
              navigate('/dashboard/edit')
            }}
          >
            <Pencil size={16} aria-hidden="true" />
            Edit my card
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            I’ll do it later
          </Button>
        </div>
      </div>
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

function Overview({ card, publicUrl, qrUrl, analytics, pro }) {
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
          {/* Desktop only. On a phone the preview is a phone-sized picture of
              a phone on a phone — it takes a whole screen to say nothing the
              real card at your link doesn't say better. */}
          <Panel className="hidden p-6 lg:block">
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
              values={statValues(analytics, 'views')}
              delta={analytics.deltas?.views}
              locked={!pro}
            />
            <StatCard
              icon={LinkIcon}
              label="Link opens"
              value={analytics.stats.links}
              values={statValues(analytics, 'links')}
              delta={analytics.deltas?.links}
              locked={!pro}
            />
            <StatCard
              icon={ScanLine}
              label="QR scans"
              value={analytics.stats.scans}
              values={statValues(analytics, 'scans')}
              delta={analytics.deltas?.scans}
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
                <QrCode value={qrUrl} size={128} color={card.accent} />
              </div>
              <div className="flex w-full flex-col gap-2.5 sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={() => downloadPng(qrUrl, `${card.username}-qr.png`, card.accent)}
                >
                  <Download size={15} aria-hidden="true" />
                  Download PNG
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => downloadSvg(qrUrl, `${card.username}-qr.svg`, card.accent)}
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

        <aside className="hidden lg:block">
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

/**
 * The desktop layout at sidebar size: the real DesktopCard laid out at 1280px
 * and scaled down, inside a browser-window frame so it reads as "this is the
 * wide screen" rather than as a squashed card.
 */
function DesktopPreview({ card }) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2" aria-hidden="true">
        <span className="h-2 w-2 rounded-md bg-slate-300" />
        <span className="h-2 w-2 rounded-md bg-slate-300" />
        <span className="h-2 w-2 rounded-md bg-slate-300" />
        <span className="ml-2 h-3 flex-1 rounded-md bg-slate-200" />
      </div>
      {/* A window shape, not a height that follows the content. The desktop
          layouts are built on `min-h-dvh`, and inside a scaled preview `dvh`
          still measures the real browser viewport — so the card comes out
          taller than what it holds and the surplus shows as empty white.
          Clipping to a 16:10 window cuts that off, and the fade at the edge
          reads as "there is more below" rather than as a crop. */}
      <div className="aspect-[16/10] overflow-hidden [-webkit-mask-image:linear-gradient(180deg,#000_90%,transparent_100%)] [mask-image:linear-gradient(180deg,#000_90%,transparent_100%)]">
        <ScaledCard designWidth={1280}>
          <DesktopCard card={card} />
        </ScaledCard>
      </div>
    </div>
  )
}

function TemplatesView({ card, setCard, pro }) {
  const toast = useToast()
  // The preview follows the pending pick, so you can see a template before
  // Apply commits it. Accent changes still save on click and arrive via `card`.
  const [pendingTemplate, setPendingTemplate] = useState(card.template)
  const [view, setView] = useState('phone')
  const previewCard = { ...card, template: pendingTemplate }

  return (
    <>
      <PageHeader
        title="Templates"
        description="Switch design and accent colour. Your link and QR code stay the same."
      />
      {/* The preview column is sized to what it holds: the `md` phone plus its
          bezel, or a wider slot for the desktop layout — at 340px a 1280px
          design scales to a quarter size and stops being readable. */}
      <div
        className={cx(
          'grid gap-8',
          view === 'desktop' ? 'xl:grid-cols-[minmax(0,1fr)_520px]' : 'xl:grid-cols-[minmax(0,1fr)_340px]'
        )}
      >
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
        <aside className="hidden lg:block">
          {/* The old top inset lined this up with the template tiles, from
              before the toggle sat between the heading and the preview. With
              that in the way the column started well below the panel, so it
              sits at the top of the row now. */}
          <div className="sticky top-24">
            <h2 className="text-sm font-semibold text-navy-900">Live preview</h2>
            {/* Every template ships a phone layout and a desktop one, and a
                card is seen on both — so both are previewable here. */}
            <ViewToggle view={view} onChange={setView} className="mt-3" />

            {view === 'phone' ? (
              <PhoneFrame scale="md" className="mx-auto mt-4">
                <CardView card={previewCard} interactive={false} />
              </PhoneFrame>
            ) : (
              <div className="mt-4">
                <DesktopPreview card={previewCard} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  )
}

function QrView({ card, publicUrl, qrUrl }) {
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
            <QrCode value={qrUrl} size={220} color={color} />
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
              <Button variant="secondary" onClick={() => downloadPng(qrUrl, `${card.username}-qr.png`, color)}>
                <Download size={15} aria-hidden="true" />
                PNG · 1024px
              </Button>
              <Button variant="secondary" onClick={() => downloadSvg(qrUrl, `${card.username}-qr.svg`, color)}>
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
        <StatCard
          icon={Eye}
          label="Card views"
          value={analytics.stats.views}
          values={statValues(analytics, 'views')}
          delta={analytics.deltas?.views}
        />
        <StatCard
          icon={LinkIcon}
          label="Link opens"
          value={analytics.stats.links}
          values={statValues(analytics, 'links')}
          delta={analytics.deltas?.links}
        />
        <StatCard
          icon={ScanLine}
          label="QR scans"
          value={analytics.stats.scans}
          values={statValues(analytics, 'scans')}
          delta={analytics.deltas?.scans}
        />
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

/** Same rule the server enforces, so the field can say no before asking. */
const USERNAME_RE = /^[a-z0-9][a-z0-9-]{2,29}$/

/**
 * Alternatives to offer when a handle is taken: a couple of numbered variants
 * and a short random suffix, trimmed to the 30-character limit.
 */
function suggestFor(base) {
  const stem = base.slice(0, 24).replace(/-+$/, '')
  return [`${stem}-1`, `${stem}2`, `${stem}-${Math.random().toString(36).slice(2, 5)}`]
}

/**
 * One header for every settings panel: an icon chip, a title, the sentence
 * that explains what the panel changes, and room for a Pro badge. Written once
 * so six panels cannot drift apart by a few pixels each.
 */
function PanelHeader({ icon: Icon, title, description, tone = 'slate', badge, className = 'mb-5' }) {
  return (
    <div className={cx('flex items-start gap-3', className)}>
      <span
        className={cx(
          'grid h-9 w-9 shrink-0 place-items-center rounded-md',
          tone === 'red' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
        )}
        aria-hidden="true"
      >
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className={cx('text-sm font-semibold', tone === 'red' ? 'text-red-700' : 'text-navy-900')}>
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
      {badge}
    </div>
  )
}

function Settings({ card, setCard, onLogout, pro, user, savePrefs, deleteAccount }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState(card.username)
  // 'current' | 'invalid' | 'checking' | 'available' | 'taken'
  const [urlState, setUrlState] = useState('current')
  const [suggestions, setSuggestions] = useState([])

  /**
   * Availability, checked as you type rather than on submit — being told a
   * handle is taken only after pressing the button is the slow way to find
   * out. Debounced so a word costs one request, not one per keystroke.
   */
  useEffect(() => {
    if (!pro) return
    const wanted = username.trim().toLowerCase()
    setSuggestions([])

    if (wanted === card.username) return setUrlState('current')
    if (!USERNAME_RE.test(wanted)) return setUrlState('invalid')

    setUrlState('checking')
    let active = true
    const timer = setTimeout(async () => {
      try {
        const free = await api.checkUsername(wanted)
        if (!active) return
        setUrlState(free ? 'available' : 'taken')
        if (free) return

        // Only offer alternatives that are themselves free.
        const candidates = await Promise.all(
          suggestFor(wanted).map(async (candidate) => ((await api.checkUsername(candidate)) ? candidate : null))
        )
        if (active) setSuggestions(candidates.filter(Boolean).slice(0, 3))
      } catch {
        // The server validates again on save, so a failed probe is not fatal.
        if (active) setUrlState('current')
      }
    }, 350)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [username, card.username, pro])
  const [upgrading, setUpgrading] = useState(false)
  const [email, setEmail] = useState(card.email || '')
  const [passwords, setPasswords] = useState({ current: '', next: '' })
  // Deleting an account is two deliberate steps: the confirmation field only
  // appears once `armed` is set, so the input is never one stray click away.
  const [armed, setArmed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState('')
  const [deleting, setDeleting] = useState(false)

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

      {/* Two columns on wide screens: the card's public identity on the left,
          the account and its preferences on the right. The panels are direct
          grid children rather than two stacked columns, so each pair shares a
          row — Card URL beside Account email, Password beside Card preferences
          — and the two in a row are the same height. Source order is therefore
          left, right, left, right, which is also the order they stack in on a
          phone. */}
      {/* No width cap: the panels run to the edge of the content column like
          every other page in the dashboard, rather than stopping short and
          leaving a band of empty page beside them. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-6">
          <PanelHeader
            icon={LinkIcon}
            title="Card URL"
            description={
              pro
                ? 'Changing this breaks any QR code or link you have already shared.'
                : 'We picked this for you. Choosing your own is part of the Pro plan.'
            }
            badge={
              !pro && (
                <Badge tone="slate">
                  <Lock size={12} aria-hidden="true" />
                  Pro
                </Badge>
              )
            }
          />
          <form
            className="flex flex-col gap-2.5 sm:flex-row sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!pro) return setUpgrading(true)
              if (urlState !== 'available') return
              try {
                await setCard({ ...card, username })
                toast('Card URL updated')
              } catch (error) {
                toast(error.errors?.username || error.message || 'Could not update the URL', 'info')
              }
            }}
          >
            {/* min-w-0: without it the prefix + input refuse to shrink below
                their content width and push the button out of the panel. */}
            <Field label="Username" htmlFor="settings-username" className="min-w-0 flex-1">
              <div
                className={cx(
                  'flex h-11 items-center overflow-hidden rounded-md border bg-white focus-within:ring-2 focus-within:ring-accent-500/25',
                  !pro && 'border-slate-200 bg-slate-50',
                  pro && urlState === 'available' && 'border-emerald-400',
                  pro && (urlState === 'taken' || urlState === 'invalid') && 'border-red-400',
                  pro && !['available', 'taken', 'invalid'].includes(urlState) && 'border-slate-300'
                )}
              >
                {/* The origin is fixed; only the handle after the slash is
                    yours to set. On localhost that reads "localhost:5173/". */}
                <span
                  title={`${SITE_DOMAIN}/`}
                  className="select-none truncate border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-500"
                >
                  {SITE_DOMAIN}/
                </span>
                <input
                  id="settings-username"
                  value={username}
                  readOnly={!pro}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className={cx(
                    // A min-width the flexbox has to honour: the origin beside
                    // it can be as long as card-folio-hazel.vercel.app, and
                    // without a floor the handle gets squeezed to a few
                    // characters — the one part of the field you are editing.
                    'h-full min-w-[7rem] flex-1 px-3 text-sm focus:outline-none',
                    pro ? 'text-navy-900' : 'cursor-not-allowed text-slate-500'
                  )}
                />
                {pro && (
                  <span className="pr-3" aria-hidden="true">
                    {urlState === 'checking' && <Loader2 size={16} className="animate-spin text-slate-400" />}
                    {urlState === 'available' && <Check size={16} className="text-emerald-600" strokeWidth={3} />}
                    {(urlState === 'taken' || urlState === 'invalid') && <X size={16} className="text-red-500" />}
                  </span>
                )}
              </div>
            </Field>
            {pro ? (
              <Button
                type="submit"
                variant="secondary"
                className="shrink-0"
                disabled={urlState !== 'available'}
              >
                Update URL
              </Button>
            ) : (
              <Button type="submit" className="shrink-0">
                <Sparkles size={15} aria-hidden="true" />
                Go Pro
              </Button>
            )}
          </form>

          {pro && (
            <div className="mt-2 min-h-5 text-xs font-medium" role="status">
              {urlState === 'checking' && <span className="text-slate-500">Checking availability…</span>}
              {urlState === 'available' && (
                <span className="text-emerald-600">
                  {SITE_DOMAIN}/{username} is available for you
                </span>
              )}
              {urlState === 'invalid' && (
                <span className="text-red-600">3–30 characters: lowercase letters, numbers or hyphens</span>
              )}
              {urlState === 'taken' && (
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-red-600">
                  That link is already taken.
                  {suggestions.length > 0 && (
                    <span className="flex flex-wrap items-center gap-1.5 text-slate-500">
                      Try
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setUsername(suggestion)}
                          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-navy-900 transition-colors hover:border-slate-300 hover:bg-white"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </span>
                  )}
                </span>
              )}
            </div>
          )}

          {upgrading && (
            <UpgradeDialog
              reason="Choosing your own card URL is part of the Pro plan."
              onClose={() => setUpgrading(false)}
            />
          )}
        </Panel>

        <Panel className="p-6">
          <PanelHeader icon={Mail} title="Account email" description="Used for login and notifications." />
          <form
            className="flex flex-col gap-2.5 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              toast('Confirmation email sent')
            }}
          >
            <Field label="Email address" htmlFor="settings-email" className="min-w-0 flex-1">
              <Input id="settings-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Button type="submit" variant="secondary" className="shrink-0">
              Save email
            </Button>
          </form>
        </Panel>

        <Panel className="p-6">
          <PanelHeader icon={KeyRound} title="Password" description="Use at least 8 characters." />
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
          <PanelHeader
            icon={SlidersHorizontal}
            title="Card preferences"
            description="Branding, search engines and the weekly summary."
            className=""
            badge={
              !pro && (
                <Badge tone="slate">
                  <Lock size={12} aria-hidden="true" />
                  Pro
                </Badge>
              )
            }
          />
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

        {/* Full width, and last: the one action on this page that cannot be
          undone should never sit beside a field someone is tabbing through. */}
        <Panel className="border-red-200! p-6 lg:col-span-2">
        <PanelHeader
          icon={Trash2}
          tone="red"
          title="Delete account"
          description="Permanently removes your card, your username and all analytics. This cannot be undone."
        />
        {armed ? (
          <form
            className="flex flex-col gap-2.5 sm:flex-row sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault()
              if (confirmDelete !== 'DELETE' || deleting) return
              setDeleting(true)
              try {
                await deleteAccount()
                toast('Your account has been deleted')
                // The session is already cleared; leave the dashboard before
                // a render can ask for a card that no longer exists.
                navigate('/', { replace: true })
              } catch (error) {
                toast(error.message || 'Could not delete your account', 'info')
                setDeleting(false)
              }
            }}
          >
            <Field label="Type DELETE to confirm" htmlFor="confirm-delete" className="sm:max-w-xs sm:flex-1">
              <Input
                id="confirm-delete"
                autoFocus
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder="DELETE"
              />
            </Field>
            <Button type="submit" variant="danger" loading={deleting} disabled={confirmDelete !== 'DELETE'}>
              Delete my account
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={deleting}
              onClick={() => {
                setArmed(false)
                setConfirmDelete('')
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            <Button type="button" variant="danger" onClick={() => setArmed(true)}>
              Delete account
            </Button>
            <Button type="button" variant="secondary" onClick={onLogout}>
              <LogOut size={15} aria-hidden="true" />
              Log out
            </Button>
          </div>
        )}
        </Panel>
      </div>
    </>
  )
}

/* ----------------------------------------------------------------- shell */

/** How often the open dashboard re-reads its figures. */
const POLL_MS = 15_000

const EMPTY_ANALYTICS = {
  stats: { views: 0, links: 0, clicks: 0, scans: 0 },
  ranges: null,
  deltas: { views: null, links: null, clicks: null, scans: null },
  series: [],
  topLinks: [],
}

export default function Dashboard() {
  const { user, card, status, saveCard, logout, savePrefs, deleteAccount } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  /**
   * Set by the wizard's Skip button. Held in state and cleared from history
   * straight away, so a refresh or a Back doesn't show it a second time.
   */
  const [showSkipNotice, setShowSkipNotice] = useState(Boolean(location.state?.skipped))

  useEffect(() => {
    if (location.state?.skipped) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  // Only an explicit 'pro' counts: an unknown or missing plan is free.
  const pro = user?.plan === 'pro'

  // Uploading a new portrait must clear a previous load failure.
  useEffect(() => setAvatarFailed(false), [card?.photo])

  /**
   * Analytics, kept current while the dashboard is open.
   *
   * A scan or a click happens on someone else's phone, so nothing here can
   * know about it — the figures have to be asked for again. Polled every
   * `POLL_MS`, and immediately whenever the tab is brought back to the front,
   * which is the moment you actually look at the numbers after testing a link.
   *
   * Only while the tab is visible: a dashboard left open in a background tab
   * overnight should not spend the night talking to the server.
   */
  useEffect(() => {
    if (status !== 'authenticated') return
    let active = true

    const load = () => {
      api
        .analytics()
        .then((data) => active && setAnalytics(data))
        .catch(() => {})
    }

    load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      active = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
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

  /**
   * The dashboard is for a card that exists publicly. An unpublished one means
   * the wizard was never finished, so there is nothing here to manage yet —
   * back to onboarding, however the user arrived, typed URL included.
   */
  if (!card.published) {
    return <Navigate to="/onboarding" replace />
  }

  const setCard = (next) => saveCard(next)
  const publicUrl = `https://${SITE_DOMAIN}/${card.username}`
  /**
   * What the QR encodes: the same page, plus a marker saying how the visitor
   * got there. Without it a scan is indistinguishable from someone opening the
   * link, and the Scans figure could only ever be zero. The card page strips
   * the parameter out of the address bar once it has counted it.
   */
  const qrUrl = `${publicUrl}?src=qr`

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
            <p title={`${SITE_DOMAIN}/${card.username}`} className="mt-1 truncate text-xs text-slate-500">
              {SITE_DOMAIN}/{card.username}
            </p>
          </div>
        </aside>

        {navOpen && (
          <div className="fixed inset-x-0 top-16 z-40 border-b border-slate-200 bg-white p-4 lg:hidden">{sidebar}</div>
        )}

        {/* pb-28 on small screens: the tab bar is fixed, so the last thing on
            the page would otherwise sit underneath it. */}
        <main className="min-w-0 flex-1 px-5 pb-28 pt-8 lg:px-8 lg:pb-8" key={location.pathname}>
          <Routes>
            <Route index element={<Overview card={card} publicUrl={publicUrl} qrUrl={qrUrl} analytics={analytics} pro={pro} />} />
            <Route path="edit" element={<EditCard card={card} setCard={setCard} pro={pro} />} />
            <Route path="templates" element={<TemplatesView card={card} setCard={setCard} pro={pro} />} />
            <Route path="qr" element={<QrView card={card} publicUrl={publicUrl} qrUrl={qrUrl} />} />
            <Route path="analytics" element={<Analytics card={card} analytics={analytics} pro={pro} />} />
            <Route path="settings" element={
                <Settings
                  card={card}
                  setCard={setCard}
                  onLogout={logout}
                  pro={pro}
                  user={user}
                  savePrefs={savePrefs}
                  deleteAccount={deleteAccount}
                />
              } />
          </Routes>
        </main>
      </div>

      <MobileTabs />

      {showSkipNotice && <SkipNotice onClose={() => setShowSkipNotice(false)} />}
    </div>
  )
}
