/** Shakedowns and Rams: light jabs between Players, outside the safe zone. */
import { emit, findPlayer, type Ctx } from './context.ts';
import { APPROACHES, APPROACH_STAT, SHAKEDOWN_GOLD } from './data.ts';
import { endMove } from './movement.ts';
import { onResolve, rollInPlay } from './response.ts';
import { stat } from './stats.ts';
import type { Action, Approach, DieInPlay, GameState, Pack, Player, PlayerId } from './types.ts';

/** The Town, every Gate square and the Stairs squares. */
export function inSafeZone(g: GameState, p: Player): boolean {
  if (p.level === 'town') return true;
  const f = g.boards[p.level].features[p.square];
  return f !== undefined && f.type !== 'guardian';
}

function targetsHere(g: GameState, p: Player): Player[] {
  if (inSafeZone(g, p) || g.turn!.shookDown || g.clash) return [];
  return g.players.filter(
    (q) =>
      q.id !== p.id &&
      q.level === p.level &&
      q.square === p.square &&
      !q.shakeProtected &&
      !q.stoneskin,
  );
}

const each = (type: 'shakedown' | 'ram', targets: Player[]): Action[] =>
  targets.flatMap((q) => APPROACHES.map((approach) => ({ type, target: q.id, approach })));

export function shakedownOptions(g: GameState, p: Player): Action[] {
  return each('shakedown', targetsHere(g, p));
}

/** STR's perk: stop on a Player passed through with steps left, if STR beats their CON. */
export function ramOptions(g: GameState, p: Player): Action[] {
  if (g.turn!.stepsLeft <= 0 || g.turn!.stepped === 0) return [];
  return each(
    'ram',
    targetsHere(g, p).filter((q) => stat(p, 'STR') > stat(q, 'CON')),
  );
}

export function defenceOptions(g: GameState, id: PlayerId): Action[] {
  const s = g.shakedown!;
  if (s.defender !== id || s.defence) return [];
  return APPROACHES.map((approach) => ({ type: 'defend' as const, approach }));
}

export function startShakedown(
  ctx: Ctx,
  p: Player,
  target: PlayerId,
  approach: Approach,
  ram: boolean,
): void {
  const { g } = ctx;
  if (ram) endMove(ctx);
  g.turn!.shookDown = true;
  g.shakedown = { attacker: p.id, defender: target, approach, defence: null, ram };
  emit(ctx, { type: 'shakedownStarted', attacker: p.id, defender: target, approach, ram });
  defendIfAway(ctx);
}

/** An offline defender defends with their best Approach, so nobody waits on them. */
export function defendIfAway(ctx: Ctx): void {
  const s = ctx.g.shakedown;
  const defender = s && !s.defence ? findPlayer(ctx.g, s.defender) : undefined;
  if (!defender || defender.online) return;
  const best = APPROACHES.reduce((a, b) =>
    stat(defender, APPROACH_STAT[b]) > stat(defender, APPROACH_STAT[a]) ? b : a,
  );
  defend(ctx, best);
}

/** The defender picks an Approach; both roll 1d6 plus that Stat, face-up. */
export function defend(ctx: Ctx, defence: Approach): void {
  const { g } = ctx;
  const s = g.shakedown!;
  s.defence = defence;
  const attacker = findPlayer(g, s.attacker)!;
  const defender = findPlayer(g, s.defender)!;
  const bonus: [number, number] = [
    stat(attacker, APPROACH_STAT[s.approach]),
    stat(defender, APPROACH_STAT[defence]),
  ];
  const at = ctx.events.length;
  const dice = rollInPlay(
    ctx,
    'shakedown',
    [
      { owner: attacker.id, bonus: bonus[0] },
      { owner: defender.id, bonus: bonus[1] },
    ],
    [6, 6],
  );
  ctx.events.splice(at, 0, {
    type: 'shakedownRolled',
    attacker: attacker.id,
    defender: defender.id,
    dice: structuredClone(dice),
    bonus,
  });
}

/** The winner takes up to 3 Gold, or else 1 Material, from the loser's Pack. A tie does nothing. */
function finishShakedown(ctx: Ctx, totals: [number, number], _dice: DieInPlay[]): void {
  const { g } = ctx;
  const s = g.shakedown!;
  g.shakedown = null;
  const attacker = findPlayer(g, s.attacker)!;
  const defender = findPlayer(g, s.defender)!;
  defender.shakeProtected = true;
  const taken: Pack = { gold: 0, herbs: 0, artifacts: 0 };
  if (totals[0] === totals[1]) {
    emit(ctx, { type: 'shakedownResolved', winner: null, loser: null, taken });
    return;
  }
  const [winner, loser] = totals[0] > totals[1] ? [attacker, defender] : [defender, attacker];
  if (loser.pack.gold > 0) taken.gold = Math.min(SHAKEDOWN_GOLD, loser.pack.gold);
  else if (loser.pack.artifacts > 0) taken.artifacts = 1;
  else if (loser.pack.herbs > 0) taken.herbs = 1;
  for (const k of ['gold', 'herbs', 'artifacts'] as const) {
    loser.pack[k] -= taken[k];
    winner.pack[k] += taken[k];
  }
  winner.shakedownWins++;
  emit(ctx, { type: 'shakedownResolved', winner: winner.id, loser: loser.id, taken });
}

onResolve('shakedown', finishShakedown);
