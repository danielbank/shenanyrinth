import { describe, expect, it } from 'vitest';
import { applyAction, viewFor } from './index.ts';
import { act, aGame } from './testing.ts';

describe('New game', () => {
  it('the Host clears the table back to an empty Lobby with no Host', () => {
    const g = act(aGame({ players: 3 }), 'p1', { type: 'newGame' });
    expect(g.phase).toBe('lobby');
    expect(g.players).toEqual([]);
    expect(g.hostId).toBeNull();
    expect(viewFor(g, 'p2').you).toBeNull();
  });

  it('only the Host can start a new game', () => {
    expect(() => applyAction(aGame({ players: 2 }), 'p2', { type: 'newGame' })).toThrow(
      'Only the Host can start a new game',
    );
  });

  it('whoever joins first after a new game becomes the Host', () => {
    let g = act(aGame({ players: 2 }), 'p1', { type: 'newGame' });
    g = act(g, 'p2', { type: 'join', name: 'Bo', hero: 'wizard', colour: 'blue' });
    expect(g.hostId).toBe('p2');
  });
});
