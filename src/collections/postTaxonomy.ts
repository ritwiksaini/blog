// Central list of allowed Geography / Asset Class tag values.
//
// These two stay as `select` fields (Postgres enums) because they are
// deliberately closed sets: three geographies and two asset classes, decided
// up front and not expected to grow. Adding a value here requires a migration.
//
// Sector is deliberately NOT here — it's a relationship to the `sectors`
// collection so new sectors can be added from the admin UI (or by the drafting
// agent) as posts are written, without a code change or a migration.

export const geographyOptions = [
  { label: 'Global', value: 'global' },
  { label: 'India', value: 'india' },
  { label: 'United States', value: 'united-states' },
] as const

export const assetClassOptions = [
  { label: 'Private Equity', value: 'private-equity' },
  { label: 'Venture Capital', value: 'venture-capital' },
  { label: 'Cross', value: 'cross' },
] as const
