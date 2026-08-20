import type { CollectionConfig } from 'payload'

import { isBot } from '../access/roles'

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
 * One syndication draft per post per platform.
 *
 * The blog app has no LLM credentials, so nothing here is generated in-process.
 * The "Queue LinkedIn draft" button on a post creates a row with status
 * `queued`; the cloud syndication routine polls for those, writes `body` and
 * `linkComment`, and flips the status to `drafted`. Identical in shape to the
 * pitch/drafter loop that already works.
 *
 * Nothing in this collection posts anything. It produces text to paste and a
 * place to record what happened afterwards.
 */
export const Syndication: CollectionConfig = {
  slug: 'syndication',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'platform', 'status', 'postedAt'],
    description:
      'Platform-native drafts to paste by hand, and the performance numbers you enter afterwards.',
    group: 'Distribution',
  },
  access: {
    // Working drafts, never public. Same posture as Pitches.
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req, data }) => {
      if (!req.user) return false
      if (!isBot(req.user)) return true

      // The routine writes the copy and marks it drafted. It must never record
      // that something was posted, and must never touch the numbers: those are
      // observations of the real world, and a bot inventing them would poison
      // the only feedback signal this system has.
      if (data?.metrics !== undefined) return false
      if (data?.postedAt !== undefined || data?.postUrl !== undefined) return false
      return data?.status === undefined || data?.status === 'drafted'
    },
    delete: ({ req }) => Boolean(req.user) && !isBot(req.user),
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        // One draft per post per platform. Without this the button becomes a
        // duplicate factory on every press, and the routine would then draft
        // the same post repeatedly.
        const postId =
          typeof data?.post === 'object' && data?.post !== null ? data.post.id : data?.post
        const platform = data?.platform ?? originalDoc?.platform ?? 'linkedin'

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
        // Refreshed whenever the relationship changes, since a post retitled
        // after queueing would otherwise leave a stale label behind.
        if (postId && (operation === 'create' || data?.post !== undefined)) {
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
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
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
          'Posted as the first comment immediately after the post itself, carrying the blog URL. This is what keeps the link out of the post body.',
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
