import type { Post } from '@/payload-types'

import { assetClassOptions, geographyOptions } from '../collections/postTaxonomy'

export const BYLINE = 'Ritwik Saini'

const labelFor = (options: readonly { label: string; value: string }[], value?: string | null) =>
  options.find((option) => option.value === value)?.label ?? value ?? ''

export const geographyLabel = (post: Pick<Post, 'geography'>) =>
  labelFor(geographyOptions, post.geography)

export const assetClassLabel = (post: Pick<Post, 'assetClass'>) =>
  labelFor(assetClassOptions, post.assetClass)

/** `sector` is a relationship, so it arrives either populated or as a bare id. */
export const sectorLabel = (post: Pick<Post, 'sector'>) =>
  typeof post.sector === 'object' && post.sector !== null ? post.sector.name : ''

/** The three taxonomy labels, in kicker order, with empties dropped. */
export const taxonomyLabels = (post: Pick<Post, 'geography' | 'assetClass' | 'sector'>) =>
  [geographyLabel(post), assetClassLabel(post), sectorLabel(post)].filter(Boolean)

export const formatMonthYear = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

export const formatFullDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

export const formatListDate = (isoDate: string) =>
  new Date(isoDate)
    .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase()
