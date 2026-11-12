/** The table: one game, its seats and who is connected. Pure of sockets; the app wires it up. */
import { randomUUID } from 'node:crypto';
import { COLOURS, HEROES } from '../rules/data.ts';
import { applyAction, newGame, SYSTEM, viewFor } from '../rules/index.ts';
import type { Action, GameEvent, GameState, PlayerId, PlayerView } from '../rules/index.ts';
import type { Clock } from './app.ts';
import { botFor, botRandom, BUILDS, type Bot } from './bot.ts';

export const RESPONSE_SECONDS = 8;

export interface TableSnapshot {
  state: GameState;
  seats: Record<string, PlayerId>;
  /** Each Bot's build, by Player id. */
  bots?: Record<PlayerId, string>;
}

export class Table {
  state: GameState;
  /** seat token → Player id */
  seats: Map<string, PlayerId>;
  /** The brain of each Bot at the table. */
  bots = new Map<PlayerId, Bot>();
  private rand: () => number;
  /** Builds picked for Bots the Host has asked for, until the rules seat them. */
  private picked = new Map<PlayerId, string>();
  private listeners = new Set<(events: GameEvent[]) => void>();
  private window: { id: number; endsAt: number; handle: unknown } | null = null;

  readonly clock: Clock;

  constructor(snapshot: TableSnapshot | undefined, seed: number, clock: Clock) {
    this.clock = clock;
    this.state = snapshot?.state ?? newGame({ seed });
    this.seats = new Map(Object.entries(snapshot?.seats ?? {}));
    this.rand = botRandom(seed);
    for (const [id, build] of Object.entries(snapshot?.bots ?? {})) {
      this.bots.set(id, botFor(id, build));
    }
    // After a restart nobody is connected until they come back; Bots are always here.
    this.state = {
      ...this.state,
      players: this.state.players.map((p) => ({ ...p, online: p.bot === true })),
    };
    this.watchResponseWindow();
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
    if (action.type === 'slap' || action.type === 'squeak') {
      return { type: action.type, at: this.clock.now() };
    }
    if (action.type === 'addBot') return { type: 'addBot', bot: this.newBot() };
    return action;
  }

  /** Who a new Bot is: a random build, named after it, with a free hero and colour. */
  private newBot(): NonNullable<Extract<Action, { type: 'addBot' }>['bot']> {
    const players = this.state.players;
    const pickFree = <T extends string>(all: readonly T[], taken: T[]): T => {
      const free = all.filter((x) => !taken.includes(x));
      const list = free.length ? free : all;
      return list[Math.floor(this.rand() * list.length)]!;
    };
    const build = BUILDS[Math.floor(this.rand() * BUILDS.length)]!;
    const base = `${build.name} Bot`;
    const names = new Set(players.map((p) => p.name));
    let n = 1;
    while (names.has(n === 1 ? base : `${base} ${n}`)) n++;
    const id = `bot-${randomUUID().slice(0, 8)}`;
    this.picked.set(id, build.name);
    return {
      id,
      name: n === 1 ? base : `${base} ${n}`,
      hero: pickFree(
        HEROES,
        players.map((p) => p.hero),
      ),
      colour: pickFree(
        COLOURS,
        players.map((p) => p.colour),
      ),
    };
  }

  snapshot(): TableSnapshot {
    return {
      state: this.state,
      seats: Object.fromEntries(this.seats),
      bots: Object.fromEntries([...this.bots].map(([id, b]) => [id, b.build.name])),
    };
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
    if (action.type === 'addBot' && action.bot) {
      const { id } = action.bot;
      this.bots.set(id, botFor(id, this.picked.get(id) ?? ''));
      this.picked.delete(id);
    }
    if (action.type === 'removeBot') this.bots.delete(action.player);
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
