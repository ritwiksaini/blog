import Image from 'next/image'
import Link from 'next/link'

import type { Media, Post } from '@/payload-types'

import { geographyOptions, industryOptions } from '../../collections/postTaxonomy'

const labelFor = (options: readonly { label: string; value: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

export function TagRow({ post }: { post: Post }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-ink-muted">
      <span className="rounded-full border border-tag/40 px-2.5 py-1 text-tag">
        {labelFor(geographyOptions, post.geography)}
      </span>
      <span className="rounded-full border border-tag/40 px-2.5 py-1 text-tag">
        {labelFor(industryOptions, post.industry)}
      </span>
      <span className="px-1">{formatDate(post.publishedDate)}</span>
    </div>
  )
}

export function PostCard({ post }: { post: Post }) {
  const featuredImage =
    typeof post.featuredImage === 'object' ? (post.featuredImage as Media | null) : null

  return (
    <Link
      href={`/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-paper-dark bg-paper transition-shadow hover:shadow-md"
    >
      {featuredImage?.url && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-paper-dark">
          <Image
            src={featuredImage.url}
            alt={featuredImage.alt ?? post.title}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <TagRow post={post} />
        <h2 className="font-serif-display text-xl leading-snug group-hover:underline">
          {post.title}
        </h2>
        <p className="line-clamp-3 text-sm text-ink-muted">{post.excerpt}</p>
      </div>
    </Link>
  )
}
