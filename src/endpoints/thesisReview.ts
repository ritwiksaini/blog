import type { Endpoint } from 'payload'

import { addDataAndFileToRequest } from 'payload'

import { isBot } from '../access/roles'

const json = (body: unknown, status: number) =>
  Response.json(body as Record<string, unknown>, { status })

/**
 * POST /api/thesis-review
 *
 * The gate decision, made from the admin. Approve lets the next stage run;
 * block stops the clock until you come back.
 *
 * Deliberately **not** an agent endpoint: `isBot` is refused outright. A bot
 * clearing its own gate would make the gates decorative, and that failure would
 * be invisible because the run history would look exactly the same.
 *
 * The note is the whole reason this is an endpoint rather than a status
 * dropdown. It is recorded against the stage it was written about, and the
 * routine is required to read it before running the next one, so a steer given
 * here actually changes what happens next.
 */
export const thesisReview: Endpoint = {
  path: '/thesis-review',
  method: 'post',
  handler: async (req) => {
    await addDataAndFileToRequest(req)

    if (!req.user) return json({ error: 'Unauthorized' }, 401)
    if (isBot(req.user)) return json({ error: 'A gate is cleared by a person, not a routine.' }, 403)

    const { thesisId, decision, note } = (req.data ?? {}) as Record<string, any>

    if (!thesisId) return json({ errors: ['thesisId is required'] }, 422)
    if (decision !== 'approve' && decision !== 'block') {
      return json({ errors: ['decision must be "approve" or "block"'] }, 422)
    }

    const thesis = await req.payload.findByID({ collection: 'theses', id: thesisId, req })

    if (thesis.status !== 'active') {
      return json({ error: 'Thesis is not active', status: thesis.status }, 409)
    }

    // The stage under review is the one already finished, which is the stage
    // before the one queued to run.
    const reviewedStage = Math.max(1, (thesis.stage ?? 1) - 1)

    const updated = await req.payload.update({
      collection: 'theses',
      id: thesisId,
      req,
      data: {
        stageStatus: decision === 'approve' ? 'ready' : 'blocked',
        reviews: [
          ...(thesis.reviews ?? []),
          {
            stage: reviewedStage,
            decision: decision === 'approve' ? 'approved' : 'blocked',
            note: note?.trim() ? note.trim() : null,
            decidedAt: new Date().toISOString(),
          },
        ],
      } as never,
    })

    return json(
      { stage: updated.stage, stageStatus: updated.stageStatus, reviewedStage },
      200,
    )
  },
}
