import { describe, expect, it } from 'vitest';
import { applyAction, viewFor } from './index.ts';
import { aGame, aLobby, act, player } from './testing.ts';

describe('Starting a game', () => {
  it('only the Host can start the game', () => {
    const g = aLobby(2);
    expect(() => applyAction(g, 'p2', { type: 'startGame' })).toThrow(/Host/);
    expect(act(g, 'p1', { type: 'startGame' }).phase).toBe('setup');
  });

  it('a game needs at least 2 Players', () => {
    expect(() => applyAction(aLobby(1), 'p1', { type: 'startGame' })).toThrow(/2/);
  });

  it('a table seats at most 6 Players', () => {
    const g = aLobby(6);
    expect(() =>
      applyAction(g, 'p7', { type: 'join', name: 'Gus', hero: 'bard', colour: 'red' }),
    ).toThrow(/full/);
  });

  it('nobody can join once the game has started', () => {
    const g = act(aLobby(2), 'p1', { type: 'startGame' });
    expect(() =>
      applyAction(g, 'p3', { type: 'join', name: 'Cy', hero: 'bard', colour: 'red' }),
    ).toThrow(/started/);
  });

  it('a Player cannot join twice', () => {
    expect(() =>
      applyAction(aLobby(1), 'p1', { type: 'join', name: 'A', hero: 'bard', colour: 'red' }),
    ).toThrow(/already/);
  });

  it('seats go in join order, starting from a random first Player', () => {
    const firsts = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const g = act(aLobby(4, seed), 'p1', { type: 'startGame' });
      const ids = ['p1', 'p2', 'p3', 'p4'];
      const k = ids.indexOf(g.seats[0] ?? '');
      expect(g.seats).toEqual([...ids.slice(k), ...ids.slice(0, k)]);
      firsts.add(g.seats[0] ?? '');
    }
    expect(firsts.size).toBe(4);
  });
});

describe('Setting up Stats', () => {
  const setup = () => act(aLobby(2), 'p1', { type: 'startGame' });
  const stats = (s: Partial<Record<string, number>>) => ({
    STR: 0,
    DEX: 0,
    INT: 0,
    WIS: 0,
    CON: 0,
    CHA: 0,
    ...s,
  });

  it('a Player assigns exactly 6 points', () => {
    expect(() =>
      applyAction(setup(), 'p1', { type: 'setStats', stats: stats({ STR: 3, DEX: 2 }) }),
    ).toThrow(/6 points/);
  });

  it('no Stat may take more than 3 points', () => {
    expect(() =>
      applyAction(setup(), 'p1', { type: 'setStats', stats: stats({ STR: 4, DEX: 2 }) }),
    ).toThrow(/3/);
  });

  it('negative points are refused', () => {
    expect(() =>
      applyAction(setup(), 'p1', {
        type: 'setStats',
        stats: stats({ STR: 3, DEX: 3, INT: 3, WIS: -3 }),
      }),
    ).toThrow();
  });

  it('HP starts at 4 + CON', () => {
    const g = act(setup(), 'p1', { type: 'setStats', stats: stats({ CON: 3, STR: 3 }) });
    expect(player(g, 'p1').hp).toBe(7);
  });

  it('a Player sets their Stats only once', () => {
    const g = act(setup(), 'p1', { type: 'setStats', stats: stats({ CON: 3, STR: 3 }) });
    expect(() =>
      applyAction(g, 'p1', { type: 'setStats', stats: stats({ CON: 3, STR: 3 }) }),
    ).toThrow(/already/);
  });

  it('play begins once every Player has set up, with the first seat to move', () => {
    const g = aGame({ players: 2 });
    expect(g.phase).toBe('playing');
    expect(g.round).toBe(1);
    expect(g.turn?.player).toBe('p1');
    expect(viewFor(g, 'p1').options).toContainEqual({ type: 'roll' });
    expect(viewFor(g, 'p2').options).not.toContainEqual({ type: 'roll' });
  });

  it('every Player starts at their Keep', () => {
    const g = aGame({ players: 3 });
    for (const p of g.players) expect([p.level, p.square]).toEqual(['town', 12]);
  });
});

describe('The seeded generator', () => {
  it('the same seed and actions replay the same game', () => {
    const run = () => {
      let g = aGame({ players: 2, seed: 42 });
      g = act(g, 'p1', { type: 'roll' });
      return g;
    };
    expect(run()).toEqual(run());
    const other = act(aGame({ players: 2, seed: 43 }), 'p1', { type: 'roll' });
    expect(other.rng).not.toBe(run().rng);
  });
});
