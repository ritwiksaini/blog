import * as migration_20260807_054819_initial from './20260807_054819_initial';

export const migrations = [
  {
    up: migration_20260807_054819_initial.up,
    down: migration_20260807_054819_initial.down,
    name: '20260807_054819_initial'
  },
];
