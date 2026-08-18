import * as migration_20260807_054819_initial from './20260807_054819_initial';
import * as migration_20260818_001924_add_sectors_assetclass_sources_pitches from './20260818_001924_add_sectors_assetclass_sources_pitches';
import * as migration_20260818_002448_drop_industry from './20260818_002448_drop_industry';

export const migrations = [
  {
    up: migration_20260807_054819_initial.up,
    down: migration_20260807_054819_initial.down,
    name: '20260807_054819_initial',
  },
  {
    up: migration_20260818_001924_add_sectors_assetclass_sources_pitches.up,
    down: migration_20260818_001924_add_sectors_assetclass_sources_pitches.down,
    name: '20260818_001924_add_sectors_assetclass_sources_pitches',
  },
  {
    up: migration_20260818_002448_drop_industry.up,
    down: migration_20260818_002448_drop_industry.down,
    name: '20260818_002448_drop_industry'
  },
];
