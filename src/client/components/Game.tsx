import type { PlayerView } from '../../rules/index.ts';
import { gameStore } from '../gameStore.ts';
import { useGame } from '../useGame.ts';
import { Board } from './board/Board.tsx';
import { FinalScores } from './FinalScores.tsx';
import { Chips } from './hud/Chips.tsx';
import { PlayerRow } from './hud/PlayerRow.tsx';
import { TurnBar } from './hud/TurnBar.tsx';
import { Vitals } from './hud/Vitals.tsx';
import styles from './Game.module.css';

export function Game({ view }: { view: PlayerView }) {
  const queue = useGame();
  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <PlayerRow view={view} />
        <TurnBar view={view} />
        <Chips view={view} playing={queue.playing} />
      </header>
      <main className={styles.stage}>
        <Board view={view} shown={queue.shown} settled={queue.settled} />
        {queue.settled ? null : (
          <button type="button" className={styles.skip} onClick={gameStore.skip}>
            Skip ▸▸
          </button>
        )}
      </main>
      <div className={styles.bottomLeft}>
        <Vitals view={view} />
      </div>
      {view.final ? <FinalScores view={view} /> : null}
    </div>
  );
}
