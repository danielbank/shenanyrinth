/**
 * Plays the Bots at the table: one decision at a time, at a pace people can follow. A decision
 * takes about a second; a step that needs no choosing takes a fifth of one.
 */
import { RuleError, type Action, type PlayerId, type PlayerView } from '../rules/index.ts';
import { buildStats } from './bot.ts';
import type { Table } from './table.ts';

export const DECISION_MS = 1000;
export const STEP_MS = 200;

/** What a Bot may do: never skip an offline person, whose phone may only be asleep. */
function choices(view: PlayerView): Action[] {
  return view.options.filter((o) => o.type !== 'skipTurn');
}

/** A step is quick when nothing is being decided: anywhere in the Town, or the only way on. */
function isQuickStep(view: PlayerView, action: Action): boolean {
  if (action.type !== 'step') return false;
  const me = view.players.find((p) => p.id === view.you);
  return me?.level === 'town' || choices(view).filter((o) => o.type === 'step').length === 1;
}

export class BotRunner {
  /** One timer per Bot, so several Bots answer a Response window at once. */
  private pending = new Map<PlayerId, unknown>();
  private stopped = false;
  /** Bots whose Stats the rules refused; they aren't retried, so the table never spins. */
  private failedSetup = new Set<PlayerId>();
  private unsubscribe: () => void;
  private table: Table;

  constructor(table: Table) {
    this.table = table;
    this.unsubscribe = table.onChange(() => this.schedule());
    this.schedule();
  }

  stop(): void {
    this.stopped = true;
    this.unsubscribe();
    for (const handle of this.pending.values()) this.table.clock.clearTimeout(handle);
    this.pending.clear();
  }

  /** Plans a move for every Bot that has one to make and isn't already waiting to act. */
  private schedule(): void {
    if (this.stopped) return;
    for (const id of this.table.bots.keys()) {
      if (this.pending.has(id)) continue;
      const next = this.next(id);
      if (!next) continue;
      const handle = this.table.clock.setTimeout(() => {
        this.pending.delete(id);
        this.play(id, next.action);
      }, next.ms);
      this.pending.set(id, handle);
    }
  }

  private next(id: PlayerId): { action: Action | null; ms: number } | null {
    const { state } = this.table;
    if (state.phase === 'setup') {
      const me = state.players.find((p) => p.id === id);
      return me && !me.setupDone && !this.failedSetup.has(id) ? { action: null, ms: 0 } : null;
    }
    if (state.phase !== 'playing') return null;
    const view = this.table.view(id);
    if (choices(view).length === 0) return null;
    const action = this.table.bots.get(id)!.choose(view);
    return { action, ms: isQuickStep(view, action) ? STEP_MS : DECISION_MS };
  }

  /** Acts as the Bot; if the table moved on since it was planned, the Bot thinks again. */
  private play(id: PlayerId, planned: Action | null): void {
    const bot = this.table.bots.get(id);
    if (!bot) return this.schedule();
    if (planned === null) {
      if (!this.attempt(id, { type: 'setStats', stats: buildStats(bot.build) })) {
        this.failedSetup.add(id);
        console.warn(`Bot ${id} could not set up its Stats`);
      }
      return this.schedule();
    }
    const view = this.table.view(id);
    const options = choices(view);
    if (options.length === 0) return this.schedule();
    if (this.attempt(id, planned)) return;
    if (this.attempt(id, bot.choose(view))) return;
    // The brain is stuck: take any legal option rather than stall the table.
    this.attempt(id, options[0]!);
    this.schedule();
  }

  private attempt(id: PlayerId, action: Action): boolean {
    if (action.type === 'skipTurn') return false;
    try {
      this.table.act(id, action);
      return true;
    } catch (err) {
      if (!(err instanceof RuleError)) console.error(err);
      return false;
    }
  }
}
