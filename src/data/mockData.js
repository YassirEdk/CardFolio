/**
 * Mock data layer. Everything the app would normally fetch from an API lives
 * here so every route is previewable without a backend. Cards are keyed by
 * username; `getCardByUsername` simulates a short network round-trip so the
 * public card can show its loading skeleton.
 */

/**
 * The domain cards are published on.
 *
 * Read from the browser rather than hardcoded: a card's URL and its QR code
 * have to point at wherever this build is actually being served — the Vercel
 * preview domain today, the real domain once it is pointed here. A fixed
 * string produced links and printed QR codes for a host that wasn't serving
 * anything. The constant is only the fallback for non-browser contexts.
 */
// The live deployment. Replace this when a real domain is pointed at the app —
// though in a browser the host below is used instead, so it self-corrects.
const FALLBACK_DOMAIN = 'card-folio-hazel.vercel.app'

export const SITE_DOMAIN =
  typeof window !== 'undefined' && window.location?.host ? window.location.host : FALLBACK_DOMAIN

/** Photo for the primary demo card, John Doe. */
export const DEMO_PHOTO =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'

/** Local portrait served from public/ — used by the Sarah Kim demo card. */
export const LOCAL_PHOTO = '/single-women-happier-than-men-675ac891b545d.avif'

/**
 * Banner photo for the demo card. Keep this in step with `cover` in
 * server/migrate.js — these previews should match the live card at /demo.
 */
export const DEMO_COVER =
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80'

/**
 * The card behind every "see a live card" link. Free accounts get a random
 * handle, and these demo accounts are no exception — so the link is read from
 * the data rather than hardcoded as "/demo" in four different files.
 */
export const DEMO_USERNAME = 'demo'

export const DEMO_CARDS = {
  demo: {
    username: 'demo',
    fullName: 'John Doe',
    title: 'Senior Product Designer',
    bio: 'I design clear, conversion-focused interfaces for SaaS and fintech teams. 9 years in, 40+ products shipped.',
    photo: DEMO_PHOTO,
    logo: null,
    cover: DEMO_COVER,
    company: 'Doe Studio',
    phone: '+1 415 555 0134',
    email: 'john@doestudio.com',
    whatsapp: '+14155550134',
    location: 'San Francisco, USA',
    website: 'https://doestudio.com',
    template: 'executive',
    accent: '#2E6BE6',
    links: [
      { id: 'l1', platform: 'linkedin', url: 'https://www.linkedin.com/feed/', label: 'LinkedIn' },
      { id: 'l2', platform: 'dribbble', url: 'https://dribbble.com/shots', label: 'Dribbble' },
      { id: 'l3', platform: 'behance', url: 'https://www.behance.net/galleries', label: 'Behance' },
      { id: 'l4', platform: 'instagram', url: 'https://www.instagram.com/explore/', label: 'Instagram' },
      { id: 'l5', platform: 'upwork', url: 'https://www.upwork.com/freelance-jobs/', label: 'Upwork' },
    ],
    stats: { views: 2841, clicks: 962, scans: 418 },
  },
  sarahkim: {
    username: 'card-ae96b7db',
    fullName: 'Sarah Kim',
    title: 'Wedding & Portrait Photographer',
    bio: 'Natural-light photography across California. Booking 2026 weddings now.',
    photo: LOCAL_PHOTO,
    logo: null,
    cover: null,
    company: 'Kim Studio',
    phone: '+1 213 555 0198',
    email: 'hello@sarahkim.photo',
    whatsapp: '+12135550198',
    location: 'Los Angeles, USA',
    website: 'https://sarahkim.photo',
    template: 'photo',
    accent: '#B45309',
    links: [
      { id: 'l1', platform: 'instagram', url: 'https://instagram.com/sarahkim.photo' },
      { id: 'l2', platform: 'facebook', url: 'https://facebook.com/sarahkimphoto' },
      { id: 'l3', platform: 'website', url: 'https://sarahkim.photo/portfolio' },
    ],
    stats: { views: 5120, clicks: 1740, scans: 903 },
  },
  marcusdev: {
    username: 'card-9900172d',
    fullName: 'Marcus Alvarez',
    title: 'Full-Stack Engineer · React & Node',
    bio: 'Freelance engineer building fast, maintainable web products. Open to contract work.',
    photo:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    logo: null,
    cover: null,
    company: null,
    phone: '+34 611 555 042',
    email: 'marcus@alvarez.dev',
    whatsapp: '+34611555042',
    location: 'Barcelona, Spain',
    website: 'https://alvarez.dev',
    template: 'darkpro',
    accent: '#0E9F6E',
    links: [
      { id: 'l1', platform: 'github', url: 'https://github.com/marcusdev' },
      { id: 'l2', platform: 'linkedin', url: 'https://linkedin.com/in/marcusalvarez' },
      { id: 'l3', platform: 'x', url: 'https://x.com/marcusdev' },
      { id: 'l4', platform: 'fiverr', url: 'https://fiverr.com/marcusdev' },
    ],
    stats: { views: 1290, clicks: 511, scans: 176 },
  },
}

/** The card owned by the signed-in demo user (drives /dashboard). */
export const CURRENT_USER = {
  name: 'John Doe',
  email: 'john@doestudio.com',
  username: 'demo',
  plan: 'Pro',
}

/** Empty card used as the starting point of the onboarding wizard. */
export const EMPTY_CARD = {
  username: '',
  fullName: '',
  title: '',
  bio: '',
  photo: null,
  logo: null,
  cover: null,
  company: '',
  phone: '',
  email: '',
  whatsapp: '',
  location: '',
  website: '',
  template: 'minimal',
  accent: '#2E6BE6',
  logoPlate: true,
  links: [],
}

/** 30 days of traffic for the dashboard chart. */
export const ANALYTICS_SERIES = [
  { day: 'Jun 26', views: 62, clicks: 21, scans: 9 },
  { day: 'Jun 27', views: 74, clicks: 26, scans: 12 },
  { day: 'Jun 28', views: 58, clicks: 18, scans: 8 },
  { day: 'Jun 29', views: 91, clicks: 34, scans: 15 },
  { day: 'Jun 30', views: 103, clicks: 41, scans: 19 },
  { day: 'Jul 01', views: 88, clicks: 30, scans: 14 },
  { day: 'Jul 02', views: 96, clicks: 37, scans: 17 },
  { day: 'Jul 03', views: 124, clicks: 48, scans: 22 },
  { day: 'Jul 04', views: 110, clicks: 39, scans: 18 },
  { day: 'Jul 05', views: 79, clicks: 25, scans: 11 },
  { day: 'Jul 06', views: 132, clicks: 52, scans: 26 },
  { day: 'Jul 07', views: 147, clicks: 61, scans: 29 },
  { day: 'Jul 08', views: 121, clicks: 44, scans: 20 },
  { day: 'Jul 09', views: 138, clicks: 55, scans: 24 },
  { day: 'Jul 10', views: 156, clicks: 66, scans: 31 },
]

export const TESTIMONIAL_AUDIENCES = [
  'Freelancers',
  'Designers',
  'Developers',
  'Photographers',
  'Consultants',
  'Real-estate agents',
]

const USED_USERNAMES = ['demo', 'johndoe', 'sarahkim', 'marcusdev', 'admin', 'support', 'cardfolio', 'hello']

/** Simulated availability check for the signup username field. */
export function checkUsername(username) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(!USED_USERNAMES.includes(username.toLowerCase()))
    }, 450)
  })
}

/** Simulated card fetch for the public route. Resolves `null` when not found. */
export function getCardByUsername(username) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(DEMO_CARDS[String(username).toLowerCase()] || null)
    }, 700)
  })
}

export function cardUrl(username) {
  return `${SITE_DOMAIN}/${username || 'yourname'}`
}
