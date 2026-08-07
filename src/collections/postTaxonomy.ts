// Central list of allowed Geography / Industry tag values.
// Single-admin, low-volume blog: extend these lists in code as new posts need
// a value that doesn't exist yet, rather than modeling geography/industry as
// separate relationship collections managed through the admin UI.

export const geographyOptions = [
  { label: 'Global', value: 'global' },
  { label: 'India', value: 'india' },
  { label: 'United States', value: 'united-states' },
] as const

export const industryOptions = [
  { label: 'Private Equity', value: 'private-equity' },
  { label: 'Venture Capital', value: 'venture-capital' },
  { label: 'Data Centers', value: 'data-centers' },
  { label: 'Nuclear Energy', value: 'nuclear-energy' },
] as const
