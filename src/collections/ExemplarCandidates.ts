import type { CollectionConfig } from 'payload'

import { isBot } from '../access/roles'

/**
 * The exemplar approval queue.
 *
 * This used to be `exemplars/_candidates.yml`, approved by hand-editing the file
 * and remembering to commit and push it before the routine could see it. That
 * is not an interface: it made a one-click decision into a four-step chore, and
 * a decision left uncommitted did nothing at all while looking done.
 *
 * The teardowns themselves stay in `blog-research`. Only the *decision* lives
 * here, which is the part a person makes.
 */
export const ExemplarCandidates: CollectionConfig = {
  slug: 'exemplar-candidates',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publisher', 'domain', 'kind', 'status'],
    description:
      'Research the harvest wants to tear down. Approve the ones worth imitating; declining with a reason is just as useful.',
    group: 'Distribution',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req, data }) => {
      if (!req.user) return false
      if (!isBot(req.user)) return true

      // The routine proposes and reports outcomes. It may never approve or
      // decline: the whole value of this corpus is that a person judged every
      // piece in it worth imitating, and a bot approving its own shortlist
      // would quietly remove the only quality gate there is.
      if (data?.status === undefined) return true
      return data.status === 'unreachable' || data.status === 'done'
    },
    delete: ({ req }) => Boolean(req.user) && !isBot(req.user),
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && isBot(req.user)) {
          data.status = 'proposed'
        }
        // Readable in a list view, which a bare URL is not.
        if (!data?.title && data?.publisher) {
          data.title = `${data.publisher}: ${String(data.url ?? '').split('/').filter(Boolean).pop() ?? ''}`
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: { description: 'Set from the publisher and URL when the routine proposes it.' },
    },
    { name: 'publisher', type: 'text', required: true },
    { name: 'url', type: 'text', required: true },
    {
      name: 'why',
      type: 'textarea',
      admin: {
        description:
          'Which gap in the coverage grid this fills, and what it teaches structurally. This is what you are judging.',
      },
    },
    {
      name: 'declineReason',
      type: 'textarea',
      admin: {
        description:
          'Why this is not worth imitating. Recorded so the same piece is never proposed again, which makes declining as useful as approving.',
        condition: (data) => data?.status === 'declined',
      },
    },
    {
      name: 'teardownPath',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Set by the harvest once the teardown is written.',
        condition: (data) => Boolean(data?.teardownPath),
      },
    },
    {
      name: 'domain',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Venture capital', value: 'vc' },
        { label: 'Private equity', value: 'pe' },
        { label: 'Macro', value: 'macro' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'kind',
      type: 'select',
      options: [
        { label: 'Thesis', value: 'thesis' },
        { label: 'Market map', value: 'market-map' },
        { label: 'Case study', value: 'case-study' },
        { label: 'Annual letter', value: 'annual-letter' },
        { label: 'Diligence memo', value: 'diligence-memo' },
        { label: 'Regime read', value: 'regime-read' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'industries',
      type: 'text',
      admin: { position: 'sidebar', description: 'Comma separated.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'proposed',
      index: true,
      options: [
        { label: 'Proposed', value: 'proposed' },
        { label: 'Approved', value: 'approved' },
        { label: 'Declined', value: 'declined' },
        { label: 'Unreachable', value: 'unreachable' },
        { label: 'Done', value: 'done' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Approved gets torn down on the next harvest. Unreachable means the routine could not read it, usually bot protection.',
      },
    },
    {
      name: 'decision',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/components/ExemplarDecisionButtons#ExemplarDecisionButtons' },
      },
    },
  ],
}
