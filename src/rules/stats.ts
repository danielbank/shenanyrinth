import { HP_BASE, STATS, TOTAL_CAP } from './data.ts';
import type { Item, ItemKind, Player, Stat } from './types.ts';

/** A Stat with Gear on top of its base, capped at 7. */
export function stat(p: Player, s: Stat): number {
  return Math.min(TOTAL_CAP, p.base[s] + p.gear[s]);
}

export function maxHp(p: Player): number {
  return HP_BASE + stat(p, 'CON');
}

/** Gear lines held plus every other carried item. */
export function slotsUsed(p: Player): number {
  return STATS.filter((s) => p.gear[s] > 0).length + p.items.length;
}

export function findItem(p: Player, kind: ItemKind): Item | undefined {
  return p.items.find((it) => it.kind === kind);
}
