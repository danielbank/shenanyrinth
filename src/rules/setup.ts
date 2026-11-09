import { generateDungeon, generateForest } from './generate.ts';
import { seedMobs } from './clash.ts';
import { FOREST_MOBS } from './data.ts';
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
    clash: null,
  };
  g.boards.forest = generateForest(g);
  g.boards.dungeon = generateDungeon(g);
  seedMobs(g, 'forest', FOREST_MOBS);
  seedTokens(g, 'forest');
  return g;
}
