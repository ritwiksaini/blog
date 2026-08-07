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
    <div className="flex flex-wrap items-center gap-2 font-mono-body text-xs text-ink-muted">
      <span className="rounded-sm border border-accent/30 px-2 py-0.5 text-accent">
        {labelFor(geographyOptions, post.geography)}
      </span>
      <span className="rounded-sm border border-accent/30 px-2 py-0.5 text-accent">
        {labelFor(industryOptions, post.industry)}
      </span>
      <span className="px-1">{formatDate(post.publishedDate)}</span>
    </div>
  )
}

export function PostCard({ post, index }: { post: Post; index: number }) {
  const featuredImage =
    typeof post.featuredImage === 'object' ? (post.featuredImage as Media | null) : null

  return (
    <Link
      href={`/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-md border border-paper-dark bg-paper transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_4px_0_0_var(--color-accent-soft)]"
    >
      {featuredImage?.url && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-paper-dark">
          <Image
            src={featuredImage.url}
            alt={featuredImage.alt ?? post.title}
            fill
            className="object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <TagRow post={post} />
          <span className="font-mono-body text-xs text-ink-muted/60">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <h2 className="font-mono-display text-lg leading-snug group-hover:text-accent">
          {post.title}
        </h2>
        <p className="line-clamp-3 font-mono-body text-sm text-ink-muted">{post.excerpt}</p>
      </div>
    </Link>
  )
}
