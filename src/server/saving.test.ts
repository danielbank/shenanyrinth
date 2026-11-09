import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from './app.ts';
import { connect, type TestClient } from './testing.ts';

let servers: RunningServer[] = [];
const clients: TestClient[] = [];
afterEach(async () => {
  for (const c of clients.splice(0)) c.close();
  for (const s of servers.splice(0)) await s.close();
});
async function boot(saveDir: string) {
  const s = await startServer({ port: 0, saveDir });
  servers.push(s);
  return s;
}
async function player(url: string, token: string) {
  const c = await connect(url, token);
  clients.push(c);
  return c;
}

describe('Saving', () => {
  it('the game is saved to disk after every change and reloads after a restart', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'shen-save-'));
    const first = await boot(dir);
    const ann = await player(first.url, 'tok-ann');
    const bo = await player(first.url, 'tok-bo');
    await ann.act({ type: 'join', name: 'Ann', hero: 'knight', colour: 'red' });
    await bo.act({ type: 'join', name: 'Bo', hero: 'wizard', colour: 'blue' });
    await ann.act({ type: 'startGame' });
    const saved = JSON.parse(await readFile(join(dir, 'game.json'), 'utf8'));
    expect(saved.state.phase).toBe('setup');
    ann.close();
    bo.close();
    await first.close();
    servers = [];

    const second = await boot(dir);
    const again = await player(second.url, 'tok-bo');
    const view = await again.view();
    expect(view.phase).toBe('setup');
    expect(view.players.map((p) => p.name)).toEqual(['Ann', 'Bo']);
    expect(view.you).toBe(view.players[1]?.id);
  });

  it('a corrupt save starts a fresh table instead of crashing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'shen-save-'));
    await writeFile(join(dir, 'game.json'), '{not json');
    const s = await boot(dir);
    const c = await player(s.url, 'tok');
    expect((await c.view()).phase).toBe('lobby');
  });
});
