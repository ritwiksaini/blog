import type { CollectionConfig } from 'payload'

import { formatSlug } from '../utilities/formatSlug'
import { geographyOptions, industryOptions } from './postTaxonomy'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'geography', 'industry', 'publishedDate', '_status'],
  },
  versions: {
    drafts: true,
  },
  access: {
    // Logged-in admin sees everything (including drafts); public requests
    // only ever see published documents.
    read: ({ req: { user } }) => (user ? true : { _status: { equals: 'published' } }),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
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
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
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
      name: 'industry',
      type: 'select',
      required: true,
      options: [...industryOptions],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
