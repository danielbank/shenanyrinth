/** Every enumerable action a Player may take right now. */
import { currentPlayer, findPlayer } from './context.ts';
import { responseOptions } from './response.ts';
import { defenceOptions, ramOptions, shakedownOptions } from './shakedown.ts';
import { clashOptions } from './clash.ts';
import { errandOptions } from './errands.ts';
import { itemOptions } from './items.ts';
import { discardOptions } from './loot.ts';
import { compassOptions, headingOptions, stepOptions } from './movement.ts';
import type { Action, GameState, PlayerId } from './types.ts';

export function legalActions(g: GameState, id: PlayerId): Action[] {
  const out: Action[] = [];
  if (g.phase === 'lobby' && id === g.hostId) out.push({ type: 'startGame' });
  if (g.phase !== 'playing' || !g.turn) return out;
  const current = currentPlayer(g)!;
  if (!current.online && current.id !== id && findPlayer(g, id)) return [{ type: 'skipTurn' }];
  if (g.response) {
    const q = findPlayer(g, id);
    return q ? responseOptions(g, q) : [];
  }
  if (g.shakedown) return defenceOptions(g, id);
  if (g.discarding) {
    const q = findPlayer(g, id);
    return q && g.discarding === id ? discardOptions(g, q) : [];
  }
  const p = currentPlayer(g);
  if (!p || p.id !== id) return out;
  if (g.clash) return [...clashOptions(g), ...itemOptions(g, p)];
  switch (g.turn.phase) {
    case 'start':
      out.push({ type: 'resumeClash' }, { type: 'moveAway' });
      break;
    case 'prepare':
      out.push({ type: 'roll' });
      out.push(...compassOptions(g, p));
      out.push(...itemOptions(g, p));
      break;
    case 'move': {
      const turn = g.turn;
      if (turn.stuck) return itemOptions(g, p);
      out.push(...itemOptions(g, p));
      out.push(...stepOptions(g, p));
      if (turn.free || (turn.stepsLeft === 0 && turn.dexLeft > 0)) out.push({ type: 'stop' });
      if (turn.onFeature) out.push({ type: 'takeFeature' });
      out.push(...ramOptions(g, p));
      break;
    }
    case 'after':
      if (g.turn.choosingHeading) {
        out.push(...headingOptions(g, p));
        break;
      }
      if (g.turn.onFeature) out.push({ type: 'takeFeature' });
      out.push(...shakedownOptions(g, p));
      out.push(...itemOptions(g, p));
      out.push(...errandOptions(g, p));
      out.push({ type: 'endTurn' });
      break;
  }
  return out;
}
