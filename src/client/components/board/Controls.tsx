import type { Action, Dir, PlayerView } from '../../../rules/index.ts';
import { send } from '../../socket.ts';
import styles from './Board.module.css';

const ARROW: Record<Dir, string> = { N: '↑', E: '→', S: '↓', W: '←' };

/** Contextual action buttons, right above the Player's own piece. */
export function Controls({
  view,
  at,
  size,
  tile,
}: {
  view: PlayerView;
  at: number;
  size: number;
  tile: number;
}) {
  const buttons = view.options.flatMap((o) => button(view, o));
  if (buttons.length === 0) return null;
  return (
    <div
      className={styles.controls}
      style={{ left: (at % size) * tile + tile / 2, top: Math.floor(at / size) * tile }}
    >
      {buttons}
    </div>
  );
}

function button(view: PlayerView, action: Action) {
  const go = () => void send(action);
  switch (action.type) {
    case 'roll':
      return [
        <button key="roll" type="button" onClick={go}>
          🎲 Roll
        </button>,
      ];
    case 'step': {
      const pivot = view.moves.find((m) => m.dir === action.dir)?.pivot;
      return [
        <button
          key={`step-${action.dir}`}
          type="button"
          className={pivot ? styles.pivotBtn : styles.free}
          aria-label={`Step ${action.dir}${pivot ? ' (Pivot)' : ''}`}
          onClick={go}
        >
          {ARROW[action.dir]}
        </button>,
      ];
    }
    case 'stop':
      return [
        <button key="stop" type="button" onClick={go}>
          Stop
        </button>,
      ];
    case 'takeFeature':
      return [
        <button key="take" type="button" onClick={go}>
          {takeLabel(view)}
        </button>,
      ];
    case 'chooseHeading':
      return [
        <button
          key={`heading-${action.dir}`}
          type="button"
          aria-label={`Set off ${action.dir}`}
          onClick={go}
        >
          ⇢{ARROW[action.dir]}
        </button>,
      ];
    case 'resumeClash':
      return [
        <button key="resume" type="button" onClick={go}>
          ⚔ Resume the Clash
        </button>,
      ];
    case 'moveAway':
      return [
        <button key="away" type="button" onClick={go}>
          Move away
        </button>,
      ];
    case 'endTurn':
      return [
        <button key="end" type="button" onClick={go}>
          End Turn
        </button>,
      ];
    default:
      return [];
  }
}

function takeLabel(view: PlayerView): string {
  const me = view.players.find((p) => p.id === view.you);
  return me?.level === 'town' ? 'Take the Gate' : 'Take the Gate to Town';
}
