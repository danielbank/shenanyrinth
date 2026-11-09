import { describe, expect, it } from 'vitest';
import { applyAction, viewFor } from './index.ts';
import { aGame, act, forceRolls, play, player } from './testing.ts';

const dirs = (g: Parameters<typeof viewFor>[0], id: string) =>
  viewFor(g, id)
    .options.filter((o) => o.type === 'step')
    .map((o) => (o.type === 'step' ? o.dir : ''))
    .sort();

describe('Turn phases', () => {
  it('a Turn goes Prepare, then Roll and move, then After moving, then End', () => {
    let g = forceRolls(aGame({ stats: [{ STR: 3, CON: 3 }] }), 1);
    expect(g.turn?.phase).toBe('prepare');
    g = act(g, 'p1', { type: 'roll' });
    expect(g.turn?.phase).toBe('move');
    g = act(g, 'p1', { type: 'step', dir: 'N' });
    expect(g.turn?.phase).toBe('after');
    g = act(g, 'p1', { type: 'endTurn' });
    expect(g.turn?.player).toBe('p2');
    expect(g.turn?.phase).toBe('prepare');
  });

  it('only the current Player can act on their Turn', () => {
    expect(() => applyAction(aGame(), 'p2', { type: 'roll' })).toThrow(/not your Turn|can't/i);
  });

  it('the Turn bar breadcrumb is in every view', () => {
    const view = viewFor(aGame(), 'p2');
    expect(view.turn).toMatchObject({ player: 'p1', phase: 'prepare' });
  });
});

describe('Town movement', () => {
  it('in the Town a Player rolls 1d6 and moves up to that many squares', () => {
    let g = forceRolls(aGame({ stats: [{ STR: 3, CON: 3 }] }), 2);
    g = act(g, 'p1', { type: 'roll' });
    expect(g.turn?.stepsLeft).toBe(2);
    g = act(g, 'p1', { type: 'step', dir: 'W' });
    expect(player(g, 'p1').square).toBe(11);
    g = act(g, 'p1', { type: 'step', dir: 'W' });
    expect(player(g, 'p1').square).toBe(10);
    expect(g.turn?.phase).toBe('after');
  });

  it('a Town move may stop early', () => {
    let g = forceRolls(aGame({ stats: [{ STR: 3, CON: 3 }] }), 5);
    g = act(g, 'p1', { type: 'roll' });
    g = act(g, 'p1', { type: 'step', dir: 'S' });
    g = act(g, 'p1', { type: 'stop' });
    expect(g.turn?.phase).toBe('after');
    expect(player(g, 'p1').square).toBe(17);
  });

  it('Town moves go any non-diagonal direction, including back, with no Pivot Limit', () => {
    let g = forceRolls(aGame({ stats: [{ STR: 3, CON: 3 }] }), 6);
    g = act(g, 'p1', { type: 'roll' });
    expect(dirs(g, 'p1')).toEqual(['E', 'N', 'S', 'W']);
    const { state } = play(
      g,
      ['p1', { type: 'step', dir: 'N' }],
      ['p1', { type: 'step', dir: 'S' }],
      ['p1', { type: 'step', dir: 'N' }],
      ['p1', { type: 'step', dir: 'E' }],
      ['p1', { type: 'step', dir: 'W' }],
    );
    expect(player(state, 'p1').square).toBe(7);
  });

  it('the Town wall stops moves off the grid', () => {
    let g = forceRolls(aGame({ stats: [{ STR: 3, CON: 3 }] }), 6);
    g = act(g, 'p1', { type: 'roll' });
    g = act(g, 'p1', { type: 'step', dir: 'N' });
    g = act(g, 'p1', { type: 'step', dir: 'N' });
    expect(player(g, 'p1').square).toBe(2);
    expect(dirs(g, 'p1')).toEqual(['E', 'S', 'W']);
    expect(() => applyAction(g, 'p1', { type: 'step', dir: 'N' })).toThrow();
  });

  it('DEX adds 1 optional extra square to a Town move', () => {
    let g = forceRolls(aGame({ stats: [{ DEX: 1, STR: 3, CON: 2 }] }), 1);
    g = act(g, 'p1', { type: 'roll' });
    expect(g.turn?.stepsLeft).toBe(2);
  });

  it('DEX 0 adds no extra square', () => {
    let g = forceRolls(aGame({ stats: [{ STR: 3, CON: 3 }] }), 1);
    g = act(g, 'p1', { type: 'roll' });
    expect(g.turn?.stepsLeft).toBe(1);
  });

  it('pieces share and pass through squares freely', () => {
    let g = forceRolls(aGame({ stats: [{ STR: 3, CON: 3 }] }), 1);
    g = act(g, 'p1', { type: 'roll' });
    g = act(g, 'p1', { type: 'step', dir: 'N' });
    g = act(g, 'p1', { type: 'endTurn' });
    g = forceRolls(g, 1);
    g = act(g, 'p2', { type: 'roll' });
    g = act(g, 'p2', { type: 'step', dir: 'N' });
    expect(player(g, 'p2').square).toBe(player(g, 'p1').square);
  });
});

describe('Rounds and the Doom Track', () => {
  const endTurns = (g: ReturnType<typeof aGame>, n: number) => {
    for (let i = 0; i < n; i++) {
      const id = g.turn?.player ?? '';
      g = act(forceRolls(g, 1), id, { type: 'roll' });
      g = act(g, id, { type: 'stop' });
      g = act(g, id, { type: 'endTurn' });
    }
    return g;
  };

  it('a Round is every Player taking one Turn, and the Doom Track advances after the last seat', () => {
    let g = aGame({ players: 3 });
    g = endTurns(g, 2);
    expect(g.round).toBe(1);
    g = endTurns(g, 1);
    expect(g.round).toBe(2);
    expect(g.turn?.player).toBe('p1');
  });

  it.each([
    [2, 30],
    [3, 24],
    [4, 20],
    [5, 19],
    [6, 18],
  ])('with %i Players the Doom Track ends the game after %i Rounds', (players, rounds) => {
    let g = aGame({ players });
    expect(viewFor(g, 'p1').doomLimit).toBe(rounds);
    g = endTurns(g, players * rounds - 1);
    expect(g.phase).toBe('playing');
    g = endTurns(g, 1);
    expect(g.phase).toBe('over');
    expect(viewFor(g, 'p1').final?.scores).toHaveLength(players);
  });

  it('the final scores count Keep Gold', () => {
    let g = aGame({ players: 2 });
    g.players[0]!.keep = 7;
    g.round = 30;
    g = endTurns(g, 2);
    const final = viewFor(g, 'p2').final;
    expect(final?.scores.find((s) => s.player === 'p1')?.total).toBe(7);
    expect(final?.winners).toEqual(['p1']);
  });

  it('nothing can be done once the game is over', () => {
    let g = aGame({ players: 2 });
    g.round = 30;
    g = endTurns(g, 2);
    expect(() => applyAction(g, 'p1', { type: 'roll' })).toThrow();
    expect(viewFor(g, 'p1').options).toEqual([]);
  });
});

describe('Move outlines', () => {
  it('the mover’s view lists where each legal step leads', () => {
    let g = forceRolls(aGame({ stats: [{ STR: 3, CON: 3 }] }), 3);
    g = act(g, 'p1', { type: 'roll' });
    expect(viewFor(g, 'p1').moves).toEqual([
      { dir: 'N', level: 'town', square: 7, pivot: false },
      { dir: 'E', level: 'town', square: 13, pivot: false },
      { dir: 'S', level: 'town', square: 17, pivot: false },
      { dir: 'W', level: 'town', square: 11, pivot: false },
    ]);
    expect(viewFor(g, 'p2').moves).toEqual([]);
  });
});
