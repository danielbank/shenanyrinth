/** The game's fixed tables. Every number comes from docs/spec.md. */
import type { Building, Dir } from './types.ts';

export const HEROES = ['knight', 'wizard', 'rogue', 'cleric', 'ranger', 'bard'] as const;
export const COLOURS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;
export const STATS = ['STR', 'DEX', 'INT', 'WIS', 'CON', 'CHA'] as const;

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;
export const SETUP_POINTS = 6;
export const SETUP_MAX_PER_STAT = 3;
export const HP_BASE = 4;

/** Rounds before the Doom Track ends the game, by Player count. */
export const DOOM_TRACK: Record<number, number> = { 2: 30, 3: 24, 4: 20, 5: 19, 6: 18 };

export const TOWN = {
  size: 5,
  keepHall: 12,
  buildings: {
    7: 'blacksmith',
    11: 'guild',
    12: 'keepHall',
    13: 'apothecary',
    17: 'arcanist',
  } as Record<number, Building>,
  gates: { 2: 'N', 10: 'W', 14: 'E', 22: 'S' } as Record<number, Dir>,
};
