import type { GameEvent, GameState, Player, PlayerId } from './types.ts';

/** A draft state being changed by one action, plus the events it produces. */
export interface Ctx {
  g: GameState;
  events: GameEvent[];
}

export function emit(ctx: Ctx, event: GameEvent): void {
  ctx.events.push(event);
}

export function findPlayer(g: GameState, id: PlayerId): Player | undefined {
  return g.players.find((p) => p.id === id);
}

export function currentPlayer(g: GameState): Player | undefined {
  return g.turn ? findPlayer(g, g.turn.player) : undefined;
}
