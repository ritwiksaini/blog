import type { CollectionConfig } from 'payload'

import { isBot } from '../access/roles'
import { assetClassOptions, geographyOptions } from './postTaxonomy'

// The biweekly research routine writes ~5 pitches here. You pick one by setting
// `status` to "Selected"; the drafting routine polls for selected pitches that
// have no linked post yet, writes the draft, and flips `status` to "Drafted".
//
// Deliberately no drafts/versions: required fields then become real NOT NULL
// columns, which forces the agent to submit complete pitches.
export const Pitches: CollectionConfig = {
  slug: 'pitches',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'postFormat', 'geography', 'assetClass', 'createdAt'],
    description: 'Research pitches. Set one to "Selected" and the drafter will pick it up.',
  },
  access: {
    // Never public — pitches are working notes, not published content.
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req, data }) => {
      if (!req.user) return false
      if (!isBot(req.user)) return true
      // Only a human selects a pitch. The bot may only mark one as drafted.
      return data?.status === undefined || data?.status === 'drafted'
    },
    delete: ({ req }) => Boolean(req.user) && !isBot(req.user),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'angle',
      type: 'textarea',
      required: true,
      admin: { description: 'The specific argument this post would make.' },
    },
    {
      name: 'whyNow',
      type: 'textarea',
      required: true,
      admin: { description: 'What in the last two weeks makes this timely.' },
    },
    {
      name: 'researchPaths',
      type: 'array',
      labels: { singular: 'Research note', plural: 'Research notes' },
      admin: {
        description: 'Paths into the blog-research repo backing this pitch.',
        initCollapsed: true,
      },
      fields: [{ name: 'path', type: 'text', required: true }],
    },
    {
      name: 'candidateSources',
      type: 'array',
      required: true,
      minRows: 2,
      labels: { singular: 'Source', plural: 'Sources' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
        { name: 'publisher', type: 'text' },
        {
          name: 'dateAccessed',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
      ],
    },
    {
      name: 'geography',
      type: 'select',
      required: true,
      options: [...geographyOptions],
      admin: { position: 'sidebar' },
    },
    {
      name: 'assetClass',
      type: 'select',
      required: true,
      options: [...assetClassOptions],
      admin: { position: 'sidebar' },
    },
    {
      name: 'suggestedSector',
      type: 'relationship',
      relationTo: 'sectors',
      admin: {
        position: 'sidebar',
        description: 'Empty if the agent proposed a sector that does not exist yet.',
      },
    },
    {
      name: 'suggestedSectorName',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'A proposed new sector name. Create it in Sectors, then link it above.',
      },
    },
    {
      name: 'postFormat',
      type: 'select',
      required: true,
      defaultValue: 'sharp-take',
      options: [
        { label: 'Sharp take (600-1000w)', value: 'sharp-take' },
        { label: 'Thesis (1200-1800w)', value: 'thesis' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'proposed',
      index: true,
      options: [
        { label: 'Proposed', value: 'proposed' },
        { label: 'Selected', value: 'selected' },
        { label: 'Drafted', value: 'drafted' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Set to "Selected" to have the drafter write this one.',
      },
    },
    {
      name: 'linkedPost',
      type: 'relationship',
      relationTo: 'posts',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Set by the drafter. Its presence is what prevents double-drafting.',
      },
    },
    {
      name: 'draftedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
