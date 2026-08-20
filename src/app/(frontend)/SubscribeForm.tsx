'use client'

import { useState } from 'react'

type State = 'idle' | 'submitting' | 'done' | 'error'

export function SubscribeForm({ source }: { source: string }) {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    setState('submitting')

    try {
      const response = await fetch('/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          website: data.get('website'),
          source,
        }),
      })

      if (response.ok) {
        setState('done')
        form.reset()
        return
      }

      const body = await response.json().catch(() => null)
      setMessage(body?.error ?? 'Something went wrong. Try again in a moment.')
      setState('error')
    } catch {
      setMessage('Could not reach the server. Try again in a moment.')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <p className="mt-6 font-mono-body text-sm text-ink">
        You&rsquo;re subscribed. A welcome email is on its way.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-6">
      <h2 className="font-mono-display text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">
        New posts by email
      </h2>

      <div className="mt-3 flex flex-wrap gap-2">
        <label htmlFor="subscribe-email" className="sr-only">
          Email address
        </label>
        <input
          id="subscribe-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          disabled={state === 'submitting'}
          className="min-w-0 flex-1 border border-paper-dark bg-paper px-3 py-2.5 font-mono-body text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="border border-ink bg-ink px-5 py-2.5 font-mono-body text-sm text-paper transition-colors hover:bg-accent hover:border-accent disabled:opacity-60"
        >
          {state === 'submitting' ? 'Adding' : 'Subscribe'}
        </button>

        {/* Honeypot. Hidden from people and from screen readers; bots fill it. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
placeholder=""
        />
      </div>

      <p
        className="mt-2 font-mono-body text-xs text-ink-muted"
        role={state === 'error' ? 'alert' : undefined}
      >
        {state === 'error' ? message : 'Sent when a post is finished. Nothing else.'}
      </p>
    </form>
  )
}
