/**
 * The in-house 16×16 drawings, in the Tiny palette: the path overlays for the Forest and the
 * Dungeon, and three HUD icons Kenney's packs don't have. Each character is a palette key;
 * `.` is transparent.
 */
import type { Dir, PathLevel } from '../../rules/index.ts';

export type Drawing = { rows: string[]; palette: Record<string, string> };

/** The four path shapes, each drawn once with these Exits and rotated in CSS for the rest. */
const BASE: Record<string, string> = { straight: 'NS', bend: 'NE', t: 'ESW', cross: 'NESW' };
const CLOCKWISE: Record<Dir, Dir> = { N: 'E', E: 'S', S: 'W', W: 'N' };

const turn = (exits: string, quarters: number): string => {
  let out = [...exits] as Dir[];
  for (let i = 0; i < quarters; i++) out = out.map((d) => CLOCKWISE[d]);
  return out.sort().join('');
};

/** Which drawing a square's Exits use, and how many quarter turns clockwise it is rotated. */
export function pathShape(exits: string): { shape: string; quarters: number } | null {
  const want = [...exits].sort().join('');
  for (const [shape, base] of Object.entries(BASE)) {
    for (let q = 0; q < 4; q++) if (turn(base, q) === want) return { shape, quarters: q };
  }
  return null;
}

/** Paints a path of the given Exits: a 6-pixel band with a darker rim and a few flecks. */
function paint(exits: string): string[] {
  const g = Array.from({ length: 16 }, () => Array<string>(16).fill('.'));
  const on = (x: number, y: number) => {
    if (x < 5 || x > 10 || y < 5 || y > 10) {
      if (y < 5 && !(exits.includes('N') && x >= 5 && x <= 10)) return false;
      if (y > 10 && !(exits.includes('S') && x >= 5 && x <= 10)) return false;
      if (x < 5 && !(exits.includes('W') && y >= 5 && y <= 10)) return false;
      if (x > 10 && !(exits.includes('E') && y >= 5 && y <= 10)) return false;
    }
    return true;
  };
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!on(x, y)) continue;
      const rim = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => {
        const nx = x + dx!;
        const ny = y + dy!;
        return nx >= 0 && nx < 16 && ny >= 0 && ny < 16 && !on(nx, ny);
      });
      g[y]![x] = rim ? 'r' : (x * 7 + y * 13) % 17 === 0 ? 'f' : 'p';
    }
  }
  return g.map((row) => row.join(''));
}

const PALETTE: Record<PathLevel, Record<string, string>> = {
  /** A dirt trail on grass, in Tiny Town's dirt colours. */
  forest: { p: '#eaa56c', r: '#cf8254', f: '#fec99c' },
  /** A stone corridor, in Tiny Dungeon's wall colours. */
  dungeon: { p: '#8b9bb4', r: '#52607c', f: '#c0cbdc' },
};

export const PATH_DRAWINGS: Record<PathLevel, Record<string, Drawing>> = {
  forest: Object.fromEntries(
    Object.entries(BASE).map(([k, e]) => [k, { rows: paint(e), palette: PALETTE.forest }]),
  ),
  dungeon: Object.fromEntries(
    Object.entries(BASE).map(([k, e]) => [k, { rows: paint(e), palette: PALETTE.dungeon }]),
  ),
};

/** The three in-house HUD icons, as 16×16 masks (`x`) tinted to a Tiny colour. */
export const IN_HOUSE_ICONS = {
  hand: {
    colour: '#f2c49b',
    rows: [
      '................',
      '......xx........',
      '...xx.xx.xx.....',
      '...xx.xx.xx.....',
      '...xx.xx.xx.xx..',
      '...xx.xx.xx.xx..',
      '...xx.xx.xx.xx..',
      '...xxxxxxxxxxx..',
      'xx.xxxxxxxxxxx..',
      'xxxxxxxxxxxxxx..',
      '.xxxxxxxxxxxxx..',
      '..xxxxxxxxxxxx..',
      '...xxxxxxxxxx...',
      '....xxxxxxxxx...',
      '.....xxxxxxx....',
      '................',
    ],
  },
  info: {
    colour: '#7ec8e3',
    rows: [
      '................',
      '.....xxxxxx.....',
      '...xxxxxxxxxx...',
      '..xxxxx..xxxxx..',
      '..xxxxx..xxxxx..',
      '.xxxxxxxxxxxxxx.',
      '.xxxxx...xxxxxx.',
      '.xxxxxx..xxxxxx.',
      '.xxxxxx..xxxxxx.',
      '.xxxxxx..xxxxxx.',
      '.xxxxxx..xxxxxx.',
      '..xxxx....xxxx..',
      '..xxxxxxxxxxxx..',
      '...xxxxxxxxxx...',
      '.....xxxxxx.....',
      '................',
    ],
  },
  mute: {
    colour: '#f4e9d8',
    rows: [
      '................',
      '................',
      '.....x..........',
      '....xx..........',
      '...xxx..........',
      'xxxxxx..x....x..',
      'xxxxxx...x..x...',
      'xxxxxx....xx....',
      'xxxxxx....xx....',
      'xxxxxx...x..x...',
      'xxxxxx..x....x..',
      '...xxx..........',
      '....xx..........',
      '.....x..........',
      '................',
      '................',
    ],
  },
} satisfies Record<string, { colour: string; rows: string[] }>;
