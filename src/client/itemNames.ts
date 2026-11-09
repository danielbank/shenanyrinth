import { CHARMS, POTIONS, SPECIAL_GEAR } from '../rules/data.ts';
import type { ItemKind } from '../rules/index.ts';

const NAMES: Record<string, string> = Object.fromEntries(
  [...Object.entries(POTIONS), ...Object.entries(CHARMS), ...Object.entries(SPECIAL_GEAR)].map(
    ([kind, def]) => [kind, def.name],
  ),
);

export function itemName(kind: ItemKind): string {
  return NAMES[kind] ?? kind;
}

/** How many squares an aimed item needs. */
export function picksNeeded(kind: ItemKind): number {
  return kind === 'stones' ? 2 : 1;
}
