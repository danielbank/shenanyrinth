/** Tokens, piles and what a Player collects from every square they pass over. */
import { emit, type Ctx } from './context.ts';
import { LEVELS } from './data.ts';
import { rnd } from './rng.ts';
import type { GameState, PathLevel, Player, Token } from './types.ts';

/** A random square with no Feature, token, pile or piece on it, or -1. */
export function emptySquare(g: GameState, level: PathLevel): number {
  const board = g.boards[level];
  const free = board.tiles
    .map((_, i) => i)
    .filter(
      (i) =>
        !board.features[i] &&
        !board.tokens[i] &&
        !board.piles[i] &&
        !g.players.some((p) => p.level === level && p.square === i),
    );
  return free.length ? free[Math.floor(rnd(g) * free.length)]! : -1;
}

export function makeToken(g: GameState, level: PathLevel, type: Token['type']): Token {
  const cfg = LEVELS[level];
  if (type === 'gold') {
    return { type, amount: cfg.goldMin + Math.floor(rnd(g) * (cfg.goldMax - cfg.goldMin + 1)) };
  }
  return { type };
}

export function placeToken(g: GameState, level: PathLevel, type: Token['type']): void {
  const square = emptySquare(g, level);
  if (square >= 0) g.boards[level].tokens[square] = makeToken(g, level, type);
}

export function seedTokens(g: GameState, level: PathLevel): void {
  const cfg = LEVELS[level];
  for (let i = 0; i < cfg.goldTokens; i++) placeToken(g, level, 'gold');
  for (let i = 0; i < cfg.materialTokens; i++) placeToken(g, level, cfg.material);
}

/** Collect everything collectable on the Player's square. */
export function collect(ctx: Ctx, p: Player): void {
  if (p.level === 'town') return;
  const level = p.level;
  const board = ctx.g.boards[level];
  const token = board.tokens[p.square] ?? null;
  const pile = board.piles[p.square] ?? null;
  if (!token && !pile) return;
  if (token) {
    delete board.tokens[p.square];
    if (token.type === 'gold') p.pack.gold += token.amount;
    else p.pack[token.type] += 1;
  }
  if (pile) {
    delete board.piles[p.square];
    p.pack.gold += pile.gold;
    p.pack.herbs += pile.herbs;
    p.pack.artifacts += pile.artifacts;
  }
  emit(ctx, { type: 'pickedUp', player: p.id, level, square: p.square, token, pile });
  if (token) placeToken(ctx.g, level, token.type);
}
