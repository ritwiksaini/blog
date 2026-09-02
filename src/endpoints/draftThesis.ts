import type { Endpoint } from 'payload'

import { addDataAndFileToRequest, commitTransaction, initTransaction, killTransaction } from 'payload'

import { markdownToLexical, validateDraft } from './validateDraft'

const json = (body: unknown, status: number) =>
  Response.json(body as Record<string, unknown>, { status })

/**
 * POST /api/agent/draft-thesis
 *
 * Stage 6 of the thesis routine. Structurally identical to
 * `draft-from-pitch`: markdown in, a draft post out, the originating row marked
 * so a re-run cannot duplicate it. The rules it enforces live in
 * `validateDraft.ts` and are shared with that endpoint.
 *
 * The format is forced to `long-thesis` rather than taken from the request.
 * That is what admits markdown tables, and letting a caller pick it would make
 * the table ban on the other formats bypassable by sending one field.
 */
export const draftThesis: Endpoint = {
  path: '/agent/draft-thesis',
  method: 'post',
  handler: async (req) => {
    await addDataAndFileToRequest(req)

    if (!req.user) return json({ error: 'Unauthorized' }, 401)

    const { thesisId, title, slug, excerpt, markdown, sources, geography, assetClass, sector } =
      (req.data ?? {}) as Record<string, any>

    const { errors, words } = validateDraft({
      title,
      excerpt,
      markdown,
      sources,
      geography,
      assetClass,
      sector,
      postFormat: 'long-thesis',
    })

    if (!thesisId) errors.unshift('thesisId is required')

    if (errors.length) return json({ errors }, 422)

    const { content, error } = await markdownToLexical(req.payload, markdown)
    if (error) return json({ errors: [error] }, 422)

    await initTransaction(req)

    try {
      const thesis = await req.payload.findByID({ collection: 'theses', id: thesisId, req })

      // Idempotency, the same guarantee the drafter has: re-running stage 6 is
      // always safe and never produces a second post. Treat a 409 as a stop.
      if (thesis.status !== 'active' || thesis.linkedPost) {
        await killTransaction(req)
        return json(
          { error: 'Thesis is not active, or has already been drafted', status: thesis.status },
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
        } as never,
      })

      await req.payload.update({
        collection: 'theses',
        id: thesisId,
        overrideAccess: false,
        user: req.user,
        req,
        data: {
          linkedPost: post.id,
          stage: 7,
          stageStatus: 'ready',
          stageEnteredAt: new Date().toISOString(),
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
