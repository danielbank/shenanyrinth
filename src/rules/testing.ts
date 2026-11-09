/**
 * Fixture builders for rules tests. Each builds through the real rules setup and then adjusts,
 * so a fixture is always a reachable state.
 */
import { applyAction } from './apply.ts';
import { newGame } from './setup.ts';
import { COLOURS, HEROES, TOWN } from './data.ts';
import type { Action, GameEvent, GameState, PlayerId, Stats, Token } from './types.ts';

export const NAMES = ['Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Fay'];

/** Queue the next die results. */
export function forceRolls(g: GameState, ...values: number[]): GameState {
  return { ...g, forced: [...g.forced, ...values] };
}

export interface GameOptions {
  players?: number;
  seed?: number;
  stats?: Partial<Stats>[];
}

/** A game with Players p1..pN who have joined and set up their Stats, in turn order p1 first. */
export function aGame({ players = 2, seed = 1, stats = [] }: GameOptions = {}): GameState {
  let g = aLobby(players, seed);
  g = act(g, 'p1', { type: 'startGame' });
  // Rotate seats so that p1 always goes first in fixtures.
  g.seats = g.players.map((p) => p.id);
  for (let i = 0; i < players; i++) {
    const want = stats[i] ?? { STR: 1, DEX: 1, INT: 1, WIS: 1, CON: 1, CHA: 1 };
    const full: Stats = { STR: 0, DEX: 0, INT: 0, WIS: 0, CON: 0, CHA: 0, ...want };
    g = act(g, `p${i + 1}`, { type: 'setStats', stats: full });
  }
  return g;
}

export function aLobby(players: number, seed = 1): GameState {
  let g = newGame({ seed });
  for (let i = 0; i < players; i++) {
    g = act(g, `p${i + 1}`, {
      type: 'join',
      name: NAMES[i] ?? `P${i + 1}`,
      hero: HEROES[i % HEROES.length] ?? 'knight',
      colour: COLOURS[i % COLOURS.length] ?? 'red',
    });
  }
  return g;
}

export function act(g: GameState, actor: PlayerId, action: Action): GameState {
  return applyAction(g, actor, action).state;
}

/** Apply a sequence of actions, returning the final state and every event. */
export function play(
  g: GameState,
  ...steps: [PlayerId, Action][]
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  let state = g;
  for (const [actor, action] of steps) {
    const res = applyAction(state, actor, action);
    state = res.state;
    events.push(...res.events);
  }
  return { state, events };
}

export function player(g: GameState, id: PlayerId) {
  const p = g.players.find((x) => x.id === id);
  if (!p) throw new Error(`no player ${id}`);
  return p;
}

/** Adjust a Player in a copy of the state. */
export function withPlayer(
  g: GameState,
  id: PlayerId,
  change: (p: GameState['players'][number]) => void,
): GameState {
  const copy = structuredClone(g);
  change(player(copy, id));
  return copy;
}

const GLYPHS: Record<string, string> = {
  '│': 'NS',
  '─': 'EW',
  '└': 'NE',
  '┌': 'ES',
  '┐': 'SW',
  '┘': 'NW',
  '├': 'NES',
  '┬': 'ESW',
  '┤': 'NSW',
  '┴': 'NEW',
  '┼': 'NESW',
};

/** Tiles from rows of box-drawing glyphs, e.g. ['┌─┐', '│┼│', '└─┘']. */
export function tilesFrom(rows: string[]): string[] {
  return rows.flatMap((row) =>
    [...row].map((ch) => {
      const exits = GLYPHS[ch];
      if (!exits) throw new Error(`unknown glyph ${ch}`);
      return exits;
    }),
  );
}

/** Replace a Level's Tiles with a drawn board; Features stay where they are. */
export function withTiles(g: GameState, level: 'forest' | 'dungeon', rows: string[]): GameState {
  const copy = structuredClone(g);
  const board = copy.boards[level];
  const tiles = tilesFrom(rows);
  if (tiles.length !== board.size * board.size) throw new Error('board size mismatch');
  board.tiles = tiles;
  return copy;
}

/** Put a Player somewhere with a Heading. */
export function placed(
  g: GameState,
  id: PlayerId,
  level: 'town' | 'forest' | 'dungeon',
  square: number,
  heading: 'N' | 'E' | 'S' | 'W' = 'N',
): GameState {
  const copy = withPlayer(g, id, (p) => {
    p.level = level;
    p.square = square;
    p.heading = heading;
  });
  // A Player placed before their Turn begins has passed only the building they stand on.
  if (copy.turn?.player === id && copy.turn.phase === 'prepare') {
    const building = level === 'town' ? TOWN.buildings[square] : undefined;
    copy.turn.passed = building ? [building] : [];
  }
  return copy;
}

/** A square index from (x, y). */
export const sq = (size: number, x: number, y: number) => y * size + x;

/** Put tokens on a Level, replacing whatever was there. */
export function withTokens(
  g: GameState,
  level: 'forest' | 'dungeon',
  tokens: Record<number, Token>,
): GameState {
  const copy = structuredClone(g);
  copy.boards[level].tokens = { ...tokens };
  return copy;
}

/** Light up a whole Level, as if Torchlight had been everywhere. */
export function revealAll(g: GameState, level: 'forest' | 'dungeon'): GameState {
  const copy = structuredClone(g);
  copy.boards[level].revealed = copy.boards[level].revealed.map(() => true);
  return copy;
}

/** Make `kind` the only Mob on a Level, at `square`. */
export function withMob(
  g: GameState,
  level: 'forest' | 'dungeon',
  square: number,
  kind: string,
  wounds = 0,
): GameState {
  const copy = structuredClone(g);
  copy.boards[level].mobs = { [square]: { kind, wounds } };
  return copy;
}

/** Clear a Level of Mobs, tokens and piles. */
export function emptied(g: GameState, level: 'forest' | 'dungeon'): GameState {
  const copy = structuredClone(g);
  const board = copy.boards[level];
  board.mobs = {};
  board.tokens = {};
  board.piles = {};
  return copy;
}
