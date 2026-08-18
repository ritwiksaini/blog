import type { Post } from '@/payload-types'

import { taxonomyLabels } from '@/utilities/postDisplay'

/**
 * Taxonomy rendered as an editorial kicker — uppercase, letter-spaced, middot
 * separated — rather than bordered chips. Sits above the title on a post.
 */
export function Kicker({
  post,
  className = '',
}: {
  post: Pick<Post, 'geography' | 'assetClass' | 'sector'>
  className?: string
}) {
  const labels = taxonomyLabels(post)
  if (labels.length === 0) return null

  return (
    <p
      className={`font-mono-body text-xs uppercase tracking-[0.18em] text-accent ${className}`.trim()}
    >
      {labels.map((label, i) => (
        <span key={label}>
          {i > 0 && <span className="mx-2 text-accent/40">·</span>}
          {label}
        </span>
      ))}
    </p>
  )
}
