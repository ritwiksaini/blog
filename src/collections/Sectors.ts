import type { CollectionConfig } from 'payload'

import { formatSlug } from '../utilities/formatSlug'

// Sectors are a collection rather than a select field so the list can keep
// growing as posts are written — a new sector is a row created from the admin
// UI (or by the drafting agent), never a code change plus a migration.
export const Sectors: CollectionConfig = {
  slug: 'sectors',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'description'],
    description: 'Post sectors. Add a new one whenever a post needs it.',
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        // The generated FK is ON DELETE SET NULL, so deleting a sector would
        // silently leave posts with an empty required field rather than
        // failing loudly. Refuse instead.
        const { totalDocs } = await req.payload.count({
          collection: 'posts',
          where: { sector: { equals: id } },
          req,
        })

        if (totalDocs > 0) {
          throw new Error(
            `Cannot delete this sector: ${totalDocs} post(s) still reference it. Reassign them first.`,
          )
        }
      },
    ],
  },
  fields: [
    {
      name: 'name',
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
        description: 'Auto-generated from the name if left blank.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (value) return formatSlug(value)
            if (data?.name) return formatSlug(data.name)
            return value
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional. Shown on sector browse pages later.',
      },
    },
  ],
}
