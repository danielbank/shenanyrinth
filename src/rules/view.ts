/** The rules engine's view seam: what one Player sees, their legal options and their events. */
import { TOWN } from './data.ts';
import { mobDef } from './clash.ts';
import { currentPlayer } from './context.ts';
import { offers } from './errands.ts';
import { targetedItems } from './items.ts';
import { legalActions } from './legal.ts';
import { moveOutlines } from './movement.ts';
import { publicScore, score, winners } from './score.ts';
import { maxHp, slotsUsed, stat } from './stats.ts';
import { DEEDS, STATS } from './data.ts';
import { doomLimit } from './turns.ts';
import type {
  Board,
  BoardView,
  Player,
  Token,
  Feature,
  PathLevel,
  MobState,
  MobView,
  GameEvent,
  GameState,
  PlayerId,
  PlayerView,
  Stats,
} from './types.ts';

export function viewFor(state: GameState, viewer: PlayerId, events: GameEvent[] = []): PlayerView {
  const mine = state.players.find((p) => p.id === viewer);
  const current = currentPlayer(state);
  return {
    you: mine ? viewer : null,
    phase: state.phase,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      hero: p.hero,
      colour: p.colour,
      online: p.online,
      bot: p.bot,
      isHost: p.id === state.hostId,
      setupDone: p.setupDone,
      level: p.level,
      square: p.square,
      heading: p.heading,
      hp: p.hp,
      maxHp: maxHp(p),
      stats: Object.fromEntries(STATS.map((s) => [s, stat(p, s)])) as Stats,
      trinkets: [...p.trinkets],
      publicScore: publicScore(state, p),
    })),
    me: mine
      ? {
          pack: { ...mine.pack },
          keep: mine.keep,
          base: { ...mine.base },
          gear: { ...mine.gear },
          trained: [...mine.trained],
          items: mine.items.map((it) => ({ ...it })),
          slotsUsed: slotsUsed(mine),
          pivots: mine.pivots,
          sway: mine.sway,
          resist: mine.resist,
          autoPass: mine.autoPass,
        }
      : null,
    seats: state.seats,
    round: state.round,
    doomLimit: doomLimit(state),
    turn: state.turn,
    town: { size: TOWN.size, buildings: TOWN.buildings, gates: TOWN.gates },
    boards: {
      forest: boardView(state.boards.forest, 'forest', mine),
      dungeon: boardView(state.boards.dungeon, 'dungeon', mine),
    },
    clash: state.clash,
    // Who may act would reveal carried dice Charms, so each Player sees only themselves.
    response: state.response && {
      ...state.response,
      eligible: state.response.eligible.filter((id) => id === viewer),
      passed: state.response.passed.filter((id) => id === viewer),
    },
    shakedown: state.shakedown,
    deeds: state.deeds.map((d) => ({
      ...DEEDS.find((x) => x.id === d.id)!,
      claimedBy: d.claimedBy,
    })),
    final:
      state.phase === 'over'
        ? { scores: state.players.map((p) => score(state, p)), winners: winners(state) }
        : null,
    options: legalActions(state, viewer),
    aimable: mine ? targetedItems(state, mine) : [],
    offers:
      current?.id === viewer &&
      state.turn?.phase === 'after' &&
      !state.turn.choosingHeading &&
      !state.clash
        ? offers(state, current)
        : [],
    moves: current && current.id === viewer ? moveOutlines(state, current) : [],
    events: events.filter((e) => !e.only || e.only.includes(viewer)),
  };
}

function boardView(board: Board, level: PathLevel, viewer: Player | undefined): BoardView {
  return {
    size: board.size,
    squares: board.tiles.map((exits, i) => ({
      exits: level === 'forest' || board.revealed[i] ? exits : null,
      revealed: board.revealed[i] ?? false,
      feature: visibleFeature(board, i),
      token: visibleToken(board, i, viewer),
      pile: (board.revealed[i] && board.piles[i]) || null,
      mob: board.revealed[i] && board.mobs[i] ? mobView(board.mobs[i]) : null,
    })),
  };
}

function mobView(mob: MobState): MobView {
  const def = mobDef(mob.kind);
  return {
    kind: mob.kind,
    wounds: mob.wounds,
    maxWounds: def.wounds,
    damage: def.damage,
    dice: def.dice,
  };
}

/** Gates are always in sight; every other Feature shows once revealed. */
function visibleFeature(board: Board, i: number): Feature | null {
  const f = board.features[i];
  if (!f) return null;
  return f.type === 'gate' || board.revealed[i] ? f : null;
}

/** Contents show once revealed; a Cache only where Torchlight reached and only to enough INT. */
function visibleToken(board: Board, i: number, viewer: Player | undefined): Token | null {
  const t = board.tokens[i];
  if (!t || !board.revealed[i]) return null;
  if (t.type !== 'cache') return t;
  return board.lit[i] && viewer && stat(viewer, 'INT') >= t.rating ? t : null;
}
