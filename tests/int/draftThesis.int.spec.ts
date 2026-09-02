// Must stay the first import: pins DATABASE_URI to the dev branch. See the
// comment in tests/helpers/env.ts.
import '../helpers/env.js'

import { getPayload, type Payload, type TypedUser } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { renderToStaticMarkup } from 'react-dom/server'

import config from '@/payload.config'
import { PostBody } from '@/app/(frontend)/[slug]/PostBody'
import { markdownToLexical, validateDraft, WORD_RANGES } from '@/endpoints/validateDraft'

/**
 * The long-form thesis path, and the table support that only it has.
 *
 * The failure this file mostly exists to catch is silent: if the editor config
 * the endpoint builds does not carry the table feature,
 * `convertMarkdownToLexical` leaves a markdown table as literal pipe characters.
 * That stores fine as jsonb, returns 201, and renders as garbage on the page,
 * so nothing short of an assertion on the converted node tree notices.
 */

let payload: Payload
let bot: TypedUser
const stamp = Date.now()
const createdTheses: number[] = []
const createdPosts: number[] = []

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i % 50}`).join(' ')

const TABLE = ['| Driver | Base | Bull |', '| --- | --- | --- |', '| Attach rate | 12% | 31% |'].join(
  '\n',
)

describe('Long-form thesis drafting', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await payload.delete({ collection: 'users', where: { email: { equals: `t-${stamp}@x.local` } } })
    bot = (await payload.create({
      collection: 'users',
      data: { email: `t-${stamp}@x.local`, password: 'test', roles: ['bot'] },
    })) as unknown as TypedUser
  })

  afterAll(async () => {
    for (const id of createdPosts) {
      await payload.delete({ collection: 'posts', id }).catch(() => {})
    }
    for (const id of createdTheses) {
      await payload.delete({ collection: 'theses', id }).catch(() => {})
    }
    await payload
      .delete({ collection: 'users', where: { email: { equals: `t-${stamp}@x.local` } } })
      .catch(() => {})
  })

  describe('the table round trip', () => {
    it('converts a markdown table into real table nodes, not literal pipes', async () => {
      const { content, error } = await markdownToLexical(
        payload,
        `Some prose above the model.\n\n${TABLE}\n\nAnd prose below it.`,
      )

      expect(error).toBeUndefined()

      const types = ((content as any).root.children as { type: string }[]).map((c) => c.type)
      expect(types).toContain('table')

      // The specific regression: a table that failed to convert comes back as a
      // paragraph whose text still has the pipes in it. Asserting only on
      // "conversion succeeded" would pass in exactly that case.
      const flat = JSON.stringify(content)
      expect(flat).toContain('Attach rate')
      const paragraphs = (content as any).root.children.filter((c: any) => c.type === 'paragraph')
      expect(JSON.stringify(paragraphs)).not.toContain('| ---')
    })

    it('renders the table as real HTML inside a scroll container', async () => {
      // The node tree being right does not prove the page is. This renders the
      // actual component the post page uses, so a missing JSX converter or a
      // dropped wrapper fails here rather than in production.
      const { content } = await markdownToLexical(payload, `Prose.\n\n${TABLE}\n\nMore prose.`)
      const html = renderToStaticMarkup(PostBody({ content }) as never)

      expect(html).toContain('<table')
      expect(html).toContain('Attach rate')
      expect(html).toContain('class="post-table"')
      // The pipes must not survive into the page.
      expect(html).not.toContain('| ---')
    })

    it('still converts a document with no table at all', async () => {
      const { content, error } = await markdownToLexical(payload, 'Just a paragraph.')
      expect(error).toBeUndefined()
      expect((content as any).root.children.length).toBeGreaterThan(0)
    })
  })

  describe('which formats may carry a table', () => {
    const base = {
      title: 'A thesis',
      excerpt: 'An excerpt.',
      sources: [{ title: 'A source', url: 'https://example.com/a' }],
      geography: 'global',
      assetClass: 'venture-capital',
      sector: 1,
    }

    it('accepts a table for long-thesis', () => {
      const { errors } = validateDraft({
        ...base,
        markdown: `${words(3200)}\n\n${TABLE}`,
        postFormat: 'long-thesis',
      })
      expect(errors.filter((e) => /table/i.test(e))).toHaveLength(0)
    })

    for (const format of ['sharp-take', 'thesis'] as const) {
      it(`still rejects a table for ${format}`, () => {
        const { errors } = validateDraft({
          ...base,
          markdown: `${words(1000)}\n\n${TABLE}`,
          postFormat: format,
        })
        expect(errors.some((e) => /table/i.test(e))).toBe(true)
      })
    }

    it('rejects a code fence even for long-thesis', () => {
      // Tables were unbanned; code fences were not. The editor still drops them.
      const { errors } = validateDraft({
        ...base,
        markdown: `${words(3200)}\n\n\`\`\`python\nx = 1\n\`\`\``,
        postFormat: 'long-thesis',
      })
      expect(errors.some((e) => /code block/i.test(e))).toBe(true)
    })
  })

  describe('the word fence', () => {
    const probe = (n: number, format = 'long-thesis') =>
      validateDraft({
        title: 'T',
        excerpt: 'E',
        markdown: words(n),
        sources: [{ title: 'S', url: 'https://example.com' }],
        geography: 'global',
        assetClass: 'cross',
        sector: 1,
        postFormat: format,
      }).errors.filter((e) => /word count/.test(e))

    it('is 3000 to 6000 for long-thesis', () => {
      expect(WORD_RANGES['long-thesis']).toEqual({ min: 3000, max: 6000 })
    })

    it('rejects 2999 and 6001, accepts the ends', () => {
      expect(probe(2999)).toHaveLength(1)
      expect(probe(3000)).toHaveLength(0)
      expect(probe(6000)).toHaveLength(0)
      expect(probe(6001)).toHaveLength(1)
    })

    it('leaves the existing formats where they were', () => {
      // The extraction into validateDraft.ts must not have moved these.
      expect(WORD_RANGES['sharp-take']).toEqual({ min: 450, max: 1400 })
      expect(WORD_RANGES.thesis).toEqual({ min: 900, max: 2400 })
    })
  })

  describe('house style, shared with draft-from-pitch', () => {
    const check = (over: Record<string, unknown>) =>
      validateDraft({
        title: 'T',
        excerpt: 'E',
        markdown: words(3200),
        sources: [{ title: 'S', url: 'https://example.com' }],
        geography: 'global',
        assetClass: 'cross',
        sector: 1,
        postFormat: 'long-thesis',
        ...over,
      }).errors

    it('rejects an em dash in the body', () => {
      expect(check({ markdown: `${words(3200)} — and more` }).some((e) => /em dash/.test(e))).toBe(
        true,
      )
    })

    it('rejects more than three en dashes', () => {
      expect(
        check({ markdown: `${words(3200)} – – – –` }).some((e) => /en dashes/.test(e)),
      ).toBe(true)
    })

    it('rejects an inline link URL with parentheses', () => {
      expect(
        check({ markdown: `${words(3200)} [a](https://e.com/a(b))` }).some((e) =>
          /parentheses/.test(e),
        ),
      ).toBe(true)
    })

    it('rejects an empty sources array', () => {
      expect(check({ sources: [] }).some((e) => /non-empty/.test(e))).toBe(true)
    })

    it('rejects a relative source URL', () => {
      expect(
        check({ sources: [{ title: 'S', url: '/relative' }] }).some((e) => /absolute URL/.test(e)),
      ).toBe(true)
    })
  })

  describe('the collection, and what a bot may do to it', () => {
    const newThesis = async (data: Record<string, unknown> = {}, opts = {}) => {
      const doc = await payload.create({
        collection: 'theses',
        data: { topic: `Physical Intelligence ${stamp}`, ...data } as never,
        ...opts,
      })
      createdTheses.push(doc.id as number)
      return doc
    }

    it('defaults a new thesis to proposed, stage 1, ready', async () => {
      const doc = await newThesis()
      expect(doc.status).toBe('proposed')
      expect(doc.stage).toBe(1)
      expect(doc.stageStatus).toBe('ready')
    })

    it('forces a bot-created thesis to proposed even when it asks for active', async () => {
      // Stage 7 proposes next month's topics. If the bot could create them
      // active it would start spending a research budget on a topic nobody
      // chose, so the floor is set in beforeChange as well as in access.
      const doc = await newThesis(
        { status: 'active', topic: `Bot proposal ${stamp}` },
        { overrideAccess: false, user: bot },
      )
      expect(doc.status).toBe('proposed')
      expect(doc.proposedBy).toBe('routine')
    })

    it('refuses a bot update that activates a thesis', async () => {
      const doc = await newThesis({ topic: `Bot activation ${stamp}` })

      await expect(
        payload.update({
          collection: 'theses',
          id: doc.id as number,
          data: { status: 'active' } as never,
          overrideAccess: false,
          user: bot,
        }),
      ).rejects.toThrow()
    })

    it('stamps stageEnteredAt server-side, ignoring what the caller sends', async () => {
      // The 48 hour gate counts from this field. The first live stage 1 sent a
      // date with no time, which would have opened its own gate 21 hours early.
      const doc = await newThesis({ topic: `Clock ${stamp}` })

      const updated = await payload.update({
        collection: 'theses',
        id: doc.id as number,
        data: {
          stageStatus: 'awaiting-review',
          stageEnteredAt: '2020-01-01T00:00:00.000Z',
        } as never,
        overrideAccess: false,
        user: bot,
      })

      const stamped = new Date(updated.stageEnteredAt as string).getTime()
      expect(stamped).not.toBe(new Date('2020-01-01T00:00:00.000Z').getTime())
      expect(Math.abs(stamped - Date.now())).toBeLessThan(60_000)
    })

    it('lets a bot advance the stage', async () => {
      const doc = await newThesis({ topic: `Bot stage ${stamp}` })

      const updated = await payload.update({
        collection: 'theses',
        id: doc.id as number,
        data: { stage: 2, stageStatus: 'awaiting-review' } as never,
        overrideAccess: false,
        user: bot,
      })

      expect(updated.stage).toBe(2)
      expect(updated.stageStatus).toBe('awaiting-review')
    })
  })
})
