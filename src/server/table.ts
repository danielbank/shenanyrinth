/** The table: one game, its seats and who is connected. Pure of sockets; the app wires it up. */
import { randomUUID } from 'node:crypto';
import { applyAction, newGame, SYSTEM, viewFor } from '../rules/index.ts';
import type { Clock } from './app.ts';

export const RESPONSE_SECONDS = 8;
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
  private window: { id: number; endsAt: number; handle: unknown } | null = null;

  private clock: Clock;

  constructor(snapshot: TableSnapshot | undefined, seed: number, clock: Clock) {
    this.clock = clock;
    this.state = snapshot?.state ?? newGame({ seed });
    this.seats = new Map(Object.entries(snapshot?.seats ?? {}));
    // After a restart nobody is connected until they come back.
    this.state = {
      ...this.state,
      players: this.state.players.map((p) => ({ ...p, online: false })),
    };
  }

  private connections = new Map<PlayerId, number>();

  connected(id: PlayerId): void {
    this.connections.set(id, (this.connections.get(id) ?? 0) + 1);
    if (this.state.players.some((p) => p.id === id)) {
      this.act(SYSTEM, { type: 'presence', player: id, online: true });
    }
  }

  disconnected(id: PlayerId): void {
    const left = (this.connections.get(id) ?? 1) - 1;
    this.connections.set(id, left);
    if (left === 0 && this.state.players.some((p) => p.id === id)) {
      this.act(SYSTEM, { type: 'presence', player: id, online: false });
    }
  }

  /** Server-side facts the client can't be trusted with, such as the time of a slap. */
  stamp(action: Action): Action {
    return action.type === 'slap' ? { type: 'slap', at: this.clock.now() } : action;
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
    this.watchResponseWindow();
    for (const l of this.listeners) l(events);
  }

  /** The 8 seconds count from the server's opening of the window. */
  private watchResponseWindow(): void {
    const id = this.state.response?.id ?? null;
    if (this.window && this.window.id !== id) {
      this.clock.clearTimeout(this.window.handle);
      this.window = null;
    }
    if (id === null || this.window) return;
    const handle = this.clock.setTimeout(
      () => this.act(SYSTEM, { type: 'closeResponse', id }),
      RESPONSE_SECONDS * 1000,
    );
    this.window = { id, endsAt: this.clock.now() + RESPONSE_SECONDS * 1000, handle };
  }

  view(viewer: PlayerId, events: GameEvent[] = []): PlayerView {
    const view = viewFor(this.state, viewer, events);
    if (!this.window) return view;
    return { ...view, responseMsLeft: Math.max(0, this.window.endsAt - this.clock.now()) };
  }
}
