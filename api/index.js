/**
 * Vercel serverless entry point.
 *
 * The same Express app that `npm run server` runs, handed to Vercel as a
 * function handler — an Express app is already a (req, res) function, so no
 * adapter is needed. Keeping one app means the API cannot drift between local
 * development and production.
 *
 * vercel.json rewrites every /api/* request here; the original path survives
 * the rewrite, so the routes inside still match their own /api prefix.
 */
export { default } from '../server/index.js'
