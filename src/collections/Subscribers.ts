import type { CollectionConfig } from 'payload'

/**
 * Newsletter list.
 *
 * Nothing writes to this collection through the public REST API. Access is
 * closed on every operation, and the only write path is the /newsletter/subscribe
 * route handler, which uses the local API with `overrideAccess: true` after
 * validating its input. That keeps a list of real people's email addresses off
 * the public API surface entirely rather than relying on a read rule to hide it.
 */
export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'source', 'createdAt'],
    description: 'Newsletter subscribers. Added by the public form, never editable by it.',
    group: 'Newsletter',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: () => false,
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        // Unused under single opt-in: the form subscribes immediately. Kept
        // so switching to double opt-in stays a code change, not a migration.
        { label: 'Pending confirmation', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'source',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Slug of the post the reader subscribed from, or "home".',
      },
    },
    {
      // Unused under single opt-in, kept alongside the 'pending' status so
      // reinstating double opt-in needs no migration.
      name: 'confirmToken',
      type: 'text',
      index: true,
      admin: { hidden: true },
    },
    {
      name: 'unsubscribeToken',
      type: 'text',
      index: true,
      admin: { hidden: true },
    },
    {
      name: 'confirmedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'unsubscribedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
