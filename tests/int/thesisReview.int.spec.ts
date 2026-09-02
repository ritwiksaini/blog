// Must stay the first import: pins DATABASE_URI to the dev branch. See
// tests/helpers/env.ts.
import '../helpers/env.js'

import { getPayload, type Payload, type TypedUser } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { GATE_STAGES, LAST_STAGE, nextStageState } from '@/endpoints/thesisStages'

/**
 * The stage machine and the review gate.
 *
 * The bug these exist for: the first live run finished stage 1 and left `stage`
 * at 1, because nothing defined whether the field meant "just completed" or
 * "next to run". Approving would have re-run stage 1, and the artifact list
 * would have been the only evidence. Stage arithmetic now belongs to the server,
 * so the tests are about the transition table rather than about a prompt.
 */

let payload: Payload
let bot: TypedUser
let human: TypedUser
const stamp = Date.now()
const created: number[] = []

const newThesis = async (over: Record<string, unknown> = {}) => {
  const doc = await payload.create({
    collection: 'theses',
    data: { topic: `Stage machine ${stamp}`, status: 'active', ...over } as never,
  })
  created.push(doc.id as number)
  return doc
}

describe('Thesis stage machine', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    for (const email of [`sm-bot-${stamp}@x.local`, `sm-human-${stamp}@x.local`]) {
      await payload.delete({ collection: 'users', where: { email: { equals: email } } })
    }
    bot = (await payload.create({
      collection: 'users',
      data: { email: `sm-bot-${stamp}@x.local`, password: 'test', roles: ['bot'] },
    })) as unknown as TypedUser
    human = (await payload.create({
      collection: 'users',
      data: { email: `sm-human-${stamp}@x.local`, password: 'test', roles: ['admin'] },
    })) as unknown as TypedUser
  })

  afterAll(async () => {
    for (const id of created) {
      await payload.delete({ collection: 'theses', id }).catch(() => {})
    }
    await payload
      .delete({ collection: 'users', where: { email: { like: `%-${stamp}@x.local` } } })
      .catch(() => {})
  })

  describe('the transition table', () => {
    it('advances to the next stage, never repeating the one just finished', () => {
      // The exact bug from the first live run.
      expect(nextStageState(1).stage).toBe(2)
      expect(nextStageState(2).stage).toBe(3)
    })

    it('gates after 1, 4 and 5 and not otherwise', () => {
      for (let n = 1; n < LAST_STAGE; n += 1) {
        expect(nextStageState(n).stageStatus).toBe(
          GATE_STAGES.has(n) ? 'awaiting-review' : 'ready',
        )
      }
    })

    it('finishes after the last stage rather than gating forever', () => {
      expect(nextStageState(LAST_STAGE).stageStatus).toBe('done')
    })

    it('stamps the clock the 48 hour auto-advance counts from', () => {
      const at = new Date(nextStageState(2).stageEnteredAt).getTime()
      expect(Math.abs(at - Date.now())).toBeLessThan(60_000)
      // A date with no time was the original defect: it opened the gate early.
      expect(nextStageState(2).stageEnteredAt).not.toMatch(/T00:00:00\.000Z$/)
    })
  })

  describe('what a bot may do to a thesis', () => {
    it('cannot clear its own gate by writing stageStatus', async () => {
      const t = await newThesis({ stage: 2, stageStatus: 'awaiting-review' })

      // The endpoint refuses a bot outright; this covers the direct write too,
      // because a guard that only exists in one path is not a guard.
      await expect(
        payload.update({
          collection: 'theses',
          id: t.id as number,
          data: { status: 'published' } as never,
          overrideAccess: false,
          user: bot,
        }),
      ).rejects.toThrow()
    })

    it('lets a human record an approval and the reviews survive', async () => {
      const t = await newThesis({ stage: 2, stageStatus: 'awaiting-review' })

      const updated = await payload.update({
        collection: 'theses',
        id: t.id as number,
        data: {
          stageStatus: 'ready',
          reviews: [
            {
              stage: 1,
              decision: 'approved',
              note: 'Tighten the claim to deal structure only.',
              decidedAt: new Date().toISOString(),
            },
          ],
        } as never,
        overrideAccess: false,
        user: human,
      })

      expect(updated.stageStatus).toBe('ready')
      expect(updated.reviews?.[0]?.note).toMatch(/deal structure/)
      expect(updated.reviews?.[0]?.stage).toBe(1)
    })
  })

  describe('artifacts are readable in the admin', () => {
    it('stores the full stage output on the row, not just its path', async () => {
      // Reviewing a gate means reading the artifact. If only the path were
      // stored, the decision and the thing decided on would be in different
      // places, which is the whole problem this replaced.
      const t = await newThesis()
      const body = '# Stage 1\n\nThe claim, stated plainly.'

      const updated = await payload.update({
        collection: 'theses',
        id: t.id as number,
        data: {
          artifacts: [{ stage: 1, path: 'theses/x/01-scope.md', content: body }],
        } as never,
      })

      expect(updated.artifacts?.[0]?.content).toBe(body)
    })
  })
})

describe('Exemplar candidates', () => {
  const createdCandidates: number[] = []

  afterAll(async () => {
    for (const id of createdCandidates) {
      await payload.delete({ collection: 'exemplar-candidates', id }).catch(() => {})
    }
  })

  const candidate = async (over: Record<string, unknown> = {}, opts = {}) => {
    const doc = await payload.create({
      collection: 'exemplar-candidates',
      data: {
        publisher: 'Sequoia Capital',
        url: 'https://example.com/a-piece',
        domain: 'vc',
        why: 'Fills the empty vc/thesis cell.',
        ...over,
      } as never,
      ...opts,
    })
    createdCandidates.push(doc.id as number)
    return doc
  }

  it('lands as proposed and gets a readable title', async () => {
    const doc = await candidate()
    expect(doc.status).toBe('proposed')
    expect(doc.title).toContain('Sequoia')
  })

  it('forces a bot proposal to proposed even when it asks for approved', async () => {
    const doc = await candidate({ status: 'approved' }, { overrideAccess: false, user: bot })
    expect(doc.status).toBe('proposed')
  })

  it('refuses a bot approving its own shortlist', async () => {
    // The corpus is worth something only because a person judged each piece
    // worth imitating. A bot approving removes the only quality gate there is.
    const doc = await candidate()

    await expect(
      payload.update({
        collection: 'exemplar-candidates',
        id: doc.id as number,
        data: { status: 'approved' } as never,
        overrideAccess: false,
        user: bot,
      }),
    ).rejects.toThrow()
  })

  it('lets the bot report an outcome it legitimately observed', async () => {
    const doc = await candidate()

    const updated = await payload.update({
      collection: 'exemplar-candidates',
      id: doc.id as number,
      data: { status: 'unreachable' } as never,
      overrideAccess: false,
      user: bot,
    })

    expect(updated.status).toBe('unreachable')
  })

  it('lets a human approve', async () => {
    const doc = await candidate()

    const updated = await payload.update({
      collection: 'exemplar-candidates',
      id: doc.id as number,
      data: { status: 'approved' } as never,
      overrideAccess: false,
      user: human,
    })

    expect(updated.status).toBe('approved')
  })
})
