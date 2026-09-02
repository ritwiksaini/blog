// Must stay the first import: it pins DATABASE_URI to the dev branch and
// refuses to run against the one in `.env`. ES module imports are hoisted and
// evaluated in declaration order, so a config imported above this line would
// read the environment before the guard ever ran.
import '../helpers/env.js'

import { getPayload, type Payload, type TypedUser } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

/**
 * The two kinds of syndication row, and the boundary between them.
 *
 * `post` stopped being a required field when research originals arrived, so the
 * requirement moved into a `beforeChange` hook where it could be made
 * conditional. That move is the thing most likely to break quietly: a field
 * flag is enforced by the database, a hook is enforced by code that can be
 * edited around. These tests are what stands in for the NOT NULL.
 */

let payload: Payload
let bot: TypedUser
let human: TypedUser
let postId: number
const created: number[] = []
const createdPosts: number[] = []
const stamp = Date.now()
let postSeq = 0

const seedUser = async (email: string, roles: ('admin' | 'bot')[]): Promise<TypedUser> => {
  await payload.delete({ collection: 'users', where: { email: { equals: email } } })
  return (await payload.create({
    collection: 'users',
    data: { email, password: 'test', roles },
  })) as unknown as TypedUser
}

// Every create funnels through here so nothing survives a run. A leaked row
// would break the one-per-post dedup test on the next run rather than this one,
// which is the worst kind of flake to debug.
// A test that needs an unclaimed post makes its own. Sharing one across the
// suite made the dedup test pass or fail on execution order.
const createPost = async (): Promise<number> => {
  const suffix = `${stamp}-${(postSeq += 1)}`
  const post = await payload.create({
    collection: 'posts',
    draft: true,
    data: {
      title: `Syndication fixture ${suffix}`,
      slug: `syndication-fixture-${suffix}`,
      excerpt: 'A fixture post.',
      geography: 'global',
      assetClass: 'cross',
    } as never,
  })
  createdPosts.push(post.id as number)
  return post.id as number
}

const create = async (data: Record<string, unknown>, opts: Record<string, unknown> = {}) => {
  const doc = await payload.create({ collection: 'syndication', data: data as never, ...opts })
  created.push(doc.id as number)
  return doc
}

describe('Syndication', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    bot = await seedUser(`bot-${stamp}@test.local`, ['bot'])
    human = await seedUser(`human-${stamp}@test.local`, ['admin'])

    postId = await createPost()
  })

  afterAll(async () => {
    for (const id of created) {
      await payload.delete({ collection: 'syndication', id }).catch(() => {})
    }
    for (const id of createdPosts) {
      await payload.delete({ collection: 'posts', id }).catch(() => {})
    }
    // Guarded like the rest: a cleanup failure must not fail a green suite,
    // and these rows are namespaced by `stamp` so a leak cannot affect a rerun.
    await payload
      .delete({ collection: 'users', where: { email: { like: `%-${stamp}@test.local` } } })
      .catch(() => {})
  })

  describe('the post requirement, now conditional', () => {
    it('saves a research original with no post at all', async () => {
      const doc = await create({
        kind: 'research-original',
        topic: 'The rehost rule nobody enforced',
        sourceAnchors: [{ path: 'notes/2026/08/2026-08-21.md#eqt-lifts-its-offer' }],
      })

      expect(doc.post).toBeFalsy()
      // Denormalised from `topic` rather than from a post title, which is the
      // whole reason `topic` exists.
      expect(doc.label).toBe('The rehost rule nobody enforced')
      expect(doc.sourceAnchors?.[0]?.path).toContain('2026-08-21.md#')
    })

    it('refuses a post syndication with no post', async () => {
      await expect(create({ kind: 'post-syndication' })).rejects.toThrow(/needs a post/i)
    })

    it('refuses a research original that carries a post', async () => {
      // Both directions are checked. A research original with a post set would
      // silently take the post-syndication branch in the label hook and in the
      // dedup check, so it has to be rejected rather than tolerated.
      await expect(
        create({ kind: 'research-original', topic: 'Wrong shape', post: postId }),
      ).rejects.toThrow(/no post behind it/i)
    })

    it('refuses a research original with no topic', async () => {
      await expect(create({ kind: 'research-original' })).rejects.toThrow(/needs a topic/i)
    })

    it('defaults to a post syndication and labels it from the post title', async () => {
      const doc = await create({ post: postId })

      expect(doc.kind).toBe('post-syndication')
      expect(doc.label).toBe(`Syndication fixture ${stamp}-1`)
    })
  })

  describe('the one-draft-per-post rule', () => {
    it('still refuses a second draft for the same post', async () => {
      const ownPost = await createPost()
      await create({ post: ownPost, platform: 'linkedin' })

      await expect(create({ post: ownPost, platform: 'linkedin' })).rejects.toThrow(
        /already has a linkedin draft/i,
      )
    })

    it('allows two research originals, which have no post to collide on', async () => {
      // Deliberate: the weekly routine may legitimately produce several over
      // time, and there is no post for the uniqueness rule to key on.
      await create({ kind: 'research-original', topic: `First ${stamp}` })
      const second = await create({ kind: 'research-original', topic: `Second ${stamp}` })

      expect(second.id).toBeTruthy()
    })
  })

  describe('the body validators, which bind both kinds', () => {
    const body = (value: string) => ({
      kind: 'research-original',
      topic: `Validator probe ${stamp}`,
      body: value,
    })

    /**
     * The Local API flattens field validation to "The following field is
     * invalid: Body", so asserting on `.message` would pass for any of these
     * four rules and prove only that something was rejected. The specific text
     * is in `data.errors`, and it is the part worth testing: these messages are
     * read by an unattended routine deciding how to fix its draft.
     */
    const reasonFor = async (value: string): Promise<string> => {
      try {
        await create(body(value))
      } catch (error) {
        const errors = (error as { data?: { errors?: { message?: string }[] } }).data?.errors ?? []
        return errors.map((e) => e.message ?? '').join(' | ')
      }
      throw new Error('Expected the body to be rejected, and it was accepted.')
    }

    it('rejects an em dash, and says so', async () => {
      expect(await reasonFor('A hook that runs on — dashes.')).toMatch(/em dash/i)
    })

    it('rejects a link in the body, and points at the first comment', async () => {
      // The link penalty is the reason the first-comment field exists, and it
      // applies to a research original even though that one carries no link at
      // all: the failure mode is an agent pasting a source URL inline.
      expect(await reasonFor('See https://example.com for the filing.')).toMatch(/first comment/i)
    })

    it('rejects a first line past the desktop fold, and names the fold', async () => {
      expect(await reasonFor(`${'x'.repeat(221)}\n\nrest`)).toMatch(/first line/i)
    })

    it('rejects a body past the LinkedIn ceiling', async () => {
      expect(await reasonFor(`Short first line.\n\n${'word '.repeat(700)}`)).toMatch(/3000/)
    })

    it('accepts an ordinary body', async () => {
      const doc = await create(body('A first line under the fold.\n\nAnd a second paragraph.'))
      expect(doc.body).toContain('under the fold')
    })
  })

  describe('what a bot may write', () => {
    it('lets the bot create a research original', async () => {
      const doc = await create(
        { kind: 'research-original', topic: `Bot wrote this ${stamp}`, status: 'drafted' },
        { overrideAccess: false, user: bot },
      )

      expect(doc.kind).toBe('research-original')
    })

    // The gap this closes: `access.update` has always guarded these three
    // fields, `access.create` never did. It did not matter while every row was
    // created by a human pressing a button. The weekly routine is the first bot
    // that creates rows, so the guard has to exist on both operations.
    for (const field of ['metrics', 'postedAt', 'postUrl'] as const) {
      it(`refuses a bot create carrying ${field}`, async () => {
        const value =
          field === 'metrics'
            ? [{ bucket: '48h', capturedAt: new Date().toISOString(), impressions: 99999 }]
            : field === 'postedAt'
              ? new Date().toISOString()
              : 'https://www.linkedin.com/feed/update/urn:li:activity:1/'

        await expect(
          create(
            { kind: 'research-original', topic: `Bot overreach ${stamp}`, [field]: value },
            { overrideAccess: false, user: bot },
          ),
        ).rejects.toThrow()
      })
    }

    it('refuses a bot create that marks a row posted', async () => {
      await expect(
        create(
          { kind: 'research-original', topic: `Bot status ${stamp}`, status: 'posted' },
          { overrideAccess: false, user: bot },
        ),
      ).rejects.toThrow()
    })

    it('refuses a bot update that writes metrics', async () => {
      const doc = await create({ kind: 'research-original', topic: `Bot patch ${stamp}` })

      await expect(
        payload.update({
          collection: 'syndication',
          id: doc.id as number,
          data: { metrics: [{ bucket: '48h', capturedAt: new Date().toISOString() }] } as never,
          overrideAccess: false,
          user: bot,
        }),
      ).rejects.toThrow()
    })

    it('lets a human write the metrics the bot may not', async () => {
      const doc = await create({ kind: 'research-original', topic: `Human metrics ${stamp}` })

      const updated = await payload.update({
        collection: 'syndication',
        id: doc.id as number,
        data: {
          postedAt: new Date().toISOString(),
          metrics: [{ bucket: '48h', capturedAt: new Date().toISOString(), impressions: 1200 }],
        } as never,
        overrideAccess: false,
        user: human,
      })

      expect(updated.metrics?.[0]?.impressions).toBe(1200)
    })
  })
})
