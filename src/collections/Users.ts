import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    // No public signup: only an existing logged-in admin can create a new user.
    // The very first user is still creatable when the users collection is empty
    // (Payload's own first-admin bootstrap flow on a fresh /admin visit).
    create: ({ req }) => Boolean(req.user),
  },
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
