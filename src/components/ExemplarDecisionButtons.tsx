'use client'

import { Button, useAllFormFields, useDocumentInfo, useForm } from '@payloadcms/ui'
import { useCallback, useState } from 'react'

/**
 * Approve or decline an exemplar candidate in one click.
 *
 * The status select below can do this too, but a select plus a save is three
 * actions for a binary judgement you make a dozen at a time. Declining sets the
 * status and leaves the reason field showing, because a decline without a reason
 * means the same piece comes back next week.
 */
export function ExemplarDecisionButtons() {
  const { id } = useDocumentInfo()
  const { dispatchFields, submit } = useForm()
  const [fields] = useAllFormFields()
  const [busy, setBusy] = useState(false)

  const status = fields?.status?.value as string | undefined
  const declineReason = fields?.declineReason?.value as string | undefined

  const decide = useCallback(
    async (next: 'approved' | 'declined') => {
      setBusy(true)
      dispatchFields({ type: 'UPDATE', path: 'status', value: next })
      // Let the field update land before the form reads it back.
      await new Promise((resolve) => setTimeout(resolve, 0))
      await submit()
      setBusy(false)
    },
    [dispatchFields, submit],
  )

  if (!id) return null

  if (status === 'done') {
    return (
      <div className="field-type">
        <div className="field-label">Decision</div>
        <p style={{ margin: 0, opacity: 0.7 }}>Torn down. It is in the corpus.</p>
      </div>
    )
  }

  if (status === 'unreachable') {
    return (
      <div className="field-type">
        <div className="field-label">Decision</div>
        <p style={{ margin: 0, opacity: 0.7 }}>
          The harvest could not read this one, usually bot protection. Approving again will not
          help unless the source becomes reachable.
        </p>
      </div>
    )
  }

  return (
    <div className="field-type">
      <div className="field-label">Decision</div>

      <p style={{ margin: '0 0 0.5rem', opacity: 0.7 }}>
        {status === 'approved'
          ? 'Approved. The next harvest writes the teardown.'
          : status === 'declined'
            ? 'Declined. Give a reason below so it is not proposed again.'
            : 'Judge it on how it argues, not on what it is about.'}
      </p>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          buttonStyle="primary"
          size="small"
          disabled={busy || status === 'approved'}
          onClick={() => decide('approved')}
        >
          Approve
        </Button>
        <Button
          buttonStyle="secondary"
          size="small"
          disabled={busy || status === 'declined'}
          onClick={() => decide('declined')}
        >
          Decline
        </Button>
      </div>

      {status === 'declined' && !declineReason?.trim() && (
        <p style={{ margin: '0.5rem 0 0', opacity: 0.7 }}>
          Add a reason, or this comes back next week.
        </p>
      )}
    </div>
  )
}
