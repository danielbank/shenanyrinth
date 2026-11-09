/** Torchlight reveals the squares around each piece, permanently and for everyone. */
import { stat } from './stats.ts';
import type { GameState, PathLevel, Player } from './types.ts';

/** Foresight: 3×3 at WIS 0–2, 5×5 at 3–4, 7×7 at 5 and up. */
export function torchRadius(p: Player): number {
  const wis = stat(p, 'WIS');
  return wis >= 5 ? 3 : wis >= 3 ? 2 : 1;
}

export function reveal(g: GameState, p: Player): void {
  if (p.level === 'town') return;
  revealArea(g, p.level, p.square, torchRadius(p), true);
}

/** Reveal the squares within r of a square; Torchlight (`lit`) also shows Caches there. */
export function revealArea(
  g: GameState,
  level: PathLevel,
  square: number,
  r: number,
  lit: boolean,
): void {
  const board = g.boards[level];
  const n = board.size;
  const x0 = square % n;
  const y0 = Math.floor(square / n);
  for (let y = Math.max(0, y0 - r); y <= Math.min(n - 1, y0 + r); y++) {
    for (let x = Math.max(0, x0 - r); x <= Math.min(n - 1, x0 + r); x++) {
      board.revealed[y * n + x] = true;
      if (lit) board.lit[y * n + x] = true;
    }
  }
}
