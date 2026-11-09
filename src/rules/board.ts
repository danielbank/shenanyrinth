/** Square geometry: squares are indexed y * size + x. */
import type { Dir } from './types.ts';

export const DIRS: readonly Dir[] = ['N', 'E', 'S', 'W'];
const DELTA: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
export const OPPOSITE: Record<Dir, Dir> = { N: 'S', E: 'W', S: 'N', W: 'E' };

/** The square one step from `square` in `dir`, or -1 off the board. */
export function neighbour(size: number, square: number, dir: Dir): number {
  const [dx, dy] = DELTA[dir];
  const x = (square % size) + dx;
  const y = Math.floor(square / size) + dy;
  return x < 0 || y < 0 || x >= size || y >= size ? -1 : y * size + x;
}

const ORDER: Record<Dir, number> = { N: 0, E: 1, S: 2, W: 3 };

/** Exits turned clockwise by k quarter turns, in N E S W order. */
export function rotate(exits: string, k: number): string {
  return [...exits]
    .map((d) => DIRS[(ORDER[d as Dir] + k) % 4]!)
    .sort((a, b) => ORDER[a] - ORDER[b])
    .join('');
}
