/** Mobs, Ambushes and Clashes made of Exchanges. */
import { emit, type Ctx } from './context.ts';
import { APPROACHES, APPROACH_STAT, MOBS, type MobDef } from './data.ts';
import { emptySquare } from './pickups.ts';
import { sendHome } from './home.ts';
import { die, shuffle } from './rng.ts';
import { stat } from './stats.ts';
import type { Action, Approach, GameState, PathLevel, Player } from './types.ts';

export function mobDef(kind: string): MobDef {
  return MOBS[kind]!;
}

export function seedMobs(g: GameState, level: PathLevel, roster: MobDef[]): void {
  for (const def of shuffle(g, [...roster])) {
    const square = emptySquare(g, level);
    if (square >= 0) g.boards[level].mobs[square] = { kind: def.name, wounds: 0 };
  }
}

/** The Mob on the Player's square, if any. */
export function mobUnder(g: GameState, p: Player) {
  return p.level === 'town' ? undefined : g.boards[p.level].mobs[p.square];
}

/** Ambush: stepping onto a Mob ends the movement and starts a Clash. */
export function ambush(ctx: Ctx, p: Player): void {
  const { g } = ctx;
  if (p.level === 'town') return;
  const mob = g.boards[p.level].mobs[p.square]!;
  const turn = g.turn!;
  turn.stepsLeft = 0;
  turn.dexLeft = 0;
  turn.onFeature = false;
  turn.phase = 'after';
  g.clash = { player: p.id, level: p.level, square: p.square, exchanges: 0, last: null };
  emit(ctx, { type: 'ambushed', player: p.id, level: p.level, square: p.square, mob: mob.kind });
}

export function clashOptions(g: GameState): Action[] {
  const out: Action[] = APPROACHES.map((approach) => ({ type: 'exchange' as const, approach }));
  if (g.clash!.exchanges > 0) out.push({ type: 'retreat' });
  return out;
}

export function exchange(ctx: Ctx, p: Player, approach: Approach): void {
  const { g } = ctx;
  const clash = g.clash!;
  const mob = g.boards[clash.level].mobs[clash.square]!;
  const def = mobDef(mob.kind);
  const bonus = stat(p, APPROACH_STAT[approach]);
  const mine = die(g, 6);
  const theirs = die(g, def.dice[approach]);
  const dice = [
    { id: 0, owner: p.id, faces: 6, value: mine },
    { id: 1, owner: 'mob', faces: def.dice[approach], value: theirs },
  ];
  emit(ctx, {
    type: 'exchangeRolled',
    player: p.id,
    approach,
    mob: mob.kind,
    dice,
    bonus: [bonus, 0],
  });
  clash.exchanges++;
  const totals: [number, number] = [mine + bonus, theirs];
  const winner = totals[0] > totals[1] ? 'player' : totals[0] < totals[1] ? 'mob' : 'tie';
  clash.last = { approach, dice, bonus: [bonus, 0], totals, winner };
  if (winner === 'player') mob.wounds++;
  if (winner === 'mob') p.hp = Math.max(0, p.hp - def.damage);
  emit(ctx, {
    type: 'exchangeResolved',
    player: p.id,
    winner,
    totals,
    mobWounds: mob.wounds,
    hp: p.hp,
  });
  if (mob.wounds >= def.wounds) kill(ctx, p, def);
  else if (p.hp <= 0) knockOut(ctx, p);
}

function kill(ctx: Ctx, p: Player, def: MobDef): void {
  const { g } = ctx;
  const clash = g.clash!;
  const board = g.boards[clash.level];
  delete board.mobs[clash.square];
  p.trophies += def.trophy;
  p.pack.gold += def.gold;
  g.clash = null;
  emit(ctx, {
    type: 'mobKilled',
    player: p.id,
    mob: def.name,
    trophies: def.trophy,
    gold: def.gold,
  });
  const square = emptySquare(g, clash.level);
  if (square >= 0) board.mobs[square] = { kind: def.name, wounds: 0 };
}

/** Knocked Out has exactly the same effect as being Lost. */
function knockOut(ctx: Ctx, p: Player): void {
  ctx.g.clash = null;
  emit(ctx, { type: 'knockedOut', player: p.id, level: p.level, square: p.square });
  sendHome(ctx, p);
}

export function retreat(ctx: Ctx, p: Player): void {
  ctx.g.clash = null;
  emit(ctx, { type: 'retreated', player: p.id });
}

/** Starting a Turn on a Mob: resume the Clash (the whole Turn) or move away. */
export function resumeClash(ctx: Ctx, p: Player): void {
  const { g } = ctx;
  if (p.level === 'town') return;
  g.turn!.phase = 'after';
  g.clash = { player: p.id, level: p.level, square: p.square, exchanges: 0, last: null };
}

export function moveAway(ctx: Ctx): void {
  ctx.g.turn!.phase = 'prepare';
}
