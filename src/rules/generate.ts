/** Random boards, drawn from each Level's Tile Mix with the seeded generator. */
import { DIRS, neighbour, rotate } from './board.ts';
import { DUNGEON, FOREST, SHAPES, type LevelConfig, type TileShape } from './data.ts';
import { rnd } from './rng.ts';
import type { Board, Dir, GameState } from './types.ts';

/** True when none of the Exits faces off the board. */
export function fits(size: number, square: number, exits: string): boolean {
  return [...exits].every((d) => neighbour(size, square, d as Dir) >= 0);
}

function isEdge(size: number, i: number) {
  const x = i % size;
  const y = Math.floor(i / size);
  return x === 0 || y === 0 || x === size - 1 || y === size - 1;
}

function isCorner(size: number, i: number) {
  const x = i % size;
  const y = Math.floor(i / size);
  return (x === 0 || x === size - 1) && (y === 0 || y === size - 1);
}

/** Every rotation of a shape's Exits that stays on the board at that square. */
export function rotationsThatFit(size: number, square: number, exits: string): string[] {
  return [...new Set([0, 1, 2, 3].map((k) => rotate(exits, k)))].filter((e) =>
    fits(size, square, e),
  );
}

function drawTile(g: GameState, cfg: LevelConfig, i: number): string {
  const { size, mix } = cfg;
  if (isEdge(size, i) && !isCorner(size, i) && rnd(g) < cfg.edgeT) {
    return DIRS.filter((d) => fits(size, i, d)).join('');
  }
  let pool = (Object.keys(SHAPES) as TileShape[]).filter((k) => mix[k] > 0);
  for (;;) {
    const total = pool.reduce((a, k) => a + mix[k], 0);
    let r = rnd(g) * total;
    const shape = pool.find((k) => (r -= mix[k]) < 0) ?? pool[pool.length - 1]!;
    const options = rotationsThatFit(size, i, SHAPES[shape]);
    if (options.length) return options[Math.floor(rnd(g) * options.length)]!;
    pool = pool.filter((k) => k !== shape);
  }
}

export function generateTiles(g: GameState, cfg: LevelConfig): string[] {
  return Array.from({ length: cfg.size * cfg.size }, (_, i) => drawTile(g, cfg, i));
}

/** A random non-corner square on one edge. */
export function edgeSquare(g: GameState, size: number, side: Dir): number {
  const k = 1 + Math.floor(rnd(g) * (size - 2));
  return { N: k, S: (size - 1) * size + k, W: k * size, E: k * size + size - 1 }[side];
}

function emptyBoard(g: GameState, cfg: LevelConfig): Board {
  return {
    size: cfg.size,
    tiles: generateTiles(g, cfg),
    revealed: Array.from({ length: cfg.size * cfg.size }, () => false),
    features: {},
    tokens: {},
    mobs: {},
    piles: {},
  };
}

export function generateDungeon(g: GameState): Board {
  return emptyBoard(g, DUNGEON);
}

export function generateForest(g: GameState): Board {
  const size = FOREST.size;
  const board = emptyBoard(g, FOREST);
  for (const side of DIRS) board.features[edgeSquare(g, size, side)] = { type: 'gate', side };
  return board;
}
