import { getPayload } from 'payload'

import config from '@/payload.config'

import { DataMesh } from './DataMesh'
import { PostListItem } from './PostListItem'
import { SubscribeForm } from './SubscribeForm'

export const revalidate = 60

export default async function HomePage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const { docs: posts } = await payload.find({
    collection: 'posts',
    sort: '-publishedDate',
    limit: 100,
    // Local API bypasses access control by default; enforce it explicitly so
    // an unauthenticated render never leaks a draft post onto the public grid.
    overrideAccess: false,
  })

  const sectors = new Set(
    posts
      .map((post) => (typeof post.sector === 'object' && post.sector ? post.sector.id : post.sector))
      .filter(Boolean),
  ).size
  const regions = new Set(posts.map((post) => post.geography)).size

  const stats: { label: string; value: number }[] = [
    { label: 'posts', value: posts.length },
    { label: 'sectors', value: sectors },
    { label: 'regions', value: regions },
  ]

  return (
    <div>
      <section className="mb-14 grid gap-10 border-b border-paper-dark pb-12 sm:grid-cols-[1.5fr_1fr] sm:items-end">
        <div>
          <p className="mb-3 font-mono-body text-xs uppercase tracking-[0.2em] text-accent">
            Research notes
          </p>
          <h1 className="font-mono-display text-3xl leading-snug sm:text-4xl">
            Writing on private equity, venture capital, and industry deep-dives.
          </h1>
          <p className="mt-4 max-w-md font-mono-body text-sm text-ink-muted">
            Long-form theses and market notes, published as they&apos;re finished.
          </p>

          <div className="max-w-md">
            <SubscribeForm source="home" />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <DataMesh className="h-16 w-full text-accent" />
          {posts.length > 0 && (
            <dl className="grid grid-cols-3 gap-4 font-mono-body text-xs text-ink-muted">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="font-mono-display text-2xl font-bold text-ink">{stat.value}</dt>
                  <dd className="uppercase tracking-wide">{stat.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {posts.length === 0 ? (
        <div className="border border-dashed border-paper-dark px-8 py-16 text-center">
          <p className="font-mono-display text-sm uppercase tracking-[0.2em] text-ink-muted">
            First note in progress
          </p>
          <p className="mx-auto mt-3 max-w-sm font-serif-body text-base leading-relaxed text-ink-muted">
            New writing lands on the 1st and 15th of each month.
          </p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostListItem key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
