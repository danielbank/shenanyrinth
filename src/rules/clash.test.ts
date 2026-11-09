import { describe, expect, it } from 'vitest';
import { applyAction, viewFor } from './index.ts';
import type { GameState } from './index.ts';
import { FOREST_MOBS } from './data.ts';
import {
  aGame,
  act,
  forceRolls,
  placed,
  player,
  revealAll,
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
const fight = (g: GameState, approach: 'Fight' | 'Magic' | 'Trickery', mine: number, mob: number) =>
  act(forceRolls(g, mine, mob), 'p1', { type: 'exchange', approach });

/** p1 at (2,4) heading E, a Mob at (3,4), on an open lit board with no tokens. */
function facing(mob = 'Goblin', stats = { STR: 3, CON: 3 }) {
  let g = aGame({ stats: [stats] });
  g = withTiles(g, 'forest', OPEN);
  g = withTokens(g, 'forest', {});
  g = withMob(g, 'forest', s9(3, 4), mob);
  g = placed(g, 'p1', 'forest', s9(2, 4), 'E');
  return revealAll(g, 'forest');
}
const ambushed = (mob?: string, stats?: { STR: number; CON: number }) =>
  go(roll(facing(mob, stats), 3), 'E');

describe('Forest Mobs', () => {
  it('the Forest roster and dice match the spec', () => {
    expect(
      FOREST_MOBS.map((m) => [
        m.name,
        m.dice.Fight,
        m.dice.Magic,
        m.dice.Trickery,
        m.wounds,
        m.gold,
      ]),
    ).toEqual([
      ['Goblin', 8, 8, 6, 1, 1],
      ['Myconid', 6, 8, 10, 1, 1],
      ['Pixie', 10, 6, 8, 1, 1],
      ['Dire Wolf', 6, 8, 10, 2, 2],
      ['Bandit', 6, 8, 10, 2, 2],
      ['Treant', 10, 6, 8, 2, 2],
    ]);
    for (const m of FOREST_MOBS) expect([m.damage, m.trophy]).toEqual([1, 1]);
  });

  it('every Mob has exactly one weak Approach, its smallest die', () => {
    for (const m of FOREST_MOBS) {
      const dice = Object.values(m.dice);
      expect(m.dice[m.weak]).toBe(Math.min(...dice));
      expect(dice.filter((d) => d === m.dice[m.weak])).toHaveLength(1);
    }
  });

  it('the Forest is seeded with one of each of its 6 Mobs, off the Features', () => {
    const g = aGame({ seed: 5 });
    const mobs = Object.entries(g.boards.forest.mobs);
    expect(mobs.map(([, m]) => m.kind).sort()).toEqual(
      ['Bandit', 'Dire Wolf', 'Goblin', 'Myconid', 'Pixie', 'Treant'].sort(),
    );
    for (const [square] of mobs) expect(g.boards.forest.features[Number(square)]).toBeUndefined();
  });

  it('Mobs stay hidden until Torchlight reveals them', () => {
    let g = withMob(aGame(), 'forest', s9(4, 4), 'Pixie');
    expect(viewFor(g, 'p2').boards.forest.squares[s9(4, 4)]?.mob).toBeNull();
    g = revealAll(g, 'forest');
    expect(viewFor(g, 'p2').boards.forest.squares[s9(4, 4)]?.mob).toMatchObject({
      kind: 'Pixie',
      wounds: 0,
      maxWounds: 1,
    });
  });
});

describe('Ambush', () => {
  it('stepping onto a Mob ends the movement and starts a Clash', () => {
    const g = ambushed();
    expect(player(g, 'p1').square).toBe(s9(3, 4));
    expect(g.turn).toMatchObject({ phase: 'after', stepsLeft: 0 });
    expect(g.clash).toMatchObject({ player: 'p1', square: s9(3, 4) });
    const options = viewFor(g, 'p1').options.map((o) => o.type);
    expect(options).toEqual(['exchange', 'exchange', 'exchange']);
  });

  it('a hidden Mob still ambushes, and is revealed by it', () => {
    let g = facing();
    g.boards.forest.revealed = g.boards.forest.revealed.map(() => false);
    g = go(roll(g, 2), 'E');
    expect(g.clash).not.toBeNull();
    expect(viewFor(g, 'p2').boards.forest.squares[s9(3, 4)]?.mob).not.toBeNull();
  });
});

describe('Exchanges', () => {
  it('the Player rolls 1d6 plus their Approach Stat against the Mob’s die for that Approach', () => {
    const res = applyAction(forceRolls(ambushed(), 2, 5), 'p1', {
      type: 'exchange',
      approach: 'Fight',
    });
    const rolled = res.events.find((e) => e.type === 'exchangeRolled');
    expect(rolled).toMatchObject({
      dice: [
        { owner: 'p1', faces: 6, value: 2 },
        { owner: 'mob', faces: 8, value: 5 },
      ],
      bonus: [3, 0],
    });
  });

  it('both sides’ dice are face-up for everyone', () => {
    const res = applyAction(forceRolls(ambushed(), 2, 5), 'p1', {
      type: 'exchange',
      approach: 'Fight',
    });
    expect(viewFor(res.state, 'p2', res.events).events.map((e) => e.type)).toContain(
      'exchangeRolled',
    );
  });

  it('a higher Player total lands a Wound on the Mob', () => {
    const g = fight(ambushed('Dire Wolf'), 'Fight', 4, 6);
    expect(g.boards.forest.mobs[s9(3, 4)]?.wounds).toBe(1);
    expect(player(g, 'p1').hp).toBe(7);
  });

  it('a higher Mob total deals its Damage to the Player', () => {
    const g = fight(ambushed('Dire Wolf'), 'Fight', 1, 6);
    expect(player(g, 'p1').hp).toBe(6);
    expect(g.boards.forest.mobs[s9(3, 4)]?.wounds).toBe(0);
  });

  it('a tie does nothing', () => {
    const g = fight(ambushed('Dire Wolf'), 'Fight', 2, 5);
    expect(player(g, 'p1').hp).toBe(7);
    expect(g.boards.forest.mobs[s9(3, 4)]?.wounds).toBe(0);
  });

  it('Magic uses INT and Trickery uses DEX', () => {
    let g = ambushed('Dire Wolf', { STR: 0, CON: 0, INT: 3, DEX: 3 } as never);
    g = fight(g, 'Magic', 3, 6);
    expect(g.boards.forest.mobs[s9(3, 4)]?.wounds).toBe(0);
    g = fight(g, 'Trickery', 4, 6);
    expect(g.boards.forest.mobs[s9(3, 4)]?.wounds).toBe(1);
  });

  it('after each Exchange the Player may Press, switching Approach, or Retreat', () => {
    const g = fight(ambushed('Dire Wolf'), 'Fight', 2, 5);
    expect(viewFor(g, 'p1').options).toEqual([
      { type: 'exchange', approach: 'Fight' },
      { type: 'exchange', approach: 'Magic' },
      { type: 'exchange', approach: 'Trickery' },
      { type: 'retreat' },
    ]);
  });

  it('a Retreat leaves the Player on the square and the Mob keeps its Wounds', () => {
    let g = fight(ambushed('Dire Wolf'), 'Fight', 6, 1);
    g = act(g, 'p1', { type: 'retreat' });
    expect(g.clash).toBeNull();
    expect(player(g, 'p1').square).toBe(s9(3, 4));
    expect(g.boards.forest.mobs[s9(3, 4)]?.wounds).toBe(1);
    expect(viewFor(g, 'p1').options).toContainEqual({ type: 'endTurn' });
  });

  it('a Retreat at 1 HP is allowed, and the Player survives', () => {
    let g = withPlayer(ambushed('Dire Wolf'), 'p1', (p) => (p.hp = 2));
    g = fight(g, 'Fight', 1, 8);
    expect(player(g, 'p1').hp).toBe(1);
    g = act(g, 'p1', { type: 'retreat' });
    expect(player(g, 'p1')).toMatchObject({ hp: 1, level: 'forest' });
  });
});

describe('Kills', () => {
  it('only the kill pays: its Trophy scores at once and its Gold goes into the Pack', () => {
    let g = fight(ambushed('Dire Wolf'), 'Fight', 6, 1);
    expect(player(g, 'p1')).toMatchObject({ trophies: 0, pack: { gold: 0 } });
    g = fight(g, 'Fight', 6, 1);
    expect(player(g, 'p1')).toMatchObject({ trophies: 1, pack: { gold: 2 } });
    expect(viewFor(g, 'p2').players[0]?.publicScore).toBe(1);
  });

  it('a killed Mob respawns on a random empty square of the same Level, unwounded', () => {
    const g = fight(ambushed('Goblin'), 'Fight', 6, 1);
    const mobs = Object.entries(g.boards.forest.mobs);
    expect(mobs).toHaveLength(1);
    expect(mobs[0]![0]).not.toBe(String(s9(3, 4)));
    expect(mobs[0]![1]).toMatchObject({ kind: 'Goblin', wounds: 0 });
    expect(g.clash).toBeNull();
  });
});

describe('Knocked Out', () => {
  it('HP is 4 + CON', () => {
    expect(viewFor(facing('Goblin', { STR: 3, CON: 3 }), 'p1').players[0]?.maxHp).toBe(7);
  });

  it('at 0 HP the Player is Knocked Out, exactly like Lost', () => {
    let g = withPlayer(ambushed('Dire Wolf'), 'p1', (p) => {
      p.hp = 1;
      p.pack = { gold: 4, herbs: 2, artifacts: 0 };
    });
    const res = applyAction(forceRolls(g, 1, 8), 'p1', { type: 'exchange', approach: 'Fight' });
    g = res.state;
    expect(res.events.map((e) => e.type)).toContain('knockedOut');
    expect(player(g, 'p1')).toMatchObject({
      level: 'town',
      square: 12,
      hp: 7,
      pack: { gold: 2, herbs: 1 },
    });
    expect(g.boards.forest.piles[s9(3, 4)]).toEqual({ gold: 2, herbs: 1, artifacts: 0 });
    expect(g.clash).toBeNull();
    expect(g.turn?.player).toBe('p2');
    expect(g.boards.forest.mobs[s9(3, 4)]).toBeDefined();
  });
});

describe('Starting a Turn on a Mob', () => {
  function retreatedAndBack(mob = 'Dire Wolf') {
    let g = fight(ambushed(mob), 'Fight', 6, 1);
    g = act(g, 'p1', { type: 'retreat' });
    g = act(g, 'p1', { type: 'endTurn' });
    g = roll(g, 1, 'p2');
    g = act(g, 'p2', { type: 'stop' });
    return act(g, 'p2', { type: 'endTurn' });
  }

  it('offers to resume the Clash or move away', () => {
    const g = retreatedAndBack();
    expect(g.turn?.phase).toBe('start');
    expect(viewFor(g, 'p1').options).toEqual([{ type: 'resumeClash' }, { type: 'moveAway' }]);
  });

  it('resuming the Clash takes the whole Turn', () => {
    let g = act(retreatedAndBack(), 'p1', { type: 'resumeClash' });
    expect(viewFor(g, 'p1').options.map((o) => o.type)).toEqual([
      'exchange',
      'exchange',
      'exchange',
    ]);
    g = fight(g, 'Fight', 6, 1);
    expect(player(g, 'p1').trophies).toBe(1);
    expect(viewFor(g, 'p1').options).toEqual([{ type: 'endTurn' }]);
  });

  it('moving away does not trigger a new Ambush', () => {
    let g = act(retreatedAndBack(), 'p1', { type: 'moveAway' });
    expect(g.turn?.phase).toBe('prepare');
    g = go(roll(g, 1), 'E');
    expect(g.clash).toBeNull();
    expect(g.turn?.phase).toBe('after');
  });
});
