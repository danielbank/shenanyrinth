/** The fuzz harness: whole Bot games on the real rules engine, checking invariants every Turn. */
import { applyAction, newGame, SYSTEM, viewFor } from '../../src/rules/index.ts';
import { COLOURS, HEROES } from '../../src/rules/data.ts';
import type { Action, GameState, PlayerId } from '../../src/rules/index.ts';
import { Bot, botRandom, BUILDS, buildStats } from '../../src/server/bot.ts';

export interface GameReport {
  seed: number;
  players: number;
  rounds: number;
  actions: number;
  feat: boolean;
  winners: PlayerId[];
  builds: Record<PlayerId, string>;
  scores: Record<PlayerId, number>;
}

export type Invariant = (g: GameState) => string | null;

/** Play one whole bot game. Throws with a replayable seed when an invariant breaks. */
export function playGame(
  seed: number,
  playerCount: number,
  invariants: Invariant[] = [],
): GameReport {
  const rand = botRandom(seed * 7919);
  let g = newGame({ seed });
  const bots = new Map<PlayerId, Bot>();
  const act = (actor: PlayerId, action: Action) => {
    g = applyAction(g, actor, action).state;
  };
  for (let i = 0; i < playerCount; i++) {
    const id = `p${i + 1}`;
    const build = BUILDS[Math.floor(rand() * BUILDS.length)]!;
    bots.set(id, new Bot(id, build, seed * 31 + i));
    act(id, { type: 'join', name: `Bot ${i + 1}`, hero: HEROES[i]!, colour: COLOURS[i]! });
  }
  act('p1', { type: 'startGame' });
  for (const [id, bot] of bots) {
    act(id, { type: 'setStats', stats: buildStats(bot.build) });
  }
  let actions = 0;
  let lastTurn = '';
  const check = () => {
    for (const inv of invariants) {
      const broken = inv(g);
      if (broken) throw new FuzzFailure(seed, playerCount, broken);
    }
  };
  while (g.phase === 'playing') {
    if (++actions > 20_000) throw new FuzzFailure(seed, playerCount, 'the game never ended');
    const turnKey = `${g.round}:${g.turn?.player}`;
    if (turnKey !== lastTurn) {
      check();
      lastTurn = turnKey;
    }
    if (g.response && rand() < 0.03) {
      act(SYSTEM, { type: 'closeResponse', id: g.response.id });
      continue;
    }
    const actor = [...bots.keys()].find((id) => viewFor(g, id).options.length > 0);
    if (!actor) throw new FuzzFailure(seed, playerCount, 'nobody can act');
    const view = viewFor(g, actor);
    act(actor, bots.get(actor)!.choose(view));
  }
  check();
  const final = viewFor(g, 'p1').final!;
  return {
    seed,
    players: playerCount,
    rounds: g.round,
    actions,
    feat: g.players.some((p) => p.feat),
    winners: final.winners,
    builds: Object.fromEntries([...bots].map(([id, b]) => [id, b.build.name])),
    scores: Object.fromEntries(final.scores.map((s) => [s.player, s.total])),
  };
}

export class FuzzFailure extends Error {
  constructor(seed: number, players: number, problem: string) {
    super(
      `${problem}\nReplay it with:\n\n  it('replays seed ${seed} with ${players} Players', () => {\n    playGame(${seed}, ${players}, INVARIANTS);\n  });\n`,
    );
    this.name = 'FuzzFailure';
  }
}
