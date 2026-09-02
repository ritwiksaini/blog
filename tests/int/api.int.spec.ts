// Must stay the first import: it pins DATABASE_URI to the dev branch and
// refuses to run against the one in `.env`. Without it this suite reads the
// environment `vitest.setup.ts` loaded, which is `.env`, which is production.
import '../helpers/env.js'

import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

describe('API', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })
})
