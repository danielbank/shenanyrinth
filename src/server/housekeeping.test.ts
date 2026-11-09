import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { GameState } from '../rules/index.ts';
import { aGame } from '../rules/testing.ts';
import { startServer, type Clock, type RunningServer } from './app.ts';
import { connect, type TestClient } from './testing.ts';

let server: RunningServer;
const clients: TestClient[] = [];
afterEach(async () => {
  for (const c of clients.splice(0)) c.close();
  await server?.close();
});

function manualClock() {
  let now = 10_000;
  const clock: Clock = {
    now: () => now,
    setTimeout: () => 0,
    clearTimeout: () => {},
  };
  return { clock, advance: (ms: number) => (now += ms) };
}

async function boot(state: GameState, clock?: Clock) {
  const dir = await mkdtemp(join(tmpdir(), 'shen-house-'));
  const seats = Object.fromEntries(state.players.map((p) => [`tok-${p.id}`, p.id]));
  await writeFile(join(dir, 'game.json'), JSON.stringify({ state, seats }));
  server = await startServer({ port: 0, saveDir: dir, clock });
}
async function seat(id: string) {
  const c = await connect(server.url, `tok-${id}`);
  clients.push(c);
  return c;
}

describe('Offline Players over sockets', () => {
  it('a Player with no connection is shown offline, and any Player can skip their Turn', async () => {
    await boot(aGame({ players: 3 }));
    const p2 = await seat('p2');
    await seat('p3');
    const view = await p2.view((v) => v.players.every((p) => p.online === (p.id !== 'p1')));
    expect(view.players.find((p) => p.id === 'p1')?.online).toBe(false);
    expect(view.options).toContainEqual({ type: 'skipTurn' });
    expect(await p2.act({ type: 'skipTurn' })).toEqual({ ok: true });
    expect((await p2.view((v) => v.turn?.player === 'p2')).turn?.player).toBe('p2');
  });

  it('a Player who disconnects goes offline, and comes back online on reconnect', async () => {
    await boot(aGame({ players: 2 }));
    const p1 = await seat('p1');
    const p2 = await seat('p2');
    await p2.view((v) => v.players.every((p) => p.online));
    p1.close();
    await p2.view((v) => v.players.find((p) => p.id === 'p1')?.online === false);
    await seat('p1');
    await p2.view((v) => v.players.find((p) => p.id === 'p1')?.online === true);
  });

  it('the game continues if the Host leaves: the Host role passes on', async () => {
    await boot(aGame({ players: 2 }));
    const p1 = await seat('p1');
    const p2 = await seat('p2');
    await p2.view((v) => v.players.every((p) => p.online));
    expect((await p2.view()).players.find((p) => p.isHost)?.id).toBe('p1');
    p1.close();
    const view = await p2.view((v) => v.players.find((p) => p.isHost)?.id === 'p2');
    expect(view.players.find((p) => p.isHost)?.id).toBe('p2');
  });
});

describe('The slap over sockets', () => {
  it('the server enforces the slap cooldown with its own clock', async () => {
    const time = manualClock();
    await boot(aGame({ players: 2 }), time.clock);
    await seat('p1');
    const p2 = await seat('p2');
    expect(await p2.act({ type: 'slap', at: 0 })).toEqual({ ok: true });
    expect((await p2.act({ type: 'slap', at: 999_999 })).ok).toBe(false);
    time.advance(1500);
    expect(await p2.act({ type: 'slap', at: 0 })).toEqual({ ok: true });
  });
});
