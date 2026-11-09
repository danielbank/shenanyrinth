/** Tokens, piles and what a Player collects from every square they pass over. */
import { emit, type Ctx } from './context.ts';
import { CACHES, LEVELS, LOOT_NEEDS } from './data.ts';
import { dropLoot } from './loot.ts';
import { stat } from './stats.ts';
import { die, rnd } from './rng.ts';
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
        !board.mobs[i] &&
        !g.players.some((p) => p.level === level && p.square === i),
    );
  return free.length ? free[Math.floor(rnd(g) * free.length)]! : -1;
}

export function makeToken(g: GameState, level: PathLevel, type: Token['type']): Token {
  const cfg = LEVELS[level];
  if (type === 'gold') {
    return { type, amount: cfg.goldMin + Math.floor(rnd(g) * (cfg.goldMax - cfg.goldMin + 1)) };
  }
  if (type === 'cache') {
    const c = CACHES[level];
    return { type, rating: c.min + Math.floor(rnd(g) * (c.max - c.min + 1)) };
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
  for (let i = 0; i < CACHES[level].count; i++) placeToken(g, level, 'cache');
}

/** Collect everything collectable on the Player's square. */
export function collect(ctx: Ctx, p: Player): void {
  if (p.level === 'town') return;
  const level = p.level;
  const board = ctx.g.boards[level];
  const found = board.tokens[p.square];
  if (found?.type === 'cache') {
    if (stat(p, 'INT') >= found.rating) claimCache(ctx, p, level, found.rating);
    return collectRest(ctx, p, null);
  }
  collectRest(ctx, p, found ?? null);
}

function collectRest(ctx: Ctx, p: Player, token: Token | null): void {
  if (p.level === 'town') return;
  const level = p.level;
  const board = ctx.g.boards[level];
  const pile = board.piles[p.square] ?? null;
  if (!token && !pile) return;
  if (token && token.type !== 'cache') {
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

/** A Cache pays its Gold and Material, may drop Loot, and respawns; only INT-worthy Players hear of it. */
function claimCache(ctx: Ctx, p: Player, level: PathLevel, rating: number): void {
  const { g } = ctx;
  const c = CACHES[level];
  delete g.boards[level].tokens[p.square];
  p.pack.gold += c.gold;
  p.pack[c.material] += 1;
  p.cachesClaimed.push(rating);
  const only = g.players.filter((q) => stat(q, 'INT') >= rating).map((q) => q.id);
  emit(ctx, { type: 'cacheClaimed', player: p.id, rating, only });
  if (die(g, 6) >= LOOT_NEEDS.cache) dropLoot(ctx, p);
  placeToken(g, level, 'cache');
}
