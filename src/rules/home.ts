/** Being sent home to the Keep: what Lost and Knocked Out both do. */
import type { Ctx } from './context.ts';
import { TOWN } from './data.ts';
import { maxHp } from './stats.ts';
import { endTurn } from './turns.ts';
import type { Player } from './types.ts';

export function sendHome(ctx: Ctx, p: Player): void {
  p.level = 'town';
  p.square = TOWN.keepHall;
  p.hp = maxHp(p);
  endTurn(ctx);
}
