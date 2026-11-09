import type { PlayerView } from '../../rules/index.ts';
import styles from './FinalScores.module.css';

export function FinalScores({ view }: { view: PlayerView }) {
  const final = view.final;
  if (!final) return null;
  const names = new Map(view.players.map((p) => [p.id, p.name]));
  const name = (id: string) => names.get(id) ?? id;
  const winners = new Set(final.winners);
  const sorted = [...final.scores].sort((a, b) => b.total - a.total);
  return (
    <dialog open className={styles.overlay} aria-label="Final scores">
      <div className={styles.card}>
        <h2>{final.winners.map(name).join(' & ')} wins!</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Player</th>
              <th>Keep</th>
              <th>Pack ½</th>
              <th>Trophies</th>
              <th>Deeds</th>
              <th>Trinkets</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.player} className={winners.has(s.player) ? styles.winner : ''}>
                <td>{name(s.player)}</td>
                <td>{s.keep}</td>
                <td>{s.pack}</td>
                <td>{s.trophies}</td>
                <td>{s.deeds}</td>
                <td>{s.trinkets}</td>
                <td>{s.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </dialog>
  );
}
