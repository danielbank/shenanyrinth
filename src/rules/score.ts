import type { GameState, Player, PlayerId, Score } from './types.ts';

export function score(p: Player): Score {
  const pack = Math.floor(p.pack.gold / 2);
  return { player: p.id, keep: p.keep, pack, total: p.keep + pack + p.trophies };
}

/** The score everyone can see: it leaves out Pack Gold. */
export function publicScore(p: Player): number {
  return p.keep + p.trophies;
}

/** Most points; ties go to most Trophies, then the feat; if still tied, they share the win. */
export function winners(g: GameState): PlayerId[] {
  const rank = (p: Player) => [score(p).total, p.trophies, p.feat ? 1 : 0];
  let best = g.players;
  for (let k = 0; k < 3; k++) {
    const top = Math.max(...best.map((p) => rank(p)[k]!));
    best = best.filter((p) => rank(p)[k] === top);
  }
  return best.map((p) => p.id);
}
