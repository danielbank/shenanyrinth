/** The latest view, played through the event queue. One small store, no state library. */
import { advance, createQueue, fastForward, receive, skip, type Queue } from './eventQueue.ts';
import { socket } from './socket.ts';
import type { GameEvent, PlayerView } from '../rules/index.ts';

const reducedMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

let queue: Queue = createQueue({ reducedMotion });
const listeners = new Set<() => void>();
function set(next: Queue) {
  queue = next;
  for (const l of listeners) l();
}

socket.on('view', (view: PlayerView) => set(receive(queue, view)));

export const gameStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get: () => queue,
  advance: () => set(advance(queue)),
  skip: () => set(skip(queue)),
  fastForward: (match: (e: GameEvent) => boolean) => set(fastForward(queue, match)),
};

/** How long each animated event plays, in milliseconds. */
export function durationOf(e: GameEvent): number {
  switch (e.type) {
    case 'stepped':
      return 220;
    case 'rolled':
    case 'exchangeRolled':
      return 650;
    default:
      return 300;
  }
}
