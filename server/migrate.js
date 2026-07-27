/**
 * Creates the schema and seeds the demo cards.
 *   node server/migrate.js         → schema only
 *   node server/migrate.js --seed  → schema + demo data
 *
 * Both are idempotent: re-running will not duplicate rows.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import bcrypt from 'bcryptjs'
import { pool, query, transaction } from './db.js'

const here = dirname(fileURLToPath(import.meta.url))

const DEMO_PASSWORD = 'demo1234'

// Usernames are the random handles these cards carry in the database. They
// are the seed's conflict key, so they have to match or a re-run would try to
// insert a second card for the same user.
const DEMO = [
  {
    email: 'john@doestudio.com',
    username: 'demo',
    fullName: 'John Doe',
    title: 'Senior Product Designer',
    bio: 'I design clear, conversion-focused interfaces for SaaS and fintech teams. 9 years in, 40+ products shipped.',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    company: 'Doe Studio',
    phone: '+1 415 555 0134',
    whatsapp: '+14155550134',
    location: 'San Francisco, USA',
    website: 'https://doestudio.com',
    template: 'executive',
    accent: '#2E6BE6',
    // Demo links point at pages each platform really serves: John Doe is
    // fictional, so a handle URL 404s and the site bounces you to its home.
    links: [
      { platform: 'linkedin', url: 'https://www.linkedin.com/feed/', label: 'LinkedIn' },
      { platform: 'dribbble', url: 'https://dribbble.com/shots', label: 'Dribbble' },
      { platform: 'behance', url: 'https://www.behance.net/galleries', label: 'Behance' },
      { platform: 'instagram', url: 'https://www.instagram.com/explore/', label: 'Instagram' },
      { platform: 'upwork', url: 'https://www.upwork.com/freelance-jobs/', label: 'Upwork' },
    ],
    events: { view: 2841, click: 962, scan: 418 },
  },
  {
    email: 'hello@sarahkim.photo',
    username: 'card-ae96b7db',
    fullName: 'Sarah Kim',
    title: 'Wedding & Portrait Photographer',
    bio: 'Natural-light photography across California. Booking 2026 weddings now.',
    photo: '/single-women-happier-than-men-675ac891b545d.avif',
    company: 'Kim Studio',
    phone: '+1 213 555 0198',
    whatsapp: '+12135550198',
    location: 'Los Angeles, USA',
    website: 'https://sarahkim.photo',
    template: 'photo',
    accent: '#B45309',
    links: [
      { platform: 'instagram', url: 'https://instagram.com/sarahkim.photo' },
      { platform: 'facebook', url: 'https://facebook.com/sarahkimphoto' },
      { platform: 'website', url: 'https://sarahkim.photo/portfolio' },
    ],
    events: { view: 5120, click: 1740, scan: 903 },
  },
  {
    email: 'marcus@alvarez.dev',
    username: 'card-9900172d',
    fullName: 'Marcus Alvarez',
    title: 'Full-Stack Engineer · React & Node',
    bio: 'Freelance engineer building fast, maintainable web products. Open to contract work.',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    company: null,
    phone: '+34 611 555 042',
    whatsapp: '+34611555042',
    location: 'Barcelona, Spain',
    website: 'https://alvarez.dev',
    template: 'darkpro',
    accent: '#0E9F6E',
    links: [
      { platform: 'github', url: 'https://github.com/marcusdev' },
      { platform: 'linkedin', url: 'https://linkedin.com/in/marcusalvarez' },
      { platform: 'x', url: 'https://x.com/marcusdev' },
      { platform: 'fiverr', url: 'https://fiverr.com/marcusdev' },
    ],
    events: { view: 1290, click: 511, scan: 176 },
  },
]

async function runSchema() {
  const sql = await readFile(join(here, 'schema.sql'), 'utf8')
  await query(sql)
  console.log('✓ schema applied')
}

async function seed() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  for (const person of DEMO) {
    await transaction(async (client) => {
      const { rows: userRows } = await client.query(
        `INSERT INTO users (full_name, email, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (lower(email)) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [person.fullName, person.email, passwordHash]
      )
      const userId = userRows[0].id

      const { rows: cardRows } = await client.query(
        `INSERT INTO cards (user_id, username, full_name, title, bio, photo, cover, company,
                            phone, email, whatsapp, location, website, template, accent, published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, true)
         ON CONFLICT (lower(username)) DO UPDATE SET
           full_name = EXCLUDED.full_name, title = EXCLUDED.title, bio = EXCLUDED.bio,
           photo = EXCLUDED.photo, cover = EXCLUDED.cover, company = EXCLUDED.company, phone = EXCLUDED.phone,
           email = EXCLUDED.email, whatsapp = EXCLUDED.whatsapp, location = EXCLUDED.location,
           website = EXCLUDED.website, template = EXCLUDED.template, accent = EXCLUDED.accent,
           published = true, updated_at = now()
         RETURNING id`,
        [
          userId,
          person.username,
          person.fullName,
          person.title,
          person.bio,
          person.photo,
          person.cover || null,
          person.company,
          person.phone,
          person.email,
          person.whatsapp,
          person.location,
          person.website,
          person.template,
          person.accent,
        ]
      )
      const cardId = cardRows[0].id

      // Links are replaced wholesale so the seed stays idempotent.
      await client.query('DELETE FROM card_links WHERE card_id = $1', [cardId])
      for (const [index, link] of person.links.entries()) {
        await client.query(
          'INSERT INTO card_links (card_id, platform, url, label, position) VALUES ($1,$2,$3,$4,$5)',
          [cardId, link.platform, link.url, link.label || null, index]
        )
      }

      // Backfill events only if this card has none, so counts don't inflate.
      const { rows: existing } = await client.query(
        'SELECT count(*)::int AS n FROM card_events WHERE card_id = $1',
        [cardId]
      )
      if (existing[0].n === 0) {
        for (const [type, total] of Object.entries(person.events)) {
          await client.query(
            `INSERT INTO card_events (card_id, type, created_at)
             SELECT $1, $2, now() - (random() * interval '15 days')
             FROM generate_series(1, $3)`,
            [cardId, type, total]
          )
        }
      }

      console.log(`✓ seeded /${person.username}`)
    })
  }
}

const wantSeed = process.argv.includes('--seed')

try {
  await runSchema()
  if (wantSeed) {
    await seed()
    console.log(`\nDemo logins — password: ${DEMO_PASSWORD}`)
    for (const p of DEMO) console.log(`  ${p.email}`)
  }
} catch (error) {
  console.error('Migration failed:', error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
