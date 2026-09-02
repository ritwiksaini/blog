import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload } from 'payload'

import { editorFeatures } from '../lexicalFeatures'

/**
 * Everything two drafting endpoints must agree on.
 *
 * `draft-from-pitch` and `draft-thesis` differ only in what they read and what
 * they link. The house style rules, the markdown restrictions and the Lexical
 * conversion are identical, and each of those is one rule that must have one
 * home: a copy would drift the first time a rule changed, and the drift would
 * show up as a published post rather than as a failing test.
 */

// The default lexicalEditor() link transformer only matches URLs with no
// parentheses and no whitespace. A URL containing them is silently left as
// literal text rather than becoming a link, which would ship an unlinked
// "source" so reject it loudly instead.
const URL_UNSAFE_FOR_MARKDOWN = /[()\s]/

// House style: no em dashes, ever. Enforced here rather than left to the
// drafting prompt because prompts drift across model revisions and a validator
// does not. Source titles are deliberately exempt: a real publication headline
// may contain one and rewriting a citation would corrupt it.
const EM_DASH = /—/

// Counted, not banned. En dashes are legitimate in ranges and score lines, but
// a drafter reaching for them repeatedly is usually just routing around the em
// dash ban.
const EN_DASH_LIMIT = 3

export const WORD_RANGES: Record<string, { min: number; max: number }> = {
  'sharp-take': { min: 450, max: 1400 },
  thesis: { min: 900, max: 2400 },
  // Wide, because a modelled sector argument cannot be written to 1800 words.
  // `STYLE.md` targets 3500-5000; this is the fence, not the goal.
  'long-thesis': { min: 3000, max: 6000 },
}

/**
 * Formats permitted to use markdown tables.
 *
 * Tables were banned outright until the long thesis needed them, because the
 * editor silently dropped them. They now convert, but only this format has a
 * reason to carry one: a table in a 700-word sharp take is a sign the piece
 * should have been a different format.
 */
const TABLES_ALLOWED = new Set(['long-thesis'])

export type DraftInput = {
  title?: string
  excerpt?: string
  markdown?: string
  sources?: unknown
  geography?: string
  assetClass?: string
  sector?: unknown
  postFormat?: string
}

export const validateDraft = (input: DraftInput): { errors: string[]; words: number } => {
  const { title, excerpt, markdown, sources, geography, assetClass, sector } = input
  const postFormat = input.postFormat ?? 'sharp-take'
  const errors: string[] = []

  // Draft saves skip Payload's own field validation entirely, so everything has
  // to be checked explicitly here or malformed drafts sail through.
  if (!title?.trim()) errors.push('title is required')
  if (!excerpt?.trim()) errors.push('excerpt is required')
  if (!markdown?.trim()) errors.push('markdown is required')
  if (!geography) errors.push('geography is required')
  if (!assetClass) errors.push('assetClass is required')
  if (!sector) errors.push('sector is required')

  if (!Array.isArray(sources) || sources.length === 0) {
    errors.push('sources must be a non-empty array')
  } else {
    sources.forEach((source: any, i: number) => {
      if (!source?.title?.trim()) errors.push(`sources[${i}].title is required`)
      if (!source?.url) {
        errors.push(`sources[${i}].url is required`)
        return
      }
      try {
        new URL(source.url)
      } catch {
        errors.push(`sources[${i}].url is not a valid absolute URL`)
      }
    })
  }

  const body = String(markdown ?? '')
  const words = body.split(/\s+/).filter(Boolean).length

  const range = WORD_RANGES[postFormat] ?? WORD_RANGES['sharp-take']
  if (words < range.min || words > range.max) {
    errors.push(`word count ${words} outside ${postFormat} range ${range.min}-${range.max}`)
  }

  for (const [field, value] of [
    ['title', title],
    ['excerpt', excerpt],
    ['markdown', markdown],
  ] as const) {
    if (EM_DASH.test(String(value ?? ''))) {
      const count = (String(value ?? '').match(/—/g) ?? []).length
      errors.push(
        `${field} contains ${count} em dash(es). House style forbids them: rewrite as a comma, a full stop, or a colon.`,
      )
    }
  }

  const enDashes = (body.match(/–/g) ?? []).length
  if (enDashes > EN_DASH_LIMIT) {
    errors.push(
      `markdown contains ${enDashes} en dashes (limit ${EN_DASH_LIMIT}). Keep them for numeric ranges only.`,
    )
  }

  if (/^```/m.test(body)) {
    errors.push('fenced code blocks are not supported by the editor and would be lost')
  }

  if (/^\s*\|.*\|/m.test(body) && !TABLES_ALLOWED.has(postFormat)) {
    errors.push(
      `markdown tables are only supported for ${[...TABLES_ALLOWED].join(', ')}, not ${postFormat}`,
    )
  }

  // Inline markdown links whose URL the transformer cannot parse.
  for (const [, url] of body.matchAll(/\[[^\]]+\]\(([^)]*)\)/g)) {
    if (URL_UNSAFE_FOR_MARKDOWN.test(url)) {
      errors.push(`inline link URL contains parentheses or whitespace and will not convert: ${url}`)
    }
  }

  return { errors, words }
}

/**
 * Markdown to Lexical, using the editor the collection actually renders with.
 *
 * Built from `editorFeatures`, the same list `payload.config.ts` gives the
 * field. It must be built this way: `editorConfigFactory.default()` reads the
 * library's own defaults and silently ignores the configured root editor, so a
 * feature enabled in the config alone never reaches this function. Tables
 * converted to literal pipe characters until this was changed.
 */
export const markdownToLexical = async (
  payload: Payload,
  markdown: string,
): Promise<{ content?: unknown; error?: string }> => {
  let content
  try {
    const editorConfig = await editorConfigFactory.fromFeatures({
      config: payload.config,
      features: editorFeatures,
    })
    content = convertMarkdownToLexical({ editorConfig, markdown })
  } catch (err) {
    return { error: `markdown conversion failed: ${(err as Error).message}` }
  }

  if (!(content as any)?.root?.children?.length) {
    return { error: 'markdown produced an empty document' }
  }

  return { content }
}
