import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Loads the test database connection, and refuses to run against production.
 *
 * Must be the FIRST import in anything that calls `getPayload`. ES module
 * imports are hoisted and evaluated in declaration order, so a config module
 * imported above this one would read `process.env.DATABASE_URI` before this
 * file ever executes — which is exactly how a test suite ends up seeding users
 * into the live database and stamping it with a dev-push marker.
 *
 * `dotenv/config` alone is not enough: it loads `.env`, which is production.
 * Next.js gives `.env.local` priority automatically, but a bare node process
 * does not, so the split has to be applied by hand here.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const read = (file: string): Record<string, string> => {
  try {
    const out: Record<string, string> = {}
    for (const line of readFileSync(path.join(root, file), 'utf8').split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (match) out[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
    }
    return out
  } catch {
    return {}
  }
}

const production = read('.env')
const local = read('.env.local')

for (const [key, value] of Object.entries({ ...production, ...local })) {
  process.env[key] = value
}

if (!process.env.DATABASE_URI) {
  throw new Error('No DATABASE_URI. Tests need .env.local pointing at the dev branch.')
}

// The guard is written against `.env` rather than a hardcoded hostname so it
// keeps working when the production database is moved or rotated.
if (production.DATABASE_URI && process.env.DATABASE_URI === production.DATABASE_URI) {
  throw new Error(
    'Refusing to run: DATABASE_URI is the one in .env, which is production. ' +
      'Point .env.local at the dev branch before running tests.',
  )
}
