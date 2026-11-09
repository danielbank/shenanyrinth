/** Every type in the rules engine. Vocabulary follows GLOSSARY.md. */

export type PlayerId = string;

import type { COLOURS, HEROES } from './data.ts';

export type Hero = (typeof HEROES)[number];
export type Colour = (typeof COLOURS)[number];

export interface Player {
  id: PlayerId;
  name: string;
  hero: Hero;
  colour: Colour;
  online: boolean;
}

export type Phase = 'lobby';

export interface GameState {
  rng: number;
  /** Die results queued by tests; each die drawn takes the next one. */
  forced: number[];
  phase: Phase;
  players: Player[];
  hostId: PlayerId | null;
}

export type Action = { type: 'join'; name: string; hero: Hero; colour: Colour };

export type GameEvent = { type: 'joined'; player: PlayerId; to?: PlayerId[] };

export interface PublicPlayer {
  id: PlayerId;
  name: string;
  hero: Hero;
  colour: Colour;
  online: boolean;
  isHost: boolean;
}

export interface PlayerView {
  you: PlayerId | null;
  phase: Phase;
  players: PublicPlayer[];
  options: Action[];
  events: GameEvent[];
}

export interface ActionResult {
  state: GameState;
  events: GameEvent[];
}
