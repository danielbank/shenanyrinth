import { describe, expect, it } from 'vitest';
import { applyAction, viewFor } from './index.ts';
import type { GameState } from './index.ts';
import {
  aGame,
  act,
  emptied,
  withoutFeature,
  forceRolls,
  placed,
  player,
  revealAll,
  sq,
  withPlayer,
  withTiles,
  withTokens,
} from './testing.ts';

const OPEN = ['┌┬┬┬┬┬┬┬┐', ...Array.from({ length: 7 }, () => '├┼┼┼┼┼┼┼┤'), '└┴┴┴┴┴┴┴┘'];
const s9 = (x: number, y: number) => sq(9, x, y);
const roll = (g: GameState, n: number, id = 'p1') => act(forceRolls(g, n), id, { type: 'roll' });
const go = (g: GameState, ...dirs: ('N' | 'E' | 'S' | 'W')[]) =>
  dirs.reduce((s, dir) => act(s, s.turn!.player, { type: 'step', dir }), g);
const tokensOf = (g: GameState) => Object.values(g.boards.forest.tokens);

function inForest(x: number, y: number, h: 'N' | 'E' | 'S' | 'W' = 'E') {
  let g = aGame({ stats: [{ STR: 3, CON: 3 }] });
  g = emptied(withTiles(g, 'forest', OPEN), 'forest');
  return placed(g, 'p1', 'forest', s9(x, y), h);
}

describe('Forest tokens', () => {
  it('the Forest is seeded with 6 Gold tokens worth 1–2 Gold and 4 Herb tokens', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const tokens = tokensOf(aGame({ seed }));
      const gold = tokens.filter((t) => t.type === 'gold');
      expect(gold).toHaveLength(6);
      for (const t of gold) expect(t.type === 'gold' && t.amount >= 1 && t.amount <= 2).toBe(true);
      expect(tokens.filter((t) => t.type === 'herbs')).toHaveLength(4);
    }
  });

  it('tokens sit on empty squares, never on a Feature', () => {
    const g = aGame();
    for (const square of Object.keys(g.boards.forest.tokens)) {
      expect(g.boards.forest.features[Number(square)]).toBeUndefined();
    }
  });

  it('pickups happen on every square passed over, not just where the move ends', () => {
    let g = withTokens(inForest(1, 4), 'forest', {
      [s9(2, 4)]: { type: 'gold', amount: 2 },
      [s9(3, 4)]: { type: 'herbs' },
    });
    g = go(roll(g, 3), 'E', 'E', 'E');
    expect(player(g, 'p1').pack).toEqual({ gold: 2, herbs: 1, artifacts: 0 });
  });

  it('a collected token respawns on a random empty square of the same Level', () => {
    let g = withTokens(inForest(1, 4), 'forest', { [s9(2, 4)]: { type: 'gold', amount: 1 } });
    g = go(roll(g, 1), 'E');
    const tokens = Object.entries(g.boards.forest.tokens);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]![0]).not.toBe(String(s9(2, 4)));
    expect(tokens[0]![1]).toMatchObject({ type: 'gold' });
  });

  it('the Forest’s contents stay hidden until Torchlight reveals them', () => {
    const g = withTokens(aGame(), 'forest', { [s9(4, 4)]: { type: 'herbs' } });
    expect(viewFor(g, 'p1').boards.forest.squares[s9(4, 4)]?.token).toBeNull();
    const lit = revealAll(g, 'forest');
    expect(viewFor(lit, 'p1').boards.forest.squares[s9(4, 4)]?.token).toEqual({ type: 'herbs' });
  });
});

describe('Errands and the Keep', () => {
  const rich = (g: GameState, gold = 10) => withPlayer(g, 'p1', (p) => (p.pack.gold = gold));
  const deposits = (g: GameState) =>
    viewFor(g, 'p1').options.filter((o) => o.type === 'deposit').length;

  it('a Player who passed the Keep Hall may Deposit Gold from their Pack into their Keep', () => {
    let g = rich(placed(aGame({ stats: [{ STR: 3, CON: 3 }] }), 'p1', 'town', 7));
    g = go(roll(g, 2), 'S', 'S');
    expect(deposits(g)).toBe(10);
    g = act(g, 'p1', { type: 'deposit', amount: 6 });
    expect(player(g, 'p1')).toMatchObject({ keep: 6, pack: { gold: 4 } });
  });

  it('starting the Turn at the Keep Hall counts as passing it', () => {
    const g = go(roll(rich(aGame({ stats: [{ STR: 3, CON: 3 }] })), 1), 'N');
    expect(deposits(g)).toBe(10);
  });

  it('Errands include buildings passed on a move that ends by taking a Gate', () => {
    let g = rich(aGame({ stats: [{ STR: 3, CON: 3 }] }));
    g = go(roll(g, 2), 'N', 'N');
    g = act(g, 'p1', { type: 'takeFeature' });
    const heading = viewFor(g, 'p1').options.find((o) => o.type === 'chooseHeading')!;
    g = act(g, 'p1', heading);
    expect(deposits(g)).toBe(10);
  });

  it('a Player who did not pass the Keep Hall cannot Deposit', () => {
    let g = rich(placed(aGame({ stats: [{ STR: 3, CON: 3 }] }), 'p1', 'town', 0));
    g = go(roll(g, 1), 'E');
    expect(deposits(g)).toBe(0);
  });

  it('Deposit takes no more than the Pack holds, and Keep Gold never comes back out', () => {
    let g = rich(aGame({ stats: [{ STR: 3, CON: 3 }] }), 3);
    g = go(roll(g, 1), 'N');
    expect(() => applyAction(g, 'p1', { type: 'deposit', amount: 4 })).toThrow();
    g = act(g, 'p1', { type: 'deposit', amount: 3 });
    expect(deposits(g)).toBe(0);
    expect(player(g, 'p1').keep).toBe(3);
  });

  it('arriving at your Keep restores full HP', () => {
    let g = withPlayer(
      placed(aGame({ stats: [{ STR: 3, CON: 3 }] }), 'p1', 'town', 7),
      'p1',
      (p) => {
        p.hp = 1;
      },
    );
    g = go(roll(g, 2), 'S');
    expect(player(g, 'p1').hp).toBe(7);
  });
});

describe('Lost drops half the Pack', () => {
  function lostWith(pack: { gold: number; herbs: number; artifacts: number }) {
    const rows = [...OPEN];
    rows[4] = '├───┐───┤';
    let g = withTiles(aGame({ stats: [{ STR: 3, CON: 3 }] }), 'forest', rows);
    g = withoutFeature(g, 'forest', s9(4, 4));
    g = placed(g, 'p1', 'forest', s9(3, 4), 'E');
    g = withTokens(g, 'forest', {});
    g = withPlayer(roll(g, 2), 'p1', (p) => {
      p.pivots = 0;
      p.pack = { ...pack };
    });
    return go(g, 'E');
  }

  it('Lost drops half the Pack’s Gold and Materials, keeping the larger half', () => {
    const g = lostWith({ gold: 5, herbs: 3, artifacts: 1 });
    expect(player(g, 'p1').pack).toEqual({ gold: 3, herbs: 2, artifacts: 1 });
    expect(g.boards.forest.piles[s9(4, 4)]).toEqual({ gold: 2, herbs: 1, artifacts: 0 });
  });

  it('nothing is dropped from an empty Pack', () => {
    const g = lostWith({ gold: 1, herbs: 1, artifacts: 1 });
    expect(g.boards.forest.piles[s9(4, 4)]).toBeUndefined();
  });

  it('anyone can pick up a dropped pile by passing over it', () => {
    let g = lostWith({ gold: 8, herbs: 0, artifacts: 0 });
    g = placed(g, 'p2', 'forest', s9(4, 3), 'S');
    g = withTiles(g, 'forest', OPEN);
    g = go(roll(g, 2, 'p2'), 'S', 'S');
    expect(player(g, 'p2').pack.gold).toBe(4);
    expect(g.boards.forest.piles[s9(4, 4)]).toBeUndefined();
  });
});

describe('Scoring and hidden Packs', () => {
  it('final scores count Keep Gold in full and Pack Gold at half, rounded down', () => {
    let g = withPlayer(aGame(), 'p1', (p) => {
      p.keep = 4;
      p.pack.gold = 5;
    });
    g.round = 30;
    for (const id of ['p1', 'p2']) {
      g = act(forceRolls(g, 1), id, { type: 'roll' });
      g = act(g, id, { type: 'stop' });
      g = act(g, id, { type: 'endTurn' });
    }
    expect(viewFor(g, 'p1').final?.scores.find((s) => s.player === 'p1')).toMatchObject({
      keep: 4,
      pack: 2,
      total: 6,
    });
  });

  it('views hide other Players’ Packs, and the public score leaves out Pack Gold', () => {
    const g = withPlayer(aGame(), 'p1', (p) => {
      p.keep = 4;
      p.pack = { gold: 9, herbs: 2, artifacts: 1 };
    });
    const theirs = viewFor(g, 'p2');
    expect(JSON.stringify(theirs.players)).not.toContain('pack');
    expect(theirs.me?.pack).toEqual({ gold: 0, herbs: 0, artifacts: 0 });
    expect(theirs.players.find((p) => p.id === 'p1')?.publicScore).toBe(4);
    expect(viewFor(g, 'p1').me?.pack).toEqual({ gold: 9, herbs: 2, artifacts: 1 });
  });
});
