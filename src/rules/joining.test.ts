import { describe, expect, it } from 'vitest';
import { applyAction, newGame, viewFor } from './index.ts';

describe('Joining a table', () => {
  it('a Player who joins with a name, hero and colour appears in every view', () => {
    let state = newGame({ seed: 1 });
    ({ state } = applyAction(state, 'p1', {
      type: 'join',
      name: 'Ann',
      hero: 'knight',
      colour: 'red',
    }));
    ({ state } = applyAction(state, 'p2', {
      type: 'join',
      name: 'Bo',
      hero: 'wizard',
      colour: 'blue',
    }));

    for (const viewer of ['p1', 'p2']) {
      const view = viewFor(state, viewer);
      expect(view.players.map((p) => [p.name, p.hero, p.colour])).toEqual([
        ['Ann', 'knight', 'red'],
        ['Bo', 'wizard', 'blue'],
      ]);
    }
  });
});
