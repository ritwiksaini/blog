import { getPayload } from 'payload'

import config from '@/payload.config'

import { PostCard } from './PostCard'

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

  return (
    <div>
      <h1 className="mb-10 font-serif-display text-4xl">Writing</h1>
      {posts.length === 0 ? (
        <p className="text-ink-muted">No posts published yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
