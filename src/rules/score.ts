import { DEEDS } from './data.ts';
import type { GameState, Player, PlayerId, Score } from './types.ts';

export function deedPoints(g: GameState, p: Player): number {
  return g.deeds
    .filter((d) => d.claimedBy === p.id)
    .reduce((a, d) => a + (DEEDS.find((x) => x.id === d.id)?.points ?? 0), 0);
}

export function score(g: GameState, p: Player): Score {
  const pack = Math.floor(p.pack.gold / 2);
  const deeds = deedPoints(g, p);
  return {
    player: p.id,
    keep: p.keep,
    pack,
    trophies: p.trophies,
    deeds,
    trinkets: p.trinkets.length,
    total: p.keep + pack + p.trophies + deeds + p.trinkets.length,
  };
}

/** The score everyone can see: it leaves out Pack Gold. */
export function publicScore(g: GameState, p: Player): number {
  return p.keep + p.trophies + deedPoints(g, p) + p.trinkets.length;
}

/** Most points; ties go to most Trophies, then the feat; if still tied, they share the win. */
export function winners(g: GameState): PlayerId[] {
  const rank = (p: Player) => [score(g, p).total, p.trophies, p.feat ? 1 : 0];
  let best = g.players;
  for (let k = 0; k < 3; k++) {
    const top = Math.max(...best.map((p) => rank(p)[k]!));
    best = best.filter((p) => rank(p)[k] === top);
  }
  return best.map((p) => p.id);
}
