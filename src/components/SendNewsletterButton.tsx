'use client'

import { Button, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

type Phase = 'idle' | 'confirming' | 'sending' | 'done' | 'error'

/**
 * The manual trigger for the post announcement, rendered in the post sidebar.
 *
 * Two-step rather than a confirm dialog: the second press names the number of
 * people who will receive it, which is the fact worth reading before an action
 * that cannot be undone.
 */
export function SendNewsletterButton() {
  const { id, savedDocumentData } = useDocumentInfo()

  // Read from the form rather than the saved doc so the button reacts to an
  // unsaved publish/unpublish in the same session.
  const status = useFormFields(([fields]) => fields?._status?.value)

  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')
  const [count, setCount] = useState<number | null>(null)

  const sentAt = (savedDocumentData as { newsletterSentAt?: string } | undefined)?.newsletterSentAt
  const published = status === 'published'

  useEffect(() => {
    if (!id || sentAt) return

    // limit=0 returns totalDocs without the rows themselves.
    fetch('/api/subscribers?where[status][equals]=confirmed&limit=0&depth=0', {
      credentials: 'include',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setCount(typeof data?.totalDocs === 'number' ? data.totalDocs : null))
      .catch(() => setCount(null))
  }, [id, sentAt])

  // A second press within a few seconds is a decision; a second press a minute
  // later is a misclick on a button whose label has changed under them.
  useEffect(() => {
    if (phase !== 'confirming') return
    const timer = setTimeout(() => setPhase('idle'), 8000)
    return () => clearTimeout(timer)
  }, [phase])

  const send = useCallback(
    async (test: boolean) => {
      setPhase('sending')

      try {
        const response = await fetch(`/api/posts/${id}/newsletter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ test }),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          setMessage(data?.error ?? 'Send failed.')
          setPhase('error')
          return
        }

        setMessage(
          test
            ? 'Test sent to you. Nothing was recorded against this post.'
            : `Sent to ${data?.sent ?? 0} subscribers.${data?.failed ? ` ${data.failed} failed.` : ''}`,
        )
        setPhase('done')
      } catch {
        setMessage('Could not reach the server.')
        setPhase('error')
      }
    },
    [id],
  )

  if (!id) return null

  if (sentAt) {
    return (
      <div className="field-type">
        <div className="field-label">Newsletter</div>
        <p style={{ margin: 0, opacity: 0.7 }}>
          Sent {new Date(sentAt).toLocaleString()}. Each post goes out once.
        </p>
      </div>
    )
  }

  return (
    <div className="field-type">
      <div className="field-label">Newsletter</div>

      {!published && (
        <p style={{ margin: '0 0 0.5rem', opacity: 0.7 }}>
          Publish the post before sending. The email links straight to it.
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Button
          buttonStyle={phase === 'confirming' ? 'primary' : 'secondary'}
          size="small"
          disabled={!published || phase === 'sending'}
          onClick={() => (phase === 'confirming' ? send(false) : setPhase('confirming'))}
        >
          {phase === 'sending'
            ? 'Sending'
            : phase === 'confirming'
              ? `Confirm: email ${count ?? 'all'} subscribers`
              : 'Send to subscribers'}
        </Button>

        <Button
          buttonStyle="none"
          size="small"
          disabled={!published || phase === 'sending'}
          onClick={() => send(true)}
        >
          Send test to me
        </Button>
      </div>

      {(phase === 'done' || phase === 'error') && (
        <p style={{ margin: '0.5rem 0 0', opacity: 0.7 }}>{message}</p>
      )}
    </div>
  )
}
