'use client'

import { useState } from 'react'

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        return
      }
    }

    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-sm border border-accent/30 px-2.5 py-1 font-mono-body text-xs text-accent transition-colors hover:bg-accent-soft"
    >
      {copied ? 'copied ✓' : '↗ share'}
    </button>
  )
}
