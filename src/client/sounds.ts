/** The spec's event-to-sound table, plus the Trinket gags. */
import type { GameEvent, PlayerView } from '../rules/index.ts';
import type { SoundName } from './audio.ts';
import type { PieceAt } from './eventQueue.ts';

export function soundsFor(
  e: GameEvent,
  view: PlayerView,
  shown: Record<string, PieceAt>,
): SoundName[] {
  const owns = (id: string, trinket: string) =>
    view.players.find((p) => p.id === id)?.trinkets.includes(trinket as never) ?? false;
  /** Someone other than `id` owns the Trombone of Sorrow. */
  const sorrow = (id: string) =>
    view.players.some((p) => p.id !== id && owns(p.id, 'Trombone of Sorrow'));
  switch (e.type) {
    case 'stepped': {
      const out: SoundName[] = [`step-${e.level}`];
      if (e.pivot) out.push('pivot');
      const passing = Object.entries(shown).some(
        ([id, at]) => id !== e.player && at.level === e.level && at.square === e.to,
      );
      if (passing && owns(e.player, 'Sack of Flatulence')) out.push('fart');
      return out;
    }
    case 'rolled':
      return e.value === 1 && sorrow(e.player) ? ['dice', 'trombone'] : ['dice'];
    case 'exchangeRolled':
    case 'shakedownRolled': {
      const ones = e.dice.some((d) => d.owner !== 'mob' && d.value === 1 && sorrow(d.owner));
      return ones ? ['dice', 'trombone'] : ['dice'];
    }
    case 'travelled':
      return e.to.level === 'dungeon' || e.from.level === 'dungeon' ? ['stairs'] : ['step-town'];
    case 'lost':
    case 'knockedOut':
      return sorrow(e.player) ? ['lost', 'trombone'] : ['lost'];
    case 'pickedUp':
      return e.token?.type === 'gold' || (e.pile?.gold ?? 0) > 0 ? ['coin'] : ['rustle'];
    case 'cacheClaimed':
      return ['coin'];
    case 'exchangeResolved':
      return e.winner === 'tie' ? ['miss'] : ['hit'];
    case 'mobKilled':
      return owns(e.player, 'Kazoo of Triumph') ? ['kill', 'kazoo'] : ['kill'];
    case 'feat':
      return ['kill'];
    case 'shakedownStarted':
      return ['shakedown'];
    case 'swayed':
    case 'meddled':
      return ['click'];
    case 'bought':
    case 'trained':
      return ['buy'];
    case 'deposited': {
      const out: SoundName[] = ['deposit'];
      if (owns(e.player, 'Lute of the Bard')) out.push('lute');
      if (e.amount >= 10 && owns(e.player, 'Party Popper')) out.push('popper');
      return out;
    }
    case 'turnStarted':
      return e.player === view.you ? ['chime'] : [];
    case 'slapped':
      return owns(e.target, 'Rubber Chicken') ? ['slap', 'squeak'] : ['slap'];
    case 'squeaked':
      return ['squeak'];
    default:
      return [];
  }
}
