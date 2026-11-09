import type { GameEvent, GameState, PlayerId, PlayerView } from './types.ts';

export function viewFor(state: GameState, viewer: PlayerId, events: GameEvent[] = []): PlayerView {
  const you = state.players.some((p) => p.id === viewer) ? viewer : null;
  return {
    you,
    phase: state.phase,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      hero: p.hero,
      colour: p.colour,
      online: p.online,
      isHost: p.id === state.hostId,
    })),
    options: [],
    events: events.filter((e) => !e.to || e.to.includes(viewer)),
  };
}
