'use client'

import { Button, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

type Phase = 'checking' | 'idle' | 'queueing' | 'error'

/**
 * Queues a LinkedIn draft for this post, rendered in the post sidebar.
 *
 * It does not write any copy. The blog app holds no LLM credentials, so this
 * only creates the `syndication` row; the cloud routine polls for `queued` rows
 * and fills them in. That is the same split as the pitch/drafter loop, and it
 * keeps model access out of the web app entirely.
 */
export function QueueLinkedInButton() {
  const { id } = useDocumentInfo()

  // Read from the form so the button responds to a publish in this session
  // rather than to whatever was true at page load.
  const status = useFormFields(([fields]) => fields?._status?.value)
  const published = status === 'published'

  const [phase, setPhase] = useState<Phase>('checking')
  const [message, setMessage] = useState('')
  const [existingId, setExistingId] = useState<string | number | null>(null)
  const [existingStatus, setExistingStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    fetch(
      `/api/syndication?where[post][equals]=${id}&where[platform][equals]=linkedin&limit=1&depth=0`,
      { credentials: 'include' },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const row = data?.docs?.[0]
        if (row) {
          setExistingId(row.id)
          setExistingStatus(row.status ?? null)
        }
        setPhase('idle')
      })
      .catch(() => setPhase('idle'))
  }, [id])

  const queue = useCallback(async () => {
    setPhase('queueing')

    try {
      const response = await fetch('/api/syndication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ post: id, platform: 'linkedin', status: 'queued' }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setMessage(data?.errors?.[0]?.message ?? 'Could not queue the draft.')
        setPhase('error')
        return
      }

      setExistingId(data?.doc?.id ?? null)
      setExistingStatus('queued')
      setPhase('idle')
    } catch {
      setMessage('Could not reach the server.')
      setPhase('error')
    }
  }, [id])

  if (!id) return null

  return (
    <div className="field-type">
      <div className="field-label">LinkedIn</div>

      {existingId ? (
        <p style={{ margin: 0, opacity: 0.7 }}>
          {existingStatus === 'queued'
            ? 'Queued. The syndication routine writes the copy on its next run.'
            : `Draft ${existingStatus}.`}{' '}
          <a href={`/admin/collections/syndication/${existingId}`}>Open it</a>
        </p>
      ) : (
        <>
          {!published && (
            <p style={{ margin: '0 0 0.5rem', opacity: 0.7 }}>
              Publish first. The first comment links to the live post, so there has to be one.
            </p>
          )}

          <Button
            buttonStyle="secondary"
            size="small"
            disabled={!published || phase !== 'idle'}
            onClick={queue}
          >
            {phase === 'queueing' ? 'Queueing' : 'Queue LinkedIn draft'}
          </Button>
        </>
      )}

      {phase === 'error' && <p style={{ margin: '0.5rem 0 0', opacity: 0.7 }}>{message}</p>}
    </div>
  )
}
