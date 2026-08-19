import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { SITE_URL } from '@/utilities/site'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config: await config })

  // `_status` is filtered explicitly rather than relying on access control:
  // a draft leaking into the sitemap is a 404 handed straight to Google.
  const { docs } = await payload.find({
    collection: 'posts',
    where: { _status: { equals: 'published' } },
    limit: 1000,
    overrideAccess: false,
    select: { slug: true, updatedAt: true },
  })

  return [
    { url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: 'weekly' },
    ...docs.map((post) => ({
      url: `${SITE_URL}/${post.slug}`,
      lastModified: new Date(post.updatedAt),
    })),
  ]
}
