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
  sq,
  withItem,
  withPlayer,
  withTiles,
} from './testing.ts';

const OPEN = ['┌┬┬┬┬┬┬┬┐', ...Array.from({ length: 7 }, () => '├┼┼┼┼┼┼┼┤'), '└┴┴┴┴┴┴┴┘'];
const s9 = (x: number, y: number) => sq(9, x, y);
const roll = (g: GameState, n: number, id = 'p1') => act(forceRolls(g, n), id, { type: 'roll' });
const go = (g: GameState, ...dirs: ('N' | 'E' | 'S' | 'W')[]) =>
  dirs.reduce((s, dir) => act(s, s.turn!.player, { type: 'step', dir }), g);
const itemId = (g: GameState, kind: ItemKind) =>
  player(g, 'p1').items.find((i) => i.kind === kind)!.id;
const use = (g: GameState, kind: ItemKind, extra: object = {}) =>
  act(g, 'p1', { type: 'use', item: itemId(g, kind), ...extra } as Action);

/** p1 in the Forest at (x, y) heading E holding an item, at the start of their Turn. */
function holding(kind: ItemKind, x = 4, y = 4, rows = OPEN) {
  let g = emptied(withTiles(aGame({ stats: [{ STR: 3, CON: 3 }] }), 'forest', rows), 'forest');
  g = placed(g, 'p1', 'forest', s9(x, y), 'E');
  return withItem(g, 'p1', kind);
}

function shop(building: 'apothecary' | 'arcanist', pack = { gold: 30, herbs: 5, artifacts: 5 }) {
  let g = aGame({ stats: [{ STR: 3, CON: 3 }] });
  const square = { apothecary: 13, arcanist: 17 }[building];
  g = withPlayer(placed(g, 'p1', 'town', square), 'p1', (p) => (p.pack = { ...pack }));
  return act(roll(g, 1), 'p1', { type: 'stop' });
}
const offerFor = (g: GameState, item: string, material?: string) =>
  viewFor(g, 'p1').offers.find(
    (o) => o.action.type === 'buy' && o.action.item === item && o.action.material === material,
  );

describe('The Apothecary', () => {
  it.each([
    ['tonic', 'Troll-Blood Tonic', 2],
    ['draught', 'Draught of Wandering', 4],
    ['teleport', 'Scroll of Teleportation', 6],
    ['twirlwater', 'Twirlwater', 3],
  ])('sells %s (%s) for %i Gold + 1 Herb', (item, name, gold) => {
    expect(offerFor(shop('apothecary'), item)).toMatchObject({ name, price: { gold, herbs: 1 } });
    const g = act(shop('apothecary'), 'p1', { type: 'buy', item });
    expect(player(g, 'p1').pack).toMatchObject({ gold: 30 - gold, herbs: 4 });
    expect(player(g, 'p1').items.map((i) => i.kind)).toEqual([item]);
  });
});

describe('The Arcanist', () => {
  it.each([
    ['orb', 'Orb of Foresight', 3],
    ['stones', 'Shuffling Stones', 4],
  ])('sells %s (%s) for %i Gold + 1 Herb or Artifact, with 3 Charges', (item, name, gold) => {
    expect(offerFor(shop('arcanist'), item, 'herbs')).toMatchObject({
      name,
      price: { gold, herbs: 1 },
    });
    expect(offerFor(shop('arcanist'), item, 'artifacts')).toMatchObject({
      price: { gold, artifacts: 1 },
    });
    const g = act(shop('arcanist'), 'p1', { type: 'buy', item, material: 'artifacts' });
    expect(player(g, 'p1').pack).toMatchObject({ gold: 30 - gold, herbs: 5, artifacts: 4 });
    expect(player(g, 'p1').items).toMatchObject([{ kind: item, charges: 3 }]);
  });

  it('a Charm can be paid for only with a Material the Player has', () => {
    const g = shop('arcanist', { gold: 30, herbs: 0, artifacts: 1 });
    expect(offerFor(g, 'orb', 'herbs')).toBeUndefined();
    expect(offerFor(g, 'orb', 'artifacts')).toBeDefined();
  });
});

describe('Potions', () => {
  it('Troll-Blood Tonic restores full HP, and is used up', () => {
    let g = withPlayer(holding('tonic'), 'p1', (p) => (p.hp = 1));
    g = use(g, 'tonic');
    expect(player(g, 'p1').hp).toBe(7);
    expect(player(g, 'p1').items).toEqual([]);
  });

  it('Draught of Wandering: this Turn, move as in the Town, ignoring Exits', () => {
    const rows = [...OPEN];
    rows[4] = '├───────┤';
    let g = use(holding('draught', 4, 4, rows), 'draught');
    g = roll(g, 3);
    expect(
      viewFor(g, 'p1')
        .moves.map((m) => m.dir)
        .sort(),
    ).toEqual(['E', 'N', 'S', 'W']);
    g = go(g, 'W', 'N');
    g = act(g, 'p1', { type: 'stop' });
    expect(player(g, 'p1').square).toBe(s9(3, 3));
  });

  it('Scroll of Teleportation: instead of moving, teleport to any revealed square on the Level', () => {
    let g = holding('teleport');
    g.boards.forest.revealed[s9(7, 7)] = true;
    g = use(g, 'teleport', { square: s9(7, 7) });
    expect(player(g, 'p1').square).toBe(s9(7, 7));
    expect(g.turn?.phase).toBe('after');
    expect(viewFor(g, 'p1').options).not.toContainEqual({ type: 'roll' });
  });

  it('teleporting to a hidden square is refused', () => {
    const g = holding('teleport');
    g.boards.forest.revealed[s9(7, 7)] = false;
    expect(() => use(g, 'teleport', { square: s9(7, 7) })).toThrow();
  });

  it('Twirlwater gives +1 Pivot this Turn', () => {
    const g = use(holding('twirlwater'), 'twirlwater');
    expect(player(g, 'p1').pivots).toBe(3);
  });

  it('Twirlwater can be drunk at the moment the Player would otherwise be Lost', () => {
    const rows = [...OPEN];
    rows[4] = '├───┐───┤';
    let g = holding('twirlwater', 3, 4, rows);
    g = withPlayer(roll(g, 2), 'p1', (p) => (p.pivots = 0));
    g = go(g, 'E');
    expect(player(g, 'p1').level).toBe('forest');
    const options = viewFor(g, 'p1').options;
    expect(options).toContainEqual({ type: 'use', item: itemId(g, 'twirlwater') });
    expect(options).toContainEqual({ type: 'acceptLost' });
    g = use(g, 'twirlwater');
    g = go(g, 'S');
    expect(player(g, 'p1').square).toBe(s9(4, 5));
  });

  it('a Player who would be Lost may decline the Twirlwater and be Lost', () => {
    const rows = [...OPEN];
    rows[4] = '├───┐───┤';
    let g = holding('twirlwater', 3, 4, rows);
    g = withPlayer(roll(g, 2), 'p1', (p) => (p.pivots = 0));
    g = act(go(g, 'E'), 'p1', { type: 'acceptLost' });
    expect(player(g, 'p1').level).toBe('town');
    expect(player(g, 'p1').items).toHaveLength(1);
  });
});

describe('Using items', () => {
  it('the Prepare phase allows any number of items, at no cost of action', () => {
    let g = withItem(withItem(holding('tonic'), 'p1', 'twirlwater'), 'p1', 'twirlwater');
    g = withPlayer(g, 'p1', (p) => (p.hp = 2));
    g = use(use(use(g, 'tonic'), 'twirlwater'), 'twirlwater');
    expect(player(g, 'p1')).toMatchObject({ hp: 7, pivots: 4 });
    expect(viewFor(g, 'p1').options).toContainEqual({ type: 'roll' });
  });

  it('another Player’s items cannot be used', () => {
    const g = holding('tonic');
    expect(() => applyAction(g, 'p2', { type: 'use', item: itemId(g, 'tonic') })).toThrow();
  });

  it('items survive being Lost or Knocked Out', () => {
    const rows = [...OPEN];
    rows[4] = '├───┐───┤';
    let g = withItem(holding('orb', 3, 4, rows), 'p1', 'tonic');
    g = withPlayer(roll(g, 2), 'p1', (p) => (p.pivots = 0));
    g = go(g, 'E');
    expect(player(g, 'p1').items.map((i) => i.kind)).toEqual(['orb', 'tonic']);
  });

  it('views hide other Players’ carried items and Charges', () => {
    const g = holding('orb');
    expect(JSON.stringify(viewFor(g, 'p2'))).not.toContain('"orb"');
    expect(viewFor(g, 'p1').me?.items).toMatchObject([{ kind: 'orb', charges: 3 }]);
  });
});

describe('Charms', () => {
  it('Orb of Foresight reveals a 3×3 area anywhere on the Player’s Level', () => {
    let g = holding('orb');
    g.boards.forest.revealed = g.boards.forest.revealed.map(() => false);
    g = use(g, 'orb', { square: s9(1, 7) });
    const lit = g.boards.forest.revealed.flatMap((r, i) => (r ? [i] : []));
    expect(lit).toEqual([
      s9(0, 6),
      s9(1, 6),
      s9(2, 6),
      s9(0, 7),
      s9(1, 7),
      s9(2, 7),
      s9(0, 8),
      s9(1, 8),
      s9(2, 8),
    ]);
  });

  it('Charges count down, and a Charm crumbles when its last Charge is used', () => {
    let g = holding('orb');
    g = use(g, 'orb', { square: s9(1, 1) });
    expect(player(g, 'p1').items[0]?.charges).toBe(2);
    g = use(use(g, 'orb', { square: s9(1, 1) }), 'orb', { square: s9(1, 1) });
    expect(player(g, 'p1').items).toEqual([]);
  });

  it('Shuffling Stones swaps the path shapes of two unoccupied squares', () => {
    const rows = [...OPEN];
    rows[2] = '├┼│┼┼─┼┼┤';
    let g = use(holding('stones', 4, 4, rows), 'stones', { a: s9(2, 2), b: s9(5, 2) });
    expect(g.boards.forest.tiles[s9(2, 2)]).toBe('EW');
    expect(g.boards.forest.tiles[s9(5, 2)]).toBe('NS');
  });

  it('Shuffling Stones keeps Features in place', () => {
    const rows = [...OPEN];
    rows[6] = '├┼┼┼┼┼─┼┤';
    let g = holding('stones', 4, 4, rows);
    const gate = Number(
      Object.entries(g.boards.forest.features).find(([, f]) => f.type === 'gate')![0],
    );
    g = use(g, 'stones', { a: gate, b: s9(6, 6) });
    expect(g.boards.forest.features[gate]?.type).toBe('gate');
  });

  it('a Tile swapped onto an edge square is rotated so its Exits stay on the board', () => {
    const rows = [...OPEN];
    rows[6] = '├┼┼┼┼┼─┼┤';
    let g = holding('stones', 4, 4, rows);
    g = use(g, 'stones', { a: s9(0, 4), b: s9(6, 6) });
    expect(g.boards.forest.tiles[s9(6, 6)]).toBe('NES');
    expect(g.boards.forest.tiles[s9(0, 4)]).toBe('NS');
  });

  it('a Crossroads can never be swapped onto an edge square', () => {
    const g = holding('stones');
    expect(() => use(g, 'stones', { a: s9(0, 4), b: s9(6, 6) })).toThrow();
  });

  it('the swapping Player may choose how an edge Tile is turned, if it fits', () => {
    const rows = [...OPEN];
    rows[6] = '├┼┼┼┼┼│┼┤';
    let g = holding('stones', 4, 4, rows);
    expect(() => use(g, 'stones', { a: s9(0, 4), b: s9(6, 6), turnA: 1 })).toThrow();
    g = use(g, 'stones', { a: s9(0, 4), b: s9(6, 6), turnA: 0 });
    expect(g.boards.forest.tiles[s9(0, 4)]).toBe('NS');
  });

  it('Shuffling Stones cannot touch a square with a piece on it', () => {
    const g = holding('stones');
    expect(() => use(g, 'stones', { a: s9(4, 4), b: s9(6, 6) })).toThrow();
  });
});
