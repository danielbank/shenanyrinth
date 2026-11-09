/** Seats, Turns, Rounds and the end of the game. */
import { emit, findPlayer, type Ctx } from './context.ts';
import { DOOM_TRACK, TOWN } from './data.ts';
import { winners } from './score.ts';
import { findItem, stat } from './stats.ts';
import type { GameState } from './types.ts';

export const PIVOT_LIMIT = 2;

export function doomLimit(g: GameState): number {
  return DOOM_TRACK[g.players.length] ?? 30;
}

/** Start: refresh the current seat's budgets, then Prepare. */
export function startTurn(ctx: Ctx, seat: number): void {
  const { g } = ctx;
  const p = findPlayer(g, g.seats[seat]!)!;
  p.pivots = PIVOT_LIMIT + (findItem(p, 'boots') ? 1 : 0);
  p.sway = stat(p, 'CHA');
  p.resist = stat(p, 'CON');
  g.turn = {
    player: p.id,
    phase: 'prepare',
    roll: null,
    stepsLeft: 0,
    dexLeft: 0,
    free: false,
    onFeature: false,
    choosingHeading: false,
    passed: [],
    wander: false,
    stuck: false,
    stepped: 0,
  };
  const building = p.level === 'town' ? TOWN.buildings[p.square] : undefined;
  if (building) g.turn.passed.push(building);
  if (p.level !== 'town' && g.boards[p.level].mobs[p.square]) g.turn.phase = 'start';
  emit(ctx, { type: 'turnStarted', player: p.id, round: g.round });
}

/** End: pass play to the next seat, advancing the Doom Track after the last one. */
export function endTurn(ctx: Ctx): void {
  const { g } = ctx;
  const turn = g.turn!;
  emit(ctx, { type: 'turnEnded', player: turn.player });
  const seat = g.seats.indexOf(turn.player);
  if (seat === g.seats.length - 1) {
    emit(ctx, { type: 'roundEnded', round: g.round });
    if (g.endTriggered || g.round >= doomLimit(g)) {
      finish(ctx);
      return;
    }
    g.round++;
    startTurn(ctx, 0);
  } else {
    startTurn(ctx, seat + 1);
  }
}

function finish(ctx: Ctx): void {
  ctx.g.phase = 'over';
  ctx.g.turn = null;
  emit(ctx, { type: 'gameOver', winners: winners(ctx.g) });
}
