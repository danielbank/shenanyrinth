/** Errands: in the Town, using every building passed this Turn, in any order. */
import { emit, type Ctx } from './context.ts';
import {
  BASE_CAP,
  CHARMS,
  CHARM_CHARGES,
  POTIONS,
  GEAR_NAMES,
  GEAR_PRICES,
  SLOTS,
  SPECIAL_GEAR,
  STATS,
  TRAINING_PRICE,
  type Price,
} from './data.ts';
import { findItem, slotsUsed, stat } from './stats.ts';
import type { Action, Building, GameState, ItemKind, Offer, Player, Stat } from './types.ts';

interface Ware {
  name: string;
  /** The building that sells it. */
  at: Building;
  price: Price;
  /** Takes a new Slot when bought. */
  newSlot: boolean;
  /** Why it can't be bought right now, if it can't. */
  blocked?: boolean;
  give: (g: GameState, p: Player) => void;
}

/** Everything a store could sell this Player now, by item id. */
function wares(p: Player): Record<string, Ware> {
  const out: Record<string, Ware> = {};
  for (const s of STATS) {
    const tier = p.gear[s] + 1;
    out[`gear:${s}`] = {
      name: GEAR_NAMES[s][Math.min(tier, 3) - 1]!,
      at: 'blacksmith',
      price: GEAR_PRICES[tier] ?? { gold: 0 },
      newSlot: tier === 1,
      blocked: tier > 3,
      give: (_g, q) => (q.gear[s] = tier),
    };
  }
  for (const kind of Object.keys(SPECIAL_GEAR) as (keyof typeof SPECIAL_GEAR)[]) {
    out[kind] = {
      name: SPECIAL_GEAR[kind].name,
      at: 'blacksmith',
      price: SPECIAL_GEAR[kind].price,
      newSlot: true,
      blocked: !!findItem(p, kind),
      give: (g, q) => addItem(g, q, kind),
    };
  }
  for (const kind of Object.keys(POTIONS) as (keyof typeof POTIONS)[]) {
    out[kind] = {
      name: POTIONS[kind].name,
      at: 'apothecary',
      price: { gold: POTIONS[kind].gold, herbs: 1 },
      newSlot: true,
      give: (g, q) => addItem(g, q, kind),
    };
  }
  for (const kind of Object.keys(CHARMS) as (keyof typeof CHARMS)[]) {
    for (const material of ['herbs', 'artifacts'] as const) {
      out[`${kind}/${material}`] = {
        name: CHARMS[kind].name,
        at: 'arcanist',
        price: { gold: CHARMS[kind].gold, [material]: 1 },
        newSlot: true,
        give: (g, q) => addItem(g, q, kind, CHARM_CHARGES),
      };
    }
  }
  return out;
}

/** The ware key and buy action for an item id, splitting a Charm's Material off. */
function wareKey(action: { item: string; material?: string }): string {
  return action.material ? `${action.item}/${action.material}` : action.item;
}

function buyAction(key: string): Action {
  const [item, material] = key.split('/') as [string, 'herbs' | 'artifacts' | undefined];
  return material ? { type: 'buy', item, material } : { type: 'buy', item };
}

export function addItem(g: GameState, p: Player, kind: ItemKind, charges?: number): void {
  p.items.push(
    charges === undefined ? { id: g.nextItemId++, kind } : { id: g.nextItemId++, kind, charges },
  );
}

/** Haggle: 1 Gold less per 2 CHA, to a minimum of 1. */
export function haggled(p: Player, price: Price): Price {
  return { ...price, gold: Math.max(1, price.gold - Math.floor(stat(p, 'CHA') / 2)) };
}

function affordable(p: Player, price: Price): boolean {
  return (
    p.pack.gold >= price.gold &&
    p.pack.herbs >= (price.herbs ?? 0) &&
    p.pack.artifacts >= (price.artifacts ?? 0)
  );
}

function pay(p: Player, price: Price): void {
  p.pack.gold -= price.gold;
  p.pack.herbs -= price.herbs ?? 0;
  p.pack.artifacts -= price.artifacts ?? 0;
}

export function errandOptions(g: GameState, p: Player): Action[] {
  const passed = g.turn!.passed;
  const out: Action[] = [];
  if (passed.includes('keepHall')) {
    for (let amount = 1; amount <= p.pack.gold; amount++) out.push({ type: 'deposit', amount });
  }
  for (const [item, ware] of Object.entries(wares(p))) {
    if (!passed.includes(ware.at) || ware.blocked) continue;
    if (ware.newSlot && slotsUsed(p) >= SLOTS) continue;
    if (affordable(p, haggled(p, ware.price))) out.push(buyAction(item));
  }
  if (passed.includes('guild') && affordable(p, haggled(p, TRAINING_PRICE))) {
    for (const s of STATS) {
      if (!p.trained.includes(s) && p.base[s] < BASE_CAP) out.push({ type: 'train', stat: s });
    }
  }
  return out;
}

/** Deposit is one-way: Keep Gold is locked-in points. */
export function deposit(ctx: Ctx, p: Player, amount: number): void {
  p.pack.gold -= amount;
  p.keep += amount;
  p.deposited += amount;
  emit(ctx, { type: 'deposited', player: p.id, amount });
}

export function buy(ctx: Ctx, p: Player, item: string, material?: 'herbs' | 'artifacts'): void {
  const ware = wares(p)[wareKey({ item, material })]!;
  pay(p, haggled(p, ware.price));
  ware.give(ctx.g, p);
  emit(ctx, { type: 'bought', player: p.id, item, only: [p.id] });
}

/** Training: +1 to a Stat's base, once per Stat; never carried. */
export function train(ctx: Ctx, p: Player, s: Stat): void {
  pay(p, haggled(p, TRAINING_PRICE));
  p.base[s]++;
  p.trained.push(s);
  emit(ctx, { type: 'trained', player: p.id, stat: s });
}

/** The legal purchases and Training, named and priced for the view. */
export function offers(g: GameState, p: Player): Offer[] {
  const all = wares(p);
  return errandOptions(g, p).flatMap((action): Offer[] => {
    if (action.type === 'buy') {
      const ware = all[wareKey(action)]!;
      return [{ action, name: ware.name, price: haggled(p, ware.price) }];
    }
    if (action.type === 'train') {
      return [{ action, name: `Train ${action.stat}`, price: haggled(p, TRAINING_PRICE) }];
    }
    return [];
  });
}
