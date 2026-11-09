import { describe, expect, it } from 'vitest';
import { applyAction, viewFor } from './index.ts';
import type { GameState } from './index.ts';
import { TRINKETS } from './data.ts';
import {
  aGame,
  act,
  emptied,
  forceRolls,
  placed,
  player,
  revealAll,
  sq,
  withItem,
  withMob,
  withPlayer,
  withTiles,
  withTokens,
} from './testing.ts';

const OPEN = ['┌┬┬┬┬┬┬┬┐', ...Array.from({ length: 7 }, () => '├┼┼┼┼┼┼┼┤'), '└┴┴┴┴┴┴┴┘'];
const s9 = (x: number, y: number) => sq(9, x, y);
const roll = (g: GameState, n: number, id = 'p1') => act(forceRolls(g, n), id, { type: 'roll' });
const go = (g: GameState, ...dirs: ('N' | 'E' | 'S' | 'W')[]) =>
  dirs.reduce((s, dir) => act(s, s.turn!.player, { type: 'step', dir }), g);

function forest(stats: Record<string, number> = { STR: 3, CON: 3 }) {
  let g = emptied(withTiles(aGame({ stats: [stats] }), 'forest', OPEN), 'forest');
  return placed(g, 'p1', 'forest', s9(2, 4), 'E');
}

describe('Caches', () => {
  it('each Level is seeded with 2 Caches: Forest rated 2–3, Dungeon rated 3–5', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = aGame({ seed });
      const ratings = (level: 'forest' | 'dungeon') =>
        Object.values(g.boards[level].tokens).flatMap((t) =>
          t.type === 'cache' ? [t.rating] : [],
        );
      expect(ratings('forest')).toHaveLength(2);
      for (const r of ratings('forest')) expect(r >= 2 && r <= 3).toBe(true);
      expect(ratings('dungeon')).toHaveLength(2);
      for (const r of ratings('dungeon')) expect(r >= 3 && r <= 5).toBe(true);
    }
  });

  it('a Cache is visible only to Players whose INT meets its rating, once Torchlight has reached it', () => {
    let g = withTokens(
      aGame({
        stats: [
          { INT: 3, CON: 3 },
          { INT: 2, CON: 3, STR: 1 },
        ],
      }),
      'forest',
      {
        [s9(4, 4)]: { type: 'cache', rating: 3 },
      },
    );
    expect(viewFor(g, 'p1').boards.forest.squares[s9(4, 4)]?.token).toBeNull();
    g.boards.forest.revealed[s9(4, 4)] = true;
    g.boards.forest.lit[s9(4, 4)] = true;
    expect(viewFor(g, 'p1').boards.forest.squares[s9(4, 4)]?.token).toEqual({
      type: 'cache',
      rating: 3,
    });
    expect(JSON.stringify(viewFor(g, 'p2'))).not.toContain('cache');
  });

  it('the Orb of Foresight does not show Caches', () => {
    let g = withTokens(forest({ INT: 3, CON: 3 }), 'forest', {
      [s9(7, 7)]: { type: 'cache', rating: 2 },
    });
    g = withItem(g, 'p1', 'orb');
    g = act(g, 'p1', { type: 'use', item: player(g, 'p1').items[0]!.id, square: s9(7, 7) });
    expect(viewFor(g, 'p1').boards.forest.squares[s9(7, 7)]?.token).toBeNull();
  });

  it('a Forest Cache pays 3 Gold + 1 Herb to a Player with enough INT passing over it', () => {
    let g = withTokens(forest({ INT: 3, CON: 3 }), 'forest', {
      [s9(3, 4)]: { type: 'cache', rating: 3 },
    });
    g = act(forceRolls(g, 2, 1), 'p1', { type: 'roll' });
    g = go(g, 'E', 'E');
    expect(player(g, 'p1').pack).toMatchObject({ gold: 3, herbs: 1 });
    expect(player(g, 'p1').cachesClaimed).toEqual([3]);
  });

  it('a Dungeon Cache pays 5 Gold + 1 Artifact', () => {
    let g = emptied(aGame({ stats: [{ INT: 3, CON: 3 }] }), 'dungeon');
    g.boards.dungeon.tiles = g.boards.dungeon.tiles.map(() => 'NESW');
    g = withTokens(g, 'dungeon', { [sq(7, 3, 3)]: { type: 'cache', rating: 3 } });
    g = placed(g, 'p1', 'dungeon', sq(7, 2, 3), 'E');
    g = act(forceRolls(g, 1, 1), 'p1', { type: 'roll' });
    g = go(g, 'E');
    expect(player(g, 'p1').pack).toMatchObject({ gold: 5, artifacts: 1 });
  });

  it('a Player whose INT is below the rating passes over a Cache without claiming it', () => {
    let g = withTokens(forest({ INT: 2, CON: 3, STR: 1 }), 'forest', {
      [s9(3, 4)]: { type: 'cache', rating: 3 },
    });
    const res = applyAction(roll(g, 1), 'p1', { type: 'step', dir: 'E' });
    expect(player(res.state, 'p1').pack.gold).toBe(0);
    expect(res.state.boards.forest.tokens[s9(3, 4)]).toEqual({ type: 'cache', rating: 3 });
    expect(JSON.stringify(viewFor(res.state, 'p1', res.events))).not.toContain('cache');
  });

  it('a claimed Cache respawns elsewhere on the Level, and only INT-worthy Players hear of it', () => {
    let g = withTokens(forest({ INT: 3, CON: 3 }), 'forest', {
      [s9(3, 4)]: { type: 'cache', rating: 2 },
    });
    g = forceRolls(g, 1, 1);
    const res = applyAction(g, 'p1', { type: 'roll' });
    const step = applyAction(forceRolls(res.state, 1), 'p1', { type: 'step', dir: 'E' });
    const caches = Object.values(step.state.boards.forest.tokens).filter((t) => t.type === 'cache');
    expect(caches).toHaveLength(1);
    expect(step.state.boards.forest.tokens[s9(3, 4)]).toBeUndefined();
    expect(JSON.stringify(viewFor(step.state, 'p2', step.events).events)).not.toContain('cache');
    expect(JSON.stringify(viewFor(step.state, 'p1', step.events).events)).toContain('cache');
  });
});

describe('Loot', () => {
  function killWolf(level: 'forest' | 'dungeon', mob: string, lootRolls: number[]) {
    let g = forest();
    if (level === 'dungeon') {
      g = emptied(g, 'dungeon');
      g.boards.dungeon.tiles = g.boards.dungeon.tiles.map(() => 'NESW');
      g = placed(g, 'p1', 'dungeon', sq(7, 2, 3), 'E');
      g = withMob(g, 'dungeon', sq(7, 3, 3), mob, 1);
      g = revealAll(g, 'dungeon');
    } else {
      g = withMob(g, 'forest', s9(3, 4), mob, 0);
    }
    g = go(roll(g, 1), 'E');
    const res = applyAction(forceRolls(g, 6, 1, ...lootRolls), 'p1', {
      type: 'exchange',
      approach: 'Fight',
    });
    return res.state;
  }

  it('a Forest kill drops Loot only on a 6', () => {
    expect(player(killWolf('forest', 'Goblin', [5]), 'p1').pack.herbs).toBe(0);
    expect(player(killWolf('forest', 'Goblin', [6, 1]), 'p1').pack.herbs).toBe(2);
  });

  it('a Dungeon kill drops Loot on 4 or more', () => {
    expect(player(killWolf('dungeon', 'Skeleton', [3]), 'p1').pack.herbs).toBe(0);
    expect(player(killWolf('dungeon', 'Skeleton', [4, 6]), 'p1').pack.herbs).toBe(2);
  });

  it('a Cache drops Loot on 3 or more', () => {
    let g = withTokens(forest({ INT: 3, CON: 3 }), 'forest', {
      [s9(3, 4)]: { type: 'cache', rating: 2 },
    });
    g = roll(g, 1);
    const lucky = act(forceRolls(g, 3, 7), 'p1', { type: 'step', dir: 'E' });
    expect(player(lucky, 'p1').pack.artifacts).toBe(1);
    const unlucky = act(forceRolls(g, 2), 'p1', { type: 'step', dir: 'E' });
    expect(player(unlucky, 'p1').pack.artifacts).toBe(0);
  });

  it.each([
    [1, { herbs: 2 }],
    [6, { herbs: 2 }],
    [7, { artifacts: 1 }],
    [10, { artifacts: 1 }],
  ])('a d20 of %i drops %o', (d20, pack) => {
    expect(player(killWolf('forest', 'Goblin', [6, d20]), 'p1').pack).toMatchObject(pack);
  });

  it.each([
    [11, ['tonic', 'draught', 'teleport', 'twirlwater', 'stoneskin']],
    [14, ['tonic', 'draught', 'teleport', 'twirlwater', 'stoneskin']],
    [15, ['knucklebone', 'coin', 'hush', 'orb', 'stones']],
    [17, ['knucklebone', 'coin', 'hush', 'orb', 'stones']],
  ])('a d20 of %i drops a random item from %o', (d20, kinds) => {
    const items = player(killWolf('forest', 'Goblin', [6, d20]), 'p1').items;
    expect(items).toHaveLength(1);
    expect(kinds).toContain(items[0]!.kind);
  });

  it('a d20 of 15–17 drops a Charm with 3 Charges', () => {
    expect(player(killWolf('forest', 'Goblin', [6, 16]), 'p1').items[0]?.charges).toBe(3);
  });

  it('a d20 of 18–19 drops a random Trinket', () => {
    const p = player(killWolf('forest', 'Goblin', [6, 18]), 'p1');
    expect(p.trinkets).toHaveLength(1);
    expect(TRINKETS).toContain(p.trinkets[0]);
  });

  it('a d20 of 20 drops a random tier-1 Gear', () => {
    const p = player(killWolf('forest', 'Goblin', [6, 20]), 'p1');
    expect(Object.values(p.gear).filter((t) => t === 1)).toHaveLength(1);
  });

  it('every Guardian Wound drops Loot', () => {
    let g = aGame({ stats: [{ DEX: 3, WIS: 3 }] });
    const wyrm = Number(
      Object.entries(g.boards.dungeon.features).find(([, f]) => f.type === 'guardian')![0],
    );
    g = act(placed(g, 'p1', 'dungeon', wyrm), 'p1', { type: 'resumeClash' });
    g = act(forceRolls(g, 6, 1, 7), 'p1', { type: 'exchange', approach: 'Trickery' });
    expect(player(g, 'p1').pack.artifacts).toBe(1);
  });

  it('going over 5 Slots asks the Player what to discard', () => {
    let g = forest();
    for (const kind of ['tonic', 'tonic', 'orb', 'stones', 'twirlwater'] as const)
      g = withItem(g, 'p1', kind);
    g = withMob(g, 'forest', s9(3, 4), 'Goblin', 0);
    g = go(roll(g, 1), 'E');
    g = act(forceRolls(g, 6, 1, 6, 11), 'p1', { type: 'exchange', approach: 'Fight' });
    expect(player(g, 'p1').items).toHaveLength(6);
    const discards = viewFor(g, 'p1').options.filter((o) => o.type === 'discard');
    expect(discards).toHaveLength(6);
    expect(viewFor(g, 'p1').options.every((o) => o.type === 'discard')).toBe(true);
    g = act(g, 'p1', discards[0]!);
    expect(player(g, 'p1').items).toHaveLength(5);
    expect(viewFor(g, 'p1').options).toContainEqual({ type: 'endTurn' });
  });

  it('a Gear drop that overflows can be discarded as a Gear line', () => {
    let g = forest();
    for (const kind of ['tonic', 'tonic', 'orb', 'stones', 'twirlwater'] as const)
      g = withItem(g, 'p1', kind);
    g = withMob(g, 'forest', s9(3, 4), 'Goblin', 0);
    g = go(roll(g, 1), 'E');
    g = act(forceRolls(g, 6, 1, 6, 20), 'p1', { type: 'exchange', approach: 'Fight' });
    const gearDiscard = viewFor(g, 'p1').options.find((o) => o.type === 'discard' && o.gear);
    expect(gearDiscard).toBeDefined();
    g = act(g, 'p1', gearDiscard!);
    expect(Object.values(player(g, 'p1').gear).every((t) => t === 0)).toBe(true);
  });
});

describe('Trinkets', () => {
  it('Trinkets are unique: the same one never drops twice', () => {
    let g = aGame();
    g = withPlayer(g, 'p2', (p) => (p.trinkets = TRINKETS.slice(0, 7)));
    let mine = forest();
    mine = { ...mine, players: mine.players.map((p) => (p.id === 'p2' ? player(g, 'p2') : p)) };
    mine = withMob(mine, 'forest', s9(3, 4), 'Goblin', 0);
    mine = go(roll(mine, 1), 'E');
    mine = act(forceRolls(mine, 6, 1, 6, 19), 'p1', { type: 'exchange', approach: 'Fight' });
    expect(player(mine, 'p1').trinkets).toEqual([TRINKETS[7]]);
  });

  it('with every Trinket taken, a Trinket drop gives 2 Herbs instead', () => {
    let g = withPlayer(forest(), 'p2', (p) => (p.trinkets = [...TRINKETS]));
    g = withMob(g, 'forest', s9(3, 4), 'Goblin', 0);
    g = go(roll(g, 1), 'E');
    g = act(forceRolls(g, 6, 1, 6, 18), 'p1', { type: 'exchange', approach: 'Fight' });
    expect(player(g, 'p1')).toMatchObject({ trinkets: [], pack: { herbs: 2 } });
  });

  it('Trinkets take no Slot, score 1 point each, are public, and are never lost', () => {
    let g = withPlayer(forest(), 'p1', (p) => (p.trinkets = ['Rubber Chicken', 'Party Popper']));
    expect(viewFor(g, 'p1').me?.slotsUsed).toBe(0);
    expect(viewFor(g, 'p2').players[0]).toMatchObject({
      publicScore: 2,
      trinkets: ['Rubber Chicken', 'Party Popper'],
    });
    const rows = [...OPEN];
    rows[4] = '├──┐────┤';
    g = withTiles(g, 'forest', rows);
    g = withPlayer(roll(g, 2), 'p1', (p) => (p.pivots = 0));
    g = go(g, 'E');
    expect(player(g, 'p1').trinkets).toHaveLength(2);
  });
});
