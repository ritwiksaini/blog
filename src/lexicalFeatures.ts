import { EXPERIMENTAL_TableFeature } from '@payloadcms/richtext-lexical'
import type { FeatureProviderServer } from '@payloadcms/richtext-lexical'

/**
 * The one definition of which Lexical features this blog has.
 *
 * It exists as a shared variable rather than being written inline in
 * `payload.config.ts` because the drafting endpoints must convert markdown with
 * *the same* feature set the field renders with, and there is no automatic way
 * to get it. `editorConfigFactory.default()` looks like that automatic way and
 * is not: it builds from the library's `defaultEditorFeatures` and ignores the
 * root editor entirely.
 *
 * That is not a hypothetical. Enabling the table feature in `payload.config.ts`
 * and leaving the endpoints on `.default()` converted a markdown table into
 * paragraphs of literal pipe characters, stored it as valid jsonb, and returned
 * 201. The only thing that caught it was an assertion on the converted node
 * tree, which is why `tests/int/draftThesis.int.spec.ts` makes one.
 *
 * So: `payload.config.ts` passes this to `lexicalEditor`, and
 * `validateDraft.ts` passes the same thing to
 * `editorConfigFactory.fromFeatures`. Adding a feature in one place only is the
 * failure mode this is shaped to prevent.
 */
export const editorFeatures: FeatureProviderServer<unknown, unknown, unknown>[] | any = ({
  defaultFeatures,
}: {
  defaultFeatures: any[]
}) => [
  ...defaultFeatures,
  // What lets a long-form thesis carry a model. Which formats may actually
  // submit a table is a separate question, enforced in `validateDraft.ts`.
  EXPERIMENTAL_TableFeature(),
]
