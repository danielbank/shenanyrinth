import type { GameState } from './types.ts';

/** mulberry32: the next float in [0, 1) from the seeded generator stored in the state. */
export function rnd(g: GameState): number {
  let t = (g.rng = (g.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A die roll 1..faces; tests can queue results in `g.forced`. */
export function die(g: GameState, faces: number): number {
  const forced = g.forced.shift();
  if (forced !== undefined) return forced;
  return 1 + Math.floor(rnd(g) * faces);
}

export function shuffle<T>(g: GameState, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(g) * (i + 1));
    [items[i], items[j]] = [items[j] as T, items[i] as T];
  }
  return items;
}
