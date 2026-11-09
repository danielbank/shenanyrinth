/** Deeds: three public, first-come goals drawn at setup, one per tier. */
import { emit, findPlayer, type Ctx } from './context.ts';
import { DEEDS, STATS, type DeedTier } from './data.ts';
import { rnd } from './rng.ts';
import type { GameState, Player } from './types.ts';

const ACHIEVED: Record<string, (p: Player) => boolean> = {
  trailblazer: (p) => p.reachedDungeon,
  hunter: (p) => p.kills >= 3,
  nestegg: (p) => p.deposited >= 6,
  artist: (p) => p.shakedownWins >= 1,
  relic: (p) => p.relic,
  sense: (p) => p.cachesClaimed.length >= 1,
  collector: (p) => p.trinkets.length >= 1,
  firstblood: (p) => p.guardianWounds >= 1,
  pathfinder: (p) => p.dungeonStreak >= 5,
  deep: (p) => p.cachesClaimed.some((r) => r >= 3),
  master: (p) => STATS.some((s) => p.gear[s] >= 2),
  slayer: (p) => p.dungeonKills >= 3,
};

export function drawDeeds(g: GameState): void {
  g.deeds = (['easy', 'medium', 'hard'] as DeedTier[]).map((tier) => {
    const pool = DEEDS.filter((d) => d.tier === tier);
    return { id: pool[Math.floor(rnd(g) * pool.length)]!.id, claimedBy: null };
  });
}

/** After every action: the first Player to achieve an unclaimed Deed scores it, for good. */
export function checkDeeds(ctx: Ctx): void {
  const { g } = ctx;
  if (g.phase !== 'playing' && g.phase !== 'over') return;
  const current = g.turn ? findPlayer(g, g.turn.player) : undefined;
  const order = current ? [current, ...g.players.filter((p) => p !== current)] : g.players;
  for (const d of g.deeds) {
    if (d.claimedBy) continue;
    const winner = order.find((p) => ACHIEVED[d.id]!(p));
    if (!winner) continue;
    d.claimedBy = winner.id;
    const points = DEEDS.find((x) => x.id === d.id)!.points;
    emit(ctx, { type: 'deedClaimed', player: winner.id, deed: d.id, points });
  }
}
