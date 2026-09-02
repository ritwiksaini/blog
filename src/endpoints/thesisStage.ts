import type { Endpoint } from 'payload'

import { addDataAndFileToRequest } from 'payload'

import { GATE_STAGES, LAST_STAGE, nextStageState } from './thesisStages'

const json = (body: unknown, status: number) =>
  Response.json(body as Record<string, unknown>, { status })

/**
 * POST /api/agent/thesis-stage
 *
 * The routine reports "I finished stage N, here is what it produced". The
 * server decides everything that follows: which stage is next, whether this one
 * gates, and when the clock started.
 *
 * That split is the point. The first live run left `stage` at 1 after finishing
 * stage 1, because the prompt never said whether the field meant *just
 * completed* or *next to run*, and approving it would have re-run stage 1. The
 * fix is not a clearer prompt. An agent that cannot get stage arithmetic wrong
 * is better than one told carefully how to get it right.
 *
 * The artifact content is mirrored onto the row so a gate can be reviewed in the
 * admin. `blog-research` stays the source of truth and the audit trail.
 */
export const thesisStage: Endpoint = {
  path: '/agent/thesis-stage',
  method: 'post',
  handler: async (req) => {
    await addDataAndFileToRequest(req)

    if (!req.user) return json({ error: 'Unauthorized' }, 401)

    const { thesisId, stage, path, content, summary } = (req.data ?? {}) as Record<string, any>

    const errors: string[] = []
    if (!thesisId) errors.push('thesisId is required')
    if (!Number.isInteger(stage) || stage < 1 || stage > LAST_STAGE) {
      errors.push(`stage must be an integer 1-${LAST_STAGE}`)
    }
    if (!path?.trim()) errors.push('path is required')
    if (!content?.trim()) errors.push('content is required, so the stage can be reviewed in the admin')
    if (errors.length) return json({ errors }, 422)

    const thesis = await req.payload.findByID({ collection: 'theses', id: thesisId, req })

    if (thesis.status !== 'active') {
      return json({ error: 'Thesis is not active', status: thesis.status }, 409)
    }

    // The routine may only report the stage the row is actually waiting on.
    // Without this a confused run could skip a gate by reporting stage 5 when
    // the row is at 2, which is precisely what the gates exist to prevent.
    if (thesis.stage !== stage) {
      return json(
        {
          error: `This thesis is waiting on stage ${thesis.stage}, not ${stage}. Run that one.`,
          expected: thesis.stage,
        },
        409,
      )
    }

    if (thesis.stageStatus === 'blocked') {
      return json({ error: 'Thesis is blocked. A human has to clear it.' }, 409)
    }

    const next = nextStageState(stage)

    const updated = await req.payload.update({
      collection: 'theses',
      id: thesisId,
      overrideAccess: false,
      user: req.user,
      req,
      data: {
        artifacts: [
          ...(thesis.artifacts ?? []),
          { stage, path, summary: summary ?? null, content },
        ],
        ...next,
      } as never,
    })

    return json(
      {
        stage: updated.stage,
        stageStatus: updated.stageStatus,
        gated: GATE_STAGES.has(stage),
      },
      200,
    )
  },
}
