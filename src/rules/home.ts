/** Being sent home to the Keep: what Lost and Knocked Out both do. */
import { emit, type Ctx } from './context.ts';
import { TOWN } from './data.ts';
import { maxHp } from './stats.ts';
import { endTurn } from './turns.ts';
import type { Pack, Player } from './types.ts';

/** Drop half the Pack's Gold and Materials (keeping the larger half) where the Player fell. */
function dropHalf(ctx: Ctx, p: Player): void {
  if (p.level === 'town') return;
  const drop: Pack = {
    gold: Math.floor(p.pack.gold / 2),
    herbs: Math.floor(p.pack.herbs / 2),
    artifacts: Math.floor(p.pack.artifacts / 2),
  };
  if (drop.gold + drop.herbs + drop.artifacts === 0) return;
  p.pack.gold -= drop.gold;
  p.pack.herbs -= drop.herbs;
  p.pack.artifacts -= drop.artifacts;
  const piles = ctx.g.boards[p.level].piles;
  const pile = piles[p.square] ?? { gold: 0, herbs: 0, artifacts: 0 };
  piles[p.square] = {
    gold: pile.gold + drop.gold,
    herbs: pile.herbs + drop.herbs,
    artifacts: pile.artifacts + drop.artifacts,
  };
  emit(ctx, { type: 'dropped', player: p.id, level: p.level, square: p.square, pile: drop });
}

export function sendHome(ctx: Ctx, p: Player): void {
  dropHalf(ctx, p);
  p.level = 'town';
  p.square = TOWN.keepHall;
  p.hp = maxHp(p);
  p.dungeonStreak = 0;
  if (p.pack.artifacts >= 2) p.relic = true;
  emit(ctx, { type: 'sentHome', player: p.id });
  endTurn(ctx);
}

/** Arriving at your Keep restores full HP. */
export function arriveInTown(ctx: Ctx, p: Player): void {
  const building = TOWN.buildings[p.square];
  const turn = ctx.g.turn!;
  if (building && !turn.passed.includes(building)) turn.passed.push(building);
  if (building === 'keepHall' && p.hp < maxHp(p)) {
    p.hp = maxHp(p);
    emit(ctx, { type: 'healed', player: p.id, hp: p.hp });
  }
}
