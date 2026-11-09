import { useState, useSyncExternalStore } from 'react';
import * as m from 'motion/react-m';
import { SLAP_COOLDOWN_MS } from '../../rules/data.ts';
import type { PlayerView } from '../../rules/index.ts';
import { fxStore, type Fx } from '../fxStore.ts';
import { send } from '../socket.ts';
import styles from './Slap.module.css';

/** ✋ always hits whoever's Turn it is; the ring shows the cooldown. */
export function SlapButton({ view }: { view: PlayerView }) {
  const [cooling, setCooling] = useState(0);
  const me = view.players.find((p) => p.id === view.you);
  const target = view.players.find((p) => p.id === view.turn?.player);
  if (!me || !target || target.id === me.id || view.phase !== 'playing') return null;
  const cooldown = SLAP_COOLDOWN_MS / (me.trinkets.includes('Glove of Slapping') ? 2 : 1);
  async function slap() {
    const res = await send({ type: 'slap', at: 0 });
    if (res.ok) setCooling((n) => n + 1);
  }
  return (
    <button
      type="button"
      className={styles.slap}
      aria-label={`Slap ${target.name}`}
      title={`Slap ${target.name}`}
      onClick={slap}
    >
      ✋
      {cooling > 0 ? (
        <svg key={cooling} className={styles.ring} viewBox="0 0 52 52" aria-hidden>
          <m.circle
            cx="26"
            cy="26"
            r="24"
            fill="none"
            stroke="var(--gold)"
            strokeWidth="4"
            initial={{ pathLength: 1 }}
            animate={{ pathLength: 0 }}
            transition={{ duration: cooldown / 1000, ease: 'linear' }}
          />
        </svg>
      ) : null}
    </button>
  );
}

/** push-poker's burst-and-shake, rebuilt with Motion. */
export function SlapEffects({ view }: { view: PlayerView }) {
  const fx = useSyncExternalStore(fxStore.subscribe, fxStore.get);
  return (
    <>
      {fx.map((f) => (
        <Burst key={f.id} fx={f} view={view} />
      ))}
    </>
  );
}

function Burst({ fx, view }: { fx: Fx; view: PlayerView }) {
  if (fx.event.type !== 'slapped') return null;
  const { target, by, bounced } = fx.event;
  const name = (id: string) => view.players.find((p) => p.id === id)?.name ?? '?';
  const text = target === view.you ? 'SLAP!' : `${name(by)} slaps ${name(target)}!`;
  return (
    <m.div
      className={styles.burst}
      role="status"
      initial={{ scale: 0.2, opacity: 0, rotate: -12 }}
      animate={{ scale: [0.2, 1.3, 1], opacity: [0, 1, 0], x: [0, -10, 10, -6, 6, 0] }}
      transition={{ duration: 0.9 }}
      onAnimationComplete={() => fxStore.done(fx.id)}
    >
      {bounced ? `${text} Bounced!` : text}
    </m.div>
  );
}
