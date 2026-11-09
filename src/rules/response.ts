/**
 * Response windows: after the dice in a Clash or Shakedown, eligible Players may Sway, Meddle
 * with dice Charms, or Resist. The window closes when everyone eligible has passed, or when the
 * server's timer runs out.
 */
import { emit, findPlayer, type Ctx } from './context.ts';
import { RuleError } from './errors.ts';
import { die } from './rng.ts';
import type {
  Action,
  DieInPlay,
  GameState,
  Item,
  Player,
  PlayerId,
  ResponseEffect,
  ResponseWindow,
  RollSide,
} from './types.ts';

/** The actor id the server uses for its own actions, such as closing a window on time. */
export const SYSTEM = '@system';

type Resolver = (ctx: Ctx, totals: [number, number], dice: DieInPlay[]) => void;
const resolvers: Partial<Record<ResponseWindow['kind'], Resolver>> = {};

/** Each kind of roll says what happens when its window closes. */
export function onResolve(kind: ResponseWindow['kind'], resolver: Resolver): void {
  resolvers[kind] = resolver;
}

export function totals(w: Pick<ResponseWindow, 'sides' | 'dice'>): [number, number] {
  const sum = (side: RollSide) =>
    side.bonus + w.dice.filter((d) => d.owner === side.owner).reduce((a, d) => a + d.value, 0);
  return [sum(w.sides[0]), sum(w.sides[1])];
}

/** Roll the dice face-up, then open a window if anyone can act, or resolve at once. */
export function rollInPlay(
  ctx: Ctx,
  kind: ResponseWindow['kind'],
  sides: [RollSide, RollSide],
  faces: [number, number],
): DieInPlay[] {
  const { g } = ctx;
  const dice: DieInPlay[] = sides.map((s, i) => ({
    id: i,
    owner: s.owner,
    faces: faces[i]!,
    value: die(g, faces[i]!),
  }));
  const w: ResponseWindow = {
    id: g.nextResponseId++,
    kind,
    sides,
    dice,
    nextDie: dice.length,
    eligible: [],
    passed: [],
    pending: null,
  };
  g.response = w;
  w.eligible = eligibleFor(g, w);
  if (w.eligible.length === 0) {
    g.response = null;
    resolvers[kind]!(ctx, totals(w), w.dice);
  } else {
    emit(ctx, {
      type: 'responseOpened',
      id: w.id,
      dice: structuredClone(dice),
    });
  }
  return dice;
}

function ownsSide(w: ResponseWindow, id: PlayerId): boolean {
  return w.sides.some((s) => s.owner === id);
}

function diceItems(p: Player, w: ResponseWindow): Item[] {
  return p.items.filter((it) => {
    if (it.kind === 'knucklebone') return ownsSide(w, p.id);
    if (it.kind === 'coin') return w.dice.length >= 2;
    if (it.kind === 'hush')
      return w.sides.some((s) => w.dice.filter((d) => d.owner === s.owner).length >= 2);
    return false;
  });
}

function eligibleFor(g: GameState, w: ResponseWindow): PlayerId[] {
  return g.players
    .filter((p) => !p.autoPass && (p.sway > 0 || diceItems(p, w).length > 0))
    .map((p) => p.id);
}

/** What one Player may do in the open window. */
export function responseOptions(g: GameState, p: Player): Action[] {
  const w = g.response!;
  if (w.pending) {
    const waiting = w.pending.targets.includes(p.id) && !w.pending.allowed.includes(p.id);
    return waiting ? [{ type: 'resist' }, { type: 'allow' }] : [];
  }
  if (!w.eligible.includes(p.id) || w.passed.includes(p.id)) return [];
  const out: Action[] = [];
  if (p.sway > 0) {
    for (const d of w.dice) {
      if (d.value < d.faces) out.push({ type: 'sway', die: d.id, delta: 1 });
      if (d.value > 1) out.push({ type: 'sway', die: d.id, delta: -1 });
    }
  }
  for (const it of diceItems(p, w)) {
    if (it.kind === 'knucklebone') out.push({ type: 'use', item: it.id });
  }
  out.push({ type: 'pass' });
  return out;
}

export function sway(ctx: Ctx, p: Player, dieId: number, delta: 1 | -1): void {
  p.sway--;
  emit(ctx, { type: 'swayed', player: p.id, die: dieId, delta });
  announce(ctx, p, { kind: 'sway', die: dieId, delta });
}

/** Lucky Knucklebone, Trickster's Coin and Hush Rune, used in an open window. */
export function meddle(ctx: Ctx, p: Player, action: Extract<Action, { type: 'use' }>): void {
  const w = ctx.g.response!;
  if (w.pending || !w.eligible.includes(p.id) || w.passed.includes(p.id)) {
    throw new RuleError("You can't Meddle right now");
  }
  const item = diceItems(p, w).find((it) => it.id === action.item);
  if (!item) throw new RuleError("You can't use that here");
  let effect: ResponseEffect | null = null;
  if (item.kind === 'coin') {
    const [a, b] = action.dice ?? [];
    if (a === undefined || b === undefined || a === b || !dieById(w, a) || !dieById(w, b)) {
      throw new RuleError('Choose two dice to swap');
    }
    effect = { kind: 'coin', dice: [a, b] };
  } else if (item.kind === 'hush') {
    const target = action.die === undefined ? undefined : dieById(w, action.die);
    if (!target) throw new RuleError('Choose a die to remove');
    if (w.dice.filter((d) => d.owner === target.owner).length < 2) {
      throw new RuleError('Hush Rune only removes a die from a roll of 2 or more dice');
    }
    effect = { kind: 'hush', die: target.id };
  }
  spendCharge(ctx, p, item);
  if (!effect) {
    // Lucky Knucklebone: add 1d6 to your own roll.
    w.dice.push({ id: w.nextDie++, owner: p.id, faces: 6, value: die(ctx.g, 6), touchedBy: p.id });
    emit(ctx, { type: 'meddled', player: p.id, kind: item.kind, dice: [w.nextDie - 1] });
    afterChange(ctx);
    return;
  }
  emit(ctx, {
    type: 'meddled',
    player: p.id,
    kind: item.kind,
    dice: effect.kind === 'coin' ? effect.dice : [effect.die],
  });
  announce(ctx, p, effect);
}

function spendCharge(ctx: Ctx, p: Player, item: Item): void {
  if (item.charges !== undefined && --item.charges > 0) return;
  p.items = p.items.filter((it) => it !== item);
  emit(ctx, { type: 'crumbled', player: p.id, kind: item.kind, only: [p.id] });
}

function dieById(w: ResponseWindow, id: number): DieInPlay | undefined {
  return w.dice.find((d) => d.id === id);
}

/** Players whose own side the effect would make worse, and who could Resist it. */
function hurt(g: GameState, w: ResponseWindow, by: PlayerId, effect: ResponseEffect): PlayerId[] {
  const before = totals(w);
  const after = totals({ sides: w.sides, dice: applied(w.dice, effect, by) });
  return w.sides
    .map((s, i) => ({ owner: s.owner, worse: after[i]! < before[i]! }))
    .filter(({ owner, worse }) => worse && owner !== 'mob' && owner !== by)
    .map(({ owner }) => findPlayer(g, owner)!)
    .filter((q) => q.resist > 0 && !q.autoPass)
    .map((q) => q.id);
}

function applied(dice: DieInPlay[], effect: ResponseEffect, by: PlayerId): DieInPlay[] {
  const out = dice.map((d) => ({ ...d }));
  switch (effect.kind) {
    case 'sway': {
      const d = out.find((x) => x.id === effect.die)!;
      d.value += effect.delta;
      d.touchedBy = by;
      return out;
    }
    case 'coin': {
      const a = out.find((x) => x.id === effect.dice[0])!;
      const b = out.find((x) => x.id === effect.dice[1])!;
      [a.value, b.value] = [b.value, a.value];
      a.touchedBy = by;
      b.touchedBy = by;
      return out;
    }
    case 'hush':
      return out.filter((x) => x.id !== effect.die);
  }
}

/** A Sway or Meddle lands at once, unless a Player it hurts may Resist it first. */
function announce(ctx: Ctx, p: Player, effect: ResponseEffect): void {
  const w = ctx.g.response!;
  const targets = hurt(ctx.g, w, p.id, effect);
  if (targets.length) {
    w.pending = { by: p.id, effect, targets, allowed: [] };
    return;
  }
  land(ctx, p.id, effect);
}

function land(ctx: Ctx, by: PlayerId, effect: ResponseEffect): void {
  const w = ctx.g.response!;
  w.dice = applied(w.dice, effect, by);
  emit(ctx, { type: 'diceChanged', dice: structuredClone(w.dice) });
  afterChange(ctx);
}

/** After any change, everyone gets another chance to respond. */
function afterChange(ctx: Ctx): void {
  const w = ctx.g.response!;
  w.pending = null;
  w.passed = [];
  w.eligible = eligibleFor(ctx.g, w);
  if (w.eligible.length === 0) resolve(ctx);
}

export function resist(ctx: Ctx, p: Player): void {
  const w = ctx.g.response!;
  const pending = w.pending!;
  p.resist--;
  emit(ctx, { type: 'resisted', player: p.id, against: pending.by });
  afterChange(ctx);
}

export function allow(ctx: Ctx, p: Player): void {
  const pending = ctx.g.response!.pending!;
  pending.allowed.push(p.id);
  if (pending.targets.every((t) => pending.allowed.includes(t)))
    land(ctx, pending.by, pending.effect);
}

export function pass(ctx: Ctx, p: Player): void {
  const w = ctx.g.response!;
  w.passed.push(p.id);
  emit(ctx, { type: 'passed', player: p.id });
  if (w.eligible.every((id) => w.passed.includes(id))) resolve(ctx);
}

/** The server's timer ran out: a pending effect lands, then the result is final. */
export function closeResponse(ctx: Ctx, id: number): void {
  const w = ctx.g.response;
  if (!w || w.id !== id) throw new RuleError('That window has already closed');
  if (w.pending) w.dice = applied(w.dice, w.pending.effect, w.pending.by);
  resolve(ctx);
}

function resolve(ctx: Ctx): void {
  const w = ctx.g.response!;
  ctx.g.response = null;
  emit(ctx, { type: 'responseClosed', id: w.id });
  resolvers[w.kind]!(ctx, totals(w), w.dice);
}
