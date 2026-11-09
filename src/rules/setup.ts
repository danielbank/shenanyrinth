import { generateDungeon, generateForest } from './generate.ts';
import { seedTokens } from './pickups.ts';
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
  seedTokens(g, 'forest');
  return g;
}
