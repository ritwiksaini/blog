/**
 * Provisions the drafting agent's bot user and prints its API key.
 *
 *   DATABASE_URI=<uri> npx tsx scripts/createBotUser.ts [email]
 *
 * The key is what the cloud drafting routine authenticates with:
 *   Authorization: users API-Key <key>
 *
 * The key is stored ENCRYPTED (not hashed), so it can be read back later by an
 * admin — payload.find({collection:'users', showHiddenFields:true}) returns it
 * in plaintext, and the admin UI shows it on the user's edit page. Treat it as
 * recoverable, not write-once. Rotating PAYLOAD_SECRET invalidates it.
 *
 * NOTE: this provisions the bot in whichever DB DATABASE_URI points at. The dev
 * branch and production have SEPARATE bot users with DIFFERENT keys.
 */
import 'dotenv/config'
import { randomBytes } from 'crypto'
import { getPayload } from 'payload'

import config from '../src/payload.config.js'

const email = process.argv[2] ?? 'bot@ritwiksaini.com'

const run = async () => {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })

  const apiKey = randomBytes(32).toString('hex')

  if (existing.docs.length > 0) {
    const updated = await payload.update({
      collection: 'users',
      id: existing.docs[0].id,
      data: { roles: ['bot'], enableAPIKey: true, apiKey },
    })
    console.log(`Rotated API key for existing bot user ${updated.email}`)
  } else {
    const created = await payload.create({
      collection: 'users',
      data: {
        email,
        password: randomBytes(24).toString('hex'),
        roles: ['bot'],
        enableAPIKey: true,
        apiKey,
      },
    })
    console.log(`Created bot user ${created.email}`)
  }

  console.log(`\nAuthorization: users API-Key ${apiKey}\n`)
  process.exit(0)
}

void run()
