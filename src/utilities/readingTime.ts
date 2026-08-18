const WORDS_PER_MINUTE = 225

type LexicalNode = {
  text?: string
  children?: LexicalNode[]
}

const collectText = (node: LexicalNode | undefined, out: string[]): void => {
  if (!node) return
  if (typeof node.text === 'string') out.push(node.text)
  node.children?.forEach((child) => collectText(child, out))
}

/** Walks a Lexical document collecting text nodes, and returns whole minutes. */
export const readingTimeMinutes = (content: unknown): number => {
  const root = (content as { root?: LexicalNode })?.root
  if (!root) return 1

  const parts: string[] = []
  collectText(root, parts)

  const words = parts.join(' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}
