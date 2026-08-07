import { RichText } from '@payloadcms/richtext-lexical/react'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'

import { TagRow } from '../PostCard'

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

  return (
    <article className="mx-auto max-w-2xl">
      <TagRow post={post} />
      <h1 className="mt-4 font-serif-display text-4xl leading-tight">{post.title}</h1>
      <div className="prose prose-neutral mt-8 max-w-none text-ink">
        <RichText data={post.content} />
      </div>
    </article>
  )
}
