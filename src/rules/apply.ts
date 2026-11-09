import { currentPlayer, emit, findPlayer, type Ctx } from './context.ts';
import {
  HP_BASE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  SETUP_MAX_PER_STAT,
  SETUP_POINTS,
  STATS,
  TOWN,
} from './data.ts';
import { RuleError } from './errors.ts';
import { legalActions } from './legal.ts';
import { chooseHeading, endMove, roll, step, takeFeature } from './movement.ts';
import { shuffle } from './rng.ts';
import { endTurn, startTurn } from './turns.ts';
import type { Action, ActionResult, GameState, Player, PlayerId, Stats } from './types.ts';

/** Actions whose parameters are free-form, so they are checked by hand instead of against the legal list. */
const FREE_FORM = new Set<Action['type']>(['join', 'setStats']);

/** The rules engine's action seam: the next state plus the ordered list of what just happened. */
export function applyAction(state: GameState, actor: PlayerId, action: Action): ActionResult {
  const ctx: Ctx = { g: structuredClone(state), events: [] };
  if (!FREE_FORM.has(action.type)) {
    const legal = legalActions(state, actor);
    if (!legal.some((a) => sameAction(a, action)))
      throw new RuleError(refusal(state, actor, action));
  }
  handle(ctx, actor, action);
  return { state: ctx.g, events: ctx.events };
}

function sameAction(a: Action, b: Action): boolean {
  return JSON.stringify(a) === JSON.stringify(b, Object.keys(a));
}

function refusal(g: GameState, actor: PlayerId, action: Action): string {
  if (action.type === 'startGame' && actor !== g.hostId) return 'Only the Host can start the game';
  if (g.phase === 'playing' && g.turn?.player !== actor) return "It's not your Turn";
  return `You can't ${String(action.type)} right now`;
}

function handle(ctx: Ctx, actor: PlayerId, action: Action): void {
  const { g } = ctx;
  switch (action.type) {
    case 'join':
      return join(ctx, actor, action);
    case 'startGame':
      if (g.players.length < MIN_PLAYERS) {
        throw new RuleError(`A game needs at least ${MIN_PLAYERS} Players`);
      }
      return startGame(ctx);
    case 'setStats':
      return setStats(ctx, actor, action.stats);
    case 'roll':
      return roll(ctx, me(g));
    case 'step':
      return step(ctx, me(g), action.dir);
    case 'stop':
      return endMove(ctx);
    case 'takeFeature':
      return takeFeature(ctx, me(g));
    case 'chooseHeading':
      return chooseHeading(ctx, me(g), action.dir);
    case 'endTurn':
      return endTurn(ctx);
  }
}

function me(g: GameState): Player {
  return currentPlayer(g)!;
}

function join(ctx: Ctx, actor: PlayerId, action: Extract<Action, { type: 'join' }>): void {
  const { g } = ctx;
  if (g.phase !== 'lobby') throw new RuleError('The game has already started');
  if (findPlayer(g, actor)) throw new RuleError('You have already joined');
  if (g.players.length >= MAX_PLAYERS) throw new RuleError('The table is full');
  const zero: Stats = { STR: 0, DEX: 0, INT: 0, WIS: 0, CON: 0, CHA: 0 };
  g.players.push({
    id: actor,
    name: String(action.name).slice(0, 16) || 'Player',
    hero: action.hero,
    colour: action.colour,
    online: true,
    setupDone: false,
    base: zero,
    hp: HP_BASE,
    pack: { gold: 0, herbs: 0, artifacts: 0 },
    keep: 0,
    trophies: 0,
    level: 'town',
    square: TOWN.keepHall,
    heading: 'N',
    pivots: 0,
  });
  g.hostId ??= actor;
  emit(ctx, { type: 'joined', player: actor });
}

function startGame(ctx: Ctx): void {
  const { g } = ctx;
  const ids = g.players.map((p) => p.id);
  const first = shuffle(g, [...ids.keys()])[0] ?? 0;
  g.seats = [...ids.slice(first), ...ids.slice(0, first)];
  g.phase = 'setup';
  emit(ctx, { type: 'gameStarted', seats: g.seats });
}

function setStats(ctx: Ctx, actor: PlayerId, stats: Stats): void {
  const { g } = ctx;
  const p = findPlayer(g, actor);
  if (g.phase !== 'setup' || !p) throw new RuleError("You can't set up Stats right now");
  if (p.setupDone) throw new RuleError('You have already set up your Stats');
  const values = STATS.map((s) => stats?.[s]);
  if (values.some((v) => !Number.isInteger(v) || (v as number) < 0)) {
    throw new RuleError('Each Stat takes a whole number of points');
  }
  if (values.some((v) => (v as number) > SETUP_MAX_PER_STAT)) {
    throw new RuleError(`No Stat may take more than ${SETUP_MAX_PER_STAT} points`);
  }
  if (values.reduce((a, v) => (a as number) + (v as number), 0) !== SETUP_POINTS) {
    throw new RuleError(`Assign exactly ${SETUP_POINTS} points`);
  }
  p.base = Object.fromEntries(STATS.map((s) => [s, stats[s]])) as Stats;
  p.hp = HP_BASE + p.base.CON;
  p.setupDone = true;
  emit(ctx, { type: 'statsSet', player: p.id });
  if (g.players.every((x) => x.setupDone)) {
    g.phase = 'playing';
    g.round = 1;
    startTurn(ctx, 0);
  }
}
