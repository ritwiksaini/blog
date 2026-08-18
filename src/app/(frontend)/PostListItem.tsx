import Image from 'next/image'
import Link from 'next/link'

import type { Media, Post } from '@/payload-types'
import { formatListDate, taxonomyLabels } from '@/utilities/postDisplay'

/**
 * Editorial list row: date and taxonomy on a metadata line, then the title,
 * then a one-line excerpt, with an optional thumbnail on the right. Reads like
 * a research archive and stays deliberate-looking at low post counts.
 */
export function PostListItem({ post }: { post: Post }) {
  const featuredImage =
    typeof post.featuredImage === 'object' ? (post.featuredImage as Media | null) : null

  return (
    <Link
      href={`/${post.slug}`}
      className="group flex items-start gap-6 border-b border-paper-dark py-7 transition-colors hover:bg-accent-soft/30"
    >
      <div className="min-w-0 flex-1">
        <p className="font-mono-body text-xs uppercase tracking-[0.16em] text-ink-muted">
          <span className="text-ink-muted/80">{formatListDate(post.publishedDate)}</span>
          {taxonomyLabels(post).map((label) => (
            <span key={label}>
              <span className="mx-2 text-ink-muted/30">·</span>
              <span className="text-accent">{label}</span>
            </span>
          ))}
        </p>

        <h2 className="mt-2.5 font-mono-display text-xl leading-snug transition-colors group-hover:text-accent">
          {post.title}
        </h2>

        <p className="mt-2 line-clamp-2 max-w-2xl font-serif-body text-base leading-relaxed text-ink-muted">
          {post.excerpt}
        </p>
      </div>

      {featuredImage?.url && (
        <div className="relative hidden aspect-[4/3] w-32 shrink-0 overflow-hidden rounded-sm bg-paper-dark sm:block">
          <Image
            src={featuredImage.url}
            alt={featuredImage.alt ?? post.title}
            fill
            sizes="128px"
            className="object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
          />
        </div>
      )}
    </Link>
  )
}
