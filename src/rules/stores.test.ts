import { describe, expect, it } from 'vitest';
import { applyAction, viewFor } from './index.ts';
import type { Action, GameState } from './index.ts';
import {
  aGame,
  act,
  emptied,
  forceRolls,
  placed,
  player,
  sq,
  withPlayer,
  withTiles,
} from './testing.ts';

const roll = (g: GameState, n: number, id = 'p1') => act(forceRolls(g, n), id, { type: 'roll' });
const go = (g: GameState, ...dirs: ('N' | 'E' | 'S' | 'W')[]) =>
  dirs.reduce((s, dir) => act(s, s.turn!.player, { type: 'step', dir }), g);

/** p1 standing at a building with a full Pack, after a Town move, ready for Errands. */
function at(
  building: 'blacksmith' | 'guild',
  pack = { gold: 30, herbs: 5, artifacts: 5 },
  stats: Record<string, number> = { STR: 3, CON: 3 },
) {
  const square = { blacksmith: 7, guild: 11 }[building];
  let g = aGame({ stats: [stats] });
  g = withPlayer(placed(g, 'p1', 'town', square), 'p1', (p) => (p.pack = { ...pack }));
  g = roll(g, 1);
  return act(g, 'p1', { type: 'stop' });
}
const buy = (g: GameState, item: string): GameState =>
  act(g, 'p1', { type: 'buy', item } as Action);
const can = (g: GameState, a: Action) =>
  viewFor(g, 'p1').options.some((o) => JSON.stringify(o) === JSON.stringify(a));

describe('The Blacksmith', () => {
  it('tier-1 Gear costs 5 Gold and raises its Stat by 1', () => {
    const g = buy(at('blacksmith'), 'gear:DEX');
    expect(player(g, 'p1').pack.gold).toBe(25);
    expect(player(g, 'p1').gear.DEX).toBe(1);
    expect(viewFor(g, 'p1').players[0]?.stats.DEX).toBe(1);
  });

  it('an upgrade trades in the current piece: tier 2 for +4 Gold, tier 3 for +6 Gold + 1 Artifact', () => {
    let g = buy(at('blacksmith'), 'gear:STR');
    g = buy(g, 'gear:STR');
    expect(player(g, 'p1')).toMatchObject({ gear: { STR: 2 }, pack: { gold: 21 } });
    g = buy(g, 'gear:STR');
    expect(player(g, 'p1')).toMatchObject({ gear: { STR: 3 }, pack: { gold: 15, artifacts: 4 } });
    expect(can(g, { type: 'buy', item: 'gear:STR' })).toBe(false);
  });

  it('a Player holds at most one piece per line, in one Slot', () => {
    let g = buy(buy(at('blacksmith'), 'gear:STR'), 'gear:STR');
    expect(viewFor(g, 'p1').me?.slotsUsed).toBe(1);
  });

  it('Boots of Second Thoughts cost 8 Gold + 1 Artifact and add 1 to the Pivot Limit', () => {
    let g = buy(at('blacksmith'), 'boots');
    expect(player(g, 'p1').pack).toMatchObject({ gold: 22, artifacts: 4 });
    expect(can(g, { type: 'buy', item: 'boots' })).toBe(false);
    g = act(g, 'p1', { type: 'endTurn' });
    g = act(roll(g, 1, 'p2'), 'p2', { type: 'stop' });
    g = act(g, 'p2', { type: 'endTurn' });
    expect(player(g, 'p1').pivots).toBe(3);
  });

  it('the Lodestone Compass costs 4 Gold + 1 Artifact', () => {
    const g = buy(at('blacksmith'), 'compass');
    expect(player(g, 'p1').pack).toMatchObject({ gold: 26, artifacts: 4 });
  });

  it('the Lodestone Compass spends a Pivot to turn before moving, but never a U-turn', () => {
    let g = buy(at('blacksmith'), 'compass');
    g = emptied(g, 'forest');
    g = act(g, 'p1', { type: 'endTurn' });
    g = act(roll(g, 1, 'p2'), 'p2', { type: 'stop' });
    g = act(g, 'p2', { type: 'endTurn' });
    g = placed(g, 'p1', 'forest', sq(9, 4, 4), 'E');
    const turns = viewFor(g, 'p1')
      .options.filter((o) => o.type === 'compass')
      .map((o) => (o.type === 'compass' ? o.dir : ''));
    expect(turns).toEqual(['N', 'S']);
    g = act(g, 'p1', { type: 'compass', dir: 'N' });
    expect(player(g, 'p1')).toMatchObject({ heading: 'N', pivots: 1 });
  });

  it('nobody can buy without passing the store', () => {
    let g = withPlayer(aGame(), 'p1', (p) => (p.pack.gold = 30));
    g = act(roll(g, 1), 'p1', { type: 'stop' });
    expect(can(g, { type: 'buy', item: 'gear:STR' })).toBe(false);
  });

  it('stores take Gold only from the Pack, never from the Keep', () => {
    let g = at('blacksmith', { gold: 4, herbs: 0, artifacts: 0 });
    g = withPlayer(g, 'p1', (p) => (p.keep = 50));
    expect(can(g, { type: 'buy', item: 'gear:STR' })).toBe(false);
    expect(() => buy(g, 'gear:STR')).toThrow();
  });
});

describe('Offers in the view', () => {
  it('each purchase the Player can make is listed with its name and Haggled price', () => {
    const offers = viewFor(at('blacksmith', undefined, { CHA: 2, CON: 3, STR: 1 }), 'p1').offers;
    expect(offers).toContainEqual({
      action: { type: 'buy', item: 'gear:STR' },
      name: 'Rusty Sword',
      price: { gold: 4 },
    });
    expect(offers).toContainEqual({
      action: { type: 'buy', item: 'boots' },
      name: 'Boots of Second Thoughts',
      price: { gold: 7, artifacts: 1 },
    });
  });
});

describe('Haggle', () => {
  it('each purchase costs 1 less Gold per 2 CHA', () => {
    const g = buy(at('blacksmith', undefined, { CHA: 3, CON: 3 }), 'gear:STR');
    expect(player(g, 'p1').pack.gold).toBe(26);
  });

  it('Gear adds to CHA for Haggle', () => {
    let g = buy(at('blacksmith', undefined, { CHA: 3, CON: 3 }), 'gear:CHA');
    g = buy(g, 'gear:STR');
    expect(player(g, 'p1').pack.gold).toBe(30 - 4 - 3);
  });

  it('Haggle never takes a price below 1 Gold', () => {
    let g = at('blacksmith', undefined, { CHA: 3, CON: 3 });
    g = withPlayer(g, 'p1', (p) => (p.base.CHA = 5));
    g = withPlayer(g, 'p1', (p) => (p.gear.CHA = 3));
    g = buy(g, 'compass');
    expect(player(g, 'p1').pack.gold).toBe(29);
  });
});

describe('Training', () => {
  it('Training costs 6 Gold + 1 Herb + 1 Artifact and adds 1 to a Stat’s base', () => {
    const g = act(at('guild'), 'p1', { type: 'train', stat: 'WIS' });
    expect(player(g, 'p1')).toMatchObject({
      base: { WIS: 1 },
      pack: { gold: 24, herbs: 4, artifacts: 4 },
    });
    expect(viewFor(g, 'p1').me?.slotsUsed).toBe(0);
  });

  it('each Stat can be Trained at most once per game', () => {
    const g = act(at('guild'), 'p1', { type: 'train', stat: 'WIS' });
    expect(can(g, { type: 'train', stat: 'WIS' })).toBe(false);
    expect(can(g, { type: 'train', stat: 'STR' })).toBe(true);
  });

  it('a Stat’s base is capped at 5', () => {
    const g = withPlayer(at('guild'), 'p1', (p) => (p.base.STR = 5));
    expect(can(g, { type: 'train', stat: 'STR' })).toBe(false);
  });

  it('Training needs both Materials', () => {
    const g = at('guild', { gold: 30, herbs: 0, artifacts: 5 });
    expect(can(g, { type: 'train', stat: 'STR' })).toBe(false);
  });
});

describe('Stat caps and Slots', () => {
  it('a Stat with Gear is capped at 7', () => {
    let g = withPlayer(at('blacksmith'), 'p1', (p) => (p.base.STR = 5));
    g = buy(buy(buy(g, 'gear:STR'), 'gear:STR'), 'gear:STR');
    expect(viewFor(g, 'p1').players[0]?.stats.STR).toBe(7);
  });

  it('Gear, Potions and Charms share 5 Slots', () => {
    let g = at('blacksmith', { gold: 60, herbs: 5, artifacts: 5 });
    for (const s of ['STR', 'DEX', 'INT', 'WIS', 'CON']) g = buy(g, `gear:${s}`);
    expect(viewFor(g, 'p1').me?.slotsUsed).toBe(5);
    expect(can(g, { type: 'buy', item: 'gear:CHA' })).toBe(false);
    expect(can(g, { type: 'buy', item: 'gear:STR' })).toBe(true);
  });

  it('Gear raises the Stat in Clashes', () => {
    let g = buy(at('blacksmith'), 'gear:STR');
    g = emptied(g, 'forest');
    g = withTiles(g, 'forest', [
      '┌┬┬┬┬┬┬┬┐',
      ...Array.from({ length: 7 }, () => '├┼┼┼┼┼┼┼┤'),
      '└┴┴┴┴┴┴┴┘',
    ]);
    g.boards.forest.mobs[sq(9, 4, 4)] = { kind: 'Dire Wolf', wounds: 0 };
    g = act(g, 'p1', { type: 'endTurn' });
    g = act(roll(g, 1, 'p2'), 'p2', { type: 'stop' });
    g = act(g, 'p2', { type: 'endTurn' });
    g = placed(g, 'p1', 'forest', sq(9, 3, 4), 'E');
    g = go(roll(g, 1), 'E');
    const res = applyAction(forceRolls(g, 1, 1), 'p1', { type: 'exchange', approach: 'Fight' });
    expect(res.events.find((e) => e.type === 'exchangeRolled')).toMatchObject({ bonus: [4, 0] });
  });
});
