import { describe, expect, it } from 'vitest';
import { applyAction, viewFor } from './index.ts';
import type { GameState } from './index.ts';
import { DEEDS } from './data.ts';
import {
  aGame,
  act,
  emptied,
  forceRolls,
  placed,
  player,
  sq,
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

function withDeeds(g: GameState, ids: string[]): GameState {
  return { ...g, deeds: ids.map((id) => ({ id, claimedBy: null })) };
}
const claimed = (g: GameState, id: string) => g.deeds.find((d) => d.id === id)?.claimedBy;
const everyDeed = (g: GameState) =>
  withDeeds(
    g,
    DEEDS.map((d) => d.id),
  );

function forestKill(g: GameState, mob = 'Goblin', level: 'forest' | 'dungeon' = 'forest') {
  if (level === 'dungeon') {
    g = emptied(g, 'dungeon');
    g.boards.dungeon.tiles = g.boards.dungeon.tiles.map(() => 'NESW');
    g = placed(g, 'p1', 'dungeon', sq(7, 2, 3), 'E');
    g = withMob(g, 'dungeon', sq(7, 3, 3), mob, 1);
  } else {
    g = emptied(withTiles(g, 'forest', OPEN), 'forest');
    g = placed(g, 'p1', 'forest', s9(2, 4), 'E');
    g = withMob(g, 'forest', s9(3, 4), mob, 0);
  }
  g = go(roll(g, 1), 'E');
  return act(forceRolls(g, 6, 1, 1), 'p1', { type: 'exchange', approach: 'Fight' });
}

describe('Drawing Deeds', () => {
  it('there are 12 Deeds, 4 per tier, worth 3, 4 and 5 points', () => {
    expect(DEEDS).toHaveLength(12);
    for (const [tier, points] of [
      ['easy', 3],
      ['medium', 4],
      ['hard', 5],
    ] as const) {
      const ofTier = DEEDS.filter((d) => d.tier === tier);
      expect(ofTier).toHaveLength(4);
      for (const d of ofTier) expect(d.points).toBe(points);
    }
  });

  it('setup draws one public Deed per tier with the seeded generator', () => {
    const draws = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const g = aGame({ seed });
      expect(g.deeds.map((d) => DEEDS.find((x) => x.id === d.id)?.tier)).toEqual([
        'easy',
        'medium',
        'hard',
      ]);
      draws.add(g.deeds.map((d) => d.id).join());
      expect(aGame({ seed }).deeds).toEqual(g.deeds);
    }
    expect(draws.size).toBeGreaterThan(10);
    expect(viewFor(aGame(), 'p2').deeds).toHaveLength(3);
  });
});

describe('The Deeds', () => {
  it('Trailblazer: first to reach the Dungeon', () => {
    let g = everyDeed(emptied(withTiles(aGame(), 'forest', OPEN), 'forest'));
    const stairs = Number(
      Object.entries(g.boards.forest.features).find(([, f]) => f.type === 'stairs')![0],
    );
    g = go(roll(placed(g, 'p1', 'forest', stairs - 1, 'E'), 1), 'E');
    g = act(g, 'p1', { type: 'takeFeature' });
    expect(claimed(g, 'trailblazer')).toBe('p1');
  });

  it('Monster Hunter: first to kill 3 Mobs', () => {
    let g = withPlayer(everyDeed(aGame()), 'p1', (p) => (p.kills = 2));
    expect(claimed(g, 'hunter')).toBeNull();
    g = forestKill(g);
    expect(claimed(g, 'hunter')).toBe('p1');
  });

  it('Nest Egg: first to have 6 Gold Deposited', () => {
    let g = withPlayer(everyDeed(aGame()), 'p1', (p) => (p.pack.gold = 6));
    g = go(roll(g, 1), 'N');
    g = act(g, 'p1', { type: 'deposit', amount: 5 });
    expect(claimed(g, 'nestegg')).toBeNull();
    g = act(g, 'p1', { type: 'deposit', amount: 1 });
    expect(claimed(g, 'nestegg')).toBe('p1');
  });

  it('Shakedown Artist: first to win a Shakedown', () => {
    let g = everyDeed(emptied(withTiles(aGame(), 'forest', OPEN), 'forest'));
    g = placed(placed(g, 'p2', 'forest', s9(3, 4)), 'p1', 'forest', s9(2, 4), 'E');
    g = withPlayer(g, 'p2', (p) => (p.pack.gold = 2));
    g = go(roll(g, 1), 'E');
    g = act(g, 'p1', { type: 'shakedown', target: 'p2', approach: 'Fight' });
    g = act(forceRolls(g, 6, 1), 'p2', { type: 'defend', approach: 'Fight' });
    expect(claimed(g, 'artist')).toBe('p1');
  });

  it('Relic Hunter: first to carry 2 Artifacts into the Town at once', () => {
    let g = everyDeed(emptied(withTiles(aGame(), 'forest', OPEN), 'forest'));
    const gate = Number(
      Object.entries(g.boards.forest.features).find(
        ([, f]) => f.type === 'gate' && f.side === 'E',
      )![0],
    );
    g = withPlayer(placed(g, 'p1', 'forest', gate - 1, 'E'), 'p1', (p) => (p.pack.artifacts = 2));
    g = act(go(roll(g, 1), 'E'), 'p1', { type: 'takeFeature' });
    expect(claimed(g, 'relic')).toBe('p1');
  });

  it('Treasure Sense: first to claim any Cache', () => {
    let g = everyDeed(
      emptied(withTiles(aGame({ stats: [{ INT: 2, CON: 3, STR: 1 }] }), 'forest', OPEN), 'forest'),
    );
    g = withTokens(placed(g, 'p1', 'forest', s9(2, 4), 'E'), 'forest', {
      [s9(3, 4)]: { type: 'cache', rating: 2 },
    });
    g = act(forceRolls(g, 1, 1), 'p1', { type: 'roll' });
    g = go(g, 'E');
    expect(claimed(g, 'sense')).toBe('p1');
    expect(claimed(g, 'deep')).toBeNull();
  });

  it('Collector: first to own 1 Trinket', () => {
    let g = everyDeed(aGame());
    g = forestKill(g);
    expect(claimed(g, 'collector')).toBeNull();
    g = withPlayer(g, 'p1', (p) => (p.trinkets = ['Rubber Chicken']));
    g = act(g, 'p1', { type: 'endTurn' });
    expect(claimed(g, 'collector')).toBe('p1');
  });

  it('First Blood: first to land a Wound on the Guardian', () => {
    let g = everyDeed(aGame({ stats: [{ DEX: 3, WIS: 3 }] }));
    const wyrm = Number(
      Object.entries(g.boards.dungeon.features).find(([, f]) => f.type === 'guardian')![0],
    );
    g = act(placed(g, 'p1', 'dungeon', wyrm), 'p1', { type: 'resumeClash' });
    g = act(forceRolls(g, 6, 1, 1), 'p1', { type: 'exchange', approach: 'Trickery' });
    expect(claimed(g, 'firstblood')).toBe('p1');
  });

  it('Pathfinder: first to end 5 Turns in a row in the Dungeon without being Lost or Knocked Out', () => {
    let g = everyDeed(emptied(aGame(), 'dungeon'));
    g.boards.dungeon.tiles = g.boards.dungeon.tiles.map((_, i) =>
      i % 7 === 0 ? 'NES' : i % 7 === 6 ? 'NSW' : 'EW',
    );
    for (let turn = 1; turn <= 5; turn++) {
      g = placed(g, 'p1', 'dungeon', sq(7, 2, 3), 'E');
      g = go(roll(g, 1), 'E');
      expect(claimed(g, 'pathfinder')).toBeNull();
      g = act(g, 'p1', { type: 'endTurn' });
      g = act(roll(g, 1, 'p2'), 'p2', { type: 'stop' });
      g = act(g, 'p2', { type: 'endTurn' });
    }
    expect(claimed(g, 'pathfinder')).toBe('p1');
  });

  it('Pathfinder’s streak starts over after a Turn ended outside the Dungeon', () => {
    let g = withPlayer(everyDeed(aGame()), 'p1', (p) => (p.dungeonStreak = 4));
    g = act(roll(g, 1), 'p1', { type: 'stop' });
    g = act(g, 'p1', { type: 'endTurn' });
    expect(player(g, 'p1').dungeonStreak).toBe(0);
  });

  it('Deep Secrets: first to claim a Cache rated 3 or higher', () => {
    let g = everyDeed(
      emptied(withTiles(aGame({ stats: [{ INT: 3, CON: 3 }] }), 'forest', OPEN), 'forest'),
    );
    g = withTokens(placed(g, 'p1', 'forest', s9(2, 4), 'E'), 'forest', {
      [s9(3, 4)]: { type: 'cache', rating: 3 },
    });
    g = act(forceRolls(g, 1, 1), 'p1', { type: 'roll' });
    g = go(g, 'E');
    expect(claimed(g, 'deep')).toBe('p1');
  });

  it('Master-at-Arms: first to wield a tier-2 Gear', () => {
    let g = withPlayer(everyDeed(placed(aGame(), 'p1', 'town', 7)), 'p1', (p) => {
      p.pack.gold = 20;
      p.gear.STR = 1;
    });
    g = act(roll(g, 1), 'p1', { type: 'stop' });
    expect(claimed(g, 'master')).toBeNull();
    g = act(g, 'p1', { type: 'buy', item: 'gear:STR' });
    expect(claimed(g, 'master')).toBe('p1');
  });

  it('Dungeon Slayer: first to kill 3 Dungeon Mobs', () => {
    let g = withPlayer(everyDeed(aGame()), 'p1', (p) => (p.dungeonKills = 2));
    g = forestKill(g);
    expect(claimed(g, 'slayer')).toBeNull();
    g = forestKill(
      withPlayer(everyDeed(aGame()), 'p1', (p) => (p.dungeonKills = 2)),
      'Skeleton',
      'dungeon',
    );
    expect(claimed(g, 'slayer')).toBe('p1');
  });
});

describe('Claiming', () => {
  it('only the first Player to achieve a Deed scores it, and it shows who took it', () => {
    let g = withDeeds(aGame(), ['nestegg', 'sense', 'deep']);
    g = withPlayer(g, 'p2', (p) => (p.keep = 6));
    g = withPlayer(g, 'p1', (p) => (p.keep = 6));
    g = act(roll(g, 1), 'p1', { type: 'stop' });
    expect(claimed(g, 'nestegg')).toBe('p1');
    expect(viewFor(g, 'p2').deeds[0]).toMatchObject({ id: 'nestegg', claimedBy: 'p1', points: 3 });
    expect(viewFor(g, 'p2').players.find((p) => p.id === 'p1')?.publicScore).toBe(9);
    expect(viewFor(g, 'p2').players.find((p) => p.id === 'p2')?.publicScore).toBe(6);
  });

  it('Deed points can’t be lost', () => {
    let g = withDeeds(aGame(), ['nestegg', 'sense', 'deep']);
    g = withPlayer(g, 'p1', (p) => (p.keep = 6));
    g = act(roll(g, 1), 'p1', { type: 'stop' });
    const rows = [...OPEN];
    rows[4] = '├──┐────┤';
    g = act(g, 'p1', { type: 'endTurn' });
    g = act(roll(g, 1, 'p2'), 'p2', { type: 'stop' });
    g = act(g, 'p2', { type: 'endTurn' });
    g = emptied(withTiles(g, 'forest', rows), 'forest');
    g = placed(g, 'p1', 'forest', s9(2, 4), 'E');
    g = withPlayer(roll(g, 2), 'p1', (p) => (p.pivots = 0));
    const res = applyAction(g, 'p1', { type: 'step', dir: 'E' });
    expect(res.events.map((e) => e.type)).toContain('lost');
    expect(claimed(res.state, 'nestegg')).toBe('p1');
    expect(viewFor(res.state, 'p1').players[0]?.publicScore).toBe(9);
  });

  it('final scores include Deed points', () => {
    let g = withDeeds(aGame(), ['nestegg', 'sense', 'deep']);
    g = withPlayer(g, 'p1', (p) => (p.keep = 6));
    g.round = 30;
    for (const id of ['p1', 'p2']) {
      g = act(roll(g, 1, id), id, { type: 'stop' });
      g = act(g, id, { type: 'endTurn' });
    }
    expect(viewFor(g, 'p1').final?.scores.find((s) => s.player === 'p1')).toMatchObject({
      deeds: 3,
      total: 9,
    });
  });
});
