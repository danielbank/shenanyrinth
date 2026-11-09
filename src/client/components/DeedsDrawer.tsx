import type { PlayerView } from '../../rules/index.ts';
import styles from './Drawer.module.css';

/** The three public Deeds and who claimed each one. */
export function DeedsDrawer({ view, onClose }: { view: PlayerView; onClose: () => void }) {
  const names = new Map(view.players.map((p) => [p.id, p.name]));
  return (
    <dialog open className={styles.drawer} aria-label="Deeds">
      <div className={styles.head}>
        <h3>Deeds</h3>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <ul className={styles.list}>
        {view.deeds.map((d) => (
          <li key={d.id} className={`${styles.deed} ${d.claimedBy ? styles.claimed : ''}`}>
            <div className={styles.tier}>
              {d.tier} · {d.points} points
            </div>
            <strong>{d.name}</strong>: first to {d.text}.
            <div>{d.claimedBy ? `Claimed by ${names.get(d.claimedBy) ?? '?'}` : 'Unclaimed'}</div>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
