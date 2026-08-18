import type { TypedUser } from 'payload'

/**
 * The drafting agent authenticates with a Payload API key, which produces a
 * fully-populated `req.user` — so every `Boolean(req.user)` check in the
 * codebase passes for it. That means the bot inherits admin rights unless it is
 * explicitly scoped. `isBot` is the discriminator all such scoping hangs off.
 */
export const isBot = (user: TypedUser | null | undefined): boolean =>
  Array.isArray(user?.roles) && user.roles.includes('bot')

export const isAdmin = (user: TypedUser | null | undefined): boolean =>
  Array.isArray(user?.roles) && user.roles.includes('admin')
