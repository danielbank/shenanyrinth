/** Every enumerable action a Player may take right now. */
import { currentPlayer } from './context.ts';
import { clashOptions } from './clash.ts';
import { errandOptions } from './errands.ts';
import { compassOptions, headingOptions, stepOptions } from './movement.ts';
import type { Action, GameState, PlayerId } from './types.ts';

export function legalActions(g: GameState, id: PlayerId): Action[] {
  const out: Action[] = [];
  if (g.phase === 'lobby' && id === g.hostId) out.push({ type: 'startGame' });
  if (g.phase !== 'playing' || !g.turn) return out;
  const p = currentPlayer(g);
  if (!p || p.id !== id) return out;
  if (g.clash) return clashOptions(g);
  switch (g.turn.phase) {
    case 'start':
      out.push({ type: 'resumeClash' }, { type: 'moveAway' });
      break;
    case 'prepare':
      out.push({ type: 'roll' });
      out.push(...compassOptions(g, p));
      break;
    case 'move': {
      const turn = g.turn;
      out.push(...stepOptions(g, p));
      if (turn.free || (turn.stepsLeft === 0 && turn.dexLeft > 0)) out.push({ type: 'stop' });
      if (turn.onFeature) out.push({ type: 'takeFeature' });
      break;
    }
    case 'after':
      if (g.turn.choosingHeading) {
        out.push(...headingOptions(g, p));
        break;
      }
      if (g.turn.onFeature) out.push({ type: 'takeFeature' });
      out.push(...errandOptions(g, p));
      out.push({ type: 'endTurn' });
      break;
  }
  return out;
}
