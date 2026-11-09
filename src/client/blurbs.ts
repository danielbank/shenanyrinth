/** Words for inspect cards. Effects follow docs/spec.md. */
import type {
  Building,
  ItemKind,
  LevelName,
  PlayerView,
  SquareView,
  Trinket,
} from '../rules/index.ts';
import { BUILDING_NAMES } from './art/townSprites.ts';

export const ITEM_BLURBS: Record<ItemKind, string> = {
  boots: 'Boots of Second Thoughts: +1 Pivot Limit.',
  compass: 'Lodestone Compass: spend a Pivot to turn before moving, but never a U-turn.',
  tonic: 'Troll-Blood Tonic: restore full HP. Single use.',
  draught: 'Draught of Wandering: this Turn, move as in the Town, ignoring Exits. Single use.',
  teleport:
    'Scroll of Teleportation: instead of moving, teleport to any revealed square on your Level.',
  twirlwater: 'Twirlwater: +1 Pivot this Turn, even at the moment you would be Lost.',
  stoneskin: 'Stoneskin Salve: immune to Shakedowns and Rams until your next Turn.',
  knucklebone: 'Lucky Knucklebone: add 1d6 to any roll of yours. 3 Charges.',
  coin: "Trickster's Coin: Meddle: swap the values of any two dice in play. 3 Charges.",
  hush: 'Hush Rune: remove one die from a roll of 2 or more dice. 3 Charges.',
  orb: 'Orb of Foresight: reveal a 3×3 area anywhere on your Level (not Caches). 3 Charges.',
  stones:
    'Shuffling Stones: swap the path shapes of two unoccupied squares on your Level. 3 Charges.',
};

export const TRINKET_BLURBS: Record<Trinket, string> = {
  'Glove of Slapping': 'Halves your slap cooldown. 1 point.',
  'Ring of Reflection': 'Slaps aimed at you bounce back half the time. 1 point.',
  'Trombone of Sorrow': 'A sad trombone when another Player is Lost or rolls a 1. 1 point.',
  'Sack of Flatulence': 'A fart when you pass through a Player. 1 point.',
  'Kazoo of Triumph': 'A fanfare when you kill a Mob. 1 point.',
  'Rubber Chicken': 'Squeaks on demand, and when you are slapped. 1 point.',
  'Lute of the Bard': 'A jingle when you Deposit. 1 point.',
  'Party Popper': 'Confetti for everyone when you Deposit 10 or more Gold at once. 1 point.',
};

export const BUILDING_BLURBS: Record<Building, string> = {
  keepHall:
    'Keep Hall: every Player’s Keep. Deposit Gold here as locked-in points; arriving restores full HP.',
  blacksmith:
    'Blacksmith: Gear in six Stat lines, Boots of Second Thoughts and the Lodestone Compass.',
  apothecary: 'Apothecary: Potions for Gold + 1 Herb.',
  arcanist: 'Arcanist: Charms with 3 Charges, for Gold + 1 Herb or Artifact.',
  guild: "Adventurer's Guild: Training, +1 to a Stat's base once per Stat.",
};

export function shapeName(exits: string): string {
  if (exits.length === 4) return 'a Crossroads';
  if (exits.length === 3) return 'a T-junction';
  return exits === 'NS' || exits === 'EW' ? 'a Straight' : 'a Bend';
}

const DIR_NAMES: Record<string, string> = { N: 'north', E: 'east', S: 'south', W: 'west' };
const LEVEL_NAMES = { town: 'The Town', forest: 'The Forest', dungeon: 'The Dungeon' };

/** What an inspect card says about a square, from the Player's own view. */
export function describeSquare(
  view: PlayerView,
  level: LevelName,
  square: number,
): { title: string; lines: string[] } {
  if (level === 'town') return describeTown(view, square);
  const board = view.boards[level];
  const s = board.squares[square];
  const title = `${LEVEL_NAMES[level]} · square ${(square % board.size) + 1}, ${Math.floor(square / board.size) + 1}`;
  return { title, lines: s ? pathLines(level, s) : [] };
}

function describeTown(view: PlayerView, square: number): { title: string; lines: string[] } {
  const building = view.town.buildings[square];
  if (building) return { title: BUILDING_NAMES[building], lines: [BUILDING_BLURBS[building]] };
  const gate = view.town.gates[square];
  if (gate) {
    return {
      title: 'Town Gate',
      lines: [`A Gate in the ${DIR_NAMES[gate]} wall, leading to the Forest. The safe zone.`],
    };
  }
  return { title: 'The Town', lines: ['A Town square: move here freely, in any direction.'] };
}

const FEATURE_LINES: Record<string, string> = {
  gate: 'A Gate back to the Town. The safe zone.',
  stairs: 'The Stairs down to the Dungeon. The safe zone.',
  stairsUp: 'The Stairs up to the Forest. The safe zone.',
  guardian: 'The Guardian’s lair.',
};

function tokenLine(token: NonNullable<SquareView['token']>): string {
  switch (token.type) {
    case 'gold':
      return `A Gold token worth ${token.amount}.`;
    case 'herbs':
      return 'A Herb token.';
    case 'artifacts':
      return 'An Artifact token.';
    case 'cache':
      return `A Cache rated ${token.rating}: only Players with INT ${token.rating}+ can see it.`;
  }
}

function pathLines(level: LevelName, s: SquareView): string[] {
  const lines = [
    s.exits
      ? `${shapeName(s.exits)} with Exits ${[...s.exits].map((d) => DIR_NAMES[d]).join(', ')}.`
      : 'Dark: Torchlight has not reached this square yet.',
  ];
  if (!s.revealed && level === 'forest')
    lines.push('Its contents stay hidden until Torchlight reveals them.');
  if (s.feature) lines.push(FEATURE_LINES[s.feature.type] ?? '');
  if (s.token) lines.push(tokenLine(s.token));
  if (s.pile) {
    lines.push(
      `A dropped pile: ${s.pile.gold} Gold, ${s.pile.herbs} Herbs, ${s.pile.artifacts} Artifacts.`,
    );
  }
  return lines;
}
