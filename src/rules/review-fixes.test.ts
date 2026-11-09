import { describe, expect, it } from 'vitest';
import { applyAction, SYSTEM, viewFor } from './index.ts';
import type { GameState } from './index.ts';
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

const OPEN = ['┌┬┬┬┬┬┬┬┐', ...Array.from({ length: 7 }, () => '├┼┼┼┼┼┼┼┤'), '└┴┴┴┴┴┴┴┘'];
const s9 = (x: number, y: number) => sq(9, x, y);
const roll = (g: GameState, n: number, id = 'p1') => act(forceRolls(g, n), id, { type: 'roll' });

describe('Gates and Stairs come before being Lost', () => {
  function onTheEdgeGate() {
    let g = emptied(withTiles(aGame(), 'forest', OPEN), 'forest');
    const gate = Number(
      Object.entries(g.boards.forest.features).find(
        ([, f]) => f.type === 'gate' && f.side === 'N',
      )![0],
    );
    g = placed(g, 'p1', 'forest', gate + 9, 'N');
    g = withPlayer(roll(g, 3), 'p1', (p) => (p.pivots = 0));
    return { g: act(g, 'p1', { type: 'step', dir: 'N' }), gate };
  }

  it('a Player who reaches a Gate with no way on may still take it', () => {
    const { g, gate } = onTheEdgeGate();
    expect(player(g, 'p1')).toMatchObject({ level: 'forest', square: gate });
    expect(viewFor(g, 'p1').options).toContainEqual({ type: 'takeFeature' });
    expect(viewFor(g, 'p1').options).toContainEqual({ type: 'acceptLost' });
    const took = act(g, 'p1', { type: 'takeFeature' });
    expect(player(took, 'p1')).toMatchObject({ level: 'town', square: 2 });
  });

  it('declining the Gate there means being Lost', () => {
    const { g } = onTheEdgeGate();
    expect(player(act(g, 'p1', { type: 'acceptLost' }), 'p1').square).toBe(12);
  });
});

describe('Response windows keep carried items hidden', () => {
  function windowOpen() {
    let g = aGame({ players: 3 });
    g = emptied(withTiles(g, 'forest', OPEN), 'forest');
    g = withMob(g, 'forest', s9(3, 4), 'Dire Wolf');
    g = revealAll(placed(g, 'p1', 'forest', s9(2, 4), 'E'), 'forest');
    g = withItem(g, 'p2', 'coin');
    g = act(roll(g, 1), 'p1', { type: 'step', dir: 'E' });
    return applyAction(forceRolls(g, 3, 5), 'p1', { type: 'exchange', approach: 'Fight' });
  }

  it('nobody else can tell who is able to Meddle', () => {
    const res = windowOpen();
    expect(res.state.response?.eligible).toEqual(['p2']);
    const theirs = viewFor(res.state, 'p3', res.events);
    expect(JSON.stringify(theirs.response)).not.toContain('p2');
    expect(JSON.stringify(theirs.events)).not.toContain('p2');
    expect(viewFor(res.state, 'p2', res.events).response?.eligible).toEqual(['p2']);
  });

  it('only the owner hears that a Charm crumbled', () => {
    let { state: g } = windowOpen();
    g = withPlayer(g, 'p2', (p) => (p.items[0]!.charges = 1));
    const [a, b] = g.response!.dice;
    const res = applyAction(g, 'p2', {
      type: 'use',
      item: player(g, 'p2').items[0]!.id,
      dice: [a!.id, b!.id],
    });
    expect(viewFor(res.state, 'p3', res.events).events.map((e) => e.type)).not.toContain(
      'crumbled',
    );
    expect(viewFor(res.state, 'p2', res.events).events.map((e) => e.type)).toContain('crumbled');
  });
});

describe('An offline defender never stalls the table', () => {
  function shakedownOf(defenderOnline: boolean) {
    let g = emptied(
      withTiles(
        aGame({
          stats: [
            { STR: 3, CON: 3 },
            { DEX: 3, CON: 3 },
          ],
        }),
        'forest',
        OPEN,
      ),
      'forest',
    );
    g = placed(placed(g, 'p2', 'forest', s9(3, 4)), 'p1', 'forest', s9(2, 4), 'E');
    if (!defenderOnline) g = act(g, SYSTEM, { type: 'presence', player: 'p2', online: false });
    g = act(roll(g, 1), 'p1', { type: 'step', dir: 'E' });
    return act(forceRolls(g, 3, 3), 'p1', { type: 'shakedown', target: 'p2', approach: 'Fight' });
  }

  it('an offline defender defends with their best Approach at once', () => {
    const g = shakedownOf(false);
    expect(g.shakedown).toBeNull();
    expect(viewFor(g, 'p1').options).toContainEqual({ type: 'endTurn' });
  });

  it('a defender who goes offline mid-Shakedown defends with their best Approach', () => {
    let g = shakedownOf(true);
    expect(g.shakedown).not.toBeNull();
    g = act(g, SYSTEM, { type: 'presence', player: 'p2', online: false });
    expect(g.shakedown).toBeNull();
  });
});

describe('Nest Egg', () => {
  it('counts Gold Deposited, not the Guardian bonus', () => {
    let g = aGame({ stats: [{ DEX: 3, WIS: 3 }] });
    g = { ...g, deeds: [{ id: 'nestegg', claimedBy: null }] };
    const wyrm = Number(
      Object.entries(g.boards.dungeon.features).find(([, f]) => f.type === 'guardian')![0],
    );
    g = withPlayer(placed(g, 'p1', 'dungeon', wyrm), 'p1', (p) => (p.keep = 2));
    g.boards.dungeon.mobs[wyrm]!.wounds = 2;
    g = act(g, 'p1', { type: 'resumeClash' });
    g = act(forceRolls(g, 6, 1, 1), 'p1', { type: 'exchange', approach: 'Trickery' });
    expect(player(g, 'p1').keep).toBe(7);
    expect(g.deeds[0]?.claimedBy).toBeNull();
  });
});

describe('The Stairs in the Dungeon', () => {
  it('the Dungeon end can be any edge square, corners included', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 300; seed++) {
      const d = aGame({ seed }).boards.dungeon;
      seen.add(Number(Object.entries(d.features).find(([, f]) => f.type === 'stairsUp')![0]));
    }
    expect([0, 6, 42, 48].some((c) => seen.has(c))).toBe(true);
  });
});
