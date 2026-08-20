import type { Endpoint, PayloadRequest } from 'payload'

import type { Post, Subscriber } from '../payload-types'
import { isAdmin, isBot } from '../access/roles'
import { baseUrlFrom, postEmail } from '../utilities/newsletter'
import { taxonomyLabels } from '../utilities/postDisplay'
import { readingTimeMinutes } from '../utilities/readingTime'

/**
 * Resend accepts up to 100 messages per batch request, and a batch counts as a
 * single call against the rate limit. Sending one request per recipient would
 * trip that limit on any list worth having.
 */
const BATCH_SIZE = 100

const json = (body: unknown, status: number) =>
  Response.json(body as Record<string, unknown>, { status })

type Message = {
  to: string
  subject: string
  text: string
  html: string
  headers: Record<string, string>
}

/**
 * Resend's batch endpoint, called directly.
 *
 * `payload.sendEmail` sends one message per call, which is right for the
 * welcome email and wrong here. This keeps the same From identity as the
 * adapter configured in payload.config.ts, so the two paths can't drift into
 * sending from different addresses.
 */
export async function sendBatch(messages: Message[], apiKey: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      messages.map(({ headers, ...message }) => ({
        from: 'Ritwik Saini <posts@updates.ritwiksaini.com>',
        // A reader who writes back is the most valuable thing a list this size
        // produces, and posts@ is a send-only address nobody reads.
        reply_to: 'sritwik24@gmail.com',
        headers,
        ...message,
      })),
    ),
  })

  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}: ${await response.text()}`)
  }
}

/**
 * POST /api/posts/:id/newsletter
 *
 * Sending is manual on purpose. Email is the one action here that cannot be
 * undone, and a post is routinely published for a few minutes just to see how
 * it looks — so nothing should go out on a timer that fires while nobody is
 * watching.
 *
 * Body: `{ test: true }` mails only the logged-in admin and stamps nothing.
 */
export const sendPostNewsletter: Endpoint = {
  path: '/:id/newsletter',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const { payload, user, routeParams } = req

    // The drafting bot authenticates as a real user and would otherwise pass
    // a bare `req.user` check. It may not publish, so it may not mail either.
    if (!user || !isAdmin(user) || isBot(user)) return json({ error: 'Unauthorized' }, 403)

    const id = routeParams?.id
    if (typeof id !== 'string' && typeof id !== 'number') {
      return json({ error: 'Missing post id.' }, 400)
    }

    let body: { test?: boolean } = {}
    try {
      body = ((await req.json?.()) ?? {}) as { test?: boolean }
    } catch {
      // An empty body is a real send. Nothing to parse, nothing to complain about.
    }

    const isTest = body.test === true

    const post = (await payload.findByID({
      collection: 'posts',
      id,
      depth: 1,
      overrideAccess: true,
    })) as Post | null

    if (!post) return json({ error: 'No such post.' }, 404)

    // A draft has no public URL, so the link in the email would 404 for every
    // recipient. Refuse rather than send a broken announcement.
    if (post._status !== 'published') {
      return json({ error: 'This post is not published yet.' }, 409)
    }

    if (!isTest && post.newsletterSentAt) {
      return json(
        { error: `Already sent on ${new Date(post.newsletterSentAt).toUTCString()}.` },
        409,
      )
    }

    const base = baseUrlFrom(req as unknown as Request)
    const minutes = readingTimeMinutes(post.content)
    const kicker = taxonomyLabels(post)

    const build = (unsubscribeToken: string) =>
      postEmail({
        base,
        title: post.title,
        excerpt: post.excerpt,
        note: post.newsletterNote,
        kicker,
        minutes,
        slug: post.slug,
        unsubscribeToken,
      })

    const apiKey = process.env.RESEND_API_KEY

    if (isTest) {
      if (!user.email) return json({ error: 'Your account has no email address.' }, 400)

      // The admin's own unsubscribe token when they are on the list, so the
      // test exercises the real link rather than a dead one.
      const { docs } = await payload.find({
        collection: 'subscribers',
        where: { email: { equals: user.email.toLowerCase() } },
        limit: 1,
        overrideAccess: true,
      })

      const message = { to: user.email, ...build(docs[0]?.unsubscribeToken ?? 'test-token') }

      if (apiKey) await sendBatch([message], apiKey)
      else await payload.sendEmail(message)

      return json({ ok: true, test: true, sent: 1 }, 200)
    }

    const { docs: subscribers } = await payload.find({
      collection: 'subscribers',
      where: { status: { equals: 'confirmed' } },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    })

    const recipients = (subscribers as Subscriber[]).filter(
      (subscriber) => subscriber.email && subscriber.unsubscribeToken,
    )

    if (recipients.length === 0) return json({ error: 'No confirmed subscribers.' }, 409)

    // Stamped before the first message goes out, not after. A crash mid-send
    // leaves the post marked as sent, which is the safe direction to fail: the
    // alternative is a retry that mails everyone who already received it.
    await payload.update({
      collection: 'posts',
      id,
      data: { newsletterSentAt: new Date().toISOString() },
      overrideAccess: true,
    })

    const messages: Message[] = recipients.map((subscriber) => ({
      to: subscriber.email,
      ...build(subscriber.unsubscribeToken as string),
    }))

    let sent = 0
    const failures: string[] = []

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const chunk = messages.slice(i, i + BATCH_SIZE)

      try {
        if (apiKey) await sendBatch(chunk, apiKey)
        else for (const message of chunk) await payload.sendEmail(message)

        sent += chunk.length
      } catch (error) {
        payload.logger.error({ err: error, post: post.slug }, 'newsletter batch failed to send')
        failures.push(...chunk.map((message) => message.to))
      }
    }

    return json({ ok: failures.length === 0, sent, failed: failures.length }, 200)
  },
}
