import { useState } from 'react';
import { SETUP_MAX_PER_STAT, SETUP_POINTS, STATS } from '../../rules/data.ts';
import type { PlayerView, Stat, Stats } from '../../rules/index.ts';
import { send } from '../socket.ts';
import styles from './StatSetup.module.css';

const BLURBS: Record<Stat, string> = {
  STR: 'Fight · Ram other Players',
  DEX: 'Trickery · 1 optional extra square',
  INT: 'Magic · see and claim Caches',
  WIS: 'wider Torchlight · bonus vs the Guardian',
  CON: 'HP = 4 + CON · Resist',
  CHA: 'Sway dice · Haggle in stores',
};

const ZERO: Stats = { STR: 0, DEX: 0, INT: 0, WIS: 0, CON: 0, CHA: 0 };

export function StatSetup({ view }: { view: PlayerView }) {
  const me = view.players.find((p) => p.id === view.you);
  const waitingFor = view.players.filter((p) => !p.setupDone).map((p) => p.name);
  if (me?.setupDone) {
    return (
      <main className={styles.setup}>
        <h2>Ready!</h2>
        <p>Waiting for {waitingFor.join(', ')} to set up their Stats…</p>
      </main>
    );
  }
  return <StatForm />;
}

function StatForm() {
  const [stats, setStats] = useState<Stats>(ZERO);
  const [error, setError] = useState<string | null>(null);
  const left = SETUP_POINTS - STATS.reduce((a, s) => a + stats[s], 0);
  const change = (s: Stat, delta: number) =>
    setStats((prev) => ({ ...prev, [s]: prev[s] + delta }));

  async function confirm() {
    const res = await send({ type: 'setStats', stats });
    if (!res.ok) setError(res.error ?? 'Could not set Stats');
  }

  return (
    <main className={styles.setup}>
      <h2>Choose your build</h2>
      <p>
        Assign {SETUP_POINTS} points, at most {SETUP_MAX_PER_STAT} in any Stat.{' '}
        <span className={styles.left}>{left} left</span>
      </p>
      <div className={styles.grid}>
        {STATS.map((s) => (
          <StatRow key={s} stat={s} value={stats[s]} left={left} onChange={change} />
        ))}
      </div>
      <button type="button" disabled={left !== 0} onClick={confirm}>
        Ready
      </button>
      {error ? <p>{error}</p> : null}
    </main>
  );
}

function StatRow({
  stat,
  value,
  left,
  onChange,
}: {
  stat: Stat;
  value: number;
  left: number;
  onChange: (s: Stat, delta: number) => void;
}) {
  return (
    <>
      <span className={styles.stat}>{stat}</span>
      <span className={styles.blurb}>{BLURBS[stat]}</span>
      <button
        type="button"
        aria-label={`less ${stat}`}
        disabled={value === 0}
        onClick={() => onChange(stat, -1)}
      >
        −
      </button>
      <span className={styles.value}>{value}</span>
      <button
        type="button"
        aria-label={`more ${stat}`}
        disabled={left === 0 || value >= SETUP_MAX_PER_STAT}
        onClick={() => onChange(stat, 1)}
      >
        +
      </button>
    </>
  );
}
