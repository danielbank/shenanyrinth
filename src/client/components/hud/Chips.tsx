import type { GameEvent, PlayerView } from '../../../rules/index.ts';
import { Die } from '../Die.tsx';
import { Glyph } from '../Icon.tsx';
import styles from './Hud.module.css';

export function Chips({
  view,
  playing,
  onInspect,
}: {
  view: PlayerView;
  playing: GameEvent | null;
  onInspect: (chip: 'doom' | 'roll') => void;
}) {
  const turn = view.turn;
  const rolling = playing?.type === 'rolled' ? playing : null;
  return (
    <div className={styles.chips}>
      <button type="button" className={styles.chip} onClick={() => onInspect('doom')}>
        <Glyph name="doom" /> Round {view.round} / {view.doomLimit}
      </button>
      {turn?.roll != null ? (
        <button type="button" className={styles.chip} onClick={() => onInspect('roll')}>
          <Die faces={6} value={rolling ? rolling.value : turn.roll} rolling={rolling !== null} />
          {turn.phase === 'move' ? `${turn.stepsLeft} steps left` : 'rolled'}
        </button>
      ) : null}
    </div>
  );
}
