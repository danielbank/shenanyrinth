import { useState } from 'react';
import type { PlayerView } from '../../rules/index.ts';
import { send } from '../socket.ts';
import styles from './Errands.module.css';

/** Errands: every building passed this Turn, in any order. */
export function Errands({ view }: { view: PlayerView }) {
  const maxDeposit = view.options.filter((o) => o.type === 'deposit').length;
  if (maxDeposit === 0) return null;
  return (
    <section className={styles.errands} aria-label="Errands">
      <h3 className={styles.title}>Errands</h3>
      {maxDeposit > 0 ? <Deposit max={maxDeposit} /> : null}
    </section>
  );
}

function Deposit({ max }: { max: number }) {
  // null means "all of it", so the amount follows the Pack until the Player picks one.
  const [chosen, setChosen] = useState<number | null>(null);
  const value = Math.max(1, Math.min(chosen ?? max, max));
  return (
    <div className={styles.row}>
      <span>Keep Hall: Deposit</span>
      <button
        type="button"
        aria-label="less"
        disabled={value <= 1}
        onClick={() => setChosen(value - 1)}
      >
        −
      </button>
      <span className={styles.amount}>{value}</span>
      <button
        type="button"
        aria-label="more"
        disabled={value >= max}
        onClick={() => setChosen(value + 1)}
      >
        +
      </button>
      <span>of {max} Gold</span>
      <button type="button" onClick={() => send({ type: 'deposit', amount: value })}>
        Deposit (one-way)
      </button>
    </div>
  );
}
