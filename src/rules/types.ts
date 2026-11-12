/** Every type in the rules engine. Vocabulary follows GLOSSARY.md. */
import type { ApproachName, COLOURS, HEROES, STATS, TRINKETS } from './data.ts';

export type PlayerId = string;
export type Hero = (typeof HEROES)[number];
export type Colour = (typeof COLOURS)[number];
export type Stat = (typeof STATS)[number];
export type Stats = Record<Stat, number>;
export type Trinket = (typeof TRINKETS)[number];

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
  /** Played by the Host's server instead of a person. */
  bot: boolean;
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
  sway: number;
  resist: number;
  autoPass: boolean;
  trinkets: Trinket[];
  /** Ratings of the Caches claimed, in order. */
  cachesClaimed: number[];
  kills: number;
  dungeonKills: number;
  guardianWounds: number;
  reachedDungeon: boolean;
  /** Carried 2 or more Artifacts into the Town at once. */
  relic: boolean;
  /** Gold moved into the Keep by Depositing (the Guardian bonus is not Deposited). */
  deposited: number;
  /** Turns in a row ended in the Dungeon. */
  dungeonStreak: number;
  /** Server time of this Player's last slap, for the cooldown. */
  lastSlapAt: number | null;
  /** Server time of this Player's last Rubber Chicken squeak. */
  lastSqueakAt: number | null;
  /** Shakedowns won, for the Shakedown Artist Deed. */
  shakedownWins: number;
  /** Just Shaken down: safe from Shakedowns until their next Turn. */
  shakeProtected: boolean;
  /** Stoneskin Salve: immune to Shakedowns and Rams until their next Turn. */
  stoneskin: boolean;
}

export interface Shakedown {
  attacker: PlayerId;
  defender: PlayerId;
  approach: Approach;
  /** The defender's Approach, once chosen. */
  defence: Approach | null;
  ram: boolean;
}

/** A fixed thing on a square; it stays put when Tiles are swapped. */
export type Feature =
  { type: 'gate'; side: Dir } | { type: 'stairs' } | { type: 'stairsUp' } | { type: 'guardian' };

export type Token =
  | { type: 'gold'; amount: number }
  | { type: 'herbs' }
  | { type: 'artifacts' }
  /** Visible to and claimable only by Players whose INT is at least its rating. */
  | { type: 'cache'; rating: number };

export type Approach = ApproachName;

export interface MobState {
  kind: string;
  wounds: number;
}

export interface Board {
  size: number;
  /** Each square's Exits, in N E S W order, e.g. 'NS'. */
  tiles: string[];
  /** Squares revealed, permanently and for everyone. */
  revealed: boolean[];
  /** Squares Torchlight has reached; only these show Caches. */
  lit: boolean[];
  features: Record<number, Feature>;
  tokens: Record<number, Token>;
  mobs: Record<number, MobState>;
  /** What Lost and Knocked Out Players dropped. */
  piles: Record<number, Pack>;
}

export type PathLevel = 'forest' | 'dungeon';

export type ItemKind =
  | 'boots'
  | 'compass'
  | 'tonic'
  | 'draught'
  | 'teleport'
  | 'twirlwater'
  | 'orb'
  | 'stones'
  | 'knucklebone'
  | 'coin'
  | 'hush'
  | 'stoneskin';

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
  /** The last Player to Sway or Meddle with it, for the glow. */
  touchedBy?: PlayerId;
}

export interface RollSide {
  owner: PlayerId | 'mob';
  bonus: number;
}

export type ResponseEffect =
  | { kind: 'sway'; die: number; delta: 1 | -1 }
  | { kind: 'coin'; dice: [number, number] }
  | { kind: 'hush'; die: number };

/** A Meddle or Sway waiting on the Resist prompt of the Players it hurts. */
export interface PendingEffect {
  by: PlayerId;
  effect: ResponseEffect;
  targets: PlayerId[];
  allowed: PlayerId[];
}

/** The pause after the dice in a Clash or Shakedown. */
export interface ResponseWindow {
  id: number;
  kind: 'clash' | 'shakedown';
  sides: [RollSide, RollSide];
  dice: DieInPlay[];
  nextDie: number;
  /** Players who can act now (Sway left or a usable dice item, and not auto-passing). */
  eligible: PlayerId[];
  passed: PlayerId[];
  pending: PendingEffect | null;
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
  /** The Approach of the Exchange being rolled. */
  approach: Approach | null;
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
  /** Steps taken this Turn. */
  stepped: number;
  /** A Shakedown or Ram has already happened this Turn. */
  shookDown: boolean;
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
  response: ResponseWindow | null;
  shakedown: Shakedown | null;
  /** The three public Deeds of this game, one per tier. */
  deeds: { id: string; claimedBy: PlayerId | null }[];
  /** A Player over 5 Slots must discard before play goes on. */
  discarding: PlayerId | null;
  nextResponseId: number;
  nextItemId: number;
  /** The feat was performed: the game ends after this Round. */
  endTriggered: boolean;
}

export type Action =
  | { type: 'join'; name: string; hero: Hero; colour: Colour }
  /** The Host adds a Bot; the server fills in who it is. */
  | { type: 'addBot'; bot?: { id: PlayerId; name: string; hero: Hero; colour: Colour } }
  | { type: 'removeBot'; player: PlayerId }
  | { type: 'startGame' }
  /** The Host clears the table back to an empty Lobby. */
  | { type: 'newGame' }
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
      /** Trickster's Coin: the two dice to swap. Hush Rune: `die`. */
      dice?: [number, number];
      die?: number;
    }
  | { type: 'sway'; die: number; delta: 1 | -1 }
  | { type: 'pass' }
  | { type: 'resist' }
  | { type: 'allow' }
  | { type: 'closeResponse'; id: number }
  | { type: 'setAutoPass'; on: boolean }
  | { type: 'acceptLost' }
  | { type: 'shakedown'; target: PlayerId; approach: Approach }
  | { type: 'ram'; target: PlayerId; approach: Approach }
  | { type: 'defend'; approach: Approach }
  | { type: 'discard'; item?: number; gear?: Stat }
  | { type: 'passHost'; to: PlayerId }
  | { type: 'presence'; player: PlayerId; online: boolean }
  | { type: 'skipTurn' }
  /** `at` is the server's clock, filled in by the server. */
  | { type: 'slap'; at: number }
  | { type: 'squeak'; at: number }
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
    | { type: 'botRemoved'; player: PlayerId }
    | { type: 'tableCleared' }
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
        /** The step left off the Heading. */
        pivot?: boolean;
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
    | { type: 'responseOpened'; id: number; dice: DieInPlay[] }
    | { type: 'swayed'; player: PlayerId; die: number; delta: number }
    | { type: 'meddled'; player: PlayerId; kind: ItemKind; dice: number[] }
    | { type: 'resisted'; player: PlayerId; against: PlayerId }
    | { type: 'diceChanged'; dice: DieInPlay[] }
    | { type: 'passed'; player: PlayerId }
    | { type: 'responseClosed'; id: number }
    | {
        type: 'shakedownStarted';
        attacker: PlayerId;
        defender: PlayerId;
        approach: Approach;
        ram: boolean;
      }
    | {
        type: 'shakedownRolled';
        attacker: PlayerId;
        defender: PlayerId;
        dice: DieInPlay[];
        bonus: [number, number];
      }
    | { type: 'looted'; player: PlayerId; loot: string }
    | { type: 'trinketFound'; player: PlayerId; trinket: Trinket }
    | { type: 'cacheClaimed'; player: PlayerId; rating: number }
    | { type: 'discarded'; player: PlayerId }
    | { type: 'deedClaimed'; player: PlayerId; deed: string; points: number }
    | { type: 'hostPassed'; to: PlayerId }
    | { type: 'presence'; player: PlayerId; online: boolean }
    | { type: 'turnSkipped'; player: PlayerId; by: PlayerId }
    | { type: 'slapped'; by: PlayerId; target: PlayerId; bounced: boolean }
    | { type: 'squeaked'; player: PlayerId }
    | { type: 'shakedownResolved'; winner: PlayerId | null; loser: PlayerId | null; taken: Pack }
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
  trophies: number;
  deeds: number;
  trinkets: number;
  total: number;
}

export interface DeedView {
  id: string;
  tier: 'easy' | 'medium' | 'hard';
  name: string;
  text: string;
  points: number;
  claimedBy: PlayerId | null;
}

export interface PublicPlayer {
  id: PlayerId;
  name: string;
  hero: Hero;
  colour: Colour;
  online: boolean;
  bot: boolean;
  isHost: boolean;
  setupDone: boolean;
  level: LevelName;
  square: number;
  heading: Dir;
  hp: number;
  maxHp: number;
  stats: Stats;
  trinkets: Trinket[];
  publicScore: number;
}

export interface PrivatePlayer {
  sway: number;
  resist: number;
  autoPass: boolean;
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
  response: ResponseWindow | null;
  shakedown: Shakedown | null;
  deeds: DeedView[];
  final: { scores: Score[]; winners: PlayerId[] } | null;
  options: Action[];
  /** Carried items the Player may use now that need a target square. */
  aimable: Item[];
  /** Milliseconds left in the open Response window when this view was sent; set by the server. */
  responseMsLeft?: number;
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
