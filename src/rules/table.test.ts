import { describe, expect, it } from 'vitest';
import { applyAction, SYSTEM, viewFor } from './index.ts';
import type { GameState } from './index.ts';
import { aGame, aLobby, act, forceRolls, player, withPlayer } from './testing.ts';

const offline = (g: GameState, id: string) =>
  act(g, SYSTEM, { type: 'presence', player: id, online: false });

describe('The Host', () => {
  it('the Host can pass the Host role to another Player', () => {
    const g = act(aLobby(3), 'p1', { type: 'passHost', to: 'p3' });
    expect(g.hostId).toBe('p3');
    expect(viewFor(g, 'p1').players.find((p) => p.isHost)?.id).toBe('p3');
  });

  it('only the Host can pass the role, and only to a seated Player', () => {
    expect(() => applyAction(aLobby(3), 'p2', { type: 'passHost', to: 'p3' })).toThrow();
    expect(() => applyAction(aLobby(3), 'p1', { type: 'passHost', to: 'p9' })).toThrow();
  });

  it('when the Host goes offline the role passes to the next online Player', () => {
    let g = offline(aLobby(3), 'p2');
    g = offline(g, 'p1');
    expect(g.hostId).toBe('p3');
  });

  it('presence changes come only from the server', () => {
    expect(() =>
      applyAction(aLobby(2), 'p2', { type: 'presence', player: 'p1', online: false }),
    ).toThrow();
  });
});

describe('Offline Players', () => {
  it('an offline Player is marked offline in every view', () => {
    const g = offline(aGame(), 'p2');
    expect(viewFor(g, 'p1').players.find((p) => p.id === 'p2')?.online).toBe(false);
  });

  it('any Player can skip an offline Player’s Turn', () => {
    let g = offline(aGame({ players: 3 }), 'p1');
    expect(viewFor(g, 'p3').options).toContainEqual({ type: 'skipTurn' });
    g = act(g, 'p3', { type: 'skipTurn' });
    expect(g.turn?.player).toBe('p2');
  });

  it('an online Player’s Turn can’t be skipped', () => {
    expect(() => applyAction(aGame(), 'p2', { type: 'skipTurn' })).toThrow();
  });

  it('skipping mid-Clash ends the Clash too', () => {
    let g = aGame();
    g.clash = {
      player: 'p1',
      level: 'forest',
      square: 0,
      exchanges: 1,
      last: null,
      approach: null,
    };
    g = act(offline(g, 'p1'), 'p2', { type: 'skipTurn' });
    expect(g.clash).toBeNull();
  });
});

describe('The slap', () => {
  const slap = (g: GameState, by: string, at: number) => act(g, by, { type: 'slap', at });

  it('the slap always hits whoever’s Turn it is', () => {
    const res = applyAction(aGame({ players: 3 }), 'p3', { type: 'slap', at: 1000 });
    expect(res.events).toContainEqual({ type: 'slapped', by: 'p3', target: 'p1', bounced: false });
  });

  it('nobody slaps themselves', () => {
    expect(() => applyAction(aGame(), 'p1', { type: 'slap', at: 1000 })).toThrow();
  });

  it('a slap has a 1.5-second cooldown', () => {
    let g = slap(aGame(), 'p2', 1000);
    expect(() => slap(g, 'p2', 2499)).toThrow(/cooldown/);
    g = slap(g, 'p2', 2500);
    expect(player(g, 'p2').lastSlapAt).toBe(2500);
  });

  it('the Glove of Slapping halves the cooldown', () => {
    let g = withPlayer(aGame(), 'p2', (p) => (p.trinkets = ['Glove of Slapping']));
    g = slap(g, 'p2', 1000);
    expect(() => slap(g, 'p2', 1749)).toThrow(/cooldown/);
    expect(() => slap(g, 'p2', 1750)).not.toThrow();
  });

  it('the Ring of Reflection bounces a slap back half the time', () => {
    const g = withPlayer(aGame(), 'p1', (p) => (p.trinkets = ['Ring of Reflection']));
    const back = applyAction(forceRolls(g, 2), 'p2', { type: 'slap', at: 1000 });
    expect(back.events).toContainEqual({ type: 'slapped', by: 'p2', target: 'p2', bounced: true });
    const lands = applyAction(forceRolls(g, 1), 'p2', { type: 'slap', at: 1000 });
    expect(lands.events).toContainEqual({
      type: 'slapped',
      by: 'p2',
      target: 'p1',
      bounced: false,
    });
  });

  it('the slap only works while a game is being played', () => {
    expect(() => applyAction(aLobby(2), 'p2', { type: 'slap', at: 0 })).toThrow();
  });
});
