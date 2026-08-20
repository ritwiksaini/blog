import configPromise from '@payload-config'
import { getPayload } from 'payload'

async function unsubscribe(token: string | null) {
  if (!token) return false

  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'subscribers',
    where: { unsubscribeToken: { equals: token } },
    limit: 1,
    overrideAccess: true,
  })

  const subscriber = docs[0]
  if (!subscriber) return false

  if (subscriber.status !== 'unsubscribed') {
    await payload.update({
      collection: 'subscribers',
      id: subscriber.id,
      overrideAccess: true,
      data: { status: 'unsubscribed', unsubscribedAt: new Date().toISOString() },
    })
  }

  return true
}

/** The link in the footer of a sent post. */
export async function GET(request: Request) {
  const ok = await unsubscribe(new URL(request.url).searchParams.get('token'))

  return new Response(null, {
    status: 303,
    headers: { Location: `/newsletter/status?state=${ok ? 'unsubscribed' : 'invalid'}` },
  })
}

/**
 * One-click unsubscribe. Gmail and Yahoo expect `List-Unsubscribe-Post` to be
 * honoured by a POST that removes the address without any further interaction,
 * so this must not render a confirmation page.
 */
export async function POST(request: Request) {
  await unsubscribe(new URL(request.url).searchParams.get('token'))

  return new Response(null, { status: 204 })
}
