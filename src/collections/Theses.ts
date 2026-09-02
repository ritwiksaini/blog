import type { CollectionConfig } from 'payload'

import { isBot } from '../access/roles'
import { assetClassOptions, geographyOptions } from './postTaxonomy'

/**
 * One long-form thesis a month, built in stages rather than in one run.
 *
 * A 4000-word modelled sector argument is too much for a single unattended
 * session, and a single run also gives no place to intervene: by the time
 * anything is visible the month is spent. So the work is broken into seven
 * stages, the routine advances at most one per run, and three of them stop for
 * review.
 *
 * This row is the state. The artifacts themselves live in `blog-research` under
 * `theses/<slug>/`, because they are research and must not trigger a rebuild.
 *
 * Topics are supplied by hand. Stage 7 proposes next month's, which is why
 * `proposedBy` exists: a routine-proposed row is a suggestion and must be
 * promoted by a human before anything is spent on it.
 */
export const Theses: CollectionConfig = {
  slug: 'theses',
  admin: {
    useAsTitle: 'topic',
    defaultColumns: ['topic', 'status', 'stage', 'stageStatus', 'targetMonth'],
    description:
      'Long-form theses, one a month. Set one to "Active" and the routine works through its stages.',
    group: 'Distribution',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req, data }) => {
      if (!req.user) return false
      if (!isBot(req.user)) return true

      // Only a human activates a thesis or declares it published. The bot
      // advances `stage` and `stageStatus`, which is the whole of its job, and
      // may not touch `status` at all. Without this it could promote its own
      // stage 7 proposals and spend a month's research on a topic nobody chose.
      return data?.status === undefined
    },
    delete: ({ req }) => Boolean(req.user) && !isBot(req.user),
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        // A routine-proposed topic must never arrive already active. The bot is
        // barred from writing `status` above, but a create carries defaults, so
        // the floor is set here too.
        if (operation === 'create' && isBot(req.user)) {
          data.status = 'proposed'
          data.proposedBy = 'routine'
          data.stage = 1
          data.stageStatus = 'ready'
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'topic',
      type: 'text',
      required: true,
      admin: { description: 'The subject, not the argument. The argument is decided at stage 1.' },
    },
    {
      name: 'brief',
      type: 'textarea',
      admin: {
        description:
          'The framing you want, in your words. Say what the topic is NOT, when the name is ambiguous: this is what stops stage 1 researching the wrong thing for a week.',
      },
    },
    {
      name: 'whyNow',
      type: 'textarea',
      admin: { description: 'Required on a routine proposal. Optional on one you write yourself.' },
    },
    {
      name: 'artifacts',
      type: 'array',
      labels: { singular: 'Artifact', plural: 'Artifacts' },
      admin: {
        description:
          'Paths in blog-research written by each stage. Appended by the routine, in order.',
        initCollapsed: true,
      },
      fields: [
        { name: 'stage', type: 'number', required: true },
        { name: 'path', type: 'text', required: true },
        { name: 'summary', type: 'textarea' },
      ],
    },
    {
      name: 'geography',
      type: 'select',
      options: [...geographyOptions],
      admin: { position: 'sidebar' },
    },
    {
      name: 'assetClass',
      type: 'select',
      options: [...assetClassOptions],
      admin: {
        position: 'sidebar',
        description:
          'Also picks the exemplar domain the routine reads: venture-capital reads exemplars/vc, private-equity reads exemplars/pe, cross reads exemplars/macro.',
      },
    },
    {
      name: 'sector',
      type: 'relationship',
      relationTo: 'sectors',
      admin: { position: 'sidebar' },
    },
    {
      name: 'targetMonth',
      type: 'text',
      admin: { position: 'sidebar', description: 'YYYY-MM. Which month this one is for.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'proposed',
      index: true,
      options: [
        { label: 'Proposed', value: 'proposed' },
        { label: 'Active', value: 'active' },
        { label: 'Published', value: 'published' },
        { label: 'Dropped', value: 'dropped' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Set to "Active" to start it. Only one should be active at a time.',
      },
    },
    {
      name: 'stage',
      type: 'number',
      required: true,
      defaultValue: 1,
      min: 1,
      max: 7,
      admin: {
        position: 'sidebar',
        description:
          '1 scope, 2 market, 3 counter-case, 4 model, 5 spine, 6 draft, 7 recommend. Gates after 1, 4 and 5.',
      },
    },
    {
      name: 'stageStatus',
      type: 'select',
      required: true,
      defaultValue: 'ready',
      index: true,
      options: [
        { label: 'Ready', value: 'ready' },
        { label: 'Awaiting review', value: 'awaiting-review' },
        { label: 'Blocked', value: 'blocked' },
        { label: 'Done', value: 'done' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Awaiting review auto-advances after 48 hours so a quiet month still ships. Set Blocked to stop that.',
      },
    },
    {
      name: 'stageEnteredAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'When the current stage status was set. The 48 hour clock counts from here.',
      },
    },
    {
      name: 'proposedBy',
      type: 'select',
      defaultValue: 'human',
      options: [
        { label: 'Human', value: 'human' },
        { label: 'Routine', value: 'routine' },
      ],
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'linkedPost',
      type: 'relationship',
      relationTo: 'posts',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Set by stage 6. Its presence is what prevents double-drafting.',
      },
    },
  ],
}
