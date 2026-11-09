import type { GameState } from './types.ts';

export function newGame({ seed }: { seed: number }): GameState {
  return { rng: seed | 0, forced: [], phase: 'lobby', players: [], hostId: null };
}
