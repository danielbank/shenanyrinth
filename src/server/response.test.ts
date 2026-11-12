import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { GameState } from '../rules/index.ts';
import {
  aGame,
  act,
  emptied,
  forceRolls,
  placed,
  revealAll,
  sq,
  withMob,
  withTiles,
} from '../rules/testing.ts';
import { startServer, type RunningServer } from './app.ts';
import { connect, fakeClock, type TestClient } from './testing.ts';

let server: RunningServer;
const clients: TestClient[] = [];
afterEach(async () => {
  for (const c of clients.splice(0)) c.close();
  await server?.close();
});

const OPEN = ['┌┬┬┬┬┬┬┬┐', ...Array.from({ length: 7 }, () => '├┼┼┼┼┼┼┼┤'), '└┴┴┴┴┴┴┴┘'];

/** p1 has Ambushed a Dire Wolf and is about to roll an Exchange; p2 has Sway. */
function aboutToClash(): GameState {
  let g = aGame({
    players: 2,
    stats: [
      { STR: 3, CON: 3 },
      { CHA: 3, CON: 3 },
    ],
  });
  g = emptied(withTiles(g, 'forest', OPEN), 'forest');
  g = withMob(g, 'forest', sq(9, 3, 4), 'Dire Wolf');
  g = revealAll(placed(g, 'p1', 'forest', sq(9, 2, 4), 'E'), 'forest');
  g = act(forceRolls(g, 1), 'p1', { type: 'roll' });
  g = act(g, 'p1', { type: 'step', dir: 'E' });
  return forceRolls(g, 3, 5, 1, 6);
}

async function boot(state: GameState, tick: ReturnType<typeof fakeClock>) {
  const dir = await mkdtemp(join(tmpdir(), 'shen-resp-'));
  await writeFile(
    join(dir, 'game.json'),
    JSON.stringify({ state, seats: { 'tok-1': 'p1', 'tok-2': 'p2' } }),
  );
  server = await startServer({ port: 0, saveDir: dir, clock: tick.clock });
  const p1 = await connect(server.url, 'tok-1');
  const p2 = await connect(server.url, 'tok-2');
  clients.push(p1, p2);
  return { p1, p2 };
}

describe('The Response window timer', () => {
  it('the window closes 8 seconds after the server opens it', async () => {
    const time = fakeClock();
    const { p1, p2 } = await boot(aboutToClash(), time);
    await p1.act({ type: 'exchange', approach: 'Fight' });
    const open = await p2.view((v) => v.response !== null);
    expect(open.responseMsLeft).toBe(8000);
    time.tick(7999);
    expect(server.table.state.response).not.toBeNull();
    time.tick(1);
    const closed = await p2.view((v) => v.response === null);
    expect(closed.clash?.last?.winner).toBe('player');
  });

  it('closing early cancels the timer', async () => {
    const time = fakeClock();
    const { p1, p2 } = await boot(aboutToClash(), time);
    await p1.act({ type: 'exchange', approach: 'Fight' });
    await p2.view((v) => v.response !== null);
    await p2.act({ type: 'pass' });
    await p1.view((v) => v.response === null && (v.clash?.exchanges ?? 0) === 1);
    await p1.act({ type: 'exchange', approach: 'Fight' });
    await p2.view((v) => v.response !== null);
    time.tick(8000);
    await p2.view((v) => v.response === null);
    expect(server.table.state.clash?.exchanges).toBe(2);
  });

  it('a Player with auto-pass on is not prompted, so no window opens for them', async () => {
    const time = fakeClock();
    const { p1, p2 } = await boot(aboutToClash(), time);
    expect(await p2.act({ type: 'setAutoPass', on: true })).toEqual({ ok: true });
    await p1.act({ type: 'exchange', approach: 'Fight' });
    const view = await p1.view((v) => v.clash?.last !== null && v.clash?.last !== undefined);
    expect(view.response).toBeNull();
  });
});

describe('Reloading with a window open', () => {
  it('the timer starts again when a saved game reloads mid-window', async () => {
    let g = aboutToClash();
    g = act(g, 'p1', { type: 'exchange', approach: 'Fight' });
    expect(g.response).not.toBeNull();
    const time = fakeClock();
    const { p2 } = await boot(g, time);
    time.tick(8000);
    const closed = await p2.view((v) => v.response === null);
    expect(closed.clash?.last).not.toBeNull();
  });
});
