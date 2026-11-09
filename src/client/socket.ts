/** The one socket to the server, the seat token, and the latest view as a tiny store. */
import { io } from 'socket.io-client';
import type { Action, PlayerView } from '../rules/index.ts';

const TOKEN_KEY = 'shenanyrinth.seat';

function seatToken(): string {
  try {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

export const socket = io({ auth: { token: seatToken() } });

let latest: PlayerView | null = null;
const listeners = new Set<() => void>();

socket.on('view', (view: PlayerView) => {
  latest = view;
  for (const l of listeners) l();
});

export const viewStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get: () => latest,
};

export function send(action: Action): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => socket.emit('action', action, resolve));
}
