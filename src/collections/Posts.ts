import type { CollectionConfig } from 'payload'

import { isBot } from '../access/roles'
import { sendPostNewsletter } from '../endpoints/sendPostNewsletter'
import { formatSlug } from '../utilities/formatSlug'
import { assetClassOptions, geographyOptions } from './postTaxonomy'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'geography', 'assetClass', 'sector', 'publishedDate', '_status'],
  },
  versions: {
    drafts: true,
  },
  endpoints: [sendPostNewsletter],
  access: {
    // Logged-in admin sees everything (including drafts); public requests
    // only ever see published documents.
    read: ({ req: { user } }) => (user ? true : { _status: { equals: 'published' } }),

    // The bot may only ever create drafts. `?draft=true` sets data._status to
    // 'draft' before this check runs, so requiring the explicit value forces
    // the bot onto the draft codepath.
    create: ({ req, data }) => {
      if (!req.user) return false
      if (!isBot(req.user)) return true
      return data?._status === 'draft'
    },

    // The bot may never publish, and may never touch a doc that is already
    // published. Returning a Where constraint means this is enforced against
    // the *stored* row, not just the incoming body.
    update: ({ req, data }) => {
      if (!req.user) return false
      if (!isBot(req.user)) return true
      if (data?._status === 'published') return false
      return { _status: { equals: 'draft' } }
    },

    delete: ({ req }) => Boolean(req.user) && !isBot(req.user),
  },
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        // Belt-and-braces alongside the access rules above: covers GraphQL and
        // any future codepath that doesn't route through collection access.
        if (isBot(req.user) && data?._status === 'published') {
          throw new Error('Bot users cannot publish posts.')
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Auto-generated from the title if left blank.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (value) return formatSlug(value)
            if (data?.title) return formatSlug(data.title)
            return value
          },
        ],
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Shown as the standfirst under the title, and in listings.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'sources',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Source', plural: 'Sources' },
      admin: {
        description: 'Every factual claim in the post must trace to one of these.',
        initCollapsed: true,
      },
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: (value: string | null | undefined) => {
            if (!value) return 'A source URL is required.'
            try {
              const parsed = new URL(value)
              if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                return 'Source URLs must be http(s).'
              }
            } catch {
              return 'That is not a valid absolute URL.'
            }
            return true
          },
        },
        { name: 'publisher', type: 'text' },
        {
          name: 'dateAccessed',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
      ],
    },
    {
      name: 'publishedDate',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'geography',
      type: 'select',
      required: true,
      options: [...geographyOptions],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'assetClass',
      type: 'select',
      required: true,
      options: [...assetClassOptions],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sector',
      type: 'relationship',
      relationTo: 'sectors',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Create a new sector if none of the existing ones fit.',
      },
    },
    {
      name: 'newsletterNote',
      type: 'textarea',
      admin: {
        description:
          'Optional. The opening line of the announcement email, after "Hello,". A sentence or two easing the reader into the subject. When blank the excerpt opens the email instead. Never shown on the site.',
      },
    },
    {
      // Written by the send endpoint, never by hand: it is the record of an
      // action that already happened, and editing it would either re-arm a
      // send that went out or suppress one that did not.
      name: 'newsletterSentAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Set automatically when the announcement goes out.',
      },
    },
    {
      name: 'sendNewsletter',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '/components/SendNewsletterButton#SendNewsletterButton',
        },
      },
    },
  ],
}
