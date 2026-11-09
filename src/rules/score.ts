import type { GameState, Player, PlayerId, Score } from './types.ts';

export function score(p: Player): Score {
  const pack = Math.floor(p.pack.gold / 2);
  return { player: p.id, keep: p.keep, pack, total: p.keep + pack + p.trophies };
}

/** The score everyone can see: it leaves out Pack Gold. */
export function publicScore(p: Player): number {
  return p.keep + p.trophies;
}

export function winners(g: GameState): PlayerId[] {
  const best = Math.max(...g.players.map((p) => score(p).total));
  return g.players.filter((p) => score(p).total === best).map((p) => p.id);
}
