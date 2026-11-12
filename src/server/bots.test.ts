import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { GameState } from '../rules/index.ts';
import {
  act,
  aGame,
  emptied,
  forceRolls,
  placed,
  revealAll,
  sq,
  withMob,
  withTiles,
} from '../rules/testing.ts';
import { startServer, type RunningServer } from './app.ts';
import { DECISION_MS, STEP_MS } from './botRunner.ts';
import { saveSnapshot } from './save.ts';
import { connect, fakeClock, type TestClient } from './testing.ts';

let server: RunningServer;
const clients: TestClient[] = [];
afterEach(async () => {
  for (const c of clients.splice(0)) c.close();
  await server?.close();
});

async function hostWithBot() {
  const time = fakeClock();
  server = await startServer({ port: 0, seed: 7, clock: time.clock });
  const ann = await connect(server.url, 'tok-ann');
  clients.push(ann);
  await ann.act({ type: 'join', name: 'Ann', hero: 'knight', colour: 'red' });
  expect(await ann.act({ type: 'addBot' })).toEqual({ ok: true });
  return { time, ann };
}

/** Ann (p1) and a Brawler Bot (p2) in the Town, with the Bot about to roll. */
async function botsTurn(edit: (g: GameState) => void = () => {}) {
  const g = aGame({ players: 2 });
  g.players[1]!.bot = true;
  g.players[1]!.name = 'Brawler Bot';
  g.turn = { ...g.turn!, player: 'p2' };
  edit(g);
  const dir = await mkdtemp(join(tmpdir(), 'shen-bots-'));
  saveSnapshot(dir, { state: g, seats: { 'tok-ann': 'p1' }, bots: { p2: 'Brawler' } });
  const time = fakeClock();
  server = await startServer({ port: 0, saveDir: dir, clock: time.clock });
  const ann = await connect(server.url, 'tok-ann');
  clients.push(ann);
  await ann.view();
  return { time, ann, dir };
}

describe('Bots at the table', () => {
  it('the Host adds a Bot named after its build, with a free hero and colour', async () => {
    const { ann } = await hostWithBot();
    const view = await ann.view((v) => v.players.length === 2);
    const bot = view.players[1]!;
    expect(bot.bot).toBe(true);
    expect(bot.online).toBe(true);
    expect(bot.name).toMatch(/^(Brawler|Wyrmslayer|Merchant|Mystic|Trickster|\w+) Bot$/);
    expect(bot.hero).not.toBe('knight');
    expect(bot.colour).not.toBe('red');
  });

  it('a person who is not the Host cannot add a Bot', async () => {
    const { ann } = await hostWithBot();
    const bo = await connect(server.url, 'tok-bo');
    clients.push(bo);
    await bo.act({ type: 'join', name: 'Bo', hero: 'wizard', colour: 'blue' });
    expect(await bo.act({ type: 'addBot' })).toMatchObject({ ok: false });
    expect((await ann.view((v) => v.players.length === 3)).players.length).toBe(3);
  });

  it("a Bot takes its build's Stats as soon as the game starts", async () => {
    const { time, ann } = await hostWithBot();
    await ann.act({ type: 'startGame' });
    await ann.view((v) => v.phase === 'setup');
    time.tick(0);
    const view = await ann.view((v) => v.players[1]?.setupDone === true);
    expect(view.players[0]!.setupDone).toBe(false);
  });

  it('a Bot takes about a second to decide, and a fifth of one per plain step', async () => {
    const { time, ann } = await botsTurn();
    time.tick(DECISION_MS - 1);
    expect(server.table.state.turn!.roll).toBeNull();
    time.tick(1);
    const rolled = await ann.view((v) => v.turn?.roll !== null);
    const left = rolled.turn!.stepsLeft;
    time.tick(STEP_MS - 1);
    expect(server.table.state.turn!.stepsLeft).toBe(left);
    time.tick(1);
    await ann.view((v) => v.turn!.stepsLeft === left - 1);
  });

  it('a Bot answers a Response window within a second, so the timer never waits on it', async () => {
    const OPEN = ['┌┬┬┬┬┬┬┬┐', ...Array.from({ length: 7 }, () => '├┼┼┼┼┼┼┼┤'), '└┴┴┴┴┴┴┴┘'];
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
    const clash = forceRolls(g, 3, 5, 1, 6);
    const { time, ann } = await botsTurn((s) => {
      Object.assign(s, clash);
      s.players[1]!.bot = true;
    });
    await ann.act({ type: 'exchange', approach: 'Fight' });
    expect(server.table.state.response?.eligible).toContain('p2');
    const before = JSON.stringify(server.table.state.response);
    time.tick(DECISION_MS);
    expect(JSON.stringify(server.table.state.response)).not.toBe(before);
  });

  it('a Bot never skips an offline person', async () => {
    const { time } = await botsTurn((g) => {
      g.turn = { ...g.turn!, player: 'p1' };
    });
    clients.splice(0).forEach((c) => c.close());
    await new Promise((r) => setTimeout(r, 50));
    expect(server.table.state.players[0]!.online).toBe(false);
    time.tick(10 * DECISION_MS);
    expect(server.table.state.turn!.player).toBe('p1');
  });

  it('Bots are saved with the game and keep playing after a reload', async () => {
    const { dir } = await botsTurn();
    await server.close();
    const again = fakeClock();
    server = await startServer({ port: 0, saveDir: dir, clock: again.clock });
    expect(server.table.state.players[1]).toMatchObject({ bot: true, online: true });
    again.tick(DECISION_MS);
    expect(server.table.state.turn!.roll).not.toBeNull();
  });

  it('the Host removes a Bot, and a full table of Bots all have different names', async () => {
    const { ann } = await hostWithBot();
    for (let i = 0; i < 4; i++) await ann.act({ type: 'addBot' });
    const full = await ann.view((v) => v.players.length === 6);
    const names = full.players.map((p) => p.name);
    expect(new Set(names).size).toBe(6);
    expect(await ann.act({ type: 'addBot' })).toMatchObject({ ok: false });
    await ann.act({ type: 'removeBot', player: full.players[1]!.id });
    await ann.view((v) => v.players.length === 5);
  });

  it('when the Host leaves, the role passes to a person, never a Bot', async () => {
    const { ann } = await hostWithBot();
    const bo = await connect(server.url, 'tok-bo');
    clients.push(bo);
    await bo.act({ type: 'join', name: 'Bo', hero: 'wizard', colour: 'blue' });
    ann.close();
    const view = await bo.view((v) => v.players.find((p) => p.name === 'Bo')?.isHost === true);
    expect(view.players.find((p) => p.bot)?.isHost).toBe(false);
  });

  it('two Bots answer the same Response window within the same second', async () => {
    const OPEN = ['┌┬┬┬┬┬┬┬┐', ...Array.from({ length: 7 }, () => '├┼┼┼┼┼┼┼┤'), '└┴┴┴┴┴┴┴┘'];
    let g = aGame({
      players: 3,
      stats: [
        { STR: 3, CON: 3 },
        { CHA: 3, CON: 3 },
        { CHA: 3, CON: 3 },
      ],
    });
    g = emptied(withTiles(g, 'forest', OPEN), 'forest');
    g = withMob(g, 'forest', sq(9, 3, 4), 'Dire Wolf');
    g = revealAll(placed(g, 'p1', 'forest', sq(9, 2, 4), 'E'), 'forest');
    g = act(forceRolls(g, 1), 'p1', { type: 'roll' });
    g = act(g, 'p1', { type: 'step', dir: 'E' });
    const clash = forceRolls(g, 3, 5, 1, 6);
    clash.players[1]!.bot = true;
    clash.players[2]!.bot = true;
    const dir = await mkdtemp(join(tmpdir(), 'shen-bots-'));
    saveSnapshot(dir, {
      state: clash,
      seats: { 'tok-ann': 'p1' },
      bots: { p2: 'Brawler', p3: 'Brawler' },
    });
    const time = fakeClock();
    server = await startServer({ port: 0, saveDir: dir, clock: time.clock });
    const ann = await connect(server.url, 'tok-ann');
    clients.push(ann);
    await ann.view();
    await ann.act({ type: 'exchange', approach: 'Fight' });
    expect(server.table.state.response!.eligible).toEqual(expect.arrayContaining(['p2', 'p3']));
    const answered = new Set<string>();
    server.table.onChange((events) => {
      for (const e of events)
        if (e.type === 'passed' || e.type === 'swayed') answered.add(e.player);
    });
    time.tick(DECISION_MS);
    expect([...answered].sort()).toEqual(['p2', 'p3']);
  });
});
