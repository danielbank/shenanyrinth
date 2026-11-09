/**
 * The Kenney CC0 sprites the game draws, as committed in `public/art/` (see `SOURCES.md` there).
 * Every sprite is a 16×16 cell of a packed sheet, shown at a whole-number scale. (A sprite is
 * art only; a board Tile is a set of Exits, see GLOSSARY.md.)
 */
import type { Building, Hero } from '../../rules/index.ts';

export type SheetName = 'town' | 'dungeon' | 'creatures' | 'oneBit';

export const SHEETS: Record<SheetName, { file: string; cols: number; w: number; h: number }> = {
  town: { file: 'tiny-town.png', cols: 12, w: 192, h: 176 },
  dungeon: { file: 'tiny-dungeon.png', cols: 12, w: 192, h: 176 },
  creatures: { file: 'tiny-creatures.png', cols: 10, w: 160, h: 288 },
  oneBit: { file: 'one-bit.png', cols: 48, w: 768, h: 352 },
};

export interface SpriteRef {
  sheet: SheetName;
  index: number;
}

/** Where a sprite sits in its sheet, as CSS background (or mask) values at a scale. */
export function sheetPlacement(sprite: SpriteRef, scale: number) {
  const sheet = SHEETS[sprite.sheet];
  const size = 16 * scale;
  const col = sprite.index % sheet.cols;
  const row = Math.floor(sprite.index / sheet.cols);
  return {
    size,
    image: `url(/art/${sheet.file})`,
    sheetSize: `${sheet.w * scale}px ${sheet.h * scale}px`,
    position: `${-col * size}px ${-row * size}px`,
  };
}

const town = (index: number): SpriteRef => ({ sheet: 'town', index });
const dungeon = (index: number): SpriteRef => ({ sheet: 'dungeon', index });
/** Tiny Creatures, by the `Tiles/tile_NNNN.png` number the Starter mob roster uses. */
const creature = (n: number): SpriteRef => ({ sheet: 'creatures', index: n - 1 });
const oneBit = (index: number): SpriteRef => ({ sheet: 'oneBit', index });

export const HERO_SPRITES: Record<Hero, SpriteRef> = {
  knight: dungeon(96),
  wizard: dungeon(84),
  rogue: dungeon(86),
  cleric: dungeon(100),
  ranger: dungeon(112),
  bard: dungeon(99),
};

export const MOB_SPRITES: Record<string, SpriteRef> = {
  Goblin: creature(11),
  Myconid: creature(14),
  Pixie: creature(13),
  'Dire Wolf': creature(24),
  Bandit: creature(20),
  Treant: creature(114),
  Skeleton: creature(2),
  Wraith: creature(5),
  Gazer: creature(6),
  'Cave Troll': creature(43),
  Necromancer: creature(66),
  'Red Wyrm': creature(34),
};

export const BUILDING_SPRITES: Record<Building, SpriteRef> = {
  keepHall: town(86),
  blacksmith: town(115),
  apothecary: town(131),
  arcanist: town(128),
  guild: town(95),
};

export const GATE_SPRITE = town(112);
export const STAIRS_DOWN_SPRITE = town(103);
export const STAIRS_UP_SPRITE = dungeon(39);

export const TOKEN_SPRITES = {
  gold: town(93),
  herbs: town(17),
  artifacts: creature(100),
  pile: town(106),
  cache: dungeon(89),
} satisfies Record<string, SpriteRef>;

/** Ground under each square, varied by square so the board doesn't repeat visibly. */
export const GROUND = {
  grass: [town(0), town(1), town(0), town(2), town(0)],
  forestFog: town(19),
  dungeonFloor: [48, 49, 50, 51, 52, 53].map(dungeon),
  dungeonRock: [0, 12, 24].map(dungeon),
} satisfies Record<string, SpriteRef | SpriteRef[]>;

/** A stable pick from a list of variants for a square. */
export function variant<T>(list: readonly T[], square: number): T {
  let h = Math.imul(square ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return list[(h >>> 0) % list.length]!;
}

/** HUD icons from the 1-Bit Pack, each tinted to a Tiny colour. */
export const ICON_SPRITES = {
  heart: { sprite: oneBit(519), colour: '#e0533d' },
  pivot: { sprite: oneBit(1032), colour: '#ff9a3c' },
  sway: { sprite: oneBit(996), colour: '#e89ad8' },
  resist: { sprite: oneBit(229), colour: '#7ec8e3' },
  doom: { sprite: oneBit(610), colour: '#e8e2d0' },
  deeds: { sprite: oneBit(753), colour: '#f2c14e' },
  clash: { sprite: oneBit(558), colour: '#c8cdd2' },
  coin: { sprite: oneBit(185), colour: '#f2c14e' },
  herb: { sprite: oneBit(557), colour: '#6fbf5a' },
  artifact: { sprite: oneBit(513), colour: '#7ec8e3' },
  dice: { sprite: oneBit(765), colour: '#f4e9d8' },
  pack: { sprite: oneBit(287), colour: '#b98a55' },
  slot: { sprite: oneBit(745), colour: '#b9a78f' },
  trophy: { sprite: oneBit(808), colour: '#f2c14e' },
  close: { sprite: oneBit(664), colour: '#e0533d' },
  volume: { sprite: oneBit(806), colour: '#f4e9d8' },
} satisfies Record<string, { sprite: SpriteRef; colour: string }>;

/** Every sprite reference, named, for the committed-art check. */
export const ALL_SPRITES: [string, SpriteRef][] = [
  ...Object.entries(HERO_SPRITES),
  ...Object.entries(MOB_SPRITES),
  ...Object.entries(BUILDING_SPRITES),
  ['gate', GATE_SPRITE],
  ['stairs down', STAIRS_DOWN_SPRITE],
  ['stairs up', STAIRS_UP_SPRITE],
  ...Object.entries(TOKEN_SPRITES),
  ...Object.entries(GROUND).flatMap(([k, v]) =>
    (Array.isArray(v) ? v : [v]).map((t, i): [string, SpriteRef] => [`${k} ${i}`, t]),
  ),
  ...Object.entries(ICON_SPRITES).map(([k, v]): [string, SpriteRef] => [`icon ${k}`, v.sprite]),
];
