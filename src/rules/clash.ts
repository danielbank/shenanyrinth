/** Mobs, Ambushes and Clashes made of Exchanges. */
import { emit, findPlayer, type Ctx } from './context.ts';
import { onResolve, rollInPlay } from './response.ts';
import {
  APPROACHES,
  APPROACH_STAT,
  GUARDIAN,
  GUARDIAN_BONUS,
  GUARDIAN_TROPHIES_PER_WOUND,
  MOBS,
  type MobDef,
} from './data.ts';
import { emptySquare } from './pickups.ts';
import { sendHome } from './home.ts';
import { shuffle } from './rng.ts';
import { stat } from './stats.ts';
import type {
  Action,
  Approach,
  DieInPlay,
  GameState,
  PathLevel,
  Player,
  RollSide,
} from './types.ts';

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
  g.clash = {
    player: p.id,
    level: p.level,
    square: p.square,
    exchanges: 0,
    last: null,
    approach: null,
  };
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
  const guardian = def.name === GUARDIAN.name;
  const bonus = stat(p, APPROACH_STAT[approach]) + (guardian ? stat(p, 'WIS') : 0);
  clash.approach = approach;
  clash.exchanges++;
  const sides: [RollSide, RollSide] = [
    { owner: p.id, bonus },
    { owner: 'mob', bonus: 0 },
  ];
  const ctxEvents = ctx.events.length;
  const dice = rollInPlay(ctx, 'clash', sides, [6, def.dice[approach]]);
  // The dice go face-up before anything else that follows from them.
  ctx.events.splice(ctxEvents, 0, {
    type: 'exchangeRolled',
    player: p.id,
    approach,
    mob: mob.kind,
    dice: structuredClone(dice),
    bonus: [bonus, 0],
  });
}

/** The Exchange's dice are final: the higher total lands a hit. */
function finishExchange(ctx: Ctx, totals: [number, number], dice: DieInPlay[]): void {
  const { g } = ctx;
  const clash = g.clash!;
  const p = findPlayer(g, clash.player)!;
  const mob = g.boards[clash.level].mobs[clash.square]!;
  const def = mobDef(mob.kind);
  const guardian = def.name === GUARDIAN.name;
  const winner = totals[0] > totals[1] ? 'player' : totals[0] < totals[1] ? 'mob' : 'tie';
  const bonus = totals[0] - dice.filter((d) => d.owner === p.id).reduce((a, d) => a + d.value, 0);
  clash.last = { approach: clash.approach!, dice, bonus: [bonus, 0], totals, winner };
  if (winner === 'player') mob.wounds++;
  if (winner === 'player' && guardian) {
    p.trophies += GUARDIAN_TROPHIES_PER_WOUND;
    emit(ctx, { type: 'guardianWounded', player: p.id, trophies: GUARDIAN_TROPHIES_PER_WOUND });
  }
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

onResolve('clash', finishExchange);

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
  if (def.name === GUARDIAN.name) {
    // The feat: the Guardian bonus goes straight into the Keep, and the end is triggered.
    p.keep += GUARDIAN_BONUS;
    p.feat = true;
    g.endTriggered = true;
    emit(ctx, { type: 'feat', player: p.id, bonus: GUARDIAN_BONUS });
    return;
  }
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
  g.clash = {
    player: p.id,
    level: p.level,
    square: p.square,
    exchanges: 0,
    last: null,
    approach: null,
  };
}

export function moveAway(ctx: Ctx): void {
  ctx.g.turn!.phase = 'prepare';
}
