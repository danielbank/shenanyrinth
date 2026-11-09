/** Loot: what a kill, a Cache or a Guardian Wound may drop, from the d20 table. */
import { emit, type Ctx } from './context.ts';
import { CHARMS, CHARM_CHARGES, POTIONS, SLOTS, STATS, TRINKETS } from './data.ts';
import { addItem } from './errands.ts';
import { RuleError } from './errors.ts';
import { die, rnd } from './rng.ts';
import { slotsUsed } from './stats.ts';
import type { Action, GameState, ItemKind, Player, Stat, Trinket } from './types.ts';

function pickFrom<T>(g: GameState, items: readonly T[]): T {
  return items[Math.floor(rnd(g) * items.length)]!;
}

/** Roll the d20 and give the Player what it shows. */
export function dropLoot(ctx: Ctx, p: Player): void {
  const { g } = ctx;
  const d20 = die(g, 20);
  const private_ = (loot: string) =>
    emit(ctx, { type: 'looted', player: p.id, loot, only: [p.id] });
  const herbs = () => {
    p.pack.herbs += 2;
    private_('2 Herbs');
  };
  if (d20 <= 6) return herbs();
  if (d20 <= 10) {
    p.pack.artifacts += 1;
    return private_('1 Artifact');
  }
  if (d20 <= 14) {
    const kind = pickFrom(g, Object.keys(POTIONS) as ItemKind[]);
    addItem(g, p, kind);
    private_(kind);
  } else if (d20 <= 17) {
    const kind = pickFrom(g, Object.keys(CHARMS) as ItemKind[]);
    addItem(g, p, kind, CHARM_CHARGES);
    private_(kind);
  } else if (d20 <= 19) {
    const taken = new Set(g.players.flatMap((q) => q.trinkets));
    const left = TRINKETS.filter((t) => !taken.has(t));
    if (left.length === 0) return herbs();
    const trinket: Trinket = pickFrom(g, left);
    p.trinkets.push(trinket);
    emit(ctx, { type: 'trinketFound', player: p.id, trinket });
    return;
  } else {
    const lines = STATS.filter((s) => p.gear[s] === 0);
    if (lines.length === 0) return herbs();
    const line = pickFrom(g, lines);
    p.gear[line] = 1;
    private_(`gear:${line}`);
  }
  if (slotsUsed(p) > SLOTS) g.discarding = p.id;
}

/** Over 5 Slots: the Player chooses any carried item or Gear line to discard. */
export function discardOptions(g: GameState, p: Player): Action[] {
  return [
    ...p.items.map((it) => ({ type: 'discard' as const, item: it.id })),
    ...STATS.filter((s) => p.gear[s] > 0).map((s) => ({ type: 'discard' as const, gear: s })),
  ];
}

export function discard(ctx: Ctx, p: Player, action: { item?: number; gear?: Stat }): void {
  const { g } = ctx;
  if (g.discarding !== p.id) throw new RuleError('You have nothing to discard');
  if (action.item !== undefined && p.items.some((it) => it.id === action.item)) {
    p.items = p.items.filter((it) => it.id !== action.item);
  } else if (action.gear !== undefined && p.gear[action.gear] > 0) {
    p.gear[action.gear] = 0;
  } else {
    throw new RuleError('Choose something you carry');
  }
  emit(ctx, { type: 'discarded', player: p.id });
  if (slotsUsed(p) <= SLOTS) g.discarding = null;
}
