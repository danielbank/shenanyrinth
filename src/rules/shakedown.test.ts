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
  withItem,
  withPlayer,
  withTiles,
} from './testing.ts';

const OPEN = ['┌┬┬┬┬┬┬┬┐', ...Array.from({ length: 7 }, () => '├┼┼┼┼┼┼┼┤'), '└┴┴┴┴┴┴┴┘'];
const s9 = (x: number, y: number) => sq(9, x, y);
const roll = (g: GameState, n: number, id = 'p1') => act(forceRolls(g, n), id, { type: 'roll' });
const go = (g: GameState, ...dirs: ('N' | 'E' | 'S' | 'W')[]) =>
  dirs.reduce((s, dir) => act(s, s.turn!.player, { type: 'step', dir }), g);
const has = (g: GameState, id: string, a: Action) =>
  viewFor(g, id).options.some((o) => JSON.stringify(o) === JSON.stringify(a));

/** p1 at (2,4) heading E, p2 at (3,4); both Forest Players with given Stats and Packs. */
function neighbours(
  p1: Record<string, number> = { STR: 3, CON: 3 },
  p2: Record<string, number> = { STR: 3, CON: 3 },
  packs = { p1: { gold: 5, herbs: 0, artifacts: 0 }, p2: { gold: 5, herbs: 1, artifacts: 1 } },
) {
  let g = emptied(withTiles(aGame({ stats: [p1, p2] }), 'forest', OPEN), 'forest');
  g = placed(g, 'p2', 'forest', s9(3, 4), 'N');
  g = placed(g, 'p1', 'forest', s9(2, 4), 'E');
  g = withPlayer(g, 'p1', (p) => (p.pack = { ...packs.p1 }));
  return withPlayer(g, 'p2', (p) => (p.pack = { ...packs.p2 }));
}
const landOn = (g: GameState) => go(roll(g, 1), 'E');
const shake = (g: GameState, mine: number, theirs: number, a = 'Fight', d = 'Fight') => {
  g = act(g, 'p1', { type: 'shakedown', target: 'p2', approach: a } as Action);
  return act(forceRolls(g, mine, theirs), 'p2', { type: 'defend', approach: d } as Action);
};

describe('Shakedowns', () => {
  it('a Player whose move ends on another Player outside the safe zone may Shake them down', () => {
    const g = landOn(neighbours());
    expect(has(g, 'p1', { type: 'shakedown', target: 'p2', approach: 'Fight' })).toBe(true);
    expect(has(g, 'p1', { type: 'shakedown', target: 'p2', approach: 'Trickery' })).toBe(true);
  });

  it('the attacker chooses an Approach, then the defender chooses theirs', () => {
    let g = act(landOn(neighbours()), 'p1', {
      type: 'shakedown',
      target: 'p2',
      approach: 'Magic',
    });
    expect(viewFor(g, 'p1').options).toEqual([]);
    expect(viewFor(g, 'p2').options).toEqual([
      { type: 'defend', approach: 'Fight' },
      { type: 'defend', approach: 'Magic' },
      { type: 'defend', approach: 'Trickery' },
    ]);
    const res = applyAction(forceRolls(g, 2, 2), 'p2', { type: 'defend', approach: 'Fight' });
    expect(res.events.find((e) => e.type === 'shakedownRolled')).toMatchObject({
      dice: [
        { owner: 'p1', value: 2 },
        { owner: 'p2', value: 2 },
      ],
      bonus: [0, 3],
    });
  });

  it('the winner takes up to 3 Gold from the loser’s Pack', () => {
    const g = shake(landOn(neighbours()), 6, 1);
    expect(player(g, 'p1').pack.gold).toBe(8);
    expect(player(g, 'p2').pack.gold).toBe(2);
  });

  it('it cuts both ways: the defender can win too', () => {
    const g = shake(landOn(neighbours()), 1, 6);
    expect(player(g, 'p1').pack.gold).toBe(2);
    expect(player(g, 'p2').pack.gold).toBe(8);
  });

  it('a loser with no Gold gives up 1 Material instead', () => {
    const g = shake(
      landOn(
        neighbours(undefined, undefined, {
          p1: { gold: 0, herbs: 0, artifacts: 0 },
          p2: { gold: 0, herbs: 1, artifacts: 1 },
        }),
      ),
      6,
      1,
    );
    expect(player(g, 'p1').pack).toEqual({ gold: 0, herbs: 0, artifacts: 1 });
  });

  it('a tie does nothing, and no one takes damage', () => {
    const g = shake(landOn(neighbours()), 3, 3);
    expect(player(g, 'p1').pack.gold).toBe(5);
    expect(player(g, 'p2').pack.gold).toBe(5);
    expect(player(g, 'p1').hp).toBe(7);
    expect(player(g, 'p2').hp).toBe(7);
  });

  it('the defender is safe from Shakedowns until their next Turn', () => {
    let g = shake(landOn(neighbours()), 3, 3);
    expect(player(g, 'p2').shakeProtected).toBe(true);
    g = withPlayer(act(g, 'p1', { type: 'endTurn' }), 'p2', () => {});
    expect(player(g, 'p2').shakeProtected).toBe(false);
  });

  it('a protected Player cannot be Shaken down', () => {
    let g = withPlayer(neighbours(), 'p2', (p) => (p.shakeProtected = true));
    g = landOn(g);
    expect(viewFor(g, 'p1').options.some((o) => o.type === 'shakedown')).toBe(false);
  });

  it('only one Shakedown per Turn', () => {
    const g = shake(landOn(neighbours()), 3, 3);
    expect(viewFor(g, 'p1').options.some((o) => o.type === 'shakedown')).toBe(false);
  });

  it('the Town, every Gate square and the Stairs squares are a safe zone', () => {
    let g = aGame();
    g = placed(g, 'p2', 'town', 7);
    g = act(roll(g, 1), 'p1', { type: 'step', dir: 'N' });
    expect(viewFor(g, 'p1').options.some((o) => o.type === 'shakedown')).toBe(false);

    for (const type of ['gate', 'stairs']) {
      let h = emptied(withTiles(aGame(), 'forest', OPEN), 'forest');
      const at = Number(
        Object.entries(h.boards.forest.features).find(([, f]) => f.type === type)![0],
      );
      const [x, y] = [at % 9, Math.floor(at / 9)];
      const [from, dir] =
        y === 0 ? [at + 9, 'N'] : y === 8 ? [at - 9, 'S'] : x === 0 ? [at + 1, 'W'] : [at - 1, 'E'];
      h = placed(h, 'p2', 'forest', at);
      h = placed(h, 'p1', 'forest', from as number, dir as 'N');
      h = go(roll(h, 1), dir as 'N');
      expect(player(h, 'p1').square).toBe(at);
      expect(viewFor(h, 'p1').options.some((o) => o.type === 'shakedown')).toBe(false);
    }
  });

  it('Response windows apply to Shakedown dice', () => {
    let g = landOn(neighbours(undefined, { CHA: 3, CON: 3 }));
    g = act(g, 'p1', { type: 'shakedown', target: 'p2', approach: 'Fight' });
    g = act(forceRolls(g, 4, 6), 'p2', { type: 'defend', approach: 'Fight' });
    expect(g.response).toMatchObject({ kind: 'shakedown', eligible: ['p2'] });
    const mine = g.response!.dice.find((d) => d.owner === 'p1')!;
    g = act(g, 'p2', { type: 'sway', die: mine.id, delta: -1 });
    g = act(g, 'p1', { type: 'allow' });
    g = act(g, 'p2', { type: 'pass' });
    expect(player(g, 'p2').pack.gold).toBe(5);
  });
});

describe('Rams', () => {
  it('a Player passing through another with steps left may Ram them if their STR beats the target’s CON', () => {
    const g = go(roll(neighbours({ STR: 3, CON: 3 }, { CON: 2, STR: 3, DEX: 1 }), 3), 'E');
    expect(has(g, 'p1', { type: 'ram', target: 'p2', approach: 'Fight' })).toBe(true);
  });

  it('CON at least the rammer’s STR blocks a Ram', () => {
    const g = go(roll(neighbours({ STR: 3, CON: 3 }, { CON: 3, STR: 3 }), 3), 'E');
    expect(viewFor(g, 'p1').options.some((o) => o.type === 'ram')).toBe(false);
  });

  it('a Ram forfeits the rest of the move and starts a Shakedown', () => {
    let g = go(roll(neighbours({ STR: 3, CON: 3 }, { CON: 2, STR: 3, DEX: 1 }), 3), 'E');
    g = act(g, 'p1', { type: 'ram', target: 'p2', approach: 'Fight' });
    expect(g.turn?.stepsLeft).toBe(0);
    g = act(forceRolls(g, 6, 1), 'p2', { type: 'defend', approach: 'Fight' });
    expect(player(g, 'p1').pack.gold).toBe(8);
    expect(player(g, 'p1').square).toBe(s9(3, 4));
    expect(g.turn?.phase).toBe('after');
  });

  it('a Player with no steps left can’t Ram', () => {
    const g = landOn(neighbours({ STR: 3, CON: 3 }, { CON: 2, STR: 3, DEX: 1 }));
    expect(viewFor(g, 'p1').options.some((o) => o.type === 'ram')).toBe(false);
  });
});

describe('Stoneskin Salve', () => {
  it('the Apothecary sells Stoneskin Salve for 2 Gold + 1 Herb', () => {
    let g = withPlayer(placed(aGame(), 'p1', 'town', 13), 'p1', (p) => {
      p.pack = { gold: 5, herbs: 1, artifacts: 0 };
    });
    g = act(roll(g, 1), 'p1', { type: 'stop' });
    g = act(g, 'p1', { type: 'buy', item: 'stoneskin' });
    expect(player(g, 'p1').pack).toMatchObject({ gold: 3, herbs: 0 });
  });

  it('it makes a Player immune to Shakedowns and Rams until their next Turn', () => {
    let g = withItem(aGame(), 'p2', 'stoneskin');
    g = act(roll(g, 1), 'p1', { type: 'stop' });
    g = act(g, 'p1', { type: 'endTurn' });
    const salve = player(g, 'p2').items[0]!.id;
    g = act(g, 'p2', { type: 'use', item: salve });
    expect(player(g, 'p2').stoneskin).toBe(true);
    g = act(roll(g, 1, 'p2'), 'p2', { type: 'stop' });
    g = act(g, 'p2', { type: 'endTurn' });
    g = emptied(withTiles(g, 'forest', OPEN), 'forest');
    g = placed(g, 'p2', 'forest', s9(3, 4));
    g = placed(g, 'p1', 'forest', s9(2, 4), 'E');
    const passing = go(roll(g, 3), 'E');
    expect(viewFor(passing, 'p1').options.some((o) => o.type === 'ram')).toBe(false);
    const landing = go(roll(g, 1), 'E');
    expect(viewFor(landing, 'p1').options.some((o) => o.type === 'shakedown')).toBe(false);
    g = act(landing, 'p1', { type: 'endTurn' });
    expect(player(g, 'p2').stoneskin).toBe(false);
  });
});
