/** Rolling and moving. */
import { neighbour, DIRS } from './board.ts';
import { emit, type Ctx } from './context.ts';
import { TOWN } from './data.ts';
import { die } from './rng.ts';
import { stat } from './stats.ts';
import type { Action, Dir, GameState, MoveOutline, Player } from './types.ts';

export function roll(ctx: Ctx, p: Player): void {
  const turn = ctx.g.turn!;
  const value = die(ctx.g, 6);
  const dex = stat(p, 'DEX') > 0 ? 1 : 0;
  turn.roll = value;
  turn.free = p.level === 'town';
  turn.stepsLeft = value + dex;
  turn.phase = 'move';
  emit(ctx, { type: 'rolled', player: p.id, value, steps: turn.stepsLeft });
}

function sizeOf(p: Player): number {
  return p.level === 'town' ? TOWN.size : 0;
}

/** Every legal step from where the current Player stands. */
export function moveOutlines(g: GameState, p: Player): MoveOutline[] {
  const turn = g.turn!;
  if (turn.phase !== 'move' || turn.stepsLeft <= 0) return [];
  return DIRS.flatMap((dir) => {
    const square = neighbour(sizeOf(p), p.square, dir);
    return square < 0 ? [] : [{ dir, level: p.level, square, pivot: false }];
  });
}

export function stepOptions(g: GameState, p: Player): Action[] {
  return moveOutlines(g, p).map(({ dir }) => ({ type: 'step' as const, dir }));
}

export function step(ctx: Ctx, p: Player, dir: Dir): void {
  const turn = ctx.g.turn!;
  const from = p.square;
  p.square = neighbour(sizeOf(p), from, dir);
  p.heading = dir;
  turn.stepsLeft--;
  emit(ctx, { type: 'stepped', player: p.id, level: p.level, from, to: p.square, dir });
  if (turn.stepsLeft === 0) endMove(ctx);
}

export function endMove(ctx: Ctx): void {
  const turn = ctx.g.turn!;
  turn.stepsLeft = 0;
  turn.phase = 'after';
}
