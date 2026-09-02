'use client'

import { Button, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useCallback, useState } from 'react'

type Phase = 'idle' | 'sending' | 'error'

/**
 * The review gate, rendered in the thesis sidebar.
 *
 * This exists so a decision and the thing being decided on are in the same
 * place. The artifact is on the page above; approving used to mean editing a
 * status dropdown, and steering meant nothing at all, because there was nowhere
 * to say what you wanted changed.
 */
export function ThesisReviewButtons() {
  const { id } = useDocumentInfo()

  // Read from the form, so the buttons reflect an approval made in this session
  // rather than whatever was true at page load.
  const stage = useFormFields(([fields]) => fields?.stage?.value) as number | undefined
  const stageStatus = useFormFields(([fields]) => fields?.stageStatus?.value) as string | undefined
  const status = useFormFields(([fields]) => fields?.status?.value) as string | undefined

  const [note, setNote] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')

  const decide = useCallback(
    async (decision: 'approve' | 'block') => {
      setPhase('sending')
      setMessage('')

      try {
        const response = await fetch('/api/thesis-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ thesisId: id, decision, note }),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          setMessage(data?.error ?? data?.errors?.[0] ?? 'Could not record the decision.')
          setPhase('error')
          return
        }

        // The row's stageStatus changed server-side; reload so the sidebar and
        // the reviews list both show it rather than going quietly stale.
        window.location.reload()
      } catch {
        setMessage('Could not reach the server.')
        setPhase('error')
      }
    },
    [id, note],
  )

  if (!id) return null

  if (status !== 'active') {
    return (
      <div className="field-type">
        <div className="field-label">Review</div>
        <p style={{ margin: 0, opacity: 0.7 }}>
          Set Status to Active to start this thesis. Nothing runs until you do.
        </p>
      </div>
    )
  }

  const reviewedStage = Math.max(1, (stage ?? 1) - 1)

  if (stageStatus !== 'awaiting-review' && stageStatus !== 'blocked') {
    return (
      <div className="field-type">
        <div className="field-label">Review</div>
        <p style={{ margin: 0, opacity: 0.7 }}>
          {stageStatus === 'done'
            ? 'Finished. Every stage is complete.'
            : `Nothing to review. Stage ${stage} runs on the next pass.`}
        </p>
      </div>
    )
  }

  return (
    <div className="field-type">
      <div className="field-label">Review stage {reviewedStage}</div>

      <p style={{ margin: '0 0 0.5rem', opacity: 0.7 }}>
        {stageStatus === 'blocked'
          ? 'Blocked. Nothing runs until you approve.'
          : 'Read the artifact above. Approving lets stage ' +
            stage +
            ' run; ignoring this approves it after 48 hours.'}
      </p>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={4}
        placeholder="What you want changed. The routine reads this before the next stage."
        style={{ width: '100%', marginBottom: '0.5rem' }}
      />

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          buttonStyle="primary"
          size="small"
          disabled={phase === 'sending'}
          onClick={() => decide('approve')}
        >
          {phase === 'sending' ? 'Saving' : 'Approve'}
        </Button>

        {stageStatus !== 'blocked' && (
          <Button
            buttonStyle="secondary"
            size="small"
            disabled={phase === 'sending'}
            onClick={() => decide('block')}
          >
            Block
          </Button>
        )}
      </div>

      {phase === 'error' && <p style={{ margin: '0.5rem 0 0', opacity: 0.7 }}>{message}</p>}
    </div>
  )
}
