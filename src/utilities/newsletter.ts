import { randomBytes } from 'crypto'

import { SITE_URL } from './site'

/** 32 bytes of CSPRNG output, hex encoded. Not guessable, not enumerable. */
export const newToken = () => randomBytes(32).toString('hex')

/**
 * Where the links in a sent email should point.
 *
 * Taken from the request rather than hardcoded, so a local run mails localhost
 * links and a Vercel preview mails preview links. Allowlisted rather than
 * trusted: `Host` is caller-controlled, and an unchecked origin would let
 * someone make us send a real person a link to a domain they own.
 */
export function baseUrlFrom(request: Request): string {
  const { origin, hostname } = new URL(request.url)

  if (origin === SITE_URL) return origin
  if (hostname === 'localhost' || hostname === '127.0.0.1') return origin
  if (hostname.endsWith('.vercel.app')) return origin

  return SITE_URL
}

export const unsubscribeUrl = (base: string, token: string) =>
  `${base}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`

/**
 * Gives Gmail and Apple Mail their own unsubscribe control in the message
 * header. A legitimacy signal to the filters, and the reason the footer can say
 * "Unsubscribe" as a link rather than pasting a raw URL.
 *
 * One-Click is only advertised because /newsletter/unsubscribe genuinely
 * honours a POST without a confirmation step. Claiming it otherwise is worse
 * than omitting it.
 */
export const unsubscribeHeaders = (base: string, token: string) => ({
  'List-Unsubscribe': `<${unsubscribeUrl(base, token)}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
})

/**
 * Single opt-in: subscribing adds the address immediately and this arrives as
 * the notification rather than as a gate.
 *
 * That makes the unsubscribe line load-bearing rather than decorative. Anyone
 * can type someone else's address into the form, so this email is the only
 * thing standing between that and a spam complaint. It says plainly what
 * happened and how to undo it.
 *
 * Plain text on purpose: best deliverability on an unwarmed sending domain and
 * impossible to render badly.
 */
export const welcomeEmail = (base: string, unsubscribeToken: string) => ({
  // Same native unsubscribe control as the announcement email. This is the one
  // message that reaches someone who may not have signed up themselves, so the
  // one-click control matters more here than anywhere else.
  headers: unsubscribeHeaders(base, unsubscribeToken),
  // No publication name on purpose: the From line already says who this is
  // from, so naming it again reads as a brand the site does not actually use.
  subject: "You're subscribed",
  text: [
    'You are now subscribed by email to new blogs by Ritwik Saini.',
    '',
    'Posts arrive when one is finished. Nothing else is sent.',
    '',
    'Read the archive: ' + base,
    '',
    'If you did not sign up for this, unsubscribe here and you will not hear',
    'from this address again:',
    unsubscribeUrl(base, unsubscribeToken),
  ].join('\n'),
})

/** Minimal HTML escaping for values interpolated into the email body. */
const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const INK = '#18181b'
const INK_MUTED = '#7a766f'
const RULE = '#e9e7e3'
const ACCENT = '#c2401f'

const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif"
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

/**
 * The announcement sent when a post goes out to the list.
 *
 * Sent as HTML with a plain-text alternative. The HTML is deliberately close to
 * what a person would send by hand: one column, no images, no tracking pixel,
 * no button, two links in the whole message. A template with a hero image and a
 * coloured call-to-action is the single clearest signal to a spam filter that
 * something is a bulk mailing rather than a letter.
 *
 * Every style is inline. Gmail strips <style> blocks in several contexts, and a
 * message that depends on them arrives unstyled.
 */
export const postEmail = ({
  base,
  title,
  excerpt,
  note,
  kicker,
  minutes,
  slug,
  unsubscribeToken,
}: {
  base: string
  title: string
  excerpt: string
  note?: string | null
  kicker: string[]
  minutes: number
  slug: string
  unsubscribeToken: string
}) => {
  const url = `${base}/${slug}`
  const unsubscribe = unsubscribeUrl(base, unsubscribeToken)
  const meta = [...kicker, `${minutes} min read`].join(' · ')

  // The note is the opening line when there is one. Without it the excerpt
  // opens instead, and is not then repeated as the standfirst below the title.
  const intro = note?.trim() || excerpt.trim()
  const standfirst = note?.trim() ? excerpt.trim() : null

  const text = [
    'Hello,',
    '',
    intro,
    '',
    title,
    meta,
    ...(standfirst ? ['', standfirst] : []),
    '',
    `Read it here: ${url}`,
    '',
    'Ritwik',
    '',
    'You are subscribed to new posts by Ritwik Saini.',
    `Unsubscribe: ${unsubscribe}`,
  ].join('\n')

  const html = `<div style="margin:0;padding:32px 0;background:#ffffff;">
  <div style="max-width:544px;margin:0 auto;padding:0 24px;font-family:${SERIF};font-size:16px;line-height:1.65;color:${INK};">
    <p style="margin:0 0 16px;">Hello,</p>
    <p style="margin:0 0 28px;">${escape(intro)}</p>
    <h1 style="margin:0 0 8px;font-family:${SERIF};font-size:23px;line-height:1.3;font-weight:700;">
      <a href="${url}" style="color:${INK};text-decoration:none;">${escape(title)}</a>
    </h1>
    <p style="margin:0 0 ${standfirst ? '14px' : '24px'};font-family:${SANS};font-size:11px;line-height:1.5;letter-spacing:0.12em;text-transform:uppercase;color:${INK_MUTED};">${escape(meta)}</p>
    ${standfirst ? `<p style="margin:0 0 24px;color:#3f3f46;">${escape(standfirst)}</p>` : ''}
    <p style="margin:0 0 32px;"><a href="${url}" style="color:${ACCENT};text-decoration:underline;">Read the full piece</a></p>
    <p style="margin:0 0 32px;">Ritwik</p>
    <hr style="border:none;border-top:1px solid ${RULE};margin:0 0 14px;">
    <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:${INK_MUTED};">
      You are subscribed to new posts by Ritwik Saini.
      <a href="${unsubscribe}" style="color:${INK_MUTED};text-decoration:underline;">Unsubscribe</a>.
    </p>
  </div>
</div>`

  return {
    // The title alone. A "New post:" prefix would spend the most-scanned line
    // in the inbox restating what the From line and the subscription already
    // say, and these titles are declarative claims that stand on their own.
    subject: title,
    text,
    html,
    headers: unsubscribeHeaders(base, unsubscribeToken),
  }
}
