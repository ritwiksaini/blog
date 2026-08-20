import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { baseUrlFrom, newToken, welcomeEmail } from '@/utilities/newsletter'

/**
 * The only write path into `subscribers`.
 *
 * Lives at /newsletter/subscribe rather than under /api, which Payload owns via
 * its catch-all route.
 */

// Deliberately permissive. Strict RFC 5322 validation rejects addresses that
// work, and the real check is whether the confirmation email arrives.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Every success path returns this. Whether an address is already on the list is
// not something an unauthenticated caller gets to learn: distinguishable
// responses turn the form into an oracle for testing whether a given person
// subscribed.
//
// A function, not a constant: a Response body can only be read once, so a
// shared instance would come back empty for every request after the first.
const accepted = () => Response.json({ ok: true }, { status: 202 })


/**
 * The subscription is the primary action and it has already been written by the
 * time this runs. A send failure is therefore logged, not raised: reporting it
 * would tell someone who *is* subscribed that they are not, and their retry
 * would hit the already-on-the-list branch and do nothing at all.
 */
async function sendWelcome(
  payload: Awaited<ReturnType<typeof getPayload>>,
  to: string,
  base: string,
  unsubscribeToken: string,
) {
  try {
    await payload.sendEmail({ to, ...welcomeEmail(base, unsubscribeToken) })
  } catch (error) {
    payload.logger.error({ err: error, to }, 'welcome email failed to send')
  }
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Malformed request.' }, { status: 400 })
  }

  const { email, source, website } = (body ?? {}) as Record<string, unknown>

  // Honeypot. A real person never fills a field they cannot see, so a value
  // here means a bot. Answer as though it worked; telling it otherwise only
  // teaches whoever wrote it to stop filling the field.
  if (typeof website === 'string' && website.length > 0) return accepted()

  if (typeof email !== 'string' || !EMAIL.test(email.trim())) {
    return Response.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 })
  }

  const normalised = email.trim().toLowerCase()
  const base = baseUrlFrom(request)
  const payload = await getPayload({ config: configPromise })

  try {
    const { docs } = await payload.find({
      collection: 'subscribers',
      where: { email: { equals: normalised } },
      limit: 1,
      overrideAccess: true,
    })

    const existing = docs[0]
    const sourceValue =
      typeof source === 'string' && source.length > 0 ? source.slice(0, 200) : 'home'

    if (!existing) {
      const unsubscribeToken = newToken()

      await payload.create({
        collection: 'subscribers',
        // Collection access denies create to everyone; this route is the
        // deliberate exception, after the validation above.
        overrideAccess: true,
        data: {
          email: normalised,
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
          unsubscribeToken,
          source: sourceValue,
        },
      })

      await sendWelcome(payload, normalised, base, unsubscribeToken)
    } else if (existing.status === 'unsubscribed') {
      // Someone who left and came back is asking to be re-added, so honour it.
      const unsubscribeToken = existing.unsubscribeToken ?? newToken()

      await payload.update({
        collection: 'subscribers',
        id: existing.id,
        overrideAccess: true,
        data: {
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
          unsubscribedAt: null,
          unsubscribeToken,
          source: sourceValue,
        },
      })

      await sendWelcome(payload, normalised, base, unsubscribeToken)
    }
    // An address already on the list is left alone. Re-sending to it would let
    // the form be used to nag someone who never asked.
  } catch (error) {
    // A concurrent duplicate races past the count above and trips the unique
    // constraint. That is a success from the reader's point of view.
    const duplicate = String(error).toLowerCase().includes('unique')
    if (!duplicate) {
      payload.logger.error({ err: error }, 'newsletter subscribe failed')
      // Reporting the failure loses nothing: it says the write broke, not
      // whether this address was already on the list. Swallowing it would tell
      // the reader they subscribed when they did not.
      return Response.json(
        { ok: false, error: 'Something went wrong. Try again in a moment.' },
        { status: 500 },
      )
    }
  }

  return accepted()
}
