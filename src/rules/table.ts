/** Table housekeeping: the Host role, who is online, skipping Turns, and the slap. */
import { emit, findPlayer, type Ctx } from './context.ts';
import { SLAP_COOLDOWN_MS } from './data.ts';
import { RuleError } from './errors.ts';
import { die } from './rng.ts';
import { endTurn } from './turns.ts';
import type { PlayerId } from './types.ts';

export function passHost(ctx: Ctx, actor: PlayerId, to: PlayerId): void {
  const { g } = ctx;
  if (actor !== g.hostId) throw new RuleError('Only the Host can pass the Host role');
  if (!findPlayer(g, to)) throw new RuleError('Pass the Host role to a Player at the table');
  g.hostId = to;
  emit(ctx, { type: 'hostPassed', to });
}

/** The server reports connections; the game survives the Host leaving. */
export function presence(ctx: Ctx, id: PlayerId, online: boolean): void {
  const { g } = ctx;
  const p = findPlayer(g, id);
  if (!p || p.online === online) return;
  p.online = online;
  emit(ctx, { type: 'presence', player: id, online });
  if (!online && g.hostId === id) {
    const seat = g.players.indexOf(p);
    const next = [...g.players.slice(seat + 1), ...g.players.slice(0, seat)].find((q) => q.online);
    if (next) {
      g.hostId = next.id;
      emit(ctx, { type: 'hostPassed', to: next.id });
    }
  }
}

/** Any Player can skip an offline Player's Turn. */
export function skipTurn(ctx: Ctx, actor: PlayerId): void {
  const { g } = ctx;
  const current = g.turn ? findPlayer(g, g.turn.player) : undefined;
  if (g.phase !== 'playing' || !current || current.online || !findPlayer(g, actor)) {
    throw new RuleError('Only an offline Player’s Turn can be skipped');
  }
  g.clash = null;
  g.shakedown = null;
  g.response = null;
  g.discarding = null;
  emit(ctx, { type: 'turnSkipped', player: current.id, by: actor });
  endTurn(ctx);
}

/** The slap always hits whoever's Turn it is, with a server cooldown. */
export function slap(ctx: Ctx, actor: PlayerId, at: number): void {
  const { g } = ctx;
  const p = findPlayer(g, actor);
  const target = g.turn ? findPlayer(g, g.turn.player) : undefined;
  if (g.phase !== 'playing' || !p || !target) throw new RuleError('Nobody to slap right now');
  if (target.id === p.id) throw new RuleError("You can't slap yourself");
  const cooldown = SLAP_COOLDOWN_MS / (p.trinkets.includes('Glove of Slapping') ? 2 : 1);
  if (p.lastSlapAt !== null && at - p.lastSlapAt < cooldown) {
    throw new RuleError('Your slap is on cooldown');
  }
  p.lastSlapAt = at;
  const bounced = target.trinkets.includes('Ring of Reflection') && die(g, 2) === 2;
  emit(ctx, { type: 'slapped', by: p.id, target: bounced ? p.id : target.id, bounced });
}
