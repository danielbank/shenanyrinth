import { describe, expect, it } from 'vitest';
import { applyAction, SYSTEM, viewFor } from './index.ts';
import { act, aLobby, player } from './testing.ts';
import type { Action } from './types.ts';

const brawler: Action = {
  type: 'addBot',
  bot: { id: 'b1', name: 'Brawler Bot', hero: 'rogue', colour: 'green' },
};

describe('Bots', () => {
  it('the Host adds a Bot in the Lobby, and every view shows it as a Bot', () => {
    const g = act(aLobby(1), 'p1', brawler);
    const bot = viewFor(g, 'p1').players.find((p) => p.id === 'b1');
    expect(bot).toMatchObject({ name: 'Brawler Bot', hero: 'rogue', colour: 'green', bot: true });
    expect(viewFor(g, 'p1').players.find((p) => p.id === 'p1')?.bot).toBe(false);
  });

  it('only the Host adds or removes a Bot, and only in the Lobby', () => {
    const g = act(aLobby(2), 'p1', brawler);
    expect(() => applyAction(aLobby(2), 'p2', brawler)).toThrow('Only the Host can add a Bot');
    expect(() => applyAction(g, 'p2', { type: 'removeBot', player: 'b1' })).toThrow(
      'Only the Host can remove a Bot',
    );
    expect(() => applyAction(g, 'p1', { type: 'removeBot', player: 'p2' })).toThrow(
      'Only a Bot can be removed',
    );
    const started = act(g, 'p1', { type: 'startGame' });
    expect(() => applyAction(started, 'p1', { type: 'removeBot', player: 'b1' })).toThrow(
      'The game has already started',
    );
  });

  it('the Host removes a Bot before the game starts', () => {
    let g = act(aLobby(1), 'p1', brawler);
    g = act(g, 'p1', { type: 'removeBot', player: 'b1' });
    expect(viewFor(g, 'p1').players.map((p) => p.id)).toEqual(['p1']);
  });

  it('Bots fill the table up to 6 seats', () => {
    let g = aLobby(1);
    for (let i = 1; i <= 5; i++) {
      g = act(g, 'p1', {
        type: 'addBot',
        bot: { id: `b${i}`, name: 'Bot', hero: 'bard', colour: 'red' },
      });
    }
    expect(() =>
      applyAction(g, 'p1', {
        type: 'addBot',
        bot: { id: 'b6', name: 'Bot', hero: 'bard', colour: 'red' },
      }),
    ).toThrow('The table is full');
  });

  it('one person and a Bot can start a game', () => {
    const g = act(act(aLobby(1), 'p1', brawler), 'p1', { type: 'startGame' });
    expect(g.phase).toBe('setup');
  });

  it('the Host role never passes to a Bot', () => {
    let g = act(aLobby(2), 'p1', brawler);
    expect(() => applyAction(g, 'p1', { type: 'passHost', to: 'b1' })).toThrow(
      'The Host role only passes to a person',
    );
    // b1 sits next after p1, but the role skips it for the next person online.
    g = act(aLobby(1), 'p1', brawler);
    g = act(g, 'p2', { type: 'join', name: 'Bo', hero: 'wizard', colour: 'blue' });
    g = act(g, SYSTEM, { type: 'presence', player: 'p1', online: false });
    expect(g.hostId).toBe('p2');
    expect(player(g, 'b1').online).toBe(true);
  });

  it("a Bot keeps its build's full name", () => {
    const g = act(aLobby(1), 'p1', {
      type: 'addBot',
      bot: { id: 'b1', name: 'Silver-tongue Bot 2', hero: 'bard', colour: 'blue' },
    });
    expect(viewFor(g, 'p1').players[1]!.name).toBe('Silver-tongue Bot 2');
  });
});
