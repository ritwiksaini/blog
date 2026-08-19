import type { Metadata } from 'next'

import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import type { Media } from '@/payload-types'
import config from '@/payload.config'
import { BYLINE, formatFullDate } from '@/utilities/postDisplay'
import { readingTimeMinutes } from '@/utilities/readingTime'
import { OG_IMAGE, PERSON_ID, PORTFOLIO_URL, SITE_NAME, SITE_URL } from '@/utilities/site'

import { Kicker } from '../Kicker'
import { PostBody } from './PostBody'
import { ShareButton } from './ShareButton'
import { Sources } from './Sources'

async function getPost(slug: string) {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const { docs } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: false,
  })

  return docs[0] ?? null
}

export async function generateStaticParams() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const { docs: posts } = await payload.find({
    collection: 'posts',
    limit: 1000,
    overrideAccess: false,
    select: { slug: true },
  })

  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return {}

  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: BYLINE, url: PORTFOLIO_URL }],
    alternates: { canonical: `/${post.slug}` },
    openGraph: {
      type: 'article',
      url: `${SITE_URL}/${post.slug}`,
      siteName: `${SITE_NAME} — Blog`,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedDate,
      modifiedTime: post.updatedAt,
      authors: [PORTFOLIO_URL],
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [OG_IMAGE],
    },
  }
}

export const revalidate = 60

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) notFound()

  const featuredImage =
    typeof post.featuredImage === 'object' ? (post.featuredImage as Media | null) : null
  const minutes = readingTimeMinutes(post.content)
  const url = `${SITE_URL}/${post.slug}`

  // `author` and `publisher` are @id references to the Person defined on the
  // portfolio domain, so both sites resolve to a single entity.
  const postGraph = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedDate,
    dateModified: post.updatedAt,
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    inLanguage: 'en',
    isPartOf: { '@id': `${SITE_URL}/#blog` },
    ...(featuredImage?.url ? { image: new URL(featuredImage.url, SITE_URL).toString() } : {}),
    ...(post.sources?.length
      ? { citation: post.sources.map((source) => source.url).filter(Boolean) }
      : {}),
  }

  return (
    <article className="mx-auto max-w-2xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postGraph) }}
      />
      <Kicker post={post} />

      <h1 className="mt-4 font-mono-display text-3xl leading-tight sm:text-4xl">{post.title}</h1>

      <p className="mt-5 font-serif-body text-xl leading-relaxed text-ink-muted">{post.excerpt}</p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-y border-paper-dark py-3 font-mono-body text-xs text-ink-muted">
        <span>
          {BYLINE}
          <span className="mx-2 text-ink-muted/40">·</span>
          {formatFullDate(post.publishedDate)}
          <span className="mx-2 text-ink-muted/40">·</span>
          {minutes} min read
        </span>
        <ShareButton title={post.title} />
      </div>

      {featuredImage?.url && (
        <figure className="mt-10">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-paper-dark">
            <Image
              src={featuredImage.url}
              alt={featuredImage.alt ?? post.title}
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
              priority
            />
          </div>
          {featuredImage.alt && (
            <figcaption className="mt-2 font-mono-body text-xs text-ink-muted">
              {featuredImage.alt}
            </figcaption>
          )}
        </figure>
      )}

      <PostBody content={post.content} />

      <Sources sources={post.sources} />

      {/* A reader arriving from a shared link has no idea who wrote this. This
          is also the reciprocal half of the entity link: the portfolio points
          here through sameAs, and until now nothing pointed back. */}
      <aside className="mt-14 border-t border-paper-dark pt-6 font-mono-body text-sm text-ink-muted">
        <p>
          Written by{' '}
          <a href={PORTFOLIO_URL} className="text-ink hover:text-accent">
            {BYLINE}
          </a>
          , who works in private capital markets: deal sourcing, investment
          theses, and automation around financial workflows. Boston University
          &rsquo;26, CFA Level I.
        </p>
      </aside>
    </article>
  )
}
