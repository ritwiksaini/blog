import type { Post } from '@/payload-types'

/**
 * Every factual claim in a post traces to one of these. Rendered as a numbered
 * list so inline citations in the body can refer to them by number.
 *
 * `dateAccessed` is still collected and stored for provenance, but deliberately
 * not rendered: it reads as apparatus rather than as something a reader needs.
 */
export function Sources({ sources }: { sources: Post['sources'] }) {
  if (!sources || sources.length === 0) return null

  return (
    <section className="mt-16 border-t border-paper-dark pt-8">
      <h2 className="font-mono-display text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">
        Sources
      </h2>
      <ol className="mt-5 space-y-3">
        {sources.map((source, index) => {
          return (
            <li key={source.id ?? index} className="flex gap-3 font-mono-body text-sm">
              <span className="shrink-0 tabular-nums text-ink-muted/70">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-ink-muted">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline decoration-accent/40 underline-offset-4 hover:text-accent"
                >
                  {source.title}
                </a>
                {source.publisher && <span> · {source.publisher}</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
