/** Every type in the rules engine. Vocabulary follows GLOSSARY.md. */
import type { ApproachName, COLOURS, HEROES, STATS } from './data.ts';

export type PlayerId = string;
export type Hero = (typeof HEROES)[number];
export type Colour = (typeof COLOURS)[number];
export type Stat = (typeof STATS)[number];
export type Stats = Record<Stat, number>;

export type Dir = 'N' | 'E' | 'S' | 'W';
export type LevelName = 'town' | 'forest' | 'dungeon';
export type Building = 'keepHall' | 'blacksmith' | 'apothecary' | 'arcanist' | 'guild';

export interface Pack {
  gold: number;
  herbs: number;
  artifacts: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  hero: Hero;
  colour: Colour;
  online: boolean;
  setupDone: boolean;
  /** Setup points plus Training (0–5). */
  base: Stats;
  /** Gear tier held in each Stat line (0 = none). */
  gear: Stats;
  /** Stats already Trained this game. */
  trained: Stat[];
  /** Carried items other than tiered Gear. */
  items: Item[];
  hp: number;
  pack: Pack;
  keep: number;
  trophies: number;
  /** Landed the Guardian's final Wound. */
  feat: boolean;
  level: LevelName;
  square: number;
  heading: Dir;
  pivots: number;
}

/** A fixed thing on a square; it stays put when Tiles are swapped. */
export type Feature =
  { type: 'gate'; side: Dir } | { type: 'stairs' } | { type: 'stairsUp' } | { type: 'guardian' };

export type Token = { type: 'gold'; amount: number } | { type: 'herbs' } | { type: 'artifacts' };

export type Approach = ApproachName;

export interface MobState {
  kind: string;
  wounds: number;
}

export interface Board {
  size: number;
  /** Each square's Exits, in N E S W order, e.g. 'NS'. */
  tiles: string[];
  /** Squares revealed by Torchlight, permanently and for everyone. */
  revealed: boolean[];
  features: Record<number, Feature>;
  tokens: Record<number, Token>;
  mobs: Record<number, MobState>;
  /** What Lost and Knocked Out Players dropped. */
  piles: Record<number, Pack>;
}

export type PathLevel = 'forest' | 'dungeon';

export type ItemKind =
  'boots' | 'compass' | 'tonic' | 'draught' | 'teleport' | 'twirlwater' | 'orb' | 'stones';

export interface Item {
  id: number;
  kind: ItemKind;
  /** Charges left, for Charms. */
  charges?: number;
}

export type Phase = 'lobby' | 'setup' | 'playing' | 'over';
export type TurnPhase = 'start' | 'prepare' | 'move' | 'after';

/** One die on the table in a Clash or Shakedown, face-up for everyone. */
export interface DieInPlay {
  id: number;
  /** The Player whose side it counts for, or 'mob'. */
  owner: PlayerId | 'mob';
  faces: number;
  value: number;
}

export interface ExchangeResult {
  approach: Approach;
  dice: DieInPlay[];
  bonus: [number, number];
  totals: [number, number];
  winner: 'player' | 'mob' | 'tie';
}

export interface Clash {
  player: PlayerId;
  level: PathLevel;
  square: number;
  exchanges: number;
  /** The latest Exchange, face-up for everyone. */
  last: ExchangeResult | null;
}

export interface Turn {
  player: PlayerId;
  phase: TurnPhase;
  roll: number | null;
  stepsLeft: number;
  /** The optional DEX square still to come (path Levels). */
  dexLeft: number;
  /** Moving freely, as in the Town: any direction, up to the steps left. */
  free: boolean;
  /** Standing on a Gate or Stairs that this move crossed, so it may be taken. */
  onFeature: boolean;
  /** Just arrived on a path Level: the Player chooses a Heading. */
  choosingHeading: boolean;
  /** Town buildings passed this Turn, for Errands. */
  passed: Building[];
  /** A Draught of Wandering is active: this Turn's move is free, as in the Town. */
  wander: boolean;
  /** About to be Lost, with a Twirlwater in hand. */
  stuck: boolean;
}

export interface GameState {
  rng: number;
  /** Die results queued by tests; each die drawn takes the next one. */
  forced: number[];
  phase: Phase;
  players: Player[];
  hostId: PlayerId | null;
  /** Player ids in Turn order. */
  seats: PlayerId[];
  round: number;
  turn: Turn | null;
  boards: Record<PathLevel, Board>;
  clash: Clash | null;
  nextItemId: number;
  /** The feat was performed: the game ends after this Round. */
  endTriggered: boolean;
}

export type Action =
  | { type: 'join'; name: string; hero: Hero; colour: Colour }
  | { type: 'startGame' }
  | { type: 'setStats'; stats: Stats }
  | { type: 'roll' }
  | { type: 'step'; dir: Dir }
  | { type: 'stop' }
  | { type: 'takeFeature' }
  | { type: 'chooseHeading'; dir: Dir }
  | { type: 'deposit'; amount: number }
  | { type: 'buy'; item: string; material?: 'herbs' | 'artifacts' }
  | { type: 'train'; stat: Stat }
  | { type: 'compass'; dir: Dir }
  | {
      type: 'use';
      item: number;
      /** Teleport destination, or the Orb's centre. */
      square?: number;
      /** Shuffling Stones: the two squares, and quarter turns for the Tile landing on each. */
      a?: number;
      b?: number;
      turnA?: number;
      turnB?: number;
    }
  | { type: 'acceptLost' }
  | { type: 'exchange'; approach: Approach }
  | { type: 'retreat' }
  | { type: 'resumeClash' }
  | { type: 'moveAway' }
  | { type: 'endTurn' };

interface Base {
  /** Only these Players see the event; everyone does when absent. */
  only?: PlayerId[];
}
export type GameEvent = Base &
  (
    | { type: 'joined'; player: PlayerId }
    | { type: 'gameStarted'; seats: PlayerId[] }
    | { type: 'statsSet'; player: PlayerId }
    | { type: 'turnStarted'; player: PlayerId; round: number }
    | { type: 'rolled'; player: PlayerId; value: number; steps: number }
    | {
        type: 'stepped';
        player: PlayerId;
        level: LevelName;
        from: number;
        to: number;
        dir: Dir;
      }
    | {
        type: 'travelled';
        player: PlayerId;
        from: { level: LevelName; square: number };
        to: { level: LevelName; square: number };
      }
    | { type: 'headingChosen'; player: PlayerId; dir: Dir }
    | { type: 'lost'; player: PlayerId; level: LevelName; square: number }
    | { type: 'sentHome'; player: PlayerId }
    | { type: 'dropped'; player: PlayerId; level: LevelName; square: number; pile: Pack }
    | {
        type: 'pickedUp';
        player: PlayerId;
        level: PathLevel;
        square: number;
        token: Token | null;
        pile: Pack | null;
      }
    | { type: 'deposited'; player: PlayerId; amount: number }
    | { type: 'bought'; player: PlayerId; item: string }
    | { type: 'trained'; player: PlayerId; stat: Stat }
    | { type: 'compassTurned'; player: PlayerId; dir: Dir }
    | { type: 'used'; player: PlayerId; kind: ItemKind; square?: number; a?: number; b?: number }
    | { type: 'teleported'; player: PlayerId; level: LevelName; from: number; to: number }
    | { type: 'crumbled'; player: PlayerId; kind: ItemKind }
    | { type: 'healed'; player: PlayerId; hp: number }
    | { type: 'ambushed'; player: PlayerId; level: PathLevel; square: number; mob: string }
    | {
        type: 'exchangeRolled';
        player: PlayerId;
        approach: Approach;
        mob: string;
        dice: DieInPlay[];
        /** Stat bonuses: the Player's, then the Mob's. */
        bonus: [number, number];
      }
    | {
        type: 'exchangeResolved';
        player: PlayerId;
        winner: 'player' | 'mob' | 'tie';
        totals: [number, number];
        mobWounds: number;
        hp: number;
      }
    | { type: 'mobKilled'; player: PlayerId; mob: string; trophies: number; gold: number }
    | { type: 'retreated'; player: PlayerId }
    | { type: 'guardianWounded'; player: PlayerId; trophies: number }
    | { type: 'feat'; player: PlayerId; bonus: number }
    | { type: 'knockedOut'; player: PlayerId; level: LevelName; square: number }
    | { type: 'turnEnded'; player: PlayerId }
    | { type: 'roundEnded'; round: number }
    | { type: 'gameOver'; winners: PlayerId[] }
  );

export interface Score {
  player: PlayerId;
  keep: number;
  pack: number;
  total: number;
}

export interface PublicPlayer {
  id: PlayerId;
  name: string;
  hero: Hero;
  colour: Colour;
  online: boolean;
  isHost: boolean;
  setupDone: boolean;
  level: LevelName;
  square: number;
  heading: Dir;
  hp: number;
  maxHp: number;
  stats: Stats;
  publicScore: number;
}

export interface PrivatePlayer {
  pack: Pack;
  keep: number;
  base: Stats;
  gear: Stats;
  trained: Stat[];
  items: Item[];
  slotsUsed: number;
  pivots: number;
}

export interface TownView {
  size: number;
  buildings: Record<number, Building>;
  gates: Record<number, Dir>;
}

export interface MoveOutline {
  dir: Dir;
  level: LevelName;
  square: number;
  /** Taking this step costs a Pivot. */
  pivot: boolean;
}

export interface SquareView {
  /** null while the Tile is hidden in the dark. */
  exits: string | null;
  revealed: boolean;
  feature: Feature | null;
  /** Contents show only once revealed. */
  token: Token | null;
  pile: Pack | null;
  mob: MobView | null;
}

export interface MobView {
  kind: string;
  wounds: number;
  maxWounds: number;
  damage: number;
  dice: Record<Approach, number>;
}

export interface BoardView {
  size: number;
  squares: SquareView[];
}

export interface Offer {
  action: Action;
  name: string;
  price: { gold: number; herbs?: number; artifacts?: number };
}

export interface PlayerView {
  you: PlayerId | null;
  phase: Phase;
  players: PublicPlayer[];
  me: PrivatePlayer | null;
  seats: PlayerId[];
  round: number;
  doomLimit: number;
  turn: Turn | null;
  town: TownView;
  boards: Record<PathLevel, BoardView>;
  clash: Clash | null;
  final: { scores: Score[]; winners: PlayerId[] } | null;
  options: Action[];
  /** Carried items the Player may use now that need a target square. */
  aimable: Item[];
  /** Every legal purchase or Training, with its name and Haggled price. */
  offers: Offer[];
  /** Where each legal step leads, for outlining on the board. */
  moves: MoveOutline[];
  events: GameEvent[];
}

export interface ActionResult {
  state: GameState;
  events: GameEvent[];
}
