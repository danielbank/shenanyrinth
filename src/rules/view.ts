/** The rules engine's view seam: what one Player sees, their legal options and their events. */
import { TOWN } from './data.ts';
import { currentPlayer } from './context.ts';
import { legalActions } from './legal.ts';
import { moveOutlines } from './movement.ts';
import { publicScore, score, winners } from './score.ts';
import { maxHp, stat } from './stats.ts';
import { STATS } from './data.ts';
import { doomLimit } from './turns.ts';
import type {
  Board,
  BoardView,
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
      isHost: p.id === state.hostId,
      setupDone: p.setupDone,
      level: p.level,
      square: p.square,
      heading: p.heading,
      hp: p.hp,
      maxHp: maxHp(p),
      stats: Object.fromEntries(STATS.map((s) => [s, stat(p, s)])) as Stats,
      publicScore: publicScore(p),
    })),
    me: mine
      ? { pack: { ...mine.pack }, keep: mine.keep, base: { ...mine.base }, pivots: mine.pivots }
      : null,
    seats: state.seats,
    round: state.round,
    doomLimit: doomLimit(state),
    turn: state.turn,
    town: { size: TOWN.size, buildings: TOWN.buildings, gates: TOWN.gates },
    boards: {
      forest: boardView(state.boards.forest),
      dungeon: boardView(state.boards.dungeon),
    },
    final:
      state.phase === 'over' ? { scores: state.players.map(score), winners: winners(state) } : null,
    options: legalActions(state, viewer),
    moves: current && current.id === viewer ? moveOutlines(state, current) : [],
    events: events.filter((e) => !e.only || e.only.includes(viewer)),
  };
}

function boardView(board: Board): BoardView {
  return {
    size: board.size,
    squares: board.tiles.map((exits, i) => ({
      exits,
      revealed: board.revealed[i] ?? false,
      feature: board.features[i] ?? null,
    })),
  };
}
