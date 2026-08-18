import { RichText } from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import type { Media } from '@/payload-types'
import config from '@/payload.config'
import { BYLINE, formatFullDate } from '@/utilities/postDisplay'
import { readingTimeMinutes } from '@/utilities/readingTime'

import { Kicker } from '../Kicker'
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return {}

  return {
    title: `${post.title} — Ritwik Saini`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedDate,
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

  return (
    <article className="mx-auto max-w-2xl">
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

      <div className="prose prose-article prose-neutral mt-10 max-w-none text-ink">
        <RichText data={post.content} />
      </div>

      <Sources sources={post.sources} />
    </article>
  )
}
