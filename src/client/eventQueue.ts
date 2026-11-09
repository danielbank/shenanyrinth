/**
 * The client's event queue, as a pure module. Each view from the server carries the events that
 * led to it; the queue plays them one at a time as animations, then settles on the view.
 * A Player can skip ahead, reduced-motion devices never animate, and a Response window
 * fast-forwards straight to the dice.
 */
import { TOWN } from '../rules/data.ts';
import type { GameEvent, LevelName, PlayerView } from '../rules/index.ts';

export interface PieceAt {
  level: LevelName;
  square: number;
}

export interface Queue {
  reducedMotion: boolean;
  /** The event animating now. */
  playing: GameEvent | null;
  pending: GameEvent[];
  /** The latest view from the server. */
  view: PlayerView | null;
  /** Where each piece is drawn right now. */
  shown: Record<string, PieceAt>;
  /** True once every event has played and the board shows the latest view. */
  settled: boolean;
}

/** Events that have an animation; everything else applies at once. */
const ANIMATED = new Set<GameEvent['type']>([
  'stepped',
  'rolled',
  'exchangeRolled',
  'responseOpened',
]);

export function createQueue({ reducedMotion = false } = {}): Queue {
  return { reducedMotion, playing: null, pending: [], view: null, shown: {}, settled: true };
}

export function receive(q: Queue, view: PlayerView): Queue {
  const next: Queue = { ...q, view, pending: [...q.pending, ...view.events] };
  if (q.reducedMotion || !q.view) return skip(next);
  // Every client jumps straight to the dice, so all Players get the full window.
  if (view.events.some((e) => e.type === 'responseOpened')) {
    return fastForward(next, (e) => e.type === 'responseOpened');
  }
  return q.playing ? next : playNext(next);
}

/** The current animation finished: apply it and start the next. */
export function advance(q: Queue): Queue {
  if (!q.playing) return q;
  return playNext({ ...q, shown: applyEvent(q.shown, q.playing) });
}

/** Jump to the latest view. */
export function skip(q: Queue): Queue {
  return settle({ ...q, playing: null, pending: [] });
}

/** Drop everything before the first event that matches, and play from there. */
export function fastForward(q: Queue, match: (e: GameEvent) => boolean): Queue {
  const all = q.playing ? [q.playing, ...q.pending] : q.pending;
  const k = all.findIndex(match);
  if (k < 0) return skip(q);
  const shown = all.slice(0, k).reduce(applyEvent, q.shown);
  return { ...q, shown, playing: all[k] ?? null, pending: all.slice(k + 1), settled: false };
}

export function piecesShown(q: Queue): Record<string, PieceAt> {
  return q.shown;
}

/** Start the next animated event, applying any instant ones on the way. */
function playNext(q: Queue): Queue {
  let shown = q.shown;
  for (let k = 0; k < q.pending.length; k++) {
    const e = q.pending[k]!;
    if (ANIMATED.has(e.type)) {
      return { ...q, shown, playing: e, pending: q.pending.slice(k + 1), settled: false };
    }
    shown = applyEvent(shown, e);
  }
  return settle({ ...q, shown, playing: null, pending: [] });
}

function settle(q: Queue): Queue {
  const shown: Record<string, PieceAt> = {};
  if (!q.view) return { ...q, shown, settled: true };
  for (const p of q.view.players) shown[p.id] = { level: p.level, square: p.square };
  return { ...q, shown, settled: true };
}

function applyEvent(shown: Record<string, PieceAt>, e: GameEvent): Record<string, PieceAt> {
  switch (e.type) {
    case 'stepped':
      return { ...shown, [e.player]: { level: e.level, square: e.to } };
    case 'travelled':
      return { ...shown, [e.player]: e.to };
    case 'sentHome':
      return { ...shown, [e.player]: { level: 'town', square: TOWN.keepHall } };
    default:
      return shown;
  }
}
