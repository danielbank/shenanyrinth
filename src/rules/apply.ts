import { RuleError } from './errors.ts';
import type { Action, ActionResult, GameEvent, GameState, PlayerId } from './types.ts';

export function applyAction(state: GameState, actor: PlayerId, action: Action): ActionResult {
  const g = structuredClone(state);
  const events: GameEvent[] = [];
  switch (action.type) {
    case 'join': {
      if (g.phase !== 'lobby') throw new RuleError('The game has already started');
      if (g.players.some((p) => p.id === actor)) throw new RuleError('You have already joined');
      g.players.push({
        id: actor,
        name: action.name,
        hero: action.hero,
        colour: action.colour,
        online: true,
      });
      g.hostId ??= actor;
      events.push({ type: 'joined', player: actor });
      break;
    }
    default:
      throw new RuleError(`Unknown action ${JSON.stringify((action as { type?: unknown }).type)}`);
  }
  return { state: g, events };
}
