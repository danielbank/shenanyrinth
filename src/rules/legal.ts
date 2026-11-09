/** Every enumerable action a Player may take right now. */
import { currentPlayer } from './context.ts';
import { stepOptions } from './movement.ts';
import type { Action, GameState, PlayerId } from './types.ts';

export function legalActions(g: GameState, id: PlayerId): Action[] {
  const out: Action[] = [];
  if (g.phase === 'lobby' && id === g.hostId) out.push({ type: 'startGame' });
  if (g.phase !== 'playing' || !g.turn) return out;
  const p = currentPlayer(g);
  if (!p || p.id !== id) return out;
  switch (g.turn.phase) {
    case 'prepare':
      out.push({ type: 'roll' });
      break;
    case 'move':
      out.push(...stepOptions(g, p));
      if (g.turn.free) out.push({ type: 'stop' });
      break;
    case 'after':
      out.push({ type: 'endTurn' });
      break;
  }
  return out;
}
