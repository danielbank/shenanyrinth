import { afterEach, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from './app.ts';
import { connect, type TestClient } from './testing.ts';

let server: RunningServer;
const clients: TestClient[] = [];
async function player(token: string) {
  const c = await connect(server.url, token);
  clients.push(c);
  return c;
}
afterEach(async () => {
  for (const c of clients.splice(0)) c.close();
  await server?.close();
});

describe('Seats', () => {
  it('a joined Player sees everyone who has joined, kept up to date', async () => {
    server = await startServer({ port: 0 });
    const ann = await player('token-ann');
    const bo = await player('token-bo');
    expect(await ann.act({ type: 'join', name: 'Ann', hero: 'knight', colour: 'red' })).toEqual({
      ok: true,
    });
    await bo.act({ type: 'join', name: 'Bo', hero: 'wizard', colour: 'blue' });
    const view = await ann.view((v) => v.players.length === 2);
    expect(view.players.map((p) => p.name)).toEqual(['Ann', 'Bo']);
    expect(view.you).not.toBeNull();
  });

  it('reconnecting with the same seat token returns the Player to their seat', async () => {
    server = await startServer({ port: 0 });
    const ann = await player('token-ann');
    await ann.act({ type: 'join', name: 'Ann', hero: 'knight', colour: 'red' });
    const before = await ann.view((v) => v.you !== null);
    ann.close();

    const again = await player('token-ann');
    const after = await again.view((v) => v.you !== null);
    expect(after.you).toBe(before.you);
    expect(after.players).toHaveLength(1);
  });

  it('an illegal action is refused with a reason', async () => {
    server = await startServer({ port: 0 });
    const ann = await player('token-ann');
    await ann.act({ type: 'join', name: 'Ann', hero: 'knight', colour: 'red' });
    const res = await ann.act({ type: 'join', name: 'Ann', hero: 'knight', colour: 'red' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/already/i);
  });
});

describe('One port', () => {
  it('serves the built client from the same port as the socket', async () => {
    const { mkdtemp, writeFile } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = await mkdtemp(join(tmpdir(), 'shen-client-'));
    await writeFile(join(dir, 'index.html'), '<title>Shenanyrinth</title>');
    server = await startServer({ port: 0, clientDir: dir });
    const html = await (await fetch(server.url)).text();
    expect(html).toContain('Shenanyrinth');
  });
});

describe('Robustness', () => {
  it('a connection without a seat token can still watch the table', async () => {
    server = await startServer({ port: 0 });
    const watcher = await player('');
    expect((await watcher.view()).you).toBeNull();
  });

  it('a malformed action is refused without crashing the server', async () => {
    server = await startServer({ port: 0 });
    const ann = await player('token-ann');
    const res = await ann.act({ type: 'nonsense' } as never);
    expect(res.ok).toBe(false);
  });
});
