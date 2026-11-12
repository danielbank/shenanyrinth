import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from './app.ts';
import { DECISION_MS } from './botRunner.ts';
import { connect, fakeClock, type TestClient } from './testing.ts';

let servers: RunningServer[] = [];
const clients: TestClient[] = [];
afterEach(async () => {
  for (const c of clients.splice(0)) c.close();
  for (const s of servers.splice(0)) await s.close();
  servers = [];
});

async function person(url: string, token: string) {
  const c = await connect(url, token);
  clients.push(c);
  return c;
}

describe('New game', () => {
  it('clears the table for everyone, forgets the Bots, and saves the empty table', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'shen-new-'));
    const time = fakeClock();
    const server = await startServer({ port: 0, saveDir: dir, clock: time.clock });
    servers.push(server);
    const ann = await person(server.url, 'tok-ann');
    const bo = await person(server.url, 'tok-bo');
    await ann.act({ type: 'join', name: 'Ann', hero: 'knight', colour: 'red' });
    await bo.act({ type: 'join', name: 'Bo', hero: 'wizard', colour: 'blue' });
    await ann.act({ type: 'addBot' });
    await ann.act({ type: 'startGame' });
    time.tick(0);

    expect(await bo.act({ type: 'newGame' })).toMatchObject({ ok: false });
    expect(await ann.act({ type: 'newGame' })).toEqual({ ok: true });

    for (const c of [ann, bo]) {
      const v = await c.view((x) => x.players.length === 0);
      expect(v).toMatchObject({ phase: 'lobby', you: null });
    }
    expect(server.table.bots.size).toBe(0);
    time.tick(10 * DECISION_MS);
    expect(server.table.state.players).toEqual([]);
    const saved = JSON.parse(await readFile(join(dir, 'game.json'), 'utf8'));
    expect(saved.state.players).toEqual([]);

    await bo.act({ type: 'join', name: 'Bo', hero: 'wizard', colour: 'blue' });
    const after = await bo.view((x) => x.players.length === 1);
    expect(after.players[0]).toMatchObject({ name: 'Bo', isHost: true });
  });
});
