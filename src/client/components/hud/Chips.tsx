import type { GameEvent, PlayerView } from '../../../rules/index.ts';
import { Die } from '../Die.tsx';
import styles from './Hud.module.css';

export function Chips({ view, playing }: { view: PlayerView; playing: GameEvent | null }) {
  const turn = view.turn;
  const rolling = playing?.type === 'rolled' ? playing : null;
  return (
    <div className={styles.chips}>
      <span className={styles.chip} title="The Doom Track">
        ☠ Round {view.round} / {view.doomLimit}
      </span>
      {turn?.roll != null ? (
        <span className={styles.chip}>
          <Die faces={6} value={rolling ? rolling.value : turn.roll} rolling={rolling !== null} />
          {turn.phase === 'move' ? `${turn.stepsLeft} steps left` : 'rolled'}
        </span>
      ) : null}
    </div>
  );
}
