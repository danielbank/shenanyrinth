import { describe, expect, it } from 'vitest';
import { applyAction, viewFor } from './index.ts';
import type { Action, GameState, ItemKind } from './index.ts';
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
} from './testing.ts';
import { SYSTEM } from './index.ts';

const OPEN = ['┌┬┬┬┬┬┬┬┐', ...Array.from({ length: 7 }, () => '├┼┼┼┼┼┼┼┤'), '└┴┴┴┴┴┴┴┘'];
const s9 = (x: number, y: number) => sq(9, x, y);
const roll = (g: GameState, n: number, id = 'p1') => act(forceRolls(g, n), id, { type: 'roll' });
const go = (g: GameState, ...dirs: ('N' | 'E' | 'S' | 'W')[]) =>
  dirs.reduce((s, dir) => act(s, s.turn!.player, { type: 'step', dir }), g);
const itemOf = (g: GameState, id: string, kind: ItemKind) =>
  player(g, id).items.find((i) => i.kind === kind)!.id;

const STATS = {
  plain: { STR: 3, CON: 3 },
  charming: { CHA: 3, CON: 3 },
  sturdy: { CON: 3, STR: 3 },
};

/**
 * p1 (STR 3) Ambushes a Dire Wolf; p2 and p3 watch. Exchange dice: p1 rolls `mine`, the Wolf `mob`.
 * Returns the state with the Response window open (or resolved, if nobody can act).
 */
function exchangeWith(
  stats: Record<string, number>[],
  mine = 3,
  mob = 5,
  items: [string, ItemKind][] = [],
) {
  let g = aGame({ players: 3, stats });
  g = emptied(withTiles(g, 'forest', OPEN), 'forest');
  g = withMob(g, 'forest', s9(3, 4), 'Dire Wolf');
  g = revealAll(placed(g, 'p1', 'forest', s9(2, 4), 'E'), 'forest');
  for (const [id, kind] of items) g = withItem(g, id, kind);
  g = go(roll(g, 1), 'E');
  return act(forceRolls(g, mine, mob), 'p1', { type: 'exchange', approach: 'Fight' });
}
const die = (g: GameState, owner: string) => g.response!.dice.find((d) => d.owner === owner)!;

describe('Sway and Resist points', () => {
  it('Sway equals CHA and Resist equals CON, refreshed at the start of each of the Player’s Turns', () => {
    let g = aGame({ stats: [{ CHA: 2, CON: 3, STR: 1 }] });
    expect(player(g, 'p1')).toMatchObject({ sway: 2, resist: 3 });
    g = withPlayer(g, 'p1', (p) => {
      p.sway = 0;
      p.resist = 0;
    });
    g = act(roll(g, 1), 'p1', { type: 'stop' });
    g = act(g, 'p1', { type: 'endTurn' });
    expect(player(g, 'p1')).toMatchObject({ sway: 0, resist: 0 });
    g = act(roll(g, 1, 'p2'), 'p2', { type: 'stop' });
    g = act(g, 'p2', { type: 'endTurn' });
    expect(player(g, 'p1')).toMatchObject({ sway: 2, resist: 3 });
  });
});

describe('Opening and closing', () => {
  it('a Response window opens after the dice in a Clash when someone can act', () => {
    const g = exchangeWith([STATS.plain, STATS.charming, STATS.plain]);
    expect(g.response).toMatchObject({ kind: 'clash', eligible: ['p2'] });
    expect(player(g, 'p1').hp).toBe(7);
  });

  it('with nobody able to act, the Exchange resolves at once', () => {
    const g = exchangeWith([STATS.plain, STATS.plain, STATS.plain]);
    expect(g.response).toBeNull();
    expect(player(g, 'p1').hp).toBe(7);
  });

  it('only eligible Players are prompted', () => {
    const g = exchangeWith([STATS.plain, STATS.charming, STATS.plain]);
    expect(viewFor(g, 'p2').options).toContainEqual({ type: 'pass' });
    expect(viewFor(g, 'p3').options).toEqual([]);
    expect(viewFor(g, 'p1').options).toEqual([]);
  });

  it('the window closes when everyone eligible has passed, and the Exchange resolves', () => {
    let g = exchangeWith([STATS.plain, STATS.charming, STATS.plain], 1, 6);
    g = act(g, 'p2', { type: 'pass' });
    expect(g.response).toBeNull();
    expect(player(g, 'p1').hp).toBe(6);
  });

  it('the window closes when the server says its time is up', () => {
    let g = exchangeWith([STATS.plain, STATS.charming, STATS.plain], 6, 1);
    g = act(g, SYSTEM, { type: 'closeResponse', id: g.response!.id });
    expect(g.response).toBeNull();
    expect(g.boards.forest.mobs[s9(3, 4)]?.wounds).toBe(1);
  });

  it('a stale close for an earlier window is ignored', () => {
    const g = exchangeWith([STATS.plain, STATS.charming, STATS.plain]);
    expect(() =>
      applyAction(g, SYSTEM, { type: 'closeResponse', id: g.response!.id + 1 }),
    ).toThrow();
  });

  it('only the server can close a window', () => {
    const g = exchangeWith([STATS.plain, STATS.charming, STATS.plain]);
    expect(() => applyAction(g, 'p2', { type: 'closeResponse', id: g.response!.id })).toThrow();
  });

  it('a Player with auto-pass on is never prompted', () => {
    let g = aGame({ players: 3, stats: [STATS.plain, STATS.charming, STATS.plain] });
    g = act(g, 'p2', { type: 'setAutoPass', on: true });
    expect(player(g, 'p2').autoPass).toBe(true);
    g = emptied(withTiles(g, 'forest', OPEN), 'forest');
    g = withMob(g, 'forest', s9(3, 4), 'Dire Wolf');
    g = placed(g, 'p1', 'forest', s9(2, 4), 'E');
    g = go(roll(g, 1), 'E');
    g = act(forceRolls(g, 3, 5), 'p1', { type: 'exchange', approach: 'Fight' });
    expect(g.response).toBeNull();
  });

  it('the Clash waits while the window is open', () => {
    const g = exchangeWith([STATS.plain, STATS.charming, STATS.plain]);
    expect(() => applyAction(g, 'p1', { type: 'retreat' })).toThrow();
  });
});

describe('Sway', () => {
  it('spending 1 Sway nudges any visible die by ±1', () => {
    let g = exchangeWith([STATS.plain, STATS.charming, STATS.plain], 3, 5);
    g = act(g, 'p2', { type: 'sway', die: die(g, 'mob').id, delta: -1 });
    expect(die(g, 'mob').value).toBe(4);
    expect(player(g, 'p2').sway).toBe(2);
  });

  it('a nudged die glows in the colour of the Player who nudged it', () => {
    let g = exchangeWith([STATS.plain, STATS.charming, STATS.plain], 3, 5);
    g = act(g, 'p2', { type: 'sway', die: die(g, 'mob').id, delta: -1 });
    expect(die(g, 'mob').touchedBy).toBe('p2');
  });

  it('a die can’t be nudged below 1 or above its faces', () => {
    const g = exchangeWith([STATS.plain, STATS.charming, STATS.plain], 6, 1);
    expect(() => applyAction(g, 'p2', { type: 'sway', die: die(g, 'p1').id, delta: 1 })).toThrow();
    expect(() =>
      applyAction(g, 'p2', { type: 'sway', die: die(g, 'mob').id, delta: -1 }),
    ).toThrow();
  });

  it('Sway changes the result', () => {
    let g = exchangeWith([STATS.plain, STATS.charming, STATS.plain], 2, 5);
    g = act(g, 'p2', { type: 'sway', die: die(g, 'p1').id, delta: 1 });
    g = act(g, 'p2', { type: 'pass' });
    expect(g.boards.forest.mobs[s9(3, 4)]?.wounds).toBe(1);
  });

  it('a Player with no Sway left and no dice items stops being prompted', () => {
    let g = exchangeWith([STATS.plain, { CHA: 1, CON: 3, STR: 2 }, STATS.plain], 2, 5);
    g = act(g, 'p2', { type: 'sway', die: die(g, 'p1').id, delta: 1 });
    expect(g.response).toBeNull();
  });
});

describe('Resist', () => {
  it('a targeted Player gets an instant Resist prompt', () => {
    let g = exchangeWith([STATS.sturdy, STATS.charming, STATS.plain], 3, 5);
    g = act(g, 'p2', { type: 'sway', die: die(g, 'p1').id, delta: -1 });
    expect(g.response?.pending).toMatchObject({ by: 'p2', targets: ['p1'] });
    expect(viewFor(g, 'p1').options).toEqual([{ type: 'resist' }, { type: 'allow' }]);
    expect(die(g, 'p1').value).toBe(3);
  });

  it('spending 1 Resist cancels the Sway aimed at the Player’s dice', () => {
    let g = exchangeWith([STATS.sturdy, STATS.charming, STATS.plain], 3, 5);
    g = act(g, 'p2', { type: 'sway', die: die(g, 'p1').id, delta: -1 });
    g = act(g, 'p1', { type: 'resist' });
    expect(die(g, 'p1').value).toBe(3);
    expect(player(g, 'p1').resist).toBe(2);
    expect(player(g, 'p2').sway).toBe(2);
  });

  it('allowing it lets the Sway land', () => {
    let g = exchangeWith([STATS.sturdy, STATS.charming, STATS.plain], 3, 5);
    g = act(g, 'p2', { type: 'sway', die: die(g, 'p1').id, delta: -1 });
    g = act(g, 'p1', { type: 'allow' });
    expect(die(g, 'p1').value).toBe(2);
  });

  it('Resist covers the Player’s own dice, not the Mob’s', () => {
    let g = exchangeWith([STATS.sturdy, STATS.charming, STATS.plain], 3, 5);
    g = act(g, 'p2', { type: 'sway', die: die(g, 'mob').id, delta: 1 });
    expect(g.response?.pending).toBeNull();
    expect(die(g, 'mob').value).toBe(6);
  });

  it('a Player can’t Resist their own nudge', () => {
    let g = exchangeWith([{ CHA: 3, CON: 3 }, STATS.plain, STATS.plain], 3, 5);
    g = act(g, 'p1', { type: 'sway', die: die(g, 'p1').id, delta: 1 });
    expect(g.response?.pending ?? null).toBeNull();
    expect(die(g, 'p1').value).toBe(4);
  });

  it('a pending Resist is allowed when the time runs out', () => {
    let g = exchangeWith([STATS.sturdy, STATS.charming, STATS.plain], 2, 5);
    g = act(g, 'p2', { type: 'sway', die: die(g, 'p1').id, delta: -1 });
    g = act(g, SYSTEM, { type: 'closeResponse', id: g.response!.id });
    expect(player(g, 'p1').hp).toBe(6);
  });
});

describe('Dice Charms', () => {
  it('Lucky Knucklebone adds 1d6 to the owner’s own roll', () => {
    let g = exchangeWith([STATS.plain, STATS.plain, STATS.plain], 2, 5, [['p1', 'knucklebone']]);
    g = act(forceRolls(g, 4), 'p1', { type: 'use', item: itemOf(g, 'p1', 'knucklebone') });
    expect(g.response!.dice.filter((d) => d.owner === 'p1').map((d) => d.value)).toEqual([2, 4]);
    g = act(g, 'p1', { type: 'pass' });
    expect(g.boards.forest.mobs[s9(3, 4)]?.wounds).toBe(1);
  });

  it('a Player with no side in the roll can’t use a Knucklebone on it', () => {
    const g = exchangeWith([STATS.plain, STATS.plain, STATS.plain], 2, 5, [['p2', 'knucklebone']]);
    expect(g.response).toBeNull();
  });

  it('Trickster’s Coin swaps the values of any two dice in play', () => {
    let g = exchangeWith([STATS.plain, STATS.plain, STATS.plain], 1, 7, [['p1', 'coin']]);
    const [a, b] = g.response!.dice;
    g = act(g, 'p1', { type: 'use', item: itemOf(g, 'p1', 'coin'), dice: [a!.id, b!.id] });
    expect(die(g, 'p1').value).toBe(7);
    expect(die(g, 'mob').value).toBe(1);
    expect(player(g, 'p1').items[0]?.charges).toBe(2);
  });

  it('Hush Rune removes one die from a roll of 2 or more dice', () => {
    let g = exchangeWith([STATS.plain, STATS.plain, STATS.plain], 2, 5, [
      ['p1', 'knucklebone'],
      ['p3', 'hush'],
    ]);
    g = act(forceRolls(g, 6), 'p1', { type: 'use', item: itemOf(g, 'p1', 'knucklebone') });
    const extra = g.response!.dice.find((d) => d.value === 6)!;
    g = act(g, 'p3', { type: 'use', item: itemOf(g, 'p3', 'hush'), die: extra.id });
    g = act(g, 'p1', { type: 'allow' });
    expect(g.response!.dice.map((d) => d.value)).toEqual([2, 5]);
  });

  it('Hush Rune can’t remove a single die', () => {
    const g = exchangeWith([STATS.charming, STATS.plain, STATS.plain], 2, 5, [['p3', 'hush']]);
    expect(() =>
      applyAction(g, 'p3', { type: 'use', item: itemOf(g, 'p3', 'hush'), die: die(g, 'mob').id }),
    ).toThrow();
  });

  it('a Meddle on a Player’s dice can be Resisted', () => {
    let g = exchangeWith([STATS.sturdy, STATS.plain, STATS.plain], 6, 1, [['p2', 'coin']]);
    const [a, b] = g.response!.dice;
    g = act(g, 'p2', { type: 'use', item: itemOf(g, 'p2', 'coin'), dice: [a!.id, b!.id] });
    g = act(g, 'p1', { type: 'resist' });
    expect(die(g, 'p1').value).toBe(6);
    expect(player(g, 'p2').items[0]?.charges).toBe(2);
  });
});

describe('Movement rolls', () => {
  it('movement rolls never open a Response window, so others can’t Meddle or Sway them', () => {
    let g = aGame({ players: 2, stats: [STATS.plain, STATS.charming] });
    g = roll(g, 3);
    expect(g.response).toBeNull();
    expect(viewFor(g, 'p2').options).toEqual([]);
    expect(() => applyAction(g, 'p2', { type: 'sway', die: 0, delta: 1 } as Action)).toThrow();
  });

  it('a Player may add their own Lucky Knucklebone to their movement roll', () => {
    let g = withItem(aGame({ stats: [STATS.plain] }), 'p1', 'knucklebone');
    g = roll(g, 2);
    g = act(forceRolls(g, 5), 'p1', { type: 'use', item: itemOf(g, 'p1', 'knucklebone') });
    expect(g.turn?.stepsLeft).toBe(7);
  });
});
