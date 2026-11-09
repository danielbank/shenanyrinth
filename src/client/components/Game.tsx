import { useState } from 'react';
import type { LevelName, PlayerView } from '../../rules/index.ts';
import { gameStore } from '../gameStore.ts';
import { picksNeeded } from '../itemNames.ts';
import { useGame } from '../useGame.ts';
import { Board } from './board/Board.tsx';
import { ClashPanel } from './ClashPanel.tsx';
import { DeedsDrawer } from './DeedsDrawer.tsx';
import { DiscardPanel } from './DiscardPanel.tsx';
import { Errands } from './Errands.tsx';
import { FinalScores } from './FinalScores.tsx';
import { Chips } from './hud/Chips.tsx';
import { LevelTabs } from './hud/LevelTabs.tsx';
import { PlayerRow } from './hud/PlayerRow.tsx';
import { TurnBar } from './hud/TurnBar.tsx';
import { Vitals } from './hud/Vitals.tsx';
import { Badge } from './Icon.tsx';
import { InspectCard, type Inspect } from './InspectCard.tsx';
import { AimBanner, ItemBar, type Aim } from './ItemBar.tsx';
import { ResponseCard } from './ResponseCard.tsx';
import { ShakedownPanel } from './ShakedownPanel.tsx';
import { Sheet } from './Sheet.tsx';
import { SlapButton, SlapEffects } from './Slap.tsx';
import styles from './Game.module.css';

type Drawer = 'deeds' | 'sheet' | null;

/** The HUD overlay layout (variant C) around the board. */
export function Game({ view }: { view: PlayerView }) {
  const queue = useGame();
  const [peek, setPeek] = useState<LevelName | null>(null);
  const myLevel = (view.you && queue.shown[view.you]?.level) || 'town';
  const level = peek ?? myLevel;
  const [aim, setAim] = useState<Aim | null>(null);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const [hideFight, setHideFight] = useState(false);
  const pick = (square: number) =>
    setAim((a) => (a ? { ...a, picks: [...a.picks, square].slice(-picksNeeded(a.item.kind)) } : a));
  const fighting = view.clash !== null || view.shakedown !== null || view.response !== null;
  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <PlayerRow view={view} onInspect={(id) => setInspect({ kind: 'player', id })} />
        <TurnBar view={view} />
        <Chips
          view={view}
          playing={queue.playing}
          onInspect={(chip) => setInspect({ kind: 'chip', chip })}
        />
      </header>
      <main className={styles.stage}>
        <Board
          view={view}
          level={level}
          shown={queue.shown}
          settled={queue.settled}
          picks={aim?.picks ?? null}
          onPick={pick}
          onInspect={(square) => setInspect({ kind: 'square', level, square })}
        />
        <LevelTabs current={level} mine={myLevel} onPick={setPeek} />
        {queue.settled ? null : (
          <button type="button" className={styles.skip} onClick={gameStore.skip}>
            Skip ▸▸
          </button>
        )}
      </main>
      <div className={styles.bottomLeft}>
        <ItemBar view={view} onAim={setAim} onInspect={(id) => setInspect({ kind: 'item', id })} />
        <Vitals view={view} onOpen={() => setDrawer('sheet')} />
      </div>
      <BottomRight
        view={view}
        fighting={fighting}
        hideFight={hideFight}
        onDeeds={() => setDrawer('deeds')}
        onToggleFight={() => setHideFight((h) => !h)}
      />
      {drawer === 'deeds' ? <DeedsDrawer view={view} onClose={() => setDrawer(null)} /> : null}
      {drawer === 'sheet' ? (
        <Sheet view={view} onInspect={setInspect} onClose={() => setDrawer(null)} />
      ) : null}
      {inspect ? (
        <InspectCard
          view={view}
          target={inspect}
          onInspect={setInspect}
          onClose={() => setInspect(null)}
        />
      ) : null}
      <Overlays
        view={view}
        settled={queue.settled}
        hideFight={hideFight}
        aim={aim}
        onAimDone={() => setAim(null)}
      />
    </div>
  );
}

function BottomRight({
  view,
  fighting,
  hideFight,
  onDeeds,
  onToggleFight,
}: {
  view: PlayerView;
  fighting: boolean;
  hideFight: boolean;
  onDeeds: () => void;
  onToggleFight: () => void;
}) {
  return (
    <div className={styles.bottomRight}>
      <button
        type="button"
        className={styles.badgeButton}
        aria-label={`Deeds: ${view.deeds.filter((d) => !d.claimedBy).length} unclaimed`}
        onClick={onDeeds}
      >
        <Badge name="deeds" />
      </button>
      <button
        type="button"
        className={`${styles.badgeButton} ${fighting ? styles.alert : ''}`}
        aria-label={hideFight ? 'Show the Clash' : 'Hide the Clash'}
        aria-pressed={!hideFight}
        disabled={!fighting}
        onClick={onToggleFight}
      >
        <Badge name="clash" />
      </button>
      <SlapButton view={view} />
    </div>
  );
}

/** Panels and cards that float over the board. */
function Overlays({
  view,
  settled,
  hideFight,
  aim,
  onAimDone,
}: {
  view: PlayerView;
  settled: boolean;
  hideFight: boolean;
  aim: Aim | null;
  onAimDone: () => void;
}) {
  const showFight = settled && !hideFight;
  return (
    <>
      <SlapEffects view={view} />
      {aim ? <AimBanner aim={aim} onDone={onAimDone} /> : null}
      {settled ? <Errands view={view} /> : null}
      {showFight && !view.response ? <ClashPanel view={view} /> : null}
      <ResponseCard view={view} />
      {view.response || hideFight ? null : <ShakedownPanel view={view} />}
      <DiscardPanel view={view} />
      {view.final ? <FinalScores view={view} /> : null}
    </>
  );
}
