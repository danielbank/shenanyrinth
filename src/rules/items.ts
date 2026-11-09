/** Using carried items: free, unlimited per Turn, at the moment their effect applies. */
import { rotate } from './board.ts';
import { ambush, mobUnder } from './clash.ts';
import { emit, type Ctx } from './context.ts';
import { RuleError } from './errors.ts';
import { rotationsThatFit } from './generate.ts';
import { arriveInTown } from './home.ts';
import { endMove } from './movement.ts';
import { collect } from './pickups.ts';
import { die } from './rng.ts';
import { maxHp } from './stats.ts';
import { reveal, revealArea } from './torchlight.ts';
import type { Action, GameState, Item, ItemKind, Player } from './types.ts';

type Use = Extract<Action, { type: 'use' }>;

/** When each kind of item may be used on its owner's Turn. */
function usableNow(g: GameState, p: Player, kind: ItemKind): boolean {
  const turn = g.turn!;
  if (turn.choosingHeading) return false;
  const path = p.level !== 'town';
  switch (kind) {
    case 'tonic':
      return (turn.phase === 'prepare' || turn.phase === 'after') && p.hp < maxHp(p);
    case 'draught':
      return turn.phase === 'prepare' && !turn.wander;
    case 'teleport':
      return turn.phase === 'prepare';
    case 'twirlwater':
      return turn.phase === 'prepare' || turn.phase === 'move';
    case 'stoneskin':
      return (turn.phase === 'prepare' || turn.phase === 'after') && !p.stoneskin;
    case 'knucklebone':
      // Any roll of yours: the movement roll, before the first step.
      return turn.phase === 'move' && turn.stepped === 0;
    case 'orb':
    case 'stones':
      return path && (turn.phase === 'prepare' || turn.phase === 'after') && !g.clash;
    default:
      return false;
  }
}

/** Items that need no target, offered as ready-made actions. */
const NO_TARGET = new Set<ItemKind>(['tonic', 'draught', 'twirlwater', 'knucklebone', 'stoneskin']);

export function itemOptions(g: GameState, p: Player): Action[] {
  if (g.turn!.stuck) {
    const twirl = p.items.find((it) => it.kind === 'twirlwater');
    return [...(twirl ? [{ type: 'use' as const, item: twirl.id }] : []), { type: 'acceptLost' }];
  }
  return p.items
    .filter((it) => NO_TARGET.has(it.kind) && usableNow(g, p, it.kind))
    .map((it) => ({ type: 'use' as const, item: it.id }));
}

/** Items that need a target square, for the client to offer. */
export function targetedItems(g: GameState, p: Player): Item[] {
  if (g.turn?.player !== p.id || g.turn.stuck) return [];
  return p.items.filter((it) => !NO_TARGET.has(it.kind) && usableNow(g, p, it.kind));
}

export function useItem(ctx: Ctx, p: Player, action: Use): void {
  const { g } = ctx;
  const item = p.items.find((it) => it.id === action.item);
  if (!item) throw new RuleError("You don't have that item");
  const stuck = g.turn!.stuck;
  if (stuck ? item.kind !== 'twirlwater' : !usableNow(g, p, item.kind)) {
    throw new RuleError(`You can't use that right now`);
  }
  EFFECTS[item.kind](ctx, p, action);
  spend(ctx, p, item);
}

function spend(ctx: Ctx, p: Player, item: Item): void {
  if (item.charges !== undefined && --item.charges > 0) return;
  p.items = p.items.filter((it) => it !== item);
  if (item.charges !== undefined) {
    emit(ctx, { type: 'crumbled', player: p.id, kind: item.kind, only: [p.id] });
  }
}

type Effect = (ctx: Ctx, p: Player, action: Use) => void;

const EFFECTS: Record<ItemKind, Effect> = {
  boots: notUsable,
  compass: notUsable,
  coin: notUsable,
  hush: notUsable,
  stoneskin(ctx, p) {
    p.stoneskin = true;
    emit(ctx, { type: 'used', player: p.id, kind: 'stoneskin' });
  },
  knucklebone(ctx, p) {
    const extra = die(ctx.g, 6);
    ctx.g.turn!.stepsLeft += extra;
    emit(ctx, { type: 'used', player: p.id, kind: 'knucklebone' });
  },
  tonic(ctx, p) {
    p.hp = maxHp(p);
    emit(ctx, { type: 'used', player: p.id, kind: 'tonic' });
  },
  draught(ctx, p) {
    ctx.g.turn!.wander = true;
    emit(ctx, { type: 'used', player: p.id, kind: 'draught' });
  },
  twirlwater(ctx, p) {
    p.pivots++;
    ctx.g.turn!.stuck = false;
    emit(ctx, { type: 'used', player: p.id, kind: 'twirlwater' });
  },
  teleport(ctx, p, { square }) {
    const { g } = ctx;
    const size = p.level === 'town' ? 25 : g.boards[p.level].tiles.length;
    if (square === undefined || !Number.isInteger(square) || square < 0 || square >= size) {
      throw new RuleError('Choose a square to teleport to');
    }
    if (p.level !== 'town' && !g.boards[p.level].revealed[square]) {
      throw new RuleError('You can only teleport to a revealed square');
    }
    const from = p.square;
    p.square = square;
    emit(ctx, { type: 'used', player: p.id, kind: 'teleport', square });
    emit(ctx, { type: 'teleported', player: p.id, level: p.level, from, to: square });
    endMove(ctx);
    reveal(g, p);
    if (p.level === 'town') arriveInTown(ctx, p);
    else collect(ctx, p);
    if (mobUnder(g, p)) ambush(ctx, p);
  },
  orb(ctx, p, { square }) {
    if (p.level === 'town') return;
    const board = ctx.g.boards[p.level];
    if (square === undefined || !Number.isInteger(square) || !board.tiles[square]) {
      throw new RuleError('Choose where to look');
    }
    revealArea(ctx.g, p.level, square, 1, false);
    emit(ctx, { type: 'used', player: p.id, kind: 'orb', square });
  },
  stones(ctx, p, { a, b, turnA, turnB }) {
    if (p.level === 'town') return;
    const { g } = ctx;
    const level = p.level;
    const board = g.boards[level];
    const valid = (sq: number | undefined): sq is number =>
      sq !== undefined && Number.isInteger(sq) && board.tiles[sq] !== undefined;
    if (!valid(a) || !valid(b) || a === b) throw new RuleError('Choose two squares to swap');
    if (g.players.some((q) => q.level === level && (q.square === a || q.square === b))) {
      throw new RuleError('Shuffling Stones only swap unoccupied squares');
    }
    const toA = turned(board.size, a, board.tiles[b]!, turnA);
    const toB = turned(board.size, b, board.tiles[a]!, turnB);
    board.tiles[a] = toA;
    board.tiles[b] = toB;
    emit(ctx, { type: 'used', player: p.id, kind: 'stones', a, b });
  },
};

function notUsable(): void {
  throw new RuleError('That item works by itself');
}

/** The Tile landing on `square`: turned as asked, or the first way that keeps its Exits on the board. */
function turned(size: number, square: number, exits: string, turns: number | undefined): string {
  const fitting = rotationsThatFit(size, square, exits);
  if (turns === undefined) {
    const first = [0, 1, 2, 3].map((k) => rotate(exits, k)).find((e) => fitting.includes(e));
    if (!first) throw new RuleError("That Tile can't fit there");
    return first;
  }
  const chosen = rotate(exits, turns);
  if (!fitting.includes(chosen)) throw new RuleError('That turn leaves an Exit off the board');
  return chosen;
}

export function acceptLost(ctx: Ctx, p: Player, lose: (ctx: Ctx, p: Player) => void): void {
  ctx.g.turn!.stuck = false;
  lose(ctx, p);
}
