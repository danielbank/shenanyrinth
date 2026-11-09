/** Rolling and moving: the Town's free moves and the path Levels' conveyor belt. */
import { DIRS, neighbour, OPPOSITE } from './board.ts';
import { emit, type Ctx } from './context.ts';
import { TOWN } from './data.ts';
import { ambush, mobUnder } from './clash.ts';
import { arriveInTown, sendHome } from './home.ts';
import { collect } from './pickups.ts';
import { die } from './rng.ts';
import { findItem, stat } from './stats.ts';
import { reveal } from './torchlight.ts';
import type {
  Action,
  Dir,
  Feature,
  GameState,
  LevelName,
  MoveOutline,
  PathLevel,
  Player,
} from './types.ts';

export function levelSize(g: GameState, level: LevelName): number {
  return level === 'town' ? TOWN.size : g.boards[level].size;
}

export function roll(ctx: Ctx, p: Player): void {
  const turn = ctx.g.turn!;
  const value = die(ctx.g, 6);
  const dex = stat(p, 'DEX') > 0 ? 1 : 0;
  turn.roll = value;
  turn.free = p.level === 'town' || turn.wander;
  turn.stepsLeft = turn.free ? value + dex : value;
  turn.dexLeft = turn.free ? 0 : dex;
  turn.phase = 'move';
  emit(ctx, { type: 'rolled', player: p.id, value, steps: turn.stepsLeft });
  checkStuck(ctx, p);
}

/** Every legal step from where the current Player stands. */
export function moveOutlines(g: GameState, p: Player): MoveOutline[] {
  const turn = g.turn!;
  if (turn.phase !== 'move' || turn.choosingHeading || turn.stuck) return [];
  const size = levelSize(g, p.level);
  const at = (dir: Dir) => neighbour(size, p.square, dir);
  if (turn.free) {
    if (turn.stepsLeft <= 0) return [];
    return DIRS.filter((d) => at(d) >= 0).map((dir) => ({
      dir,
      level: p.level,
      square: at(dir),
      pivot: false,
    }));
  }
  if (turn.stepsLeft <= 0 && turn.dexLeft <= 0) return [];
  const exits = [...tileAt(g, p)] as Dir[];
  return exits
    .filter((d) => d !== OPPOSITE[p.heading])
    .map((dir) => ({ dir, level: p.level, square: at(dir), pivot: dir !== p.heading }))
    .filter((m) => !m.pivot || p.pivots > 0);
}

function tileAt(g: GameState, p: Player): string {
  return p.level === 'town' ? 'NESW' : g.boards[p.level].tiles[p.square]!;
}

export function stepOptions(g: GameState, p: Player): Action[] {
  return moveOutlines(g, p).map(({ dir }) => ({ type: 'step' as const, dir }));
}

export function step(ctx: Ctx, p: Player, dir: Dir): void {
  const { g } = ctx;
  const turn = g.turn!;
  const from = p.square;
  if (!turn.free && dir !== p.heading) p.pivots--;
  p.heading = dir;
  p.square = neighbour(levelSize(g, p.level), from, dir);
  if (turn.stepsLeft > 0) turn.stepsLeft--;
  else turn.dexLeft--;
  emit(ctx, { type: 'stepped', player: p.id, level: p.level, from, to: p.square, dir });
  reveal(g, p);
  if (p.level === 'town') arriveInTown(ctx, p);
  else collect(ctx, p);
  turn.onFeature = featureDestination(g, p) !== null;
  if (mobUnder(g, p)) return ambush(ctx, p);
  if (turn.free) {
    if (turn.stepsLeft === 0) endMove(ctx);
    return;
  }
  if (turn.stepsLeft > 0) checkStuck(ctx, p);
  else if (turn.dexLeft <= 0 || moveOutlines(g, p).length === 0) endMove(ctx);
}

/** Lost: every Exit the Player may take needs a Pivot and they have none left. */
function checkStuck(ctx: Ctx, p: Player): void {
  const turn = ctx.g.turn!;
  if (turn.free || turn.stepsLeft <= 0) return;
  if (moveOutlines(ctx.g, p).length > 0) return;
  if (findItem(p, 'twirlwater')) turn.stuck = true;
  else becomeLost(ctx, p);
}

export function becomeLost(ctx: Ctx, p: Player): void {
  emit(ctx, { type: 'lost', player: p.id, level: p.level, square: p.square });
  sendHome(ctx, p);
}

export function endMove(ctx: Ctx): void {
  const turn = ctx.g.turn!;
  turn.stepsLeft = 0;
  turn.dexLeft = 0;
  turn.phase = 'after';
}

/** Where a Gate or Stairs under the Player leads, if any. */
export function featureDestination(
  g: GameState,
  p: Player,
): { level: LevelName; square: number } | null {
  if (p.level === 'town') {
    const side = TOWN.gates[p.square];
    if (!side) return null;
    const square = Object.entries(g.boards.forest.features).find(
      ([, f]) => f.type === 'gate' && f.side === side,
    )?.[0];
    return { level: 'forest', square: Number(square) };
  }
  const f = g.boards[p.level].features[p.square];
  if (f?.type === 'gate') {
    const square = Object.entries(TOWN.gates).find(([, side]) => side === f.side)?.[0];
    return { level: 'town', square: Number(square) };
  }
  if (f?.type === 'stairs')
    return { level: 'dungeon', square: featureSquare(g, 'dungeon', 'stairsUp') };
  if (f?.type === 'stairsUp')
    return { level: 'forest', square: featureSquare(g, 'forest', 'stairs') };
  return null;
}

export function takeFeature(ctx: Ctx, p: Player): void {
  const { g } = ctx;
  const turn = g.turn!;
  const to = featureDestination(g, p)!;
  const from = { level: p.level, square: p.square };
  p.level = to.level;
  p.square = to.square;
  endMove(ctx);
  turn.onFeature = false;
  turn.choosingHeading = to.level !== 'town';
  emit(ctx, { type: 'travelled', player: p.id, from, to });
  reveal(g, p);
  if (p.level !== 'town') collect(ctx, p);
}

export function headingOptions(g: GameState, p: Player): Action[] {
  return ([...tileAt(g, p)] as Dir[]).map((dir) => ({ type: 'chooseHeading' as const, dir }));
}

export function chooseHeading(ctx: Ctx, p: Player, dir: Dir): void {
  p.heading = dir;
  ctx.g.turn!.choosingHeading = false;
  emit(ctx, { type: 'headingChosen', player: p.id, dir });
}

export function featureSquare(g: GameState, level: PathLevel, type: Feature['type']): number {
  return Number(Object.entries(g.boards[level].features).find(([, f]) => f.type === type)?.[0]);
}

/** Lodestone Compass: before moving, spend a Pivot to turn, but never a U-turn. */
export function compassOptions(g: GameState, p: Player): Action[] {
  if (p.level === 'town' || p.pivots <= 0 || !findItem(p, 'compass')) return [];
  return DIRS.filter((d) => d !== p.heading && d !== OPPOSITE[p.heading]).map((dir) => ({
    type: 'compass' as const,
    dir,
  }));
}

export function compassTurn(ctx: Ctx, p: Player, dir: Dir): void {
  p.pivots--;
  p.heading = dir;
  emit(ctx, { type: 'compassTurned', player: p.id, dir });
}
