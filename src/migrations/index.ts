import * as migration_20260807_054819_initial from './20260807_054819_initial';
import * as migration_20260818_001924_add_sectors_assetclass_sources_pitches from './20260818_001924_add_sectors_assetclass_sources_pitches';
import * as migration_20260818_002448_drop_industry from './20260818_002448_drop_industry';
import * as migration_20260819_220803_add_subscribers from './20260819_220803_add_subscribers';
import * as migration_20260819_232242_add_subscriber_tokens from './20260819_232242_add_subscriber_tokens';
import * as migration_20260820_030038_add_newsletter_send_fields from './20260820_030038_add_newsletter_send_fields';

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
    name: '20260818_002448_drop_industry',
  },
  {
    up: migration_20260819_220803_add_subscribers.up,
    down: migration_20260819_220803_add_subscribers.down,
    name: '20260819_220803_add_subscribers',
  },
  {
    up: migration_20260819_232242_add_subscriber_tokens.up,
    down: migration_20260819_232242_add_subscriber_tokens.down,
    name: '20260819_232242_add_subscriber_tokens',
  },
  {
    up: migration_20260820_030038_add_newsletter_send_fields.up,
    down: migration_20260820_030038_add_newsletter_send_fields.down,
    name: '20260820_030038_add_newsletter_send_fields'
  },
];
