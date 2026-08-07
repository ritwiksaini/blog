import { Analytics } from '@vercel/analytics/next'
import { Lora, Playfair_Display } from 'next/font/google'
import React from 'react'
import './styles.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
})

export const metadata = {
  title: 'Ritwik Saini — Blog',
  description:
    'Research notes and theses on private equity, venture capital, and industry deep-dives.',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" className={`${playfair.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-paper text-ink">
        <header className="border-b border-paper-dark">
          <div className="mx-auto max-w-5xl px-6 py-6">
            <a href="/" className="font-serif-display text-2xl tracking-tight">
              Ritwik Saini
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
        <footer className="border-t border-paper-dark">
          <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-ink-muted">
            <a href="https://ritwiksaini.com" className="hover:text-ink">
              ritwiksaini.com
            </a>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  )
}
