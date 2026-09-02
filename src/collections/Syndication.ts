import type { CollectionConfig } from 'payload'

import { isBot } from '../access/roles'

/**
 * The three fields a bot may never write, on any operation.
 *
 * They record what a human observed after posting by hand. A bot filling them
 * in would poison the only feedback signal this system has, and the damage is
 * silent: a fabricated impression count looks exactly like a real one.
 */
const humanOnly = (data: Record<string, unknown> | undefined): boolean =>
  data?.metrics === undefined && data?.postedAt === undefined && data?.postUrl === undefined

// Same rule the drafting endpoint enforces on post bodies. House style does not
// stop at the blog's edge: a LinkedIn post carrying an em dash reads as machine
// output in exactly the same way.
const EM_DASH = /—/

// LinkedIn's hard ceiling. Past this the composer silently truncates.
const BODY_MAX = 3000

// The "see more" fold: roughly 210-220 characters on desktop, 140-150 on
// mobile. Everything above it is the entire acquisition decision, and most
// readers are on mobile, so the first line is written to the tighter number and
// only *validated* against the looser one.
const FOLD_DESKTOP = 220
const FOLD_MOBILE = 140

/**
 * LinkedIn drafts to paste by hand, of two kinds.
 *
 * The blog app has no LLM credentials, so nothing here is generated in-process.
 *
 * A **post syndication** starts from a published post: the "Queue LinkedIn
 * draft" button creates a row with status `queued`, and the syndication routine
 * writes `body` and `linkComment` and flips the status to `drafted`. One per
 * post per platform.
 *
 * A **research original** starts from the research corpus instead, and is
 * created by the weekly routine itself rather than by a button. The sweep
 * produces far more sourced material than the blog can publish, and an item
 * that never became a post is not thereby worthless. It carries no post and no
 * link.
 *
 * Both kinds live here rather than in two collections **because of `metrics`**.
 * Those numbers are hand-entered and are the only feedback signal this system
 * has, so splitting them across two tables would make the one comparison worth
 * making, research originals against post syndications, impossible.
 *
 * Nothing in this collection posts anything. It produces text to paste and a
 * place to record what happened afterwards.
 */
export const Syndication: CollectionConfig = {
  slug: 'syndication',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'kind', 'status', 'postedAt'],
    description:
      'Platform-native drafts to paste by hand, and the performance numbers you enter afterwards.',
    group: 'Distribution',
  },
  access: {
    // Working drafts, never public. Same posture as Pitches.
    read: ({ req }) => Boolean(req.user),
    // The weekly research routine creates its own rows, so `create` needs the
    // same guard as `update`. Post syndications are still created by a button.
    create: ({ req, data }) => {
      if (!req.user) return false
      if (!isBot(req.user)) return true
      if (!humanOnly(data)) return false
      return data?.status === undefined || data?.status === 'drafted'
    },
    update: ({ req, data }) => {
      if (!req.user) return false
      if (!isBot(req.user)) return true

      // The routine writes the copy and marks it drafted. It must never record
      // that something was posted, and must never touch the numbers.
      if (!humanOnly(data)) return false
      return data?.status === undefined || data?.status === 'drafted'
    },
    delete: ({ req }) => Boolean(req.user) && !isBot(req.user),
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        const postId =
          typeof data?.post === 'object' && data?.post !== null ? data.post.id : data?.post
        const platform = data?.platform ?? originalDoc?.platform ?? 'linkedin'
        const kind = data?.kind ?? originalDoc?.kind ?? 'post-syndication'
        const topic = data?.topic ?? originalDoc?.topic

        // `post` cannot be a required field once research originals exist, so
        // the requirement moves here and becomes conditional. Both directions
        // are checked: a research original carrying a post would silently take
        // the post-syndication branch everywhere below.
        if (kind === 'post-syndication' && !postId) {
          throw new Error(
            'A post syndication needs a post. Choose one, or set Kind to "Research original".',
          )
        }

        if (kind === 'research-original' && postId) {
          throw new Error(
            'A research original has no post behind it. Clear the post, or set Kind to "Post syndication".',
          )
        }

        if (kind === 'research-original' && !String(topic ?? '').trim()) {
          throw new Error('A research original needs a topic. It is what the list view is named by.')
        }

        // One draft per post per platform. Without this the button becomes a
        // duplicate factory on every press, and the routine would then draft
        // the same post repeatedly. Research originals are exempt: there is no
        // post to be duplicated against, and two in one week is legitimate.

        if (operation === 'create' && postId) {
          const existing = await req.payload.find({
            collection: 'syndication',
            where: {
              and: [{ post: { equals: postId } }, { platform: { equals: platform } }],
            },
            limit: 1,
            depth: 0,
          })

          if (existing.totalDocs > 0) {
            throw new Error(
              `This post already has a ${platform} draft. Open it rather than creating a second one.`,
            )
          }
        }

        // Denormalised so the list view reads as titles rather than row ids.
        // Refreshed whenever the source changes, since a post retitled after
        // queueing would otherwise leave a stale label behind.
        if (kind === 'research-original') {
          if (data?.topic !== undefined || operation === 'create') data.label = topic
        } else if (postId && (operation === 'create' || data?.post !== undefined)) {
          const post = await req.payload.findByID({
            collection: 'posts',
            id: postId,
            depth: 0,
            draft: true,
          })

          if (post?.title) data.label = post.title
        }

        return data
      },
    ],
  },
  fields: [
    {
      // Populated from the related post so the list view is readable. A
      // relationship alone renders as an id in most columns.
      name: 'label',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Set from the post title when the draft is created.',
      },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'post-syndication',
      index: true,
      options: [
        { label: 'Post syndication', value: 'post-syndication' },
        { label: 'Research original', value: 'research-original' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'A post syndication argues one thread of a published post. A research original argues a corpus item that never became one, and carries no link.',
      },
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      // Conditionally required, which a field-level flag cannot express, so the
      // requirement lives in `beforeChange` instead. See the hook.
      index: true,
      admin: {
        position: 'sidebar',
        condition: (data) => data?.kind !== 'research-original',
      },
    },
    {
      name: 'topic',
      type: 'text',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.kind === 'research-original',
        description: 'What this one is about. Names the row in the list view.',
      },
    },
    {
      name: 'sourceAnchors',
      type: 'array',
      labels: { singular: 'Corpus anchor', plural: 'Corpus anchors' },
      admin: {
        description:
          'Paths into blog-research backing a research original, in the same form a pitch uses. Provenance: without them there is no way to check the claims months later.',
        condition: (data) => data?.kind === 'research-original',
        initCollapsed: true,
      },
      fields: [{ name: 'path', type: 'text', required: true }],
    },
    {
      name: 'platform',
      type: 'select',
      required: true,
      defaultValue: 'linkedin',
      index: true,
      // A closed set of one, deliberately. Substack was considered and dropped:
      // it would outrank the blog for the blog's own content. The field exists
      // so adding a platform later is a migration rather than a refactor.
      options: [{ label: 'LinkedIn', value: 'linkedin' }],
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      index: true,
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Drafted', value: 'drafted' },
        { label: 'Posted', value: 'posted' },
        { label: 'Skipped', value: 'skipped' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Queued means the routine has not written it yet.',
      },
    },
    {
      name: 'body',
      type: 'textarea',
      admin: {
        rows: 16,
        description:
          'The post exactly as it will be pasted. First line is the hook and must survive the mobile fold at ~140 characters. No link in here: it goes in the first comment.',
      },
      validate: (value: string | null | undefined) => {
        if (!value) return true

        if (EM_DASH.test(value)) return 'House style: no em dashes.'

        if (value.length > BODY_MAX) {
          return `LinkedIn truncates past ${BODY_MAX} characters. This is ${value.length}.`
        }

        const firstLine = value.split('\n')[0]?.trim() ?? ''
        if (firstLine.length > FOLD_DESKTOP) {
          return `The first line is ${firstLine.length} characters and the "see more" fold cuts it at about ${FOLD_DESKTOP} on desktop, ${FOLD_MOBILE} on mobile. Break it earlier.`
        }

        // The link penalty is the whole reason for the first-comment field.
        // Catching it here beats discovering it after the reach has gone.
        if (/https?:\/\//i.test(value)) {
          return 'An external link costs roughly 60% of the post\'s reach. Put the URL in "First comment" instead.'
        }

        return true
      },
    },
    {
      name: 'linkComment',
      type: 'textarea',
      label: 'First comment',
      admin: {
        rows: 3,
        description:
          'Posted as the first comment immediately after the post itself, carrying the blog URL. This is what keeps the link out of the post body. Left empty on a research original: there is no post to send anyone to, and a loosely related link spends the reach on a click that disappoints.',
      },
      validate: (value: string | null | undefined) => {
        if (!value) return true
        if (EM_DASH.test(value)) return 'House style: no em dashes.'
        return true
      },
    },
    {
      name: 'linkPlacement',
      type: 'select',
      defaultValue: 'first-comment',
      options: [
        { label: 'First comment', value: 'first-comment' },
        { label: 'In the post body', value: 'in-post' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Recorded so the metrics below can eventually answer whether the first-comment workaround is worth its lower click-through.',
      },
    },
    {
      name: 'postedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'When you actually pasted it. The metric buckets count from here.',
      },
    },
    {
      name: 'postUrl',
      type: 'text',
      label: 'LinkedIn permalink',
      admin: {
        position: 'sidebar',
        description: 'Paste the URL of the live post so the numbers can be re-checked.',
      },
    },
    {
      name: 'metrics',
      type: 'array',
      labels: { singular: 'Snapshot', plural: 'Snapshots' },
      admin: {
        description:
          'LinkedIn has no impressions API for personal profiles, so these are entered by hand from the post analytics panel. Take one at 48 hours, one at 7 days, one at 30 days.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'bucket',
          type: 'select',
          required: true,
          options: [
            { label: '48 hours', value: '48h' },
            { label: '7 days', value: '7d' },
            { label: '30 days', value: '30d' },
          ],
          admin: { width: '33%' },
        },
        {
          name: 'capturedAt',
          type: 'date',
          required: true,
          admin: { width: '33%', date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'impressions',
          type: 'number',
          admin: { width: '33%' },
        },
        { name: 'reactions', type: 'number', admin: { width: '25%' } },
        { name: 'comments', type: 'number', admin: { width: '25%' } },
        { name: 'reposts', type: 'number', admin: { width: '25%' } },
        {
          name: 'linkClicks',
          type: 'number',
          admin: {
            width: '25%',
            description: 'Clicks on the first-comment link, if LinkedIn reports them.',
          },
        },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description:
          'What you changed before posting, or anything about the post that would explain its numbers later.',
      },
    },
  ],
}
