/** The table: one game, its seats and who is connected. Pure of sockets; the app wires it up. */
import { randomUUID } from 'node:crypto';
import { applyAction, newGame, viewFor } from '../rules/index.ts';
import type { Action, GameEvent, GameState, PlayerId, PlayerView } from '../rules/index.ts';

export interface TableSnapshot {
  state: GameState;
  seats: Record<string, PlayerId>;
}

export class Table {
  state: GameState;
  /** seat token → Player id */
  seats: Map<string, PlayerId>;
  private listeners = new Set<(events: GameEvent[]) => void>();

  constructor(snapshot?: TableSnapshot, seed = Date.now()) {
    this.state = snapshot?.state ?? newGame({ seed });
    this.seats = new Map(Object.entries(snapshot?.seats ?? {}));
  }

  snapshot(): TableSnapshot {
    return { state: this.state, seats: Object.fromEntries(this.seats) };
  }

  /** The Player id for a seat token; a new token gets a fresh id that joins on its first action. */
  playerFor(token: string): PlayerId {
    let id = this.seats.get(token);
    if (!id) {
      id = randomUUID().slice(0, 8);
      this.seats.set(token, id);
    }
    return id;
  }

  onChange(listener: (events: GameEvent[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  act(actor: PlayerId, action: Action): void {
    const { state, events } = applyAction(this.state, actor, action);
    this.state = state;
    for (const l of this.listeners) l(events);
  }

  view(viewer: PlayerId, events: GameEvent[] = []): PlayerView {
    return viewFor(this.state, viewer, events);
  }
}
