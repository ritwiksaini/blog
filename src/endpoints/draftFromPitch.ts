import type { Endpoint } from 'payload'

import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { addDataAndFileToRequest, commitTransaction, initTransaction, killTransaction } from 'payload'

const WORD_RANGES: Record<string, { min: number; max: number }> = {
  'sharp-take': { min: 450, max: 1400 },
  thesis: { min: 900, max: 2400 },
}

// The default lexicalEditor() link transformer only matches URLs with no
// parentheses and no whitespace. A URL containing them is silently left as
// literal text rather than becoming a link, which would ship an unlinked
// "source" — so reject it loudly instead.
const URL_UNSAFE_FOR_MARKDOWN = /[()\s]/

// House style: no em dashes, ever. Enforced here rather than left to the
// drafting prompt because prompts drift across model revisions and a validator
// does not. Source titles are deliberately exempt — a real publication headline
// may contain one and rewriting a citation would corrupt it.
const EM_DASH = /—/

// Counted, not banned. En dashes are legitimate in ranges and score lines, but
// a drafter reaching for them repeatedly is usually just routing around the em
// dash ban.
const EN_DASH_LIMIT = 3

const json = (body: unknown, status: number) =>
  Response.json(body as Record<string, unknown>, { status })

/**
 * POST /api/agent/draft-from-pitch
 *
 * The drafting agent submits plain markdown; this converts it to Lexical
 * server-side, creates the post as a draft, and marks the originating pitch as
 * drafted — all in one transaction.
 *
 * Markdown is the contract deliberately: an LLM emitting raw Lexical JSON
 * produces subtly malformed documents that store fine as jsonb and then render
 * blank, with nothing to catch it.
 */
export const draftFromPitch: Endpoint = {
  path: '/agent/draft-from-pitch',
  method: 'post',
  handler: async (req) => {
    await addDataAndFileToRequest(req)

    if (!req.user) return json({ error: 'Unauthorized' }, 401)

    const {
      pitchId,
      title,
      slug,
      excerpt,
      markdown,
      sources,
      geography,
      assetClass,
      sector,
      postFormat = 'sharp-take',
    } = (req.data ?? {}) as Record<string, any>

    // Draft saves skip Payload's own field validation entirely, so everything
    // has to be checked explicitly here or malformed drafts sail through.
    const errors: string[] = []

    if (!pitchId) errors.push('pitchId is required')
    if (!title?.trim()) errors.push('title is required')
    if (!excerpt?.trim()) errors.push('excerpt is required')
    if (!markdown?.trim()) errors.push('markdown is required')
    if (!geography) errors.push('geography is required')
    if (!assetClass) errors.push('assetClass is required')
    if (!sector) errors.push('sector is required')

    if (!Array.isArray(sources) || sources.length === 0) {
      errors.push('sources must be a non-empty array')
    } else {
      sources.forEach((source: any, i: number) => {
        if (!source?.title?.trim()) errors.push(`sources[${i}].title is required`)
        if (!source?.url) {
          errors.push(`sources[${i}].url is required`)
          return
        }
        try {
          new URL(source.url)
        } catch {
          errors.push(`sources[${i}].url is not a valid absolute URL`)
        }
      })
    }

    const words = String(markdown ?? '')
      .split(/\s+/)
      .filter(Boolean).length
    const range = WORD_RANGES[postFormat] ?? WORD_RANGES['sharp-take']
    if (words < range.min || words > range.max) {
      errors.push(`word count ${words} outside ${postFormat} range ${range.min}-${range.max}`)
    }

    for (const [field, value] of [
      ['title', title],
      ['excerpt', excerpt],
      ['markdown', markdown],
    ] as const) {
      if (EM_DASH.test(String(value ?? ''))) {
        const count = (String(value ?? '').match(/—/g) ?? []).length
        errors.push(
          `${field} contains ${count} em dash(es). House style forbids them: rewrite as a comma, a full stop, or a colon.`,
        )
      }
    }

    const enDashes = (String(markdown ?? '').match(/–/g) ?? []).length
    if (enDashes > EN_DASH_LIMIT) {
      errors.push(
        `markdown contains ${enDashes} en dashes (limit ${EN_DASH_LIMIT}). Keep them for numeric ranges only.`,
      )
    }

    if (/^```/m.test(markdown ?? '')) {
      errors.push('fenced code blocks are not supported by the editor and would be lost')
    }
    if (/^\s*\|.*\|/m.test(markdown ?? '')) {
      errors.push('markdown tables are not supported by the editor and would be lost')
    }

    // Inline markdown links whose URL the transformer cannot parse.
    for (const [, url] of String(markdown ?? '').matchAll(/\[[^\]]+\]\(([^)]*)\)/g)) {
      if (URL_UNSAFE_FOR_MARKDOWN.test(url)) {
        errors.push(`inline link URL contains parentheses or whitespace and will not convert: ${url}`)
      }
    }

    if (errors.length) return json({ errors }, 422)

    let content
    try {
      const editorConfig = await editorConfigFactory.default({ config: req.payload.config })
      content = convertMarkdownToLexical({ editorConfig, markdown })
    } catch (err) {
      return json({ errors: [`markdown conversion failed: ${(err as Error).message}`] }, 422)
    }

    if (!content?.root?.children?.length) {
      return json({ errors: ['markdown produced an empty document'] }, 422)
    }

    await initTransaction(req)

    try {
      const pitch = await req.payload.findByID({ collection: 'pitches', id: pitchId, req })

      // Idempotency: re-running the drafter must never produce a second post.
      if (pitch.status !== 'selected' || pitch.linkedPost) {
        await killTransaction(req)
        return json(
          { error: 'Pitch is not selected, or has already been drafted', status: pitch.status },
          409,
        )
      }

      const post = await req.payload.create({
        collection: 'posts',
        draft: true,
        overrideAccess: false,
        user: req.user,
        req,
        data: {
          title,
          ...(slug ? { slug } : {}),
          excerpt,
          content,
          sources,
          geography,
          assetClass,
          sector,
          publishedDate: new Date().toISOString(),
          _status: 'draft',
        },
      })

      await req.payload.update({
        collection: 'pitches',
        id: pitchId,
        overrideAccess: false,
        user: req.user,
        req,
        data: {
          status: 'drafted',
          linkedPost: post.id,
          draftedAt: new Date().toISOString(),
        },
      })

      await commitTransaction(req)

      return json({ postId: post.id, slug: post.slug, words }, 201)
    } catch (err) {
      await killTransaction(req)
      return json({ error: (err as Error).message }, 500)
    }
  },
}
