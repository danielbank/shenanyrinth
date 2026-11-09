/** Errands: in the Town, using every building passed this Turn, in any order. */
import { emit, type Ctx } from './context.ts';
import type { Action, GameState, Player } from './types.ts';

export function errandOptions(g: GameState, p: Player): Action[] {
  const passed = g.turn!.passed;
  const out: Action[] = [];
  if (passed.includes('keepHall')) {
    for (let amount = 1; amount <= p.pack.gold; amount++) out.push({ type: 'deposit', amount });
  }
  return out;
}

/** Deposit is one-way: Keep Gold is locked-in points. */
export function deposit(ctx: Ctx, p: Player, amount: number): void {
  p.pack.gold -= amount;
  p.keep += amount;
  emit(ctx, { type: 'deposited', player: p.id, amount });
}
