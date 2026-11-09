/**
 * Bots ported from the Balance simulation's builds and goals. They play the real rules engine
 * through its two seams only: each looks at its own view and picks one of its legal options.
 */
import { applyAction, SYSTEM, viewFor } from '../../src/rules/index.ts';
import { APPROACH_STAT, COLOURS, HEROES, STATS } from '../../src/rules/data.ts';
import type {
  Action,
  Approach,
  Dir,
  GameState,
  LevelName,
  PlayerId,
  PlayerView,
  Stats,
} from '../../src/rules/index.ts';
import { newGame } from '../../src/rules/index.ts';

export interface Build {
  name: string;
  stats: Partial<Stats>;
  shop: string[];
  bankAt: number;
  aggression: number;
}

/** The Balance simulation's builds. */
export const BUILDS: Build[] = [
  {
    name: 'Brawler',
    stats: { STR: 3, CON: 2, DEX: 1 },
    shop: ['gear:STR', 'tonic', 'gear:STR', 'gear:CON'],
    bankAt: 10,
    aggression: 1.5,
  },
  {
    name: 'Wyrmslayer',
    stats: { DEX: 3, WIS: 3 },
    shop: ['gear:DEX', 'gear:WIS', 'tonic', 'knucklebone', 'gear:DEX'],
    bankAt: 10,
    aggression: 0.5,
  },
  {
    name: 'Cache-hunter',
    stats: { INT: 3, DEX: 2, WIS: 1 },
    shop: ['gear:INT', 'orb', 'gear:INT', 'tonic'],
    bankAt: 12,
    aggression: 0.5,
  },
  {
    name: 'Silver-tongue',
    stats: { CHA: 3, DEX: 2, CON: 1 },
    shop: ['gear:CHA', 'gear:DEX', 'coin', 'tonic'],
    bankAt: 10,
    aggression: 1,
  },
  {
    name: 'Pathfinder',
    stats: { DEX: 3, CON: 2, WIS: 1 },
    shop: ['boots', 'gear:DEX', 'twirlwater', 'tonic'],
    bankAt: 10,
    aggression: 0.8,
  },
  {
    name: 'Tank',
    stats: { CON: 3, STR: 2, DEX: 1 },
    shop: ['gear:CON', 'gear:STR', 'tonic', 'stoneskin'],
    bankAt: 10,
    aggression: 1,
  },
  {
    name: 'Balanced',
    stats: { STR: 1, DEX: 1, INT: 1, WIS: 1, CON: 1, CHA: 1 },
    shop: ['gear:DEX', 'tonic', 'boots', 'hush'],
    bankAt: 10,
    aggression: 0.8,
  },
];

const DELTA: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

/** Where each kind of purchase is sold in the Town. */
const SHOP_SQUARE: Record<string, number> = {
  gear: 7,
  boots: 7,
  compass: 7,
  tonic: 13,
  draught: 13,
  teleport: 13,
  twirlwater: 13,
  stoneskin: 13,
  knucklebone: 17,
  coin: 17,
  hush: 17,
  orb: 17,
  stones: 17,
};

/** A small seeded generator for the bots' own choices, separate from the game's. */
function botRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Goal {
  level: LevelName;
  square: number;
}

/** Steps from every square to `target` over the Exits a bot can see (hidden Tiles count as Crossroads). */
function distances(view: PlayerView, level: LevelName, target: number): number[] {
  const size = level === 'town' ? view.town.size : view.boards[level].size;
  const exitsAt = (i: number) =>
    level === 'town' ? 'NESW' : (view.boards[level].squares[i]?.exits ?? 'NESW');
  const dist = Array.from({ length: size * size }, () => Infinity);
  dist[target] = 0;
  const queue = [target];
  for (let h = 0; h < queue.length; h++) {
    const j = queue[h]!;
    for (const d of ['N', 'E', 'S', 'W'] as Dir[]) {
      const [dx, dy] = DELTA[d];
      const x = (j % size) - dx;
      const y = Math.floor(j / size) - dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const i = y * size + x;
      if (dist[i] !== Infinity || !exitsAt(i).includes(d)) continue;
      dist[i] = dist[j]! + 1;
      queue.push(i);
    }
  }
  return dist;
}

function featureSquare(view: PlayerView, level: 'forest' | 'dungeon', type: string): number | null {
  const i = view.boards[level].squares.findIndex((s) => s.feature?.type === type);
  return i >= 0 ? i : null;
}

export class Bot {
  id: PlayerId;
  build: Build;
  rand: () => number;
  constructor(id: PlayerId, build: Build, seed: number) {
    this.id = id;
    this.build = build;
    this.rand = botRandom(seed);
  }

  /** Where this bot wants to be next. */
  goal(view: PlayerView): Goal {
    const me = view.players.find((p) => p.id === this.id)!;
    const mine = view.me!;
    const wantsTown =
      mine.pack.gold >= this.build.bankAt ||
      (mine.pack.gold >= 6 &&
        view.offers.length === 0 &&
        me.level !== 'town' &&
        this.rand() < 0.02);
    const gear = STATS.filter((s) => (view.me?.gear[s] ?? 0) > 0).length;
    const strong = gear >= 2 || view.round >= view.doomLimit / 3;
    if (me.level === 'town') {
      const wanted = this.build.shop.find((item) => !this.owns(view, item));
      const shop = wanted ? SHOP_SQUARE[wanted.split(':')[0]!] : undefined;
      if (shop !== undefined && mine.pack.gold >= 5 && view.turn?.phase !== 'after') {
        return { level: 'town', square: shop };
      }
      if (mine.pack.gold > 5) return { level: 'town', square: 12 };
      return { level: 'town', square: [2, 10, 14, 22][Math.floor(this.rand() * 4)]! };
    }
    if (wantsTown) {
      const gates = view.boards.forest.squares.flatMap((s, i) =>
        s.feature?.type === 'gate' ? [i] : [],
      );
      if (me.level === 'forest') return { level: 'forest', square: gates[0] ?? 0 };
      return { level: 'dungeon', square: featureSquare(view, 'dungeon', 'stairsUp') ?? 0 };
    }
    if (me.level === 'forest') {
      const stairs = featureSquare(view, 'forest', 'stairs');
      if (strong && stairs !== null) return { level: 'forest', square: stairs };
      const tokens = view.boards.forest.squares.flatMap((s, i) => (s.token || s.pile ? [i] : []));
      return { level: 'forest', square: tokens[0] ?? 40 };
    }
    const wyrm = view.boards.dungeon.squares.findIndex((s) => s.mob?.kind === 'Red Wyrm');
    if (wyrm >= 0 && me.hp >= me.maxHp - 1) return { level: 'dungeon', square: wyrm };
    const tokens = view.boards.dungeon.squares.flatMap((s, i) => (s.token || s.pile ? [i] : []));
    return { level: 'dungeon', square: tokens[0] ?? 24 };
  }

  choose(view: PlayerView): Action {
    const options = view.options;
    const pick = <T extends Action['type']>(type: T) =>
      options.filter((o): o is Extract<Action, { type: T }> => o.type === type);
    const me = view.players.find((p) => p.id === this.id)!;

    if (pick('resist').length) return this.rand() < 0.7 ? { type: 'resist' } : { type: 'allow' };
    if (view.response) return this.respond(view);
    if (pick('discard').length) return pick('discard')[0]!;
    if (pick('defend').length) return { type: 'defend', approach: this.bestDuel(view) };
    if (pick('skipTurn').length) return { type: 'skipTurn' };
    if (pick('chooseHeading').length) {
      const goal = this.goal(view);
      return this.bestStep(view, pick('chooseHeading'), goal) ?? pick('chooseHeading')[0]!;
    }
    if (pick('acceptLost').length) return pick('use')[0] ?? { type: 'acceptLost' };
    if (pick('exchange').length) return this.clash(view);
    if (pick('resumeClash').length)
      return me.hp > 2 ? { type: 'resumeClash' } : { type: 'moveAway' };

    const tonic = pick('use').find(
      (o) => view.me?.items.find((i) => i.id === o.item)?.kind === 'tonic',
    );
    if (tonic && me.hp <= me.maxHp / 2) return tonic;

    if (pick('roll').length) return { type: 'roll' };

    for (const wanted of this.build.shop) {
      const offer = view.offers.find((o) => o.action.type === 'buy' && o.action.item === wanted);
      if (offer && this.rand() < 0.9) return offer.action;
    }
    const train = view.offers.find((o) => o.action.type === 'train');
    if (train && this.rand() < 0.5) return train.action;
    const deposits = pick('deposit');
    if (deposits.length) {
      // Keep some Gold for the next shopping trip early on; bank everything late.
      const late = view.round > view.doomLimit * 0.6;
      const keepBack = late ? 0 : 5;
      const amount = (view.me?.pack.gold ?? 0) - keepBack;
      const deposit = deposits.find((d) => d.amount === amount);
      if (deposit) return deposit;
    }

    const ram = pick('ram');
    if (ram.length && this.rand() < 0.3 * this.build.aggression) return ram[0]!;
    const shake = pick('shakedown');
    if (shake.length && this.rand() < 0.5 * this.build.aggression) {
      return { ...shake[0]!, approach: this.bestDuel(view) };
    }

    if (pick('takeFeature').length && this.wantsFeature(view)) return { type: 'takeFeature' };
    const steps = pick('step');
    if (steps.length) {
      const goal = this.goal(view);
      if (pick('stop').length && me.level === goal.level && me.square === goal.square) {
        return { type: 'stop' };
      }
      return this.bestStep(view, steps, goal) ?? steps[0]!;
    }
    if (pick('stop').length) return { type: 'stop' };
    if (pick('endTurn').length) return { type: 'endTurn' };
    return options[Math.floor(this.rand() * options.length)]!;
  }

  private owns(view: PlayerView, item: string): boolean {
    const [kind, line] = item.split(':');
    if (kind === 'gear') return (view.me?.gear[line as keyof Stats] ?? 0) > 0;
    return view.me?.items.some((i) => i.kind === kind) ?? false;
  }

  private wantsFeature(view: PlayerView): boolean {
    const me = view.players.find((p) => p.id === this.id)!;
    const goal = this.goal(view);
    if (me.level === 'town') return true;
    return goal.square === me.square;
  }

  /** Free steps toward the goal first; Pivots only when they help. */
  private bestStep(view: PlayerView, steps: { dir: Dir }[], goal: Goal): Action | null {
    const me = view.players.find((p) => p.id === this.id)!;
    if (goal.level !== me.level) return null;
    const dist = distances(view, me.level, goal.square);
    const size = me.level === 'town' ? view.town.size : view.boards[me.level].size;
    let best: { score: number; dir: Dir } | null = null;
    for (const s of steps) {
      const [dx, dy] = DELTA[s.dir];
      const to = (Math.floor(me.square / size) + dy) * size + (me.square % size) + dx;
      const pivot = view.moves.find((m) => m.dir === s.dir)?.pivot ? 1.5 : 0;
      const score = (dist[to] ?? 99) + pivot + this.rand() * 0.5;
      if (!best || score < best.score) best = { score, dir: s.dir };
    }
    if (!best) return null;
    const action = (steps as Action[]).find((s) => 'dir' in s && s.dir === best.dir);
    return action ?? null;
  }

  private clash(view: PlayerView): Action {
    const me = view.players.find((p) => p.id === this.id)!;
    const clash = view.clash!;
    const mob = view.boards[clash.level].squares[clash.square]?.mob;
    const canRetreat = view.options.some((o) => o.type === 'retreat');
    if (canRetreat && mob && me.hp <= mob.damage) return { type: 'retreat' };
    let best: Approach = 'Fight';
    let bestEdge = -Infinity;
    for (const a of ['Fight', 'Magic', 'Trickery'] as Approach[]) {
      const bonus = me.stats[APPROACH_STAT[a]] + (mob?.kind === 'Red Wyrm' ? me.stats.WIS : 0);
      const edge = 3.5 + bonus - ((mob?.dice[a] ?? 6) + 1) / 2;
      if (edge > bestEdge) {
        bestEdge = edge;
        best = a;
      }
    }
    return { type: 'exchange', approach: best };
  }

  private bestDuel(view: PlayerView): Approach {
    const me = view.players.find((p) => p.id === this.id)!;
    return (['Fight', 'Magic', 'Trickery'] as Approach[]).reduce((a, b) =>
      me.stats[APPROACH_STAT[b]] > me.stats[APPROACH_STAT[a]] ? b : a,
    );
  }

  /** In a Response window: nudge your own side up or the other side down, or pass. */
  private respond(view: PlayerView): Action {
    const w = view.response!;
    const options = view.options;
    const mineSide = w.sides.findIndex((s) => s.owner === this.id);
    if (mineSide >= 0) {
      const knuckle = options.find((o) => o.type === 'use');
      if (knuckle && this.rand() < 0.5) return knuckle;
      const up = options.find(
        (o) =>
          o.type === 'sway' &&
          o.delta === 1 &&
          w.dice.find((d) => d.id === o.die)?.owner === this.id,
      );
      if (up && this.rand() < 0.6) return up;
    } else if (this.rand() < 0.2) {
      const sway = options.find((o) => o.type === 'sway');
      if (sway) return sway;
    }
    return { type: 'pass' };
  }
}

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
    const stats: Stats = { STR: 0, DEX: 0, INT: 0, WIS: 0, CON: 0, CHA: 0, ...bot.build.stats };
    act(id, { type: 'setStats', stats });
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
