import type { Action, Dir, PlayerView } from '../../../rules/index.ts';
import { ARROW_DRAWING } from '../../art/inHouse.ts';
import { send } from '../../socket.ts';
import { PixelArt } from '../PixelArt.tsx';
import styles from './Controls.module.css';

const DIRS: Dir[] = ['N', 'W', 'E', 'S'];
const DIR_NAMES: Record<Dir, string> = { N: 'North', E: 'East', S: 'South', W: 'West' };

type DirAction = Extract<Action, { type: 'step' | 'chooseHeading' | 'compass' }>;
const isDir = (a: Action): a is DirAction =>
  a.type === 'step' || a.type === 'chooseHeading' || a.type === 'compass';

/** The control dock under the board: a D-pad for whichever way-picking is live, and buttons. */
export function Controls({ view }: { view: PlayerView }) {
  const dirs = view.options.filter(isDir);
  const stop = view.options.some((o) => o.type === 'stop');
  // Stop sits in the D-pad's hub when there is a pad, and among the buttons when there isn't.
  const rest = view.options.flatMap((o) =>
    o.type === 'stop' && dirs.length ? [] : button(view, o),
  );
  if (dirs.length === 0 && rest.length === 0) return null;
  return (
    <div className={styles.dock} role="group" aria-label="Your moves">
      {dirs.length ? <DPad view={view} dirs={dirs} stop={stop} /> : null}
      {rest.length ? <div className={styles.actions}>{rest}</div> : null}
    </div>
  );
}

const CAPTION: Record<DirAction['type'], string> = {
  step: 'Step',
  chooseHeading: 'Set off',
  compass: 'Compass',
};

function DPad({ view, dirs, stop }: { view: PlayerView; dirs: DirAction[]; stop: boolean }) {
  const kind = dirs[0]!.type;
  return (
    <div className={styles.pad} aria-label={CAPTION[kind]}>
      {DIRS.map((d) => {
        const action = dirs.find((a) => a.dir === d);
        const pivot =
          kind === 'compass' || (kind === 'step' && view.moves.some((m) => m.dir === d && m.pivot));
        return (
          <button
            key={d}
            type="button"
            className={`${styles.arrow} ${styles[d]} ${pivot ? styles.pivot : styles.free}`}
            disabled={!action}
            aria-label={`${CAPTION[kind]} ${DIR_NAMES[d]}${pivot ? ' (Pivot)' : ''}`}
            onClick={action ? () => void send(action) : undefined}
          >
            <PixelArt drawing={ARROW_DRAWING} size="100%" />
          </button>
        );
      })}
      {stop ? (
        <button
          type="button"
          className={styles.hub}
          aria-label="Stop"
          onClick={() => void send({ type: 'stop' })}
        >
          Stop
        </button>
      ) : (
        <span className={`${styles.hub} ${styles.caption}`} aria-hidden>
          {CAPTION[kind]}
        </span>
      )}
    </div>
  );
}

function button(view: PlayerView, action: Action) {
  const go = () => void send(action);
  switch (action.type) {
    case 'roll':
      return [
        <button key="roll" type="button" className={styles.primary} onClick={go}>
          🎲 Roll
        </button>,
      ];
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
    case 'resumeClash':
      return [
        <button key="resume" type="button" className={styles.primary} onClick={go}>
          ⚔ Resume the Clash
        </button>,
      ];
    case 'moveAway':
      return [
        <button key="away" type="button" onClick={go}>
          Move away
        </button>,
      ];
    case 'acceptLost':
      return [
        <button key="lost" type="button" onClick={go}>
          Accept being Lost
        </button>,
      ];
    case 'shakedown':
    case 'ram': {
      const target = view.players.find((p) => p.id === action.target)?.name ?? 'them';
      const verb = action.type === 'ram' ? 'Ram' : 'Shake down';
      return [
        <button
          key={`${action.type}-${action.target}-${action.approach}`}
          type="button"
          onClick={go}
        >
          {verb} {target}: {action.approach}
        </button>,
      ];
    }
    case 'endTurn':
      return [
        <button key="end" type="button" className={styles.primary} onClick={go}>
          End Turn
        </button>,
      ];
    default:
      return [];
  }
}

function takeLabel(view: PlayerView): string {
  const me = view.players.find((p) => p.id === view.you);
  if (!me || me.level === 'town') return 'Take the Gate';
  const feature = view.boards[me.level].squares[me.square]?.feature;
  if (feature?.type === 'stairs') return 'Take the Stairs down';
  if (feature?.type === 'stairsUp') return 'Take the Stairs up';
  return 'Take the Gate to Town';
}
