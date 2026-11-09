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

const eventListeners = new Set<(e: GameEvent) => void>();

socket.on('view', (view: PlayerView) => {
  for (const e of view.events) {
    if (e.type === 'slapped' || e.type === 'squeaked') for (const l of eventListeners) l(e);
  }
  const fresh = view.events.filter(
    (e) =>
      e.type === 'slapped' || (e.type === 'deposited' && e.amount >= 10 && popper(view, e.player)),
  );
  if (fresh.length === 0) return;
  fx = [...fx, ...fresh.map((event) => ({ id: next++, event }))].slice(-6);
  notify();
});

function popper(view: PlayerView, id: string): boolean {
  return view.players.find((p) => p.id === id)?.trinkets.includes('Party Popper') ?? false;
}

export const fxStore = {
  /** Listen for instant events (slaps and squeaks), for their sounds. */
  onEvent(listener: (e: GameEvent) => void) {
    eventListeners.add(listener);
  },
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
