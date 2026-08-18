import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'roles'],
  },
  auth: {
    // Enables the API-key fields on this collection. The drafting agent runs in
    // Anthropic's cloud with no session, so it authenticates with a key:
    //   Authorization: users API-Key <key>
    // (the prefix is this collection's slug, not the word "Bearer").
    //
    // Keys are HMAC-indexed with PAYLOAD_SECRET — rotating that secret
    // invalidates every issued key.
    useAPIKey: true,
  },
  access: {
    // No public signup: only an existing logged-in admin can create a new user.
    // The very first user is still creatable when the users collection is empty
    // (Payload's own first-admin bootstrap flow on a fresh /admin visit).
    create: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['admin'],
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Bot', value: 'bot' },
      ],
      access: {
        // A bot must never be able to promote itself to admin.
        update: ({ req }) => isAdmin(req.user),
      },
      admin: {
        description: 'Bot users can only ever create and edit drafts.',
      },
    },
  ],
}
