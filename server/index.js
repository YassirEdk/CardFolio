import 'dotenv/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import nodemailer from 'nodemailer'
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

/**
 * The billing webhook keeps its body as raw bytes. Order matters here.
 *
 * Paddle signs the exact bytes it sent. `express.json()` parses them and
 * throws the original away, and re-serialising the object gives back a
 * different byte sequence — different key order, different spacing — so the
 * signature never matches and every legitimate webhook is rejected as forged.
 * Mounted above the JSON parser because the first matching body parser wins.
 */
app.use('/api/billing/webhook', express.raw({ type: '*/*' }))

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
 *
 * `email_verified` needs the opposite default and so cannot protect itself the
 * same way — an old account has to read as verified, which means a SELECT that
 * omits the column reports every account as verified. Every query feeding this
 * function must therefore name `email_verified` explicitly; two of them once
 * did not, and the verification banner vanished the moment someone changed a
 * preference.
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

/**
 * How long a verification link stays good.
 *
 * Fifteen minutes: long enough to switch to an inbox and back, short enough
 * that a link sitting in a mailbox someone else can read is worth little. The
 * resend button on the dashboard is what makes a short window bearable.
 */
const VERIFY_TTL_MINUTES = 15

/** Where the link points. Set APP_URL in production; localhost is the default. */
const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')

/**
 * A localhost link in a deployed environment is a dead letter.
 *
 * The email sends, the provider reports success, and the person clicking it
 * lands on a machine that is not theirs — the one failure mode that looks
 * entirely healthy from the server's side. Checked at module load rather than
 * in the startup banner below, because serverless imports this file instead of
 * running it, so the banner never prints in precisely the deployment where
 * getting APP_URL wrong is possible.
 */
if (/localhost|127\.0\.0\.1/.test(APP_URL) && (process.env.VERCEL || process.env.NODE_ENV === 'production')) {
  console.error(
    `APP_URL is ${APP_URL} in a deployed environment — every verification link will point at localhost.\n` +
      '  Set APP_URL to the public origin of the front end, with no trailing slash.'
  )
}

/**
 * The three SMTP vars, and whether they are all there.
 *
 * Kept in one place because two callers ask the same question — the sender,
 * deciding which transport to use, and the startup banner, reporting it. When
 * they drifted apart the banner could claim SMTP while the sender quietly used
 * something else.
 */
const SMTP_VARS = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']
const smtpMissing = () => SMTP_VARS.filter((name) => !process.env[name])
/** Half-configured: someone started setting SMTP up and did not finish. */
const smtpPartial = () => {
  const missing = smtpMissing()
  return missing.length > 0 && missing.length < SMTP_VARS.length
}

/**
 * The configured mailbox, as a transport.
 *
 * Whitespace is stripped from the password because the one credential people
 * paste here is a Google app password, which Google displays in four groups of
 * four. The spaces are presentation, not part of the secret.
 */
function smtpTransport() {
  const port = Number(process.env.SMTP_PORT || 465)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS after connecting.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '') },
  })
}

/**
 * A throwaway inbox that catches the mail and shows it to you.
 *
 * The last resort, and the useful one in development. Ethereal is nodemailer's
 * own test service: the account is created on the fly, needs no signup and no
 * credentials of yours, and nothing reaches a real person. Each send returns a
 * URL where that exact email — addressed to whoever signed up, rendered from
 * the real HTML — can be read.
 *
 * That is what makes it worth the round trip: printing a link to a terminal
 * proves the token works but says nothing about whether the email is right.
 * This shows the email.
 *
 * One account per process, reused.
 */
let previewAccount = null

async function sendViaPreviewInbox(user, link) {
  try {
    if (!previewAccount) previewAccount = await nodemailer.createTestAccount()

    const transport = nodemailer.createTransport({
      host: previewAccount.smtp.host,
      port: previewAccount.smtp.port,
      secure: previewAccount.smtp.secure,
      auth: { user: previewAccount.user, pass: previewAccount.pass },
    })

    const info = await transport.sendMail({
      from: process.env.MAIL_FROM || 'CardFolio <hello@cardfolio.test>',
      to: user.email,
      subject: 'Confirm your email address',
      html: verificationHtml(user, link),
      text: verificationText(user, link),
    })

    const preview = nodemailer.getTestMessageUrl(info)
    console.log(`
  Verification email for ${user.email}`)
    console.log(`  Read it here: ${preview}`)
    console.log(`  Or use the link directly: ${link}
`)

    /**
     * `sent: false` on purpose. It reached a test inbox, not the person, and
     * the interface must keep saying the address is unconfirmed — a preview is
     * for whoever is building the thing, not for the person signing up.
     */
    return { sent: false, preview, link }
  } catch (error) {
    console.log(`
  Verify ${user.email}:
  ${link}
`)
    console.error('  (preview inbox unavailable:', error.message + ')')
    return { sent: false, link }
  }
}

/** The brand, as two colours an email client will actually honour. */
const MAIL_INK = '#0f2544'
const MAIL_ACCENT = '#2e6be6'

/**
 * The verification email, as HTML.
 *
 * Written the way email has to be written rather than the way the app is:
 * tables for layout, every style inline, no external stylesheet and no
 * webfont — Outlook and Gmail strip all three. A max width of 560px and a
 * single column is what survives a phone.
 *
 * The button is a padded anchor rather than an image, so it renders even with
 * images blocked, and the raw URL is printed underneath because some clients
 * still refuse to make long links clickable.
 */
function verificationHtml(user, link) {
  const firstName = (user.full_name || '').split(' ')[0] || 'there'
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f1f5fa;">
    <!-- The preview line, hidden in the body but shown in the inbox list. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Confirm your address to finish setting up your card.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5fa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0"
                 style="width:100%;max-width:560px;background:#ffffff;border:1px solid #dde7f3;border-radius:8px;">
            <tr>
              <td style="padding:28px 32px 0;">
                <p style="margin:0;font:700 20px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${MAIL_INK};">
                  Card<span style="color:${MAIL_ACCENT};">Folio</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0;">
                <h1 style="margin:0;font:700 22px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${MAIL_INK};">
                  Confirm your email address
                </h1>
                <p style="margin:12px 0 0;font:400 15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#475569;">
                  Hi ${escapeHtml(firstName)}, one tap and your card is ready to build. This confirms that
                  <span style="color:${MAIL_INK};font-weight:600;">${escapeHtml(user.email)}</span> reaches you.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:${MAIL_ACCENT};border-radius:8px;">
                      <!-- target="_blank" opens a tab and leaves the inbox where
                           it was. Without it a webmail client can navigate the
                           page it is already in, which loses the mailbox. -->
                      <a href="${link}" target="_blank" rel="noopener noreferrer"
                         style="display:inline-block;padding:13px 26px;font:600 15px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;">
                        Confirm my email
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 0;">
                <p style="margin:0;font:400 13px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#64748b;">
                  The link expires in ${VERIFY_TTL_MINUTES} minutes. If it does, ask for another from your dashboard.
                </p>
                <p style="margin:14px 0 0;font:400 12px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#94a3b8;word-break:break-all;">
                  Or paste this into your browser:<br />
                  <a href="${link}" target="_blank" rel="noopener noreferrer" style="color:${MAIL_ACCENT};text-decoration:underline;">${link}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 28px;">
                <div style="height:1px;background:#e2e8f0;line-height:1px;">&nbsp;</div>
                <p style="margin:16px 0 0;font:400 12px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#94a3b8;">
                  You are receiving this because someone signed up for CardFolio with this address.
                  If that was not you, ignore this email — nothing happens without the link above.
                </p>
              </td>
            </tr>
          </table>

          <p style="margin:16px 0 0;font:400 12px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#94a3b8;">
            CardFolio — one link and one QR code for your whole professional identity.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/** The same message for clients that show the text part. */
function verificationText(user, link) {
  const firstName = (user.full_name || '').split(' ')[0] || 'there'
  return [
    `Hi ${firstName},`,
    '',
    `Confirm your email address to finish setting up your CardFolio card:`,
    link,
    '',
    `The link expires in ${VERIFY_TTL_MINUTES} minutes. If it does, ask for another from your dashboard.`,
    '',
    `If you did not sign up for CardFolio, ignore this email — nothing happens without the link.`,
  ].join('\n')
}

/** Values go into the HTML above, so they are escaped on the way in. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

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

  /**
   * SMTP first, where it is configured.
   *
   * Not a preference for the protocol — a consequence of who can receive.
   * Resend's shared test sender only delivers to the address that owns the
   * Resend account, which makes it useless for confirming anybody else's
   * email until a domain is verified. An ordinary mailbox over SMTP has no
   * such limit: it sends to whoever you address it to, today, with no DNS to
   * set up. Once a domain exists, remove the SMTP vars and Resend takes over
   * again — it is the better transport at volume.
   */
  /**
   * A half-filled SMTP block is a mistake, not a choice.
   *
   * Silently falling through to the preview inbox is what makes this hard to
   * find: signup succeeds, the page says to check an inbox, and nothing ever
   * arrives. Said out loud, at the moment of the send, it takes seconds.
   */
  if (smtpPartial()) {
    console.error(`  SMTP is half-configured — missing ${smtpMissing().join(', ')}. Not sending over SMTP.`)
  }

  if (smtpMissing().length === 0) {
    try {
      const transport = smtpTransport()
      await transport.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: 'Confirm your email address',
        html: verificationHtml(user, link),
        text: verificationText(user, link),
      })
      return { sent: true }
    } catch (error) {
      console.error('Verification email failed (SMTP):', error.message, '\n  link:', link)
      return { sent: false, link }
    }
  }

  if (!process.env.RESEND_API_KEY) {
    return sendViaPreviewInbox(user, link)
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
        html: verificationHtml(user, link),
        // Sent alongside the HTML, not instead of it: some clients show this,
        // and a mail with no text part scores worse with spam filters.
        text: verificationText(user, link),
      }),
    })
    /**
     * Resend says why in the body; a bare status code does not.
     *
     * A 403 in particular has one overwhelmingly common cause — the shared
     * `onboarding@resend.dev` sender is allowed to deliver only to the address
     * that owns the Resend account, so every other recipient is refused until
     * a domain is verified. "Resend replied 403" sends you looking at the API
     * key; the body names the real problem.
     */
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Resend replied ${response.status}${detail ? ` — ${detail.slice(0, 300)}` : ''}`)
    }
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
     VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [token, user.id, String(VERIFY_TTL_MINUTES)]
  )
  return sendVerificationEmail(user, token)
}

/**
 * Rejects a write from an account whose address is unconfirmed.
 *
 * Runs after `auth`, and only on routes that change something. Reading is
 * still allowed: someone who cannot confirm their address right now should
 * still see their own card and their own figures — they simply cannot alter
 * anything until the address is proven to reach them.
 *
 * Enforced here rather than by hiding buttons, because a hidden button is not
 * a rule. The client hides them too, so the two agree, but this is the one
 * that counts.
 */
async function requireVerified(req, res, next) {
  try {
    const { rows } = await query('SELECT email_verified FROM users WHERE id = $1', [req.userId])
    if (!rows[0]) return res.status(404).json({ error: 'Account not found' })
    if (rows[0].email_verified === false) {
      return res.status(403).json({
        error: 'Confirm your email address before changing your card.',
        reason: 'email-unverified',
      })
    }
    next()
  } catch (error) {
    next(error)
  }
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

  /**
   * An account created with Google has no password to compare against.
   *
   * `bcrypt.compare(password, null)` throws — "Illegal arguments: string,
   * object" — which the error handler turned into a 500, so signing in with
   * the wrong method looked like the server was broken. It is a normal,
   * expected case, and it deserves the one message that actually helps: use
   * the button you signed up with.
   */
  if (user && !user.password_hash) {
    return res.status(401).json({
      error: 'This account signs in with Google. Use the Google button above.',
      reason: 'use-google',
    })
  }

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

    // Whether this call is what brought the account into being.
    let created = false

    // 3. The signup page may not adopt an existing account, however it was
    //    found — by Google id or by email.
    if (user && signupOnly) return { conflict: true, email: user.email }

    // 4. Brand new account: create the user and an unpublished card — unless
    //    this came from the login page, which may only sign existing people in.
    if (!user && loginOnly) return null

    if (!user) {
      /**
       * Unverified on arrival, like every other new account.
       *
       * Google has already proven this address — the route refuses any
       * identity whose `email_verified` claim is false — so this is a
       * deliberate choice to hold one rule rather than two: every account
       * confirms by clicking a link, however it was created. The email goes
       * out below, once the transaction has committed.
       */
      ;({ rows } = await client.query(
        `INSERT INTO users (full_name, email, google_sub, avatar_url)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [payload.name || payload.email.split("@")[0], payload.email, payload.sub, picture]
      ))
      user = rows[0]

      created = true

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

    return { user, card: toCard(cardRows[0], links), created }
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

  // A brand-new Google account gets the same link as any other new account.
  if (result.created) await issueVerification(result.user)

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

app.put('/api/me/card', auth, requireVerified, asyncRoute(async (req, res) => {
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
 * Downgrades only. Pro is granted by the billing webhook and nowhere else —
 * a route that took `pro` from the request body would be a paid plan that any
 * signed-in person can hand themselves with one curl, which is exactly what
 * this used to be before checkout existed.
 *
 * Cancelling properly goes through Paddle, which keeps the subscription alive
 * until the paid period ends. This is the blunt version: it drops the plan
 * immediately and does not stop the billing. It stays because an account that
 * has no subscription at all — comped, legacy, or from before billing — still
 * needs a way down.
 */
app.put('/api/me/plan', auth, asyncRoute(async (req, res) => {
  const plan = String(req.body?.plan || '')
  if (plan !== 'free') {
    return res.status(403).json({
      error: 'Pro is granted by checkout. Start one from the upgrade dialog.',
      reason: 'checkout-required',
    })
  }

  const { rows } = await query(
    'UPDATE users SET plan = $1 WHERE id = $2 RETURNING id, full_name, email, plan, weekly_email, email_verified',
    [plan, req.userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Account not found' })
  res.json({ user: publicUser(rows[0]) })
}))

/* --------------------------------------------------------------- billing */

const PADDLE_API_KEY = process.env.PADDLE_API_KEY || ''
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET || ''
/** Sandbox until a live key is issued; the two environments differ by host. */
const PADDLE_API = process.env.PADDLE_ENV === 'production'
  ? 'https://api.paddle.com'
  : 'https://sandbox-api.paddle.com'

/**
 * Which subscription states are worth paying for.
 *
 * `past_due` is deliberately included. A card that failed to charge is a card
 * problem, not a decision to leave — Paddle retries for days, and cutting the
 * account off mid-retry punishes someone whose bank declined a routine renewal.
 * `canceled` is absent because the period end is what governs it instead.
 */
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

/**
 * Confirms the request really came from Paddle.
 *
 * The header carries a timestamp and an HMAC of `timestamp:body`, so the
 * signature covers when it was sent as well as what — which is what stops a
 * captured webhook being replayed later. Compared with a timing-safe
 * comparison: a plain `===` leaks, byte by byte, how much of a guess was
 * right, and the secret is guessable given enough of those answers.
 */
function paddleSignatureValid(rawBody, header) {
  if (!PADDLE_WEBHOOK_SECRET || !header) return false

  const parts = Object.fromEntries(
    String(header).split(';').map((pair) => pair.split('=').map((s) => s.trim()))
  )
  const { ts, h1 } = parts
  if (!ts || !h1) return false

  // Five minutes: enough for a retry from a slow queue, not enough for a
  // captured request to be useful to somebody later.
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false

  const expected = createHmac('sha256', PADDLE_WEBHOOK_SECRET)
    .update(`${ts}:${rawBody}`)
    .digest('hex')

  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(String(h1), 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Finds the account a Paddle event is about.
 *
 * `custom_data.user_id` is what checkout attaches, and it is the only link
 * that exists the very first time someone subscribes. After that the
 * subscription and customer ids are stored locally and either will do — which
 * matters for renewals and cancellations, where Paddle sends no custom data.
 */
async function userForBillingEvent(data) {
  const userId = data?.custom_data?.user_id
  if (userId) {
    const { rows } = await query('SELECT id FROM users WHERE id = $1', [userId])
    if (rows[0]) return rows[0].id
  }
  if (data?.id) {
    const { rows } = await query('SELECT id FROM users WHERE subscription_id = $1', [data.id])
    if (rows[0]) return rows[0].id
  }
  if (data?.customer_id) {
    const { rows } = await query('SELECT id FROM users WHERE billing_customer_id = $1', [data.customer_id])
    if (rows[0]) return rows[0].id
  }
  return null
}

/**
 * Where Paddle reports what happened, and the only thing that grants Pro.
 *
 * Unauthenticated by necessity — Paddle has no session — so the signature is
 * the entire proof, and nothing above this line may read the body.
 */
app.post('/api/billing/webhook', asyncRoute(async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : ''

  if (!paddleSignatureValid(raw, req.get('Paddle-Signature'))) {
    console.error('Billing webhook rejected: bad signature')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  let event
  try {
    event = JSON.parse(raw)
  } catch {
    return res.status(400).json({ error: 'Malformed body' })
  }

  /**
   * Answer first, work second.
   *
   * Paddle retries anything that is not a 2xx, and a duplicate is handled
   * below anyway. Recording the event id before acting is what makes the
   * retry harmless: the second delivery conflicts on the primary key and
   * stops there.
   */
  const inserted = await query(
    'INSERT INTO billing_events (event_id, event_type) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING event_id',
    [event.event_id, event.event_type]
  )
  if (!inserted.rows[0]) return res.json({ ok: true, duplicate: true })

  const data = event.data || {}
  const userId = await userForBillingEvent(data)

  if (!userId) {
    // Logged loudly: money changed hands and no account was credited.
    console.error(`Billing webhook ${event.event_type} matched no account`, {
      subscription: data.id,
      customer: data.customer_id,
    })
    return res.json({ ok: true, matched: false })
  }

  if (String(event.event_type).startsWith('subscription.')) {
    const status = data.status || ''
    const periodEnd = data.current_billing_period?.ends_at || null

    /**
     * A cancelled subscription keeps Pro until the period already paid for
     * runs out. Anything else follows the status directly.
     */
    const paidUntilEnd = status === 'canceled' && periodEnd && new Date(periodEnd) > new Date()
    const plan = ACTIVE_STATUSES.has(status) || paidUntilEnd ? 'pro' : 'free'

    await query(
      `UPDATE users
          SET plan = $1, subscription_id = $2, subscription_status = $3,
              billing_customer_id = COALESCE($4, billing_customer_id), current_period_end = $5
        WHERE id = $6`,
      [plan, data.id || null, status, data.customer_id || null, periodEnd, userId]
    )
    console.log(`Billing: ${event.event_type} -> ${plan} for ${userId} (${status})`)
  }

  res.json({ ok: true })
}))

/**
 * A link to Paddle's own screens for changing the card or cancelling.
 *
 * Fetched live rather than stored: the URLs are signed and expire, so a copy
 * kept in the database would be a link that works until it quietly does not.
 */
app.get('/api/billing/portal', auth, asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT subscription_id FROM users WHERE id = $1', [req.userId])
  const subscriptionId = rows[0]?.subscription_id
  if (!subscriptionId) return res.status(404).json({ error: 'No subscription on this account' })
  if (!PADDLE_API_KEY) return res.status(503).json({ error: 'Billing is not configured' })

  const response = await fetch(`${PADDLE_API}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { authorization: `Bearer ${PADDLE_API_KEY}` },
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('Paddle portal lookup failed:', response.status, detail.slice(0, 300))
    return res.status(502).json({ error: 'Could not reach the billing provider' })
  }

  const body = await response.json()
  res.json({ urls: body?.data?.management_urls || null, status: body?.data?.status || null })
}))

/**
 * Account-level preferences. Only the weekly email lives here — the card
 * preferences travel with the card.
 *
 * NOTE: nothing sends this email yet. The column records consent so the job,
 * when it exists, has an audience to read; it is not a promise of delivery.
 */
app.put('/api/me/prefs', auth, requireVerified, asyncRoute(async (req, res) => {
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
    'UPDATE users SET weekly_email = $1 WHERE id = $2 RETURNING id, full_name, email, plan, weekly_email, email_verified',
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
    if (smtpMissing().length === 0) {
      console.log(
        `  Verification email: sending via SMTP (${process.env.SMTP_HOST}) as ${process.env.MAIL_FROM || process.env.SMTP_USER}`
      )
      /**
       * Prove it, rather than assume it.
       *
       * Three non-empty variables mean someone filled the form in, not that
       * the mailbox will accept them — a revoked or mistyped app password
       * looks identical here. Without this the banner says "sending via SMTP"
       * and the first anyone hears of the failure is a person who never got
       * their email. Deliberately not awaited: the API is already listening,
       * and a slow handshake must not hold up boot.
       */
      smtpTransport()
        .verify()
        .then(() => console.log('  SMTP credentials accepted.'))
        .catch((error) =>
          console.error(
            `  SMTP LOGIN FAILED — ${error.message.split('\n')[0]}\n` +
              '  Mail will not be delivered until this is fixed. For Gmail, generate a fresh\n' +
              '  app password at myaccount.google.com/apppasswords (2-step must be on) and\n' +
              '  make sure it belongs to the same account as SMTP_USER.'
          )
        )
    } else if (smtpPartial()) {
      console.log(`  Verification email: SMTP is half-configured — missing ${smtpMissing().join(', ')}.`)
      console.log('  Fill it in, or clear all three, to stop falling back to a preview inbox.')
    } else if (process.env.RESEND_API_KEY) {
      console.log(`  Verification email: sending via Resend as ${process.env.MAIL_FROM || 'onboarding@resend.dev'}`)
      console.log('  NOTE: the shared resend.dev sender only delivers to your own Resend account address.')
    } else {
      console.log('  Verification email: no provider configured — using a preview inbox.')
      console.log('  Each email is printed here with a URL where you can read it.')
    }
  })

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => pool.end().then(() => process.exit(0)))
    })
  }
}

export default app
