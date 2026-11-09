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

export type Phase = 'lobby' | 'setup' | 'playing' | 'over';
export type TurnPhase = 'prepare' | 'move' | 'after';

export interface Turn {
  player: PlayerId;
  phase: TurnPhase;
  roll: number | null;
  stepsLeft: number;
  /** Moving freely, as in the Town: any direction, up to the steps left. */
  free: boolean;
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
}

export type Action =
  | { type: 'join'; name: string; hero: Hero; colour: Colour }
  | { type: 'startGame' }
  | { type: 'setStats'; stats: Stats }
  | { type: 'roll' }
  | { type: 'step'; dir: Dir }
  | { type: 'stop' }
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
