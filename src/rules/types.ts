/** Every type in the rules engine. Vocabulary follows GLOSSARY.md. */
import type { COLOURS, HEROES, STATS } from './data.ts';

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
  hp: number;
  pack: Pack;
  keep: number;
  trophies: number;
  level: LevelName;
  square: number;
  heading: Dir;
  pivots: number;
}

/** A fixed thing on a square; it stays put when Tiles are swapped. */
export type Feature = { type: 'gate'; side: Dir };

export interface Board {
  size: number;
  /** Each square's Exits, in N E S W order, e.g. 'NS'. */
  tiles: string[];
  /** Squares revealed by Torchlight, permanently and for everyone. */
  revealed: boolean[];
  features: Record<number, Feature>;
}

export type PathLevel = 'forest' | 'dungeon';

export type Phase = 'lobby' | 'setup' | 'playing' | 'over';
export type TurnPhase = 'prepare' | 'move' | 'after';

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
}

export interface BoardView {
  size: number;
  squares: SquareView[];
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
  final: { scores: Score[]; winners: PlayerId[] } | null;
  options: Action[];
  /** Where each legal step leads, for outlining on the board. */
  moves: MoveOutline[];
  events: GameEvent[];
}

export interface ActionResult {
  state: GameState;
  events: GameEvent[];
}
