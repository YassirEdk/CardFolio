import 'dotenv/config'
import pg from 'pg'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.')
  process.exit(1)
}

/**
 * Neon requires TLS. `rejectUnauthorized: false` is what the Neon docs use for
 * the pooled connection string; the channel is still encrypted.
 */
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
})

export function query(text, params) {
  return pool.query(text, params)
}

/** Runs a set of statements in a single transaction. */
export async function transaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Maps a DB row (+ its links) to the card shape the React app already uses. */
export function toCard(row, links = []) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    title: row.title,
    bio: row.bio,
    photo: row.photo,
    logo: row.logo,
    cover: row.cover,
    company: row.company,
    phone: row.phone,
    email: row.email,
    whatsapp: row.whatsapp,
    location: row.location,
    website: row.website,
    template: row.template,
    accent: row.accent,
    published: row.published,
    // Pro preferences; the defaults match the columns.
    hideBranding: row.hide_branding ?? false,
    logoPlate: row.logo_plate ?? true,
    indexable: row.indexable ?? true,
    links: links.map((link) => ({
      id: link.id,
      platform: link.platform,
      url: link.url,
      label: link.label || undefined,
      handle: link.handle || undefined,
    })),
  }
}
