import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { Lobby } from './components/Lobby.tsx';
import { StatSetup } from './components/StatSetup.tsx';
import { Game } from './components/Game.tsx';
import { useGame, useQueueClock } from './useGame.ts';
import { useSounds } from './useSounds.ts';

export function App() {
  useQueueClock();
  useSounds();
  const { view } = useGame();
  if (!view) return <p>Connecting…</p>;
  const me = view.players.find((p) => p.id === view.you);
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        {view.phase === 'lobby' || !me ? <Lobby view={view} /> : null}
        {view.phase === 'setup' && me ? <StatSetup view={view} /> : null}
        {(view.phase === 'playing' || view.phase === 'over') && me ? <Game view={view} /> : null}
      </MotionConfig>
    </LazyMotion>
  );
}
