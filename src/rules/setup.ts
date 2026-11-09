import { generateDungeon, generateForest } from './generate.ts';
import { seedMobs } from './clash.ts';
import { DUNGEON_MOBS, FOREST_MOBS, GUARDIAN } from './data.ts';
import { revealArea } from './torchlight.ts';
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
    nextItemId: 1,
    endTriggered: false,
  };
  g.boards.forest = generateForest(g);
  g.boards.dungeon = generateDungeon(g);
  seedMobs(g, 'forest', FOREST_MOBS);
  seedTokens(g, 'forest');
  const dungeon = g.boards.dungeon;
  for (const [square, f] of Object.entries(dungeon.features)) {
    if (f.type === 'guardian') dungeon.mobs[Number(square)] = { kind: GUARDIAN.name, wounds: 0 };
    if (f.type === 'stairsUp') revealArea(g, 'dungeon', Number(square), 1);
  }
  seedMobs(g, 'dungeon', DUNGEON_MOBS);
  seedTokens(g, 'dungeon');
  return g;
}
