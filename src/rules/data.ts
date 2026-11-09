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

export type TileShape = 'straight' | 'bend' | 't' | 'cross';
export const SHAPES: Record<TileShape, string> = {
  straight: 'NS',
  bend: 'NE',
  t: 'ESW',
  cross: 'NESW',
};

export interface LevelConfig {
  size: number;
  mix: Record<TileShape, number>;
  /** Chance that a non-corner edge square is an inward T-junction. */
  edgeT: number;
  goldTokens: number;
  goldMin: number;
  goldMax: number;
  material: 'herbs' | 'artifacts';
  materialTokens: number;
}

export const FOREST: LevelConfig = {
  size: 9,
  mix: { straight: 50, bend: 20, t: 20, cross: 10 },
  edgeT: 0.5,
  goldTokens: 6,
  goldMin: 1,
  goldMax: 2,
  material: 'herbs',
  materialTokens: 4,
};

export const DUNGEON: LevelConfig = {
  size: 7,
  mix: { straight: 5, bend: 75, t: 15, cross: 5 },
  edgeT: 0.5,
  goldTokens: 5,
  goldMin: 3,
  goldMax: 5,
  material: 'artifacts',
  materialTokens: 5,
};

export const LEVELS = { forest: FOREST, dungeon: DUNGEON };
