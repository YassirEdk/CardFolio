import 'dotenv/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes, randomUUID } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { pool, query, transaction, toCard } from './db.js'

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me'

/**
 * Only the client ID is needed: we verify Google's ID token against Google's
 * public keys. The client secret belongs to the authorization-code flow, which
 * this app does not use — so it never has to live on this server.
 */
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)

// Data-URL images make request bodies large; allow room for them.
app.use(express.json({ limit: '8mb' }))
app.use(cors())

/** Usernames the router reserves for app routes — must match src/App.jsx. */
const RESERVED = new Set([
  'login', 'signup', 'onboarding', 'dashboard', '404', 'about', 'pricing',
  'templates', 'features', 'settings', 'admin', 'api', 'help',
])

const USERNAME_RE = /^[a-z0-9][a-z0-9-]{2,29}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const asyncRoute = (fn) => (req, res, next) => fn(req, res, next).catch(next)

function sign(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
}

/**
 * The user as the client is allowed to see it. `plan` defaults to free here as
 * well as in the column: a row read before the migration ran, or any future
 * query that forgets the field, must not hand out Pro.
 */
function publicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    plan: row.plan || 'free',
    weeklyEmail: row.weekly_email ?? true,
    // `?? true` for a row read before the column existed: an account that
    // predates verification is not an unverified account.
    emailVerified: row.email_verified ?? true,
  }
}

/* ---------------------------------------------------- email verification */

/** How long a verification link stays good. Long enough to find the email. */
const VERIFY_TTL_HOURS = 24

/** Where the link points. Set APP_URL in production; localhost is the default. */
const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')

/**
 * Sends the verification email, if this deployment can send email at all.
 *
 * With RESEND_API_KEY set it posts to Resend over plain fetch — no SDK, no
 * dependency. Without one it prints the link to the server log, which is what
 * makes the whole flow testable in development: the link is real and works,
 * it just arrives in the terminal instead of an inbox.
 *
 * Never throws. A signup that succeeded must not be reported as failed
 * because a mail provider was slow.
 */
async function sendVerificationEmail(user, token) {
  const link = `${APP_URL}/verify?token=${encodeURIComponent(token)}`

  if (!process.env.RESEND_API_KEY) {
    console.log(`\n  Verify ${user.email}:\n  ${link}\n`)
    return { sent: false, link }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'CardFolio <onboarding@resend.dev>',
        to: user.email,
        subject: 'Confirm your email address',
        text:
          `Hi ${(user.full_name || '').split(' ')[0] || 'there'},\n\n` +
          `Confirm your email address to finish setting up your CardFolio card:\n\n${link}\n\n` +
          `The link works for ${VERIFY_TTL_HOURS} hours. If you didn't create an account, ignore this email.`,
      }),
    })
    if (!response.ok) throw new Error(`Resend replied ${response.status}`)
    return { sent: true }
  } catch (error) {
    // Logged, not raised: the account exists either way, and the person can
    // ask for another link from the dashboard.
    console.error('Verification email failed:', error.message, '\n  link:', link)
    return { sent: false, link }
  }
}

/** Issues a fresh link for a user, replacing any outstanding one. */
async function issueVerification(user) {
  const token = randomBytes(32).toString('hex')
  await query('DELETE FROM email_verifications WHERE user_id = $1', [user.id])
  await query(
    `INSERT INTO email_verifications (token, user_id, expires_at)
     VALUES ($1, $2, now() + ($3 || ' hours')::interval)`,
    [token, user.id, String(VERIFY_TTL_HOURS)]
  )
  return sendVerificationEmail(user, token)
}

/** Rejects the request unless a valid bearer token is present. */
function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Not signed in' })
  try {
    req.userId = jwt.verify(token, JWT_SECRET).sub
    next()
  } catch {
    res.status(401).json({ error: 'Session expired — please log in again' })
  }
}

async function loadCardByUser(userId) {
  const { rows } = await query('SELECT * FROM cards WHERE user_id = $1', [userId])
  if (!rows[0]) return null
  const { rows: links } = await query(
    'SELECT * FROM card_links WHERE card_id = $1 ORDER BY position',
    [rows[0].id]
  )
  return toCard(rows[0], links)
}

/* ------------------------------------------------------------------ health */

app.get('/api/health', asyncRoute(async (_req, res) => {
  const { rows } = await query('SELECT now() AS now')
  res.json({ ok: true, time: rows[0].now })
}))

/* -------------------------------------------------------------- usernames */

app.get('/api/usernames/:username/available', asyncRoute(async (req, res) => {
  const username = String(req.params.username || '').toLowerCase()
  if (!USERNAME_RE.test(username) || RESERVED.has(username)) {
    return res.json({ available: false, reason: 'invalid' })
  }
  const { rows } = await query('SELECT 1 FROM cards WHERE lower(username) = $1', [username])
  res.json({ available: rows.length === 0 })
}))

/**
 * Streams a remote image through this origin.
 *
 * The cropper draws into a canvas and exports it, which a cross-origin image
 * taints — and negotiating CORS in the browser proved unreliable against
 * cached copies. Same-origin bytes have nothing to negotiate.
 *
 * The host allowlist is the point: an unrestricted fetcher is an open proxy,
 * and one that follows arbitrary URLs from the internet is an SSRF hole.
 */
const IMAGE_HOSTS = [/(^|\.)googleusercontent\.com$/, /(^|\.)unsplash\.com$/, /(^|\.)gravatar\.com$/]

app.get('/api/image', asyncRoute(async (req, res) => {
  let target
  try {
    target = new URL(String(req.query.url || ''))
  } catch {
    return res.status(400).json({ error: 'Not a URL' })
  }

  if (target.protocol !== 'https:' || !IMAGE_HOSTS.some((host) => host.test(target.hostname))) {
    return res.status(403).json({ error: 'That host is not proxied' })
  }

  const upstream = await fetch(target, { redirect: 'follow' })
  if (!upstream.ok) return res.status(upstream.status).json({ error: 'Upstream refused' })

  const type = upstream.headers.get('content-type') || ''
  if (!type.startsWith('image/')) return res.status(415).json({ error: 'Not an image' })

  res.set('Content-Type', type)
  res.set('Cache-Control', 'public, max-age=3600')
  res.send(Buffer.from(await upstream.arrayBuffer()))
}))

/* ------------------------------------------------------------------- auth */

app.post('/api/auth/signup', asyncRoute(async (req, res) => {
  const fullName = String(req.body.fullName || '').trim()
  const email = String(req.body.email || '').trim()
  const password = String(req.body.password || '')
  const username = String(req.body.username || '').trim().toLowerCase()

  const errors = {}
  if (fullName.length < 2) errors.fullName = 'Enter your full name.'
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'
  if (password.length < 8) errors.password = 'Use at least 8 characters.'
  // A username may still be sent (older clients, scripts); it is validated when
  // it is. The signup form no longer asks — picking the card URL is a Pro
  // feature, so a new account gets one derived from its email.
  if (username && (!USERNAME_RE.test(username) || RESERVED.has(username))) {
    errors.username = 'Use 3–30 characters: lowercase letters, numbers or hyphens.'
  }
  if (Object.keys(errors).length) return res.status(400).json({ errors })

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const result = await transaction(async (client) => {
      const { rows: userRows } = await client.query(
        'INSERT INTO users (full_name, email, password_hash) VALUES ($1,$2,$3) RETURNING *',
        [fullName, email, passwordHash]
      )
      const user = userRows[0]
      const handle = username || (await newUsername(client))
      const { rows: cardRows } = await client.query(
        `INSERT INTO cards (user_id, username, full_name, email) VALUES ($1,$2,$3,$4) RETURNING *`,
        [user.id, handle, fullName, email]
      )
      return { user, card: toCard(cardRows[0]) }
    })

    // After the account exists, and never in a way that can fail it.
    await issueVerification(result.user)

    res.status(201).json({
      token: sign(result.user),
      user: publicUser(result.user),
      card: result.card,
    })
  } catch (error) {
    if (error.code === '23505') {
      const field = error.constraint === 'cards_username_key' ? 'username' : 'email'
      return res.status(409).json({
        reason: field === 'username' ? 'username-taken' : 'account-exists',
        errors: {
          [field]:
            field === 'username' ? 'That username is already taken.' : 'An account with this email already exists.',
        },
      })
    }
    throw error
  }
}))

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim()
  const password = String(req.body.password || '')

  const { rows } = await query('SELECT * FROM users WHERE lower(email) = lower($1)', [email])
  const user = rows[0]
  // Same message either way so the endpoint can't be used to enumerate emails.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'That email and password don’t match.' })
  }

  res.json({
    token: sign(user),
    user: publicUser(user),
    card: await loadCardByUser(user.id),
  })
}))

/**
 * A card URL for a new account.
 *
 * Random, not derived from the email or the name: a handle like "johndoe" or
 * "contactyassir" publishes part of someone's address to every visitor, and
 * the card URL is the one thing a free account cannot change. Choosing your
 * own is a Pro feature, so what free accounts get should be neutral.
 *
 * `crypto.randomUUID` gives the entropy; the collision loop stays because the
 * column is unique and 8 characters is short enough to be worth checking.
 */
async function newUsername(client) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 8)
    const candidate = `card-${suffix}`
    if (RESERVED.has(candidate) || !USERNAME_RE.test(candidate)) continue
    const { rows } = await client.query('SELECT 1 FROM cards WHERE lower(username) = $1', [candidate])
    if (rows.length === 0) return candidate
  }
  // Unreachable in practice; a timestamp is still unique enough to insert.
  return `card-${Date.now().toString(36)}`
}

app.post('/api/auth/google', asyncRoute(async (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'Google sign-in is not configured on this server.' })
  }

  const credential = String(req.body.credential || '')
  if (!credential) return res.status(400).json({ error: 'Missing Google credential' })

  /**
   * `mode: 'login'` refuses to create anything. The login page sends it so an
   * unknown Google account is told to register rather than silently ending up
   * with a new, empty account it never asked for — which is indistinguishable,
   * from the user's side, from having signed in with the wrong address.
   */
  const loginOnly = req.body.mode === 'login'

  /**
   * `mode: 'signup'` is the mirror image, and it refuses to *reuse*.
   *
   * Without it, pressing "Sign up with Google" with an address that already
   * has an account quietly signs you in instead — which looks like the signup
   * worked, and leaves someone convinced they made a second account. Told
   * plainly that the account exists, they can log in, which is what they
   * wanted a moment later anyway.
   */
  const signupOnly = req.body.mode === 'signup'

  // Verify against Google's public keys. Never trust the token's contents
  // before this — the client could have sent anything.
  let payload
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID })
    payload = ticket.getPayload()
  } catch {
    return res.status(401).json({ error: 'That Google sign-in could not be verified.' })
  }

  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ error: 'Your Google account has no verified email address.' })
  }

  /**
   * Google hands out the avatar sized for a menu bar — the URL ends in
   * `=s96-c`, i.e. 96×96 — but a card can paint that portrait a full screen
   * tall, where a 96px source is a blurry mess. The same URL serves any size,
   * so store one worth rendering.
   */
  const picture = payload.picture ? payload.picture.replace(/=s\d+/, '=s1024') : null

  const result = await transaction(async (client) => {
    // 1. Known Google account?
    let { rows } = await client.query('SELECT * FROM users WHERE google_sub = $1', [payload.sub])
    let user = rows[0]

    // 2. Otherwise an existing email/password account — link them rather than
    //    creating a duplicate the user can never log into.
    if (!user) {
      ;({ rows } = await client.query('SELECT * FROM users WHERE lower(email) = lower($1)', [payload.email]))
      user = rows[0]
      if (user) {
        ;({ rows } = await client.query(
          'UPDATE users SET google_sub = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3 RETURNING *',
          [payload.sub, picture, user.id]
        ))
        user = rows[0]
      }
    }

    // 3. The signup page may not adopt an existing account, however it was
    //    found — by Google id or by email.
    if (user && signupOnly) return { conflict: true, email: user.email }

    // 4. Brand new account: create the user and an unpublished card — unless
    //    this came from the login page, which may only sign existing people in.
    if (!user && loginOnly) return null

    if (!user) {
      /**
       * Verified on arrival: the route already refused any Google account
       * whose `email_verified` claim was false, so asking the person to prove
       * an address Google has just proven would be theatre.
       */
      ;({ rows } = await client.query(
        `INSERT INTO users (full_name, email, google_sub, avatar_url, email_verified)
         VALUES ($1,$2,$3,$4,true) RETURNING *`,
        [payload.name || payload.email.split("@")[0], payload.email, payload.sub, picture]
      ))
      user = rows[0]

      const username = await newUsername(client)
      await client.query(
        `INSERT INTO cards (user_id, username, full_name, email, photo) VALUES ($1,$2,$3,$4,$5)`,
        [user.id, username, user.full_name, user.email, picture]
      )
    }

    const { rows: cardRows } = await client.query('SELECT * FROM cards WHERE user_id = $1', [user.id])
    const { rows: links } = cardRows[0]
      ? await client.query('SELECT * FROM card_links WHERE card_id = $1 ORDER BY position', [cardRows[0].id])
      : { rows: [] }

    return { user, card: toCard(cardRows[0], links) }
  })

  if (result?.conflict) {
    return res.status(409).json({
      error: 'An account already exists with this email. Log in instead.',
      reason: 'account-exists',
      // Their own address, handed back so the page can name it — and so the
      // login form it sends them to can be filled in for them.
      email: result.email,
      errors: { email: 'An account already exists with this email.' },
    })
  }

  if (!result) {
    return res.status(404).json({
      error: 'No account uses that Google address yet. Create one first.',
      reason: 'no-account',
    })
  }

  res.json({
    token: sign(result.user),
    user: publicUser(result.user),
    card: result.card,
  })
}))

/**
 * Confirms an address from the link in the email.
 *
 * Deliberately unauthenticated: the link is opened in whichever browser the
 * inbox is on, which is often not the one that signed up. The token is the
 * proof, so it is 32 random bytes and single-use.
 */
app.post('/api/auth/verify', asyncRoute(async (req, res) => {
  const token = String(req.body?.token || '')
  if (!token) return res.status(400).json({ error: 'Missing token', reason: 'missing-token' })

  const { rows } = await query(
    `SELECT v.user_id, v.expires_at < now() AS expired, u.email
       FROM email_verifications v JOIN users u ON u.id = v.user_id
      WHERE v.token = $1`,
    [token]
  )
  const record = rows[0]

  if (!record) {
    /**
     * An unknown token is also what a *used* token looks like, because the row
     * is deleted on use. Someone who clicks the link twice — or whose mail
     * client prefetched it — should not be told their account is broken, so
     * the honest reading is offered alongside the failure.
     */
    return res.status(404).json({ error: 'That link is no longer valid.', reason: 'unknown-token' })
  }
  if (record.expired) {
    await query('DELETE FROM email_verifications WHERE token = $1', [token])
    return res.status(410).json({ error: 'That link has expired.', reason: 'expired' })
  }

  await transaction(async (client) => {
    await client.query('UPDATE users SET email_verified = true WHERE id = $1', [record.user_id])
    await client.query('DELETE FROM email_verifications WHERE token = $1', [token])
  })

  res.json({ ok: true, email: record.email })
}))

/** A fresh link, for the signed-in account. */
app.post('/api/auth/verify/resend', auth, asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.userId])
  const user = rows[0]
  if (!user) return res.status(404).json({ error: 'Account not found' })
  if (user.email_verified) return res.json({ ok: true, alreadyVerified: true })

  /**
   * One link a minute. Not a security boundary — the token is unguessable —
   * but a person hammering the button should not be able to send themselves
   * twenty emails, each of which invalidates the last.
   */
  const { rows: recent } = await query(
    `SELECT 1 FROM email_verifications
      WHERE user_id = $1 AND created_at > now() - interval '1 minute'`,
    [req.userId]
  )
  if (recent[0]) {
    return res.status(429).json({ error: 'A link was just sent. Check your inbox.', reason: 'rate-limited' })
  }

  const result = await issueVerification(user)
  res.json({ ok: true, sent: result.sent })
}))

app.get('/api/auth/me', auth, asyncRoute(async (req, res) => {
  const { rows } = await query(
    'SELECT id, full_name, email, plan, weekly_email, email_verified FROM users WHERE id = $1',
    [req.userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Account not found' })
  res.json({
    user: publicUser(rows[0]),
    card: await loadCardByUser(req.userId),
  })
}))

/* ------------------------------------------------------------- public card */

app.get('/api/cards/:username', asyncRoute(async (req, res) => {
  const username = String(req.params.username || '').toLowerCase()
  const { rows } = await query(
    'SELECT * FROM cards WHERE lower(username) = $1 AND published = true',
    [username]
  )
  if (!rows[0]) return res.status(404).json({ error: 'No card here yet' })

  const { rows: links } = await query(
    'SELECT * FROM card_links WHERE card_id = $1 ORDER BY position',
    [rows[0].id]
  )
  res.json({ card: toCard(rows[0], links) })
}))

/**
 * Reads the bearer token if one was sent, and says nothing when it is missing
 * or expired. Unlike `auth`, this never rejects the request — it is for routes
 * open to everyone that behave differently for the signed-in owner.
 */
function optionalUserId(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  try {
    return jwt.verify(header.slice(7), JWT_SECRET).sub
  } catch {
    return null
  }
}

/** Fire-and-forget analytics. Never fails the caller. */
app.post('/api/cards/:username/events', asyncRoute(async (req, res) => {
  const type = String(req.body.type || '')
  if (!['view', 'click', 'scan'].includes(type)) return res.status(400).json({ error: 'Unknown event' })

  const { rows } = await query('SELECT id, user_id FROM cards WHERE lower(username) = $1', [
    String(req.params.username).toLowerCase(),
  ])

  /**
   * Your own visits are not traffic. Previewing the card, opening your link to
   * check a change, scanning your own QR to test it — all of that would
   * otherwise be indistinguishable from a real visitor, and the first thing
   * anyone does with a new card is look at it a dozen times.
   *
   * Accepted and dropped, not refused: the client treats this as fire and
   * forget, and a 4xx here would only produce a console error to ignore.
   */
  const isOwner = rows[0] && optionalUserId(req) === rows[0].user_id
  if (rows[0] && !isOwner) {
    await query('INSERT INTO card_events (card_id, type, link_id) VALUES ($1,$2,$3)', [
      rows[0].id,
      type,
      req.body.linkId || null,
    ])
  }
  res.status(202).json({ ok: true })
}))

/* --------------------------------------------------------------- my card */

app.get('/api/me/card', auth, asyncRoute(async (req, res) => {
  const card = await loadCardByUser(req.userId)
  if (!card) return res.status(404).json({ error: 'No card yet' })
  res.json({ card })
}))

const TEXT_FIELDS = [
  'full_name', 'title', 'bio', 'photo', 'logo', 'cover', 'company',
  'phone', 'email', 'whatsapp', 'location', 'website', 'template', 'accent',
]

const FROM_CAMEL = { full_name: 'fullName' }

/**
 * Columns declared NOT NULL DEFAULT ''. Blanking one has to store the empty
 * string, not NULL — the blanket ''→NULL below is right for the optional
 * fields and a constraint violation for these, which is what made saving a
 * card with no title fail with a 500.
 */
const NOT_NULL_TEXT = new Set(['full_name', 'title', 'bio'])

/** Templates a free account may use. Everything else is part of Pro. */
const FREE_TEMPLATES = new Set(['minimal'])

/** Links a free card may carry — mirrors FREE_LINK_LIMIT in the editor. */
const FREE_LINK_LIMIT = 4

app.put('/api/me/card', auth, asyncRoute(async (req, res) => {
  const body = req.body || {}
  const { rows: owned } = await query(
    'SELECT id, username, hide_branding, indexable FROM cards WHERE user_id = $1',
    [req.userId]
  )
  if (!owned[0]) return res.status(404).json({ error: 'No card yet' })
  const cardId = owned[0].id

  // Username changes need the same validation as signup — and, since choosing
  // the card URL is a Pro feature, an account on the paid plan.
  let username = owned[0].username
  if (body.username && String(body.username).toLowerCase() !== username.toLowerCase()) {
    const { rows: account } = await query('SELECT plan FROM users WHERE id = $1', [req.userId])
    if ((account[0]?.plan || 'free') !== 'pro') {
      return res.status(403).json({ error: 'Choosing your card URL is part of the Pro plan.' })
    }

    username = String(body.username).toLowerCase()
    if (!USERNAME_RE.test(username) || RESERVED.has(username)) {
      return res.status(400).json({ errors: { username: 'That username is not allowed.' } })
    }
    const { rows: taken } = await query(
      'SELECT 1 FROM cards WHERE lower(username) = $1 AND id <> $2',
      [username, cardId]
    )
    if (taken.length) return res.status(409).json({ errors: { username: 'That username is already taken.' } })
  }

  // The picker locks Pro templates, but the lock has to hold here too — the
  // client is free to send whatever it likes.
  if ('template' in body && !FREE_TEMPLATES.has(body.template)) {
    const { rows: account } = await query('SELECT plan FROM users WHERE id = $1', [req.userId])
    if ((account[0]?.plan || 'free') !== 'pro') {
      return res.status(403).json({ error: 'That template is part of the Pro plan.' })
    }
  }

  const sets = ['username = $1']
  const values = [username]
  for (const column of TEXT_FIELDS) {
    const key = FROM_CAMEL[column] || column
    if (key in body) {
      const blank = body[key] === '' || body[key] === null || body[key] === undefined
      values.push(blank ? (NOT_NULL_TEXT.has(column) ? '' : null) : body[key])
      sets.push(`${column} = $${values.length}`)
    }
  }
  if ('published' in body) {
    values.push(Boolean(body.published))
    sets.push(`published = $${values.length}`)
  }
  // A design choice, not a plan feature — free cards set it too.
  if ('logoPlate' in body) {
    values.push(Boolean(body.logoPlate))
    sets.push(`logo_plate = $${values.length}`)
  }

  /**
   * Card preferences. Both are Pro, so a free account is refused before
   * anything is written — and only when the value would actually change, so a
   * client that echoes the whole card back on every save isn't blocked.
   */
  const PREF_COLUMNS = { hideBranding: 'hide_branding', indexable: 'indexable' }
  const prefChanges = Object.entries(PREF_COLUMNS).filter(
    ([key, column]) => key in body && Boolean(body[key]) !== owned[0][column]
  )
  if (prefChanges.length) {
    const { rows: account } = await query('SELECT plan FROM users WHERE id = $1', [req.userId])
    if ((account[0]?.plan || 'free') !== 'pro') {
      return res.status(403).json({ error: 'Card preferences are part of the Pro plan.' })
    }
    for (const [key, column] of prefChanges) {
      values.push(Boolean(body[key]))
      sets.push(`${column} = $${values.length}`)
    }
  }

  /**
   * Free cards carry at most FREE_LINK_LIMIT links. Counted on the links that
   * would actually be stored — blank rows are dropped below, so a half-filled
   * form shouldn't trip the limit. A card that came down from Pro keeps the
   * links it has; this only refuses a request that would add more.
   */
  if (Array.isArray(body.links)) {
    const filled = body.links.filter((link) => link?.url).length
    if (filled > FREE_LINK_LIMIT) {
      const { rows: account } = await query('SELECT plan FROM users WHERE id = $1', [req.userId])
      if ((account[0]?.plan || 'free') !== 'pro') {
        const { rows: current } = await query(
          'SELECT count(*)::int AS n FROM card_links WHERE card_id = $1',
          [cardId]
        )
        if (filled > current[0].n) {
          return res.status(403).json({
            error: `Free cards carry ${FREE_LINK_LIMIT} links. Pro removes the limit.`,
          })
        }
      }
    }
  }

  values.push(cardId)

  const card = await transaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE cards SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    )

    let links = []
    if (Array.isArray(body.links)) {
      await client.query('DELETE FROM card_links WHERE card_id = $1', [cardId])
      for (const [index, link] of body.links.entries()) {
        if (!link?.url) continue
        const inserted = await client.query(
          `INSERT INTO card_links (card_id, platform, url, label, handle, position)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [cardId, link.platform || 'custom', link.url, link.label || null, link.handle || null, index]
        )
        links.push(inserted.rows[0])
      }
    } else {
      const existing = await client.query(
        'SELECT * FROM card_links WHERE card_id = $1 ORDER BY position',
        [cardId]
      )
      links = existing.rows
    }

    return toCard(rows[0], links)
  })

  res.json({ card })
}))

/* ------------------------------------------------------------------ plan */

/**
 * Switches the account's plan.
 *
 * NOTE: there is no billing yet, so this grants Pro on request — it is the
 * seam a checkout goes behind, not a paywall. Until a payment provider is
 * wired in, treat Pro as self-service.
 */
app.put('/api/me/plan', auth, asyncRoute(async (req, res) => {
  const plan = String(req.body?.plan || '')
  if (!['free', 'pro'].includes(plan)) {
    return res.status(400).json({ error: 'Unknown plan' })
  }

  const { rows } = await query(
    'UPDATE users SET plan = $1 WHERE id = $2 RETURNING id, full_name, email, plan, weekly_email',
    [plan, req.userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Account not found' })
  res.json({ user: publicUser(rows[0]) })
}))

/**
 * Account-level preferences. Only the weekly email lives here — the card
 * preferences travel with the card.
 *
 * NOTE: nothing sends this email yet. The column records consent so the job,
 * when it exists, has an audience to read; it is not a promise of delivery.
 */
app.put('/api/me/prefs', auth, asyncRoute(async (req, res) => {
  if (!('weeklyEmail' in (req.body || {}))) {
    return res.status(400).json({ error: 'Nothing to update' })
  }

  const { rows: account } = await query('SELECT plan, weekly_email FROM users WHERE id = $1', [req.userId])
  if (!account[0]) return res.status(404).json({ error: 'Account not found' })

  const next = Boolean(req.body.weeklyEmail)
  if (next !== account[0].weekly_email && (account[0].plan || 'free') !== 'pro') {
    return res.status(403).json({ error: 'Card preferences are part of the Pro plan.' })
  }

  const { rows } = await query(
    'UPDATE users SET weekly_email = $1 WHERE id = $2 RETURNING id, full_name, email, plan, weekly_email',
    [next, req.userId]
  )
  res.json({ user: publicUser(rows[0]) })
}))

/**
 * Deletes the account and everything hanging off it.
 *
 * One statement: cards, card_links and card_events all cascade from the user
 * row, so there is nothing to clean up by hand and nothing to leave behind if
 * a later step were to fail. The username is freed by the same delete, which
 * is why this cannot be a soft delete without also parking the handle.
 */
app.delete('/api/me', auth, asyncRoute(async (req, res) => {
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [req.userId])
  if (!rowCount) return res.status(404).json({ error: 'Account not found' })
  res.json({ deleted: true })
}))

/* -------------------------------------------------------------- analytics */

app.get('/api/me/analytics', auth, asyncRoute(async (req, res) => {
  const { rows: owned } = await query('SELECT id FROM cards WHERE user_id = $1', [req.userId])
  if (!owned[0]) return res.status(404).json({ error: 'No card yet' })
  const cardId = owned[0].id

  const { rows: totals } = await query(
    `SELECT type, count(*)::int AS n FROM card_events WHERE card_id = $1 GROUP BY type`,
    [cardId]
  )
  /**
   * Two of these are recorded, one is derived.
   *
   * A visit arrives one of two ways: someone scanned the QR (`scan`) or they
   * opened the link (`view`). `views` is therefore every arrival — the
   * headline figure — and `links` is the arrivals that were not scans. Kept
   * as one subtraction here so the dashboard can never disagree with itself
   * about what a view is.
   */
  const stats = { views: 0, links: 0, clicks: 0, scans: 0 }
  for (const row of totals) {
    if (row.type === 'view') stats.links = row.n
    if (row.type === 'click') stats.clicks = row.n
    if (row.type === 'scan') stats.scans = row.n
  }
  stats.views = stats.links + stats.scans

  /**
   * The same three figures over three spans, so the dashboard tiles can switch
   * between them without another round trip. All of it is one scan of the
   * table — three counts of the same rows is cheaper than three queries.
   *
   * Boundaries are the server's: "today" is today where the server lives, not
   * where the visitor was. Fine for a per-day headline; a real report would
   * need the account's timezone.
   */
  const { rows: spans } = await query(
    `SELECT type,
            count(*) FILTER (WHERE created_at >= current_date)::int              AS day,
            count(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS month,
            count(*)::int                                                         AS total
       FROM card_events
      WHERE card_id = $1
      GROUP BY type`,
    [cardId]
  )

  const EMPTY_SPAN = { views: 0, links: 0, clicks: 0, scans: 0 }
  const ranges = { day: { ...EMPTY_SPAN }, month: { ...EMPTY_SPAN }, total: { ...EMPTY_SPAN } }
  const KEY = { view: 'links', click: 'clicks', scan: 'scans' }
  for (const row of spans) {
    const key = KEY[row.type]
    if (!key) continue
    ranges.day[key] = row.day
    ranges.month[key] = row.month
    ranges.total[key] = row.total
  }
  for (const span of Object.values(ranges)) span.views = span.links + span.scans

  /**
   * Analytics are a Pro feature, so a free account gets the shape of the
   * response and none of the figures. The cut happens here rather than in the
   * dashboard: numbers blurred in CSS are still numbers in the payload, one
   * devtools panel away from being read.
   *
   * Events keep being recorded either way — upgrading reveals the history,
   * it doesn't start collecting it.
   */
  const { rows: account } = await query('SELECT plan FROM users WHERE id = $1', [req.userId])
  if ((account[0]?.plan || 'free') !== 'pro') {
    return res.json({
      limited: true,
      stats: { views: null, links: null, clicks: null, scans: null },
      deltas: { views: null, links: null, clicks: null, scans: null },
      ranges: null,
      series: [],
      topLinks: [],
    })
  }

  /**
   * The trend beside each figure: the last seven days against the seven
   * before them.
   *
   * `null` when the earlier week saw nothing — there is no percentage change
   * from zero, and a card with no history should say nothing rather than
   * invent a number. The dashboard shows these three tiles at their most
   * prominent, so a made-up "+12.4%" is the one thing that must never appear
   * there.
   */
  const { rows: windows } = await query(
    `SELECT type,
            count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS recent,
            count(*) FILTER (WHERE created_at >= now() - interval '14 days'
                               AND created_at <  now() - interval '7 days')::int AS previous
       FROM card_events
      WHERE card_id = $1 AND created_at >= now() - interval '14 days'
      GROUP BY type`,
    [cardId]
  )

  const change = (recent, previous) =>
    previous === 0 ? null : Math.round(((recent - previous) / previous) * 1000) / 10

  const deltas = { views: null, links: null, clicks: null, scans: null }
  const arrivals = { recent: 0, previous: 0 }
  for (const row of windows) {
    const key = KEY[row.type]
    if (!key) continue
    deltas[key] = change(row.recent, row.previous)
    // Views is both kinds of arrival, so its trend is both kinds too.
    if (row.type === 'view' || row.type === 'scan') {
      arrivals.recent += row.recent
      arrivals.previous += row.previous
    }
  }
  deltas.views = change(arrivals.recent, arrivals.previous)

  const { rows: series } = await query(
    // Same definitions as the tiles: an arrival is a view, and it is a link
    // open unless it came from the QR. A chart that adds up differently from
    // the figures above it is worse than no chart.
    `SELECT to_char(d.day, 'Mon DD') AS day,
            count(*) FILTER (WHERE e.type IN ('view','scan'))::int AS views,
            count(*) FILTER (WHERE e.type = 'view')::int  AS links,
            count(*) FILTER (WHERE e.type = 'click')::int AS clicks,
            count(*) FILTER (WHERE e.type = 'scan')::int  AS scans
       FROM generate_series(current_date - interval '14 days', current_date, interval '1 day') AS d(day)
       LEFT JOIN card_events e
         ON e.card_id = $1 AND date_trunc('day', e.created_at) = d.day
      GROUP BY d.day
      ORDER BY d.day`,
    [cardId]
  )

  const { rows: topLinks } = await query(
    `SELECT l.id, l.platform, l.url, count(e.id)::int AS clicks
       FROM card_links l
       LEFT JOIN card_events e ON e.link_id = l.id AND e.type = 'click'
      WHERE l.card_id = $1
      GROUP BY l.id
      ORDER BY clicks DESC, l.position`,
    [cardId]
  )

  res.json({ stats, ranges, deltas, series, topLinks })
}))

/* ----------------------------------------------------------------- errors */

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Something went wrong on our side.' })
})

/**
 * Two ways to run: as a long-lived process (`npm run server`, and any host that
 * runs a Node service), or as a serverless function that imports `app` and
 * hands it each request — see api/index.js.
 *
 * `listen` therefore only happens when this file is the entry point. Calling it
 * on import would bind a port inside a function instance, which is both useless
 * and, on some platforms, fatal.
 */
const isEntryPoint = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isEntryPoint) {
  const server = app.listen(PORT, () => {
    console.log(`CardFolio API listening on http://localhost:${PORT}`)
    /**
     * Say which mode mail is in, at the one moment someone is looking.
     *
     * "There is no email verification" is what a working feature looks like
     * when nothing is sending: the account is created, the token is issued,
     * and the link goes to a terminal nobody was reading. Better to announce
     * it than to let it be discovered.
     */
    if (process.env.RESEND_API_KEY) {
      console.log(`  Verification email: sending via Resend as ${process.env.MAIL_FROM || 'onboarding@resend.dev'}`)
    } else {
      console.log('  Verification email: NOT SENDING — no RESEND_API_KEY set.')
      console.log('  Links will be printed here instead. See .env.example to enable sending.')
    }
  })

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => pool.end().then(() => process.exit(0)))
    })
  }
}

export default app
