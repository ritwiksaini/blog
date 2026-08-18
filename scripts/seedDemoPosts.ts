/**
 * DEV ONLY. Seeds published demo posts so index layouts can be compared with
 * realistic content. Never run against production.
 *
 *   DATABASE_URI=<dev uri> npx tsx scripts/seedDemoPosts.ts
 *   DATABASE_URI=<dev uri> npx tsx scripts/seedDemoPosts.ts --clean
 */
import 'dotenv/config'
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { getPayload } from 'payload'

import config from '../src/payload.config.js'
import { formatSlug } from '../src/utilities/formatSlug.js'

const DEMO_MARKER = '[demo]'

const demos = [
  {
    title: 'India’s Credit Funds Are Underwriting Growth They Cannot Exit',
    excerpt:
      'Performing-credit AUM has tripled while the exit window has not widened. The duration mismatch is the story.',
    geography: 'india',
    assetClass: 'private-equity',
    sectorSlug: 'fund-performance',
  },
  {
    title: 'The Grid Is the Real Constraint on AI Infrastructure',
    excerpt:
      'Compute is being financed faster than interconnection queues clear. Capital is arriving where electrons cannot.',
    geography: 'united-states',
    assetClass: 'private-equity',
    sectorSlug: 'ai-infrastructure',
  },
  {
    title: 'Deep-Tech Seed Rounds Have Quietly Become Series A',
    excerpt:
      'Median seed size doubled while milestones stayed flat. Founders are selling more of the company for the same proof.',
    geography: 'global',
    assetClass: 'venture-capital',
    sectorSlug: 'deep-tech',
  },
  {
    title: 'Industrial Roll-Ups Are Running Out of Fragmentation',
    excerpt:
      'The multiple arbitrage that powered a decade of buy-and-build is compressing. What replaces it is operating leverage.',
    geography: 'united-states',
    assetClass: 'private-equity',
    sectorSlug: 'industrials',
  },
]

const paragraph =
  'The structural point is not the headline number but what it implies about who is bearing the risk, and on what terms. '

const bodyFor = (title: string) =>
  [
    `${paragraph.repeat(2)}`,
    '## What the data says',
    paragraph.repeat(4),
    'The detail sits in [the filing](https://example.com/filing), which is where the assumption becomes visible.',
    '## Why it matters',
    paragraph.repeat(4),
    '- The base case assumes conditions that no longer hold',
    '- Downside is modelled on a historical average',
    '- Nobody is pricing the correlation',
    '## The position',
    paragraph.repeat(3),
    `> ${title} is a duration problem dressed as a growth problem.`,
  ].join('\n\n')

const run = async () => {
  const payload = await getPayload({ config })
  const clean = process.argv.includes('--clean')

  const existing = await payload.find({
    collection: 'posts',
    where: { excerpt: { contains: DEMO_MARKER } },
    limit: 100,
  })
  for (const doc of existing.docs) {
    await payload.delete({ collection: 'posts', id: doc.id })
  }
  console.log(`Removed ${existing.docs.length} existing demo post(s)`)

  if (clean) {
    console.log('--clean: done, nothing seeded')
    process.exit(0)
  }

  const editorConfig = await editorConfigFactory.default({ config: payload.config })
  const { docs: sectors } = await payload.find({ collection: 'sectors', limit: 100 })

  let dayOffset = 0
  for (const demo of demos) {
    const sector = sectors.find((s) => s.slug === demo.sectorSlug)
    if (!sector) throw new Error(`Missing sector ${demo.sectorSlug}`)

    const publishedDate = new Date(Date.now() - dayOffset * 86_400_000).toISOString()
    dayOffset += 14

    await payload.create({
      collection: 'posts',
      draft: false,
      data: {
        title: demo.title,
        // The beforeValidate hook would derive this, but a non-draft create is
        // typed as requiring the complete document.
        slug: formatSlug(demo.title),
        excerpt: `${demo.excerpt} ${DEMO_MARKER}`,
        content: convertMarkdownToLexical({ editorConfig, markdown: bodyFor(demo.title) }),
        sources: [
          {
            title: 'Primary filing',
            url: 'https://example.com/filing',
            publisher: 'SEC EDGAR',
            dateAccessed: new Date().toISOString(),
          },
          {
            title: 'Market coverage',
            url: 'https://example.com/coverage',
            publisher: 'Reuters',
            dateAccessed: new Date().toISOString(),
          },
        ],
        geography: demo.geography as 'india' | 'united-states' | 'global',
        assetClass: demo.assetClass as 'private-equity' | 'venture-capital',
        sector: sector.id,
        publishedDate,
        _status: 'published',
      },
    })
    console.log(`Seeded: ${demo.title}`)
  }

  process.exit(0)
}

void run()
