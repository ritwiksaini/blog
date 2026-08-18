import { Analytics } from '@vercel/analytics/next'
import { Cousine, Source_Serif_4 } from 'next/font/google'
import React from 'react'

import './styles.css'

const cousine = Cousine({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-cousine',
})

// Mono stays the identity of the site — it carries every piece of chrome.
// Long-form body copy moves to a screen-optimised serif, which is the whole
// readability difference on an 800-1500 word post.
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
})

export const metadata = {
  title: 'Ritwik Saini — Blog',
  description:
    'Research notes and theses on private equity, venture capital, and industry deep-dives.',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" className={`${cousine.variable} ${sourceSerif.variable}`}>
      <body className="min-h-screen bg-paper text-ink">
        <header className="border-b border-paper-dark">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
            <a href="/" className="font-mono-display text-sm font-bold uppercase tracking-[0.25em]">
              Ritwik Saini
            </a>
            <div className="flex items-center gap-2 font-mono-body text-xs uppercase tracking-wide text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              research &amp; writing
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
        <footer className="border-t border-paper-dark">
          <div className="mx-auto max-w-5xl px-6 py-8 font-mono-body text-sm text-ink-muted">
            <a href="https://ritwiksaini.com" className="hover:text-accent">
              ritwiksaini.com
            </a>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  )
}
