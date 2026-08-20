import { randomBytes } from 'crypto'

import { SITE_URL } from './site'

/** 32 bytes of CSPRNG output, hex encoded. Not guessable, not enumerable. */
export const newToken = () => randomBytes(32).toString('hex')

/**
 * Where the links in a sent email should point.
 *
 * Taken from the request rather than hardcoded, so a local run mails localhost
 * links and a Vercel preview mails preview links. Allowlisted rather than
 * trusted: `Host` is caller-controlled, and an unchecked origin would let
 * someone make us send a real person a link to a domain they own.
 */
export function baseUrlFrom(request: Request): string {
  const { origin, hostname } = new URL(request.url)

  if (origin === SITE_URL) return origin
  if (hostname === 'localhost' || hostname === '127.0.0.1') return origin
  if (hostname.endsWith('.vercel.app')) return origin

  return SITE_URL
}

export const unsubscribeUrl = (base: string, token: string) =>
  `${base}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`

/**
 * Single opt-in: subscribing adds the address immediately and this arrives as
 * the notification rather than as a gate.
 *
 * That makes the unsubscribe line load-bearing rather than decorative. Anyone
 * can type someone else's address into the form, so this email is the only
 * thing standing between that and a spam complaint. It says plainly what
 * happened and how to undo it.
 *
 * Plain text on purpose: best deliverability on an unwarmed sending domain and
 * impossible to render badly.
 */
export const welcomeEmail = (base: string, unsubscribeToken: string) => ({
  // No publication name on purpose: the From line already says who this is
  // from, so naming it again reads as a brand the site does not actually use.
  subject: "You're subscribed",
  text: [
    'You are now subscribed by email to new blogs by Ritwik Saini.',
    '',
    'Posts arrive when one is finished. Nothing else is sent.',
    '',
    'Read the archive: ' + base,
    '',
    'If you did not sign up for this, unsubscribe here and you will not hear',
    'from this address again:',
    unsubscribeUrl(base, unsubscribeToken),
  ].join('\n'),
})
