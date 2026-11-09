import { useState } from 'react';
import type { LevelName, PlayerView } from '../../rules/index.ts';
import { gameStore } from '../gameStore.ts';
import { useGame } from '../useGame.ts';
import { Board } from './board/Board.tsx';
import { LevelTabs } from './hud/LevelTabs.tsx';
import { ClashPanel } from './ClashPanel.tsx';
import { Errands } from './Errands.tsx';
import { AimBanner, ItemBar, type Aim } from './ItemBar.tsx';
import { picksNeeded } from '../itemNames.ts';
import { FinalScores } from './FinalScores.tsx';
import { Chips } from './hud/Chips.tsx';
import { PlayerRow } from './hud/PlayerRow.tsx';
import { TurnBar } from './hud/TurnBar.tsx';
import { Vitals } from './hud/Vitals.tsx';
import styles from './Game.module.css';

export function Game({ view }: { view: PlayerView }) {
  const queue = useGame();
  const [peek, setPeek] = useState<LevelName | null>(null);
  const myLevel = (view.you && queue.shown[view.you]?.level) || 'town';
  const level = peek ?? myLevel;
  const [aim, setAim] = useState<Aim | null>(null);
  const pick = (square: number) =>
    setAim((a) => (a ? { ...a, picks: [...a.picks, square].slice(-picksNeeded(a.item.kind)) } : a));
  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <PlayerRow view={view} />
        <TurnBar view={view} />
        <Chips view={view} playing={queue.playing} />
      </header>
      <main className={styles.stage}>
        <Board
          view={view}
          level={level}
          shown={queue.shown}
          settled={queue.settled}
          picks={aim?.picks ?? null}
          onPick={pick}
        />
        <LevelTabs current={level} mine={myLevel} onPick={setPeek} />
        {queue.settled ? null : (
          <button type="button" className={styles.skip} onClick={gameStore.skip}>
            Skip ▸▸
          </button>
        )}
      </main>
      <div className={styles.bottomLeft}>
        <Vitals view={view} />
      </div>
      <div className={styles.bottomRight}>
        <ItemBar view={view} onAim={setAim} />
      </div>
      {aim ? <AimBanner aim={aim} onDone={() => setAim(null)} /> : null}
      {queue.settled ? <Errands view={view} /> : null}
      {queue.settled ? <ClashPanel view={view} /> : null}
      {view.final ? <FinalScores view={view} /> : null}
    </div>
  );
}
