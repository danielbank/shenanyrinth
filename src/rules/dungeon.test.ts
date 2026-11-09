import { describe, expect, it } from 'vitest';
import { applyAction, viewFor } from './index.ts';
import type { GameState } from './index.ts';
import { DUNGEON_MOBS, GUARDIAN } from './data.ts';
import {
  aGame,
  act,
  emptied,
  forceRolls,
  placed,
  player,
  revealAll,
  sq,
  withMob,
  withPlayer,
  withTiles,
} from './testing.ts';

const roll = (g: GameState, n: number, id = 'p1') => act(forceRolls(g, n), id, { type: 'roll' });
const go = (g: GameState, ...dirs: ('N' | 'E' | 'S' | 'W')[]) =>
  dirs.reduce((s, dir) => act(s, s.turn!.player, { type: 'step', dir }), g);
const featureAt = (g: GameState, level: 'forest' | 'dungeon', type: string) =>
  Number(Object.entries(g.boards[level].features).find(([, f]) => f.type === type)?.[0]);

/** Steps from `from` to every square, following Exits. */
function stepsFrom(tiles: string[], size: number, from: number): number[] {
  const delta: Record<string, number[]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const dist = tiles.map(() => Infinity);
  dist[from] = 0;
  const queue = [from];
  while (queue.length) {
    const i = queue.shift()!;
    for (const d of tiles[i]!) {
      const [dx, dy] = delta[d]!;
      const j = (Math.floor(i / size) + dy!) * size + (i % size) + dx!;
      if (dist[j] === Infinity) {
        dist[j] = dist[i]! + 1;
        queue.push(j);
      }
    }
  }
  return dist;
}

describe('The Stairs', () => {
  it('the Stairs sit on a random square of the Forest’s middle 3×3', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const s = featureAt(aGame({ seed }), 'forest', 'stairs');
      expect([3, 4, 5]).toContain(s % 9);
      expect([3, 4, 5]).toContain(Math.floor(s / 9));
      seen.add(s);
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it('the Dungeon end of the Stairs is on a Dungeon edge square', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = featureAt(aGame({ seed }), 'dungeon', 'stairsUp');
      const x = s % 7;
      const y = Math.floor(s / 7);
      expect(x === 0 || y === 0 || x === 6 || y === 6).toBe(true);
    }
  });

  it('the Forest Stairs stay hidden until revealed', () => {
    const g = aGame();
    const s = featureAt(g, 'forest', 'stairs');
    expect(viewFor(g, 'p1').boards.forest.squares[s]?.feature).toBeNull();
    expect(viewFor(revealAll(g, 'forest'), 'p1').boards.forest.squares[s]?.feature).toEqual({
      type: 'stairs',
    });
  });

  it('taking the Stairs leads into the Dungeon, with a free Heading', () => {
    let g = emptied(aGame({ stats: [{ STR: 3, CON: 3 }] }), 'forest');
    const stairs = featureAt(g, 'forest', 'stairs');
    g = withTiles(g, 'forest', [
      '┌┬┬┬┬┬┬┬┐',
      ...Array.from({ length: 7 }, () => '├┼┼┼┼┼┼┼┤'),
      '└┴┴┴┴┴┴┴┘',
    ]);
    g = placed(g, 'p1', 'forest', stairs - 1, 'E');
    g = go(roll(g, 1), 'E');
    g = act(g, 'p1', { type: 'takeFeature' });
    expect(player(g, 'p1')).toMatchObject({
      level: 'dungeon',
      square: featureAt(g, 'dungeon', 'stairsUp'),
    });
    expect(g.turn?.choosingHeading).toBe(true);
  });

  it('taking the Stairs back up leads to the Forest Stairs', () => {
    let g = emptied(aGame({ stats: [{ STR: 3, CON: 3 }] }), 'dungeon');
    const up = featureAt(g, 'dungeon', 'stairsUp');
    const exits = g.boards.dungeon.tiles[up]!;
    const out = exits[0] as 'N' | 'E' | 'S' | 'W';
    const back = { N: 'S', E: 'W', S: 'N', W: 'E' }[out] as 'N';
    const next = up + { N: -7, E: 1, S: 7, W: -1 }[out];
    g.boards.dungeon.tiles[next] = 'NESW';
    g = placed(g, 'p1', 'dungeon', next, back);
    g = go(roll(g, 1), back);
    g = act(g, 'p1', { type: 'takeFeature' });
    expect(player(g, 'p1')).toMatchObject({
      level: 'forest',
      square: featureAt(g, 'forest', 'stairs'),
    });
  });
});

describe('The Dungeon', () => {
  const dungeons = Array.from({ length: 40 }, (_, i) => aGame({ seed: i + 1 }).boards.dungeon);

  it('the Dungeon is 7×7 and never has an Exit facing off the board', () => {
    for (const d of dungeons) {
      expect(d.tiles).toHaveLength(49);
      d.tiles.forEach((exits, i) => {
        const x = i % 7;
        const y = Math.floor(i / 7);
        if (y === 0) expect(exits).not.toContain('N');
        if (y === 6) expect(exits).not.toContain('S');
        if (x === 0) expect(exits).not.toContain('W');
        if (x === 6) expect(exits).not.toContain('E');
      });
    }
  });

  it('inner Dungeon Tiles are mostly Bends (Straight 5, Bend 75, T 15, Crossroads 5)', () => {
    let bends = 0;
    let n = 0;
    for (const d of dungeons) {
      d.tiles.forEach((exits, i) => {
        const x = i % 7;
        const y = Math.floor(i / 7);
        if (x === 0 || y === 0 || x === 6 || y === 6) return;
        n++;
        if (exits.length === 2 && exits !== 'NS' && exits !== 'EW') bends++;
      });
    }
    expect(bends / n).toBeCloseTo(0.75, 1);
  });

  it('the Dungeon is fully dark except the area around its Stairs end', () => {
    const g = aGame();
    const up = featureAt(g, 'dungeon', 'stairsUp');
    const squares = viewFor(g, 'p1').boards.dungeon.squares;
    squares.forEach((s, i) => {
      const near =
        Math.abs((i % 7) - (up % 7)) <= 1 && Math.abs(Math.floor(i / 7) - Math.floor(up / 7)) <= 1;
      expect(s.revealed).toBe(near);
      expect(s.exits === null).toBe(!near);
    });
  });

  it('the Dungeon holds 5 Gold tokens worth 3–5, 5 Artifacts and one of each Dungeon Mob', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const d = aGame({ seed }).boards.dungeon;
      const tokens = Object.values(d.tokens);
      const gold = tokens.filter((t) => t.type === 'gold');
      expect(gold).toHaveLength(5);
      for (const t of gold) expect(t.type === 'gold' && t.amount >= 3 && t.amount <= 5).toBe(true);
      expect(tokens.filter((t) => t.type === 'artifacts')).toHaveLength(5);
      const mobs = Object.values(d.mobs)
        .map((m) => m.kind)
        .sort();
      expect(mobs).toEqual(
        ['Cave Troll', 'Gazer', 'Necromancer', 'Red Wyrm', 'Skeleton', 'Wraith'].sort(),
      );
    }
  });

  it('the Dungeon roster and dice match the spec', () => {
    expect(
      DUNGEON_MOBS.map((m) => [
        m.name,
        m.dice.Fight,
        m.dice.Magic,
        m.dice.Trickery,
        m.wounds,
        m.trophy,
        m.gold,
        m.damage,
      ]),
    ).toEqual([
      ['Skeleton', 8, 12, 12, 2, 2, 3, 2],
      ['Wraith', 12, 8, 10, 2, 2, 3, 2],
      ['Gazer', 10, 12, 8, 2, 2, 3, 2],
      ['Cave Troll', 12, 8, 10, 3, 3, 5, 2],
      ['Necromancer', 8, 12, 12, 3, 3, 5, 2],
    ]);
  });
});

describe('Foresight', () => {
  function torchArea(wis: number) {
    let g = emptied(aGame({ stats: [{ STR: 3, CON: 3 }] }), 'forest');
    g = withTiles(g, 'forest', [
      '┌┬┬┬┬┬┬┬┐',
      ...Array.from({ length: 7 }, () => '├┼┼┼┼┼┼┼┤'),
      '└┴┴┴┴┴┴┴┘',
    ]);
    g.boards.forest.revealed = g.boards.forest.revealed.map(() => false);
    g = withPlayer(placed(g, 'p1', 'forest', sq(9, 3, 4), 'E'), 'p1', (p) => (p.base.WIS = wis));
    g = go(roll(g, 1), 'E');
    return g.boards.forest.revealed.filter(Boolean).length;
  }

  it.each([
    [2, 9],
    [3, 25],
    [4, 25],
    [5, 49],
  ])('at WIS %i Torchlight reveals %i squares', (wis, squares) => {
    expect(torchArea(wis)).toBe(squares);
  });
});

describe('The Guardian', () => {
  it('the Red Wyrm’s dice, Wounds and Damage match the spec', () => {
    expect(GUARDIAN).toMatchObject({
      name: 'Red Wyrm',
      dice: { Fight: 12, Magic: 10, Trickery: 8 },
      weak: 'Trickery',
      wounds: 3,
      damage: 3,
    });
  });

  it('the Red Wyrm waits on a square farthest by step count from the Stairs', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const d = aGame({ seed }).boards.dungeon;
      const up = Number(Object.entries(d.features).find(([, f]) => f.type === 'stairsUp')?.[0]);
      const wyrm = Number(Object.entries(d.features).find(([, f]) => f.type === 'guardian')?.[0]);
      expect(d.mobs[wyrm]?.kind).toBe('Red Wyrm');
      const dist = stepsFrom(d.tiles, 7, up);
      const reachable = dist.filter((x) => x < Infinity);
      expect(dist[wyrm]).toBe(Math.max(...reachable));
    }
  });

  function atWyrm(stats = { DEX: 3, WIS: 3 }) {
    let g = aGame({ players: 3, stats: [stats] });
    g = placed(g, 'p1', 'dungeon', featureAt(g, 'dungeon', 'guardian'), 'N');
    return act(g, 'p1', { type: 'resumeClash' });
  }
  const hit = (
    g: GameState,
    mine: number,
    mob: number,
    approach: 'Trickery' | 'Fight' = 'Trickery',
  ) => act(forceRolls(g, mine, mob), 'p1', { type: 'exchange', approach });

  it('Players add WIS on top of their Approach Stat against the Guardian', () => {
    const res = applyAction(forceRolls(atWyrm(), 1, 8), 'p1', {
      type: 'exchange',
      approach: 'Trickery',
    });
    expect(res.events.find((e) => e.type === 'exchangeRolled')).toMatchObject({ bonus: [6, 0] });
  });

  it('each Wound landed on the Guardian gives 2 Trophies', () => {
    const g = hit(atWyrm(), 6, 1);
    expect(player(g, 'p1').trophies).toBe(2);
    expect(g.boards.dungeon.mobs[featureAt(g, 'dungeon', 'guardian')]?.wounds).toBe(1);
  });

  it('the final Wound performs the feat: the Guardian bonus of 5 goes into the Keep', () => {
    let g = hit(hit(hit(atWyrm(), 6, 1), 6, 1), 6, 1);
    expect(player(g, 'p1')).toMatchObject({ trophies: 6, keep: 5, feat: true });
    expect(g.endTriggered).toBe(true);
    expect(Object.values(g.boards.dungeon.mobs).map((m) => m.kind)).not.toContain('Red Wyrm');
    expect(g.clash).toBeNull();
  });

  it('after the feat, play finishes the current Round and the game ends', () => {
    let g = hit(hit(hit(atWyrm(), 6, 1), 6, 1), 6, 1);
    g = act(g, 'p1', { type: 'endTurn' });
    for (const id of ['p2', 'p3']) {
      expect(g.phase).toBe('playing');
      g = roll(g, 1, id);
      g = act(g, id, { type: 'stop' });
      g = act(g, id, { type: 'endTurn' });
    }
    expect(g.phase).toBe('over');
    expect(viewFor(g, 'p2').final?.winners).toEqual(['p1']);
  });
});

describe('Tie-breaks', () => {
  function over(setup: (g: GameState) => void) {
    let g = aGame({ players: 2 });
    setup(g);
    g.round = 30;
    for (const id of ['p1', 'p2']) {
      g = roll(g, 1, id);
      g = act(g, id, { type: 'stop' });
      g = act(g, id, { type: 'endTurn' });
    }
    return viewFor(g, 'p1').final?.winners;
  }

  it('a tie goes to the Player with the most Trophies', () => {
    expect(
      over((g) => {
        g.players[0]!.keep = 5;
        g.players[1]!.keep = 3;
        g.players[1]!.trophies = 2;
      }),
    ).toEqual(['p2']);
  });

  it('then to whoever performed the feat', () => {
    expect(
      over((g) => {
        g.players[0]!.keep = 5;
        g.players[1]!.keep = 5;
        g.players[1]!.feat = true;
      }),
    ).toEqual(['p2']);
  });

  it('if still tied, they share the win', () => {
    expect(over(() => {})).toEqual(['p1', 'p2']);
  });
});
