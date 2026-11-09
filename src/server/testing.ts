/** Helpers for server tests: real sockets against a real server on a random port. */
import { io, type Socket } from 'socket.io-client';
import type { Action, PlayerView } from '../rules/index.ts';

export interface TestClient {
  socket: Socket;
  /** Resolves with the next view that satisfies the predicate (or the latest one, if it already does). */
  view(predicate?: (v: PlayerView) => boolean): Promise<PlayerView>;
  latest(): PlayerView | undefined;
  act(action: Action): Promise<{ ok: boolean; error?: string }>;
  close(): void;
}

export function connect(url: string, token: string): Promise<TestClient> {
  const socket = io(url, { auth: { token }, transports: ['websocket'], forceNew: true });
  let latest: PlayerView | undefined;
  let waiters: { predicate: (v: PlayerView) => boolean; resolve: (v: PlayerView) => void }[] = [];
  socket.on('view', (v: PlayerView) => {
    latest = v;
    const ready = waiters.filter((w) => w.predicate(v));
    waiters = waiters.filter((w) => !w.predicate(v));
    for (const w of ready) w.resolve(v);
  });
  const client: TestClient = {
    socket,
    latest: () => latest,
    view(predicate = () => true) {
      if (latest && predicate(latest)) return Promise.resolve(latest);
      return new Promise((resolve) => waiters.push({ predicate, resolve }));
    },
    act(action) {
      return new Promise((resolve) => socket.emit('action', action, resolve));
    },
    close: () => socket.close(),
  };
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(client));
    socket.once('connect_error', reject);
  });
}
