import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig, type Plugin } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { editorFeatures } from './lexicalFeatures'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Pitches } from './collections/Pitches'
import { Sectors } from './collections/Sectors'
import { Subscribers } from './collections/Subscribers'
import { Syndication } from './collections/Syndication'
import { Theses } from './collections/Theses'
import { draftFromPitch } from './endpoints/draftFromPitch'
import { draftThesis } from './endpoints/draftThesis'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Vercel's serverless functions have an ephemeral filesystem, so uploads
// can't live on local disk in production. Vercel Blob storage is required
// once BLOB_READ_WRITE_TOKEN is set (production and, for parity, local dev);
// falls back to Payload's local-disk default only if the token is absent.
const plugins: Plugin[] = []
if (process.env.BLOB_READ_WRITE_TOKEN) {
  plugins.push(
    vercelBlobStorage({
      enabled: true,
      collections: {
        media: true,
      },
      // clientUploads (direct-to-Blob browser upload, bypassing Vercel's
      // 4.5MB function body limit) was tried and pulled back out: the admin
      // UI got stuck on "Submitting" without surfacing the underlying error.
      // Standard server-side upload is reliable and the 4.5MB cap is not a
      // practical constraint for compressed blog images.
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  )
}

// Newsletter confirmations go out through Resend from a dedicated subdomain,
// so a deliverability problem never touches ritwiksaini.com's reputation.
// Left unset when the key is absent (local work, CI), where Payload falls back
// to writing email to the console — the alternative is a config that cannot be
// loaded without a live API key.
const email = process.env.RESEND_API_KEY
  ? resendAdapter({
      defaultFromAddress: 'posts@updates.ritwiksaini.com',
      defaultFromName: 'Ritwik Saini',
      apiKey: process.env.RESEND_API_KEY,
    })
  : undefined

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Posts, Sectors, Pitches, Subscribers, Syndication, Theses],
  email,
  endpoints: [draftFromPitch, draftThesis],
  // `editorFeatures` is shared with the drafting endpoints on purpose. See
  // `src/lexicalFeatures.ts` for why that sharing is load-bearing.
  editor: lexicalEditor({ features: editorFeatures }),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins,
})
