import { generateDungeon, generateForest } from './generate.ts';
import type { GameState } from './types.ts';

export function newGame({ seed }: { seed: number }): GameState {
  const g: GameState = {
    rng: seed | 0,
    forced: [],
    phase: 'lobby',
    players: [],
    hostId: null,
    seats: [],
    round: 0,
    turn: null,
    boards: {} as GameState['boards'],
  };
  g.boards.forest = generateForest(g);
  g.boards.dungeon = generateDungeon(g);
  return g;
}
