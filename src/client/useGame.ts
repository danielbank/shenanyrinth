import { useEffect, useSyncExternalStore } from 'react';
import { durationOf, gameStore } from './gameStore.ts';

export function useGame() {
  return useSyncExternalStore(gameStore.subscribe, gameStore.get);
}

/** Advances the queue when the current animation's time is up. */
export function useQueueClock(): void {
  const q = useGame();
  const { playing } = q;
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(gameStore.advance, durationOf(playing));
    return () => clearTimeout(timer);
  }, [playing]);
}
