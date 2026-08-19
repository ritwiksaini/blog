/**
 * Site-level constants shared by metadata, sitemap and structured data.
 *
 * `PERSON_ID` is deliberately an ID on the portfolio domain, not this one. Both
 * sites emit the same string, which is what tells search engines the author
 * here and the person there are one entity rather than two similar people.
 */
export const SITE_URL = 'https://blogs.ritwiksaini.com'
export const PORTFOLIO_URL = 'https://ritwiksaini.com'
export const PERSON_ID = `${PORTFOLIO_URL}/#person`
export const BLOG_ID = `${SITE_URL}/#blog`

export const SITE_NAME = 'Ritwik Saini'
export const SITE_DESCRIPTION =
  'Research notes and theses on private equity, venture capital, and industry deep-dives.'
export const OG_IMAGE = `${SITE_URL}/og.jpg`

/** Reused by the blog `Blog` node and by every `BlogPosting` author/publisher. */
export const personNode = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: SITE_NAME,
  url: PORTFOLIO_URL,
  sameAs: [
    'https://www.linkedin.com/in/ritwik-saini/',
    'https://github.com/ritwiksaini',
    SITE_URL,
  ],
} as const
