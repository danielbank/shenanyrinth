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

export const APPROACHES = ['Fight', 'Magic', 'Trickery'] as const;
export type ApproachName = (typeof APPROACHES)[number];
export const APPROACH_STAT = { Fight: 'STR', Magic: 'INT', Trickery: 'DEX' } as const;

export interface MobDef {
  name: string;
  dice: Record<ApproachName, number>;
  /** The ★ Approach: its smallest die. */
  weak: ApproachName;
  wounds: number;
  damage: number;
  trophy: number;
  gold: number;
}

const forestMob = (
  name: string,
  Fight: number,
  Magic: number,
  Trickery: number,
  wounds: number,
  gold: number,
): MobDef => ({
  name,
  dice: { Fight, Magic, Trickery },
  weak: Fight < Magic && Fight < Trickery ? 'Fight' : Magic < Trickery ? 'Magic' : 'Trickery',
  wounds,
  damage: 1,
  trophy: 1,
  gold,
});

export const FOREST_MOBS: MobDef[] = [
  forestMob('Goblin', 8, 8, 6, 1, 1),
  forestMob('Myconid', 6, 8, 10, 1, 1),
  forestMob('Pixie', 10, 6, 8, 1, 1),
  forestMob('Dire Wolf', 6, 8, 10, 2, 2),
  forestMob('Bandit', 6, 8, 10, 2, 2),
  forestMob('Treant', 10, 6, 8, 2, 2),
];

const dungeonMob = (
  name: string,
  Fight: number,
  Magic: number,
  Trickery: number,
  wounds: number,
  trophy: number,
  gold: number,
): MobDef => ({ ...forestMob(name, Fight, Magic, Trickery, wounds, gold), damage: 2, trophy });

export const DUNGEON_MOBS: MobDef[] = [
  dungeonMob('Skeleton', 8, 12, 12, 2, 2, 3),
  dungeonMob('Wraith', 12, 8, 10, 2, 2, 3),
  dungeonMob('Gazer', 10, 12, 8, 2, 2, 3),
  dungeonMob('Cave Troll', 12, 8, 10, 3, 3, 5),
  dungeonMob('Necromancer', 8, 12, 12, 3, 3, 5),
];

/** The Guardian pays per Wound instead of on the kill. */
export const GUARDIAN: MobDef = {
  name: 'Red Wyrm',
  dice: { Fight: 12, Magic: 10, Trickery: 8 },
  weak: 'Trickery',
  wounds: 3,
  damage: 3,
  trophy: 0,
  gold: 0,
};
export const GUARDIAN_TROPHIES_PER_WOUND = 2;
export const GUARDIAN_BONUS = 5;

export const MOBS: Record<string, MobDef> = Object.fromEntries(
  [...FOREST_MOBS, ...DUNGEON_MOBS, GUARDIAN].map((m) => [m.name, m]),
);
