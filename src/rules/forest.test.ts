import { describe, expect, it } from 'vitest';
import { applyAction, viewFor } from './index.ts';
import {
  aGame,
  emptied,
  act,
  forceRolls,
  placed,
  player,
  sq,
  withPlayer,
  withTiles,
} from './testing.ts';
import type { GameState } from './index.ts';

const OPEN = [
  '┌┬┬┬┬┬┬┬┐',
  '├┼┼┼┼┼┼┼┤',
  '├┼┼┼┼┼┼┼┤',
  '├┼┼┼┼┼┼┼┤',
  '├┼┼┼┼┼┼┼┤',
  '├┼┼┼┼┼┼┼┤',
  '├┼┼┼┼┼┼┼┤',
  '├┼┼┼┼┼┼┼┤',
  '└┴┴┴┴┴┴┴┘',
];
const s9 = (x: number, y: number) => sq(9, x, y);

/** p1 in the Forest at (x, y) heading `h`, on a board with row 4 replaced. */
function inForest(x: number, y: number, h: 'N' | 'E' | 'S' | 'W', row4?: string, stats = {}) {
  const rows = [...OPEN];
  if (row4) rows[4] = row4;
  let g = aGame({ stats: [{ STR: 3, CON: 3, ...stats }] });
  g = emptied(withTiles(g, 'forest', rows), 'forest');
  return placed(g, 'p1', 'forest', s9(x, y), h);
}
const roll = (g: GameState, n: number) => act(forceRolls(g, n), 'p1', { type: 'roll' });
const go = (g: GameState, ...dirs: ('N' | 'E' | 'S' | 'W')[]) =>
  dirs.reduce((s, dir) => act(s, 'p1', { type: 'step', dir }), g);
const moves = (g: GameState) => viewFor(g, 'p1').moves.map((m) => `${m.dir}${m.pivot ? '*' : ''}`);

describe('Forest generation', () => {
  const forests = Array.from({ length: 40 }, (_, i) => aGame({ seed: i + 1 }).boards.forest);

  it('the Forest is a 9×9 board', () => {
    expect(forests[0]?.size).toBe(9);
    expect(forests[0]?.tiles).toHaveLength(81);
  });

  it('no Exit ever faces off the board', () => {
    for (const f of forests) {
      f.tiles.forEach((exits, i) => {
        const x = i % 9;
        const y = Math.floor(i / 9);
        if (y === 0) expect(exits).not.toContain('N');
        if (y === 8) expect(exits).not.toContain('S');
        if (x === 0) expect(exits).not.toContain('W');
        if (x === 8) expect(exits).not.toContain('E');
      });
    }
  });

  it('inner Tiles follow the Forest Tile Mix: Straight 50, Bend 20, T 20, Crossroads 10', () => {
    const counts = { straight: 0, bend: 0, t: 0, cross: 0 };
    let n = 0;
    for (const f of forests) {
      f.tiles.forEach((exits, i) => {
        const x = i % 9;
        const y = Math.floor(i / 9);
        if (x === 0 || y === 0 || x === 8 || y === 8) return;
        n++;
        if (exits.length === 4) counts.cross++;
        else if (exits.length === 3) counts.t++;
        else if (exits === 'NS' || exits === 'EW') counts.straight++;
        else counts.bend++;
      });
    }
    expect(counts.straight / n).toBeCloseTo(0.5, 1);
    expect(counts.bend / n).toBeCloseTo(0.2, 1);
    expect(counts.t / n).toBeCloseTo(0.2, 1);
    expect(counts.cross / n).toBeCloseTo(0.1, 1);
  });

  it('edge squares lean towards inward T-junctions', () => {
    let edgeT = 0;
    let edges = 0;
    for (const f of forests) {
      f.tiles.forEach((exits, i) => {
        const x = i % 9;
        const y = Math.floor(i / 9);
        const edge = x === 0 || y === 0 || x === 8 || y === 8;
        const corner = (x === 0 || x === 8) && (y === 0 || y === 8);
        if (!edge || corner) return;
        edges++;
        if (exits.length === 3) edgeT++;
      });
    }
    expect(edgeT / edges).toBeGreaterThan(0.5);
  });

  it('one Gate end sits on a random square of each Forest edge', () => {
    const sides = new Set<string>();
    for (const f of forests) {
      const gates = Object.entries(f.features).filter(([, ft]) => ft.type === 'gate');
      expect(gates.map(([, ft]) => (ft.type === 'gate' ? ft.side : '')).sort()).toEqual([
        'E',
        'N',
        'S',
        'W',
      ]);
      for (const [i, ft] of gates) {
        const x = Number(i) % 9;
        const y = Math.floor(Number(i) / 9);
        if (ft.type !== 'gate') continue;
        expect({ N: y === 0, S: y === 8, W: x === 0, E: x === 8 }[ft.side]).toBe(true);
        sides.add(`${ft.side}${x}${y}`);
      }
    }
    expect(sides.size).toBeGreaterThan(12);
  });
});

describe('Forest movement', () => {
  it('a Player must move the full roll along the path', () => {
    let g = roll(inForest(1, 4, 'E', '├───────┤'), 3);
    expect(viewFor(g, 'p1').options).not.toContainEqual({ type: 'stop' });
    g = go(g, 'E', 'E', 'E');
    expect(player(g, 'p1').square).toBe(s9(4, 4));
    expect(g.turn?.phase).toBe('after');
  });

  it('each step leaves through one of the Tile’s Exits, never straight back', () => {
    const g = roll(inForest(4, 4, 'E'), 1);
    expect(moves(g)).toEqual(['N*', 'E', 'S*']);
    expect(() => applyAction(g, 'p1', { type: 'step', dir: 'W' })).toThrow();
  });

  it('leaving off the Heading is a Pivot: it changes the Heading and spends one Pivot', () => {
    let g = roll(inForest(4, 4, 'E'), 2);
    g = go(g, 'N');
    expect(player(g, 'p1').heading).toBe('N');
    expect(player(g, 'p1').pivots).toBe(1);
    expect(moves(g)).toEqual(['N', 'E*', 'W*']);
  });

  it('a Bend forces a Pivot', () => {
    const g = roll(inForest(4, 4, 'E', '├───┐───┤'), 1);
    expect(moves(g)).toEqual(['S*']);
  });

  it('the Pivot Limit is 2 per Turn, and it refills at the start of each Turn', () => {
    let g = roll(inForest(4, 4, 'E'), 3);
    g = go(g, 'N', 'E');
    expect(player(g, 'p1').pivots).toBe(0);
    expect(moves(g)).toEqual(['E']);
    g = go(g, 'E');
    g = act(g, 'p1', { type: 'endTurn' });
    g = act(forceRolls(g, 1), 'p2', { type: 'roll' });
    g = act(g, 'p2', { type: 'stop' });
    g = act(g, 'p2', { type: 'endTurn' });
    expect(player(g, 'p1').pivots).toBe(2);
  });

  it('the Heading carries over between Turns', () => {
    let g = roll(inForest(4, 4, 'E'), 1);
    g = go(g, 'S');
    g = act(g, 'p1', { type: 'endTurn' });
    expect(player(g, 'p1').heading).toBe('S');
  });

  it('a Player is Lost when every Exit they may take needs a Pivot and they have none left', () => {
    let g = inForest(3, 4, 'E', '├───┐───┤');
    g = withPlayer(roll(g, 2), 'p1', (p) => (p.pivots = 0));
    g = go(g, 'E');
    expect(player(g, 'p1')).toMatchObject({ level: 'town', square: 12 });
  });

  it('being Lost ends the Turn and forfeits the remaining steps', () => {
    let g = inForest(3, 4, 'E', '├───┐───┤');
    g = withPlayer(roll(g, 4), 'p1', (p) => (p.pivots = 0));
    const res = applyAction(g, 'p1', { type: 'step', dir: 'E' });
    expect(res.state.turn?.player).toBe('p2');
    expect(res.events.map((e) => e.type)).toContain('lost');
  });

  it('a Player who is out of Pivots on a straight path is not Lost', () => {
    let g = inForest(1, 4, 'E', '├───────┤');
    g = withPlayer(roll(g, 2), 'p1', (p) => (p.pivots = 0));
    g = go(g, 'E', 'E');
    expect(player(g, 'p1').level).toBe('forest');
  });

  it('DEX adds 1 optional extra square at the end of the move', () => {
    let g = roll(inForest(1, 4, 'E', '├───────┤', { DEX: 1, STR: 3, CON: 2 }), 1);
    g = go(g, 'E');
    expect(g.turn?.phase).toBe('move');
    expect(viewFor(g, 'p1').options).toContainEqual({ type: 'stop' });
    g = go(g, 'E');
    expect(player(g, 'p1').square).toBe(s9(3, 4));
    expect(g.turn?.phase).toBe('after');
  });

  it('the optional DEX square never makes a Player Lost', () => {
    let g = inForest(2, 4, 'E', '├──┐────┤', { DEX: 1, STR: 3, CON: 2 });
    g = withPlayer(roll(g, 1), 'p1', (p) => (p.pivots = 0));
    g = go(g, 'E');
    expect(g.turn?.phase).toBe('after');
    expect(player(g, 'p1').level).toBe('forest');
  });
});

describe('Gates', () => {
  const town = (stats = {}) => aGame({ stats: [{ STR: 3, CON: 3, ...stats }] });
  const forestGate = (g: GameState, side: string) =>
    Number(
      Object.entries(g.boards.forest.features).find(
        ([, f]) => f.type === 'gate' && f.side === side,
      )?.[0],
    );

  it('taking a Gate is optional when a Player’s path crosses it', () => {
    let g = roll(town(), 4);
    g = go(g, 'N', 'N');
    expect(viewFor(g, 'p1').options).toContainEqual({ type: 'takeFeature' });
    g = go(g, 'E');
    expect(viewFor(g, 'p1').options).not.toContainEqual({ type: 'takeFeature' });
  });

  it('taking a Gate ends the move on the Forest end of that Gate, with a free Heading', () => {
    let g = roll(town(), 4);
    g = go(g, 'N', 'N');
    g = act(g, 'p1', { type: 'takeFeature' });
    expect(player(g, 'p1')).toMatchObject({ level: 'forest', square: forestGate(g, 'N') });
    const exits = g.boards.forest.tiles[forestGate(g, 'N')] ?? '';
    const headings = viewFor(g, 'p1')
      .options.filter((o) => o.type === 'chooseHeading')
      .map((o) => (o.type === 'chooseHeading' ? o.dir : ''));
    expect(headings.join('')).toBe(exits);
    g = act(g, 'p1', { type: 'chooseHeading', dir: exits[0] as 'E' });
    expect(player(g, 'p1').heading).toBe(exits[0]);
    expect(g.turn?.phase).toBe('after');
  });

  it('a Gate can be taken when the move ends on it', () => {
    let g = roll(town(), 2);
    g = go(g, 'W', 'W');
    expect(g.turn?.phase).toBe('after');
    g = act(g, 'p1', { type: 'takeFeature' });
    expect(player(g, 'p1')).toMatchObject({ level: 'forest', square: forestGate(g, 'W') });
  });

  it('a Gate taken from the Forest leads to the matching Town Gate', () => {
    let g = town();
    const gate = forestGate(g, 'E');
    g = withTiles(g, 'forest', OPEN);
    g = placed(g, 'p1', 'forest', gate - 1, 'E');
    g = roll(g, 1);
    g = go(g, 'E');
    g = act(g, 'p1', { type: 'takeFeature' });
    expect(player(g, 'p1')).toMatchObject({ level: 'town', square: 14 });
    expect(g.turn?.phase).toBe('after');
  });

  it('a Player standing on a Gate at the start of their Turn must move before taking it', () => {
    let g = town();
    g = placed(g, 'p1', 'town', 2);
    expect(viewFor(g, 'p1').options).not.toContainEqual({ type: 'takeFeature' });
  });
});

describe('Torchlight and fog', () => {
  it('the Forest’s paths are always visible to everyone', () => {
    const view = viewFor(aGame(), 'p2');
    expect(view.boards.forest.squares.every((s) => s.exits !== null)).toBe(true);
  });

  it('Torchlight reveals the 3×3 around a piece, permanently and for everyone', () => {
    let g = roll(inForest(4, 4, 'E'), 1);
    g = go(g, 'E');
    const seen = viewFor(g, 'p2').boards.forest.squares;
    for (const [x, y] of [
      [4, 3],
      [5, 4],
      [6, 5],
    ]) {
      expect(seen[s9(x!, y!)]?.revealed).toBe(true);
    }
    expect(seen[s9(7, 4)]?.revealed).toBe(false);
    g = act(g, 'p1', { type: 'endTurn' });
    expect(viewFor(g, 'p2').boards.forest.squares[s9(6, 5)]?.revealed).toBe(true);
  });
});
