/** Torchlight reveals the squares around each piece, permanently and for everyone. */
import type { GameState, PathLevel, Player } from './types.ts';

export function torchRadius(_p: Player): number {
  return 1;
}

export function reveal(g: GameState, p: Player): void {
  if (p.level === 'town') return;
  revealArea(g, p.level, p.square, torchRadius(p));
}

export function revealArea(g: GameState, level: PathLevel, square: number, r: number): void {
  const board = g.boards[level];
  const n = board.size;
  const x0 = square % n;
  const y0 = Math.floor(square / n);
  for (let y = Math.max(0, y0 - r); y <= Math.min(n - 1, y0 + r); y++) {
    for (let x = Math.max(0, x0 - r); x <= Math.min(n - 1, x0 + r); x++) {
      board.revealed[y * n + x] = true;
    }
  }
}
