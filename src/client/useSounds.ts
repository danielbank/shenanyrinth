import { useEffect } from 'react';
import { play } from './audio.ts';
import { fxStore } from './fxStore.ts';
import { gameStore } from './gameStore.ts';
import { soundsFor } from './sounds.ts';
import { useGame } from './useGame.ts';

/** Sounds follow the event queue, so skipping ahead never plays a backlog. */
export function useSounds(): void {
  const { sounding } = useGame();
  useEffect(() => {
    const q = gameStore.get();
    if (!q.view) return;
    for (const e of sounding) for (const name of soundsFor(e, q.view, q.shown)) play(name);
  }, [sounding]);
}

/** The slap and the Rubber Chicken sound at once, outside the queue. */
fxStore.onEvent((e) => {
  const q = gameStore.get();
  if (q.view) for (const name of soundsFor(e, q.view, q.shown)) play(name);
});
