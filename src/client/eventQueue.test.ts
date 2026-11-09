import { describe, expect, it } from 'vitest';
import { advance, createQueue, fastForward, piecesShown, receive, skip } from './eventQueue.ts';
import type { GameEvent, PlayerView } from '../rules/index.ts';

const at = (square: number) => ({ id: 'p1', level: 'town' as const, square });
function aView(square: number, events: GameEvent[]): PlayerView {
  return { players: [at(square)], events } as unknown as PlayerView;
}
const stepped = (from: number, to: number): GameEvent => ({
  type: 'stepped',
  player: 'p1',
  level: 'town',
  from,
  to,
  dir: 'N',
});

describe('The client event queue', () => {
  it('plays a view’s events one at a time, in order', () => {
    let q = createQueue();
    q = receive(q, aView(12, []));
    q = receive(q, aView(2, [stepped(12, 7), stepped(7, 2)]));
    expect(q.playing).toEqual(stepped(12, 7));
    q = advance(q);
    expect(q.playing).toEqual(stepped(7, 2));
    q = advance(q);
    expect(q.playing).toBeNull();
  });

  it('pieces slide square by square: the shown position follows the played steps', () => {
    let q = receive(createQueue(), aView(12, []));
    q = receive(q, aView(2, [stepped(12, 7), stepped(7, 2)]));
    expect(piecesShown(q).p1?.square).toBe(12);
    q = advance(q);
    expect(piecesShown(q).p1?.square).toBe(7);
    q = advance(q);
    expect(piecesShown(q).p1?.square).toBe(2);
  });

  it('settles on the latest view once everything has played', () => {
    let q = receive(createQueue(), aView(12, []));
    q = receive(q, aView(2, [stepped(12, 7)]));
    q = advance(q);
    expect(q.settled).toBe(true);
    expect(piecesShown(q).p1?.square).toBe(2);
  });

  it('skipping ahead jumps straight to the latest view', () => {
    let q = receive(createQueue(), aView(12, []));
    q = receive(q, aView(2, [stepped(12, 7), stepped(7, 2)]));
    q = skip(q);
    expect(q.playing).toBeNull();
    expect(q.pending).toEqual([]);
    expect(piecesShown(q).p1?.square).toBe(2);
  });

  it('a reduced-motion queue never plays animations', () => {
    let q = receive(createQueue({ reducedMotion: true }), aView(12, []));
    q = receive(q, aView(2, [stepped(12, 7), stepped(7, 2)]));
    expect(q.playing).toBeNull();
    expect(piecesShown(q).p1?.square).toBe(2);
  });

  it('events that arrive while playing wait their turn', () => {
    let q = receive(createQueue(), aView(12, []));
    q = receive(q, aView(7, [stepped(12, 7)]));
    q = receive(q, aView(2, [stepped(7, 2)]));
    expect(q.pending).toEqual([stepped(7, 2)]);
    q = advance(q);
    expect(q.playing).toEqual(stepped(7, 2));
  });

  it('events with nothing to animate are passed over', () => {
    let q = receive(createQueue(), aView(12, []));
    q = receive(q, aView(12, [{ type: 'joined', player: 'p2' }]));
    expect(q.playing).toBeNull();
    expect(q.settled).toBe(true);
  });

  it('fast-forward drops everything before the first matching event', () => {
    let q = receive(createQueue(), aView(12, []));
    const dice: GameEvent = { type: 'rolled', player: 'p1', value: 3, steps: 3 };
    q = receive(q, aView(2, [stepped(12, 7), stepped(7, 2), dice]));
    q = fastForward(q, (e) => e.type === 'rolled');
    expect(q.playing).toEqual(dice);
    expect(piecesShown(q).p1?.square).toBe(2);
  });

  it('fast-forward with no matching event skips to the end', () => {
    let q = receive(createQueue(), aView(12, []));
    q = receive(q, aView(2, [stepped(12, 7)]));
    q = fastForward(q, (e) => e.type === 'rolled');
    expect(q.playing).toBeNull();
    expect(piecesShown(q).p1?.square).toBe(2);
  });

  it('advancing an idle queue changes nothing', () => {
    const q = receive(createQueue(), aView(12, []));
    expect(advance(q)).toEqual(q);
    expect(piecesShown(createQueue())).toEqual({});
  });
});
