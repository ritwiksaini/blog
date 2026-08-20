import type { Metadata } from 'next'

// Confirmation pages must never be indexed: they are dead ends for search and
// their URLs carry no meaning to anyone who did not arrive from an email.
export const metadata: Metadata = {
  title: 'Newsletter',
  robots: { index: false, follow: false },
}

const COPY = {
  unsubscribed: {
    heading: 'Unsubscribed',
    body: 'That address has been removed. Nothing further will be sent to it.',
  },
  invalid: {
    heading: 'That link did not work',
    body: 'That unsubscribe link is not valid. If you are still getting email you did not ask for, reply to it and it will be dealt with by hand.',
  },
} as const

type State = keyof typeof COPY

export default async function NewsletterStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const { state } = await searchParams
  const copy = COPY[(state ?? 'invalid') as State] ?? COPY.invalid

  return (
    <div className="mx-auto max-w-2xl py-16">
      <h1 className="font-mono-display text-3xl leading-tight">{copy.heading}</h1>
      <p className="mt-4 font-serif-body text-lg leading-relaxed text-ink-muted">{copy.body}</p>
      <p className="mt-8 font-mono-body text-sm">
        <a href="/" className="text-ink underline decoration-accent/40 underline-offset-4 hover:text-accent">
          Back to the posts
        </a>
      </p>
    </div>
  )
}
