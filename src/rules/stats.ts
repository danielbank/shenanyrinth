import { HP_BASE } from './data.ts';
import type { Player, Stat } from './types.ts';

/** A Stat with everything that adds to it. */
export function stat(p: Player, s: Stat): number {
  return p.base[s];
}

export function maxHp(p: Player): number {
  return HP_BASE + stat(p, 'CON');
}
