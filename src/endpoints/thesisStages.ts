/**
 * The stage machine, in one place.
 *
 * `stage` on a thesis row means **the stage that runs next**, never the one
 * just finished. Both endpoints and the tests read the transition from here so
 * the two can never disagree about which stages gate.
 */

/** 1 scope, 2 market, 3 counter-case, 4 model, 5 spine, 6 draft, 7 recommend. */
export const LAST_STAGE = 7

/**
 * Stages that stop for review once complete.
 *
 * 1 because the claim decides what the other six spend their budget on, and a
 * wrong claim is the expensive failure. 4 because a model's assumptions are
 * where it goes wrong quietly. 5 because writing 4000 words around a spine that
 * does not hold is the other expensive failure.
 */
export const GATE_STAGES = new Set([1, 4, 5])

export type StageState = {
  stage: number
  stageStatus: 'ready' | 'awaiting-review' | 'done'
  stageEnteredAt: string
}

/** What the row becomes once `completed` has been reported. */
export const nextStageState = (completed: number): StageState => {
  const stageEnteredAt = new Date().toISOString()

  if (completed >= LAST_STAGE) {
    return { stage: LAST_STAGE + 1, stageStatus: 'done', stageEnteredAt }
  }

  return {
    stage: completed + 1,
    stageStatus: GATE_STAGES.has(completed) ? 'awaiting-review' : 'ready',
    stageEnteredAt,
  }
}
