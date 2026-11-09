/** One-off effects from events that play at once, outside the event queue (the slap). */
import { socket } from './socket.ts';
import type { GameEvent, PlayerView } from '../rules/index.ts';

export interface Fx {
  id: number;
  event: GameEvent;
}

let fx: Fx[] = [];
let next = 1;
const listeners = new Set<() => void>();
const notify = () => {
  for (const l of listeners) l();
};

socket.on('view', (view: PlayerView) => {
  const fresh = view.events.filter((e) => e.type === 'slapped');
  if (fresh.length === 0) return;
  fx = [...fx, ...fresh.map((event) => ({ id: next++, event }))].slice(-6);
  notify();
});

export const fxStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get: () => fx,
  done(id: number) {
    fx = fx.filter((f) => f.id !== id);
    notify();
  },
};
