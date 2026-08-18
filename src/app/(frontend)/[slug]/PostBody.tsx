import type { SerializedLexicalNode } from 'lexical'

import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'

/**
 * A blockquote does double duty in these posts: it is either a pull-quote, or a
 * side-note explaining a piece of jargon. The markdown contract has no way to
 * express two kinds of quote, and the drafting agent submits markdown only, so
 * the two are told apart by convention: a side-note opens with a bold lead-in
 * ("**What this means.** ..."), a pull-quote does not.
 *
 * That distinction cannot be made in CSS, which has no way to style an element
 * based on what its descendants are, so it is made here instead.
 */
const BOLD = 1 // `format` is a bitfield; bit 1 is bold.

const startsWithBoldLeadIn = (node: SerializedLexicalNode): boolean => {
  const first = (node as any)?.children?.[0]
  if (!first) return false

  // convertMarkdownToLexical puts text nodes directly under `quote`, but a
  // quote authored in the admin nests them inside a paragraph. Accept both.
  const firstInline = first.type === 'text' ? first : first?.children?.[0]

  return Boolean(firstInline?.text?.trim()) && (firstInline.format & BOLD) === BOLD
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  quote: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: (node as any).children ?? [] })

    if (!startsWithBoldLeadIn(node)) {
      return <blockquote>{children}</blockquote>
    }

    return (
      <aside className="post-aside" role="note">
        {children}
      </aside>
    )
  },
})

export function PostBody({ content }: { content: any }) {
  return (
    <div className="prose prose-article prose-neutral mt-10 max-w-none text-ink">
      <RichText data={content} converters={converters} />
    </div>
  )
}
