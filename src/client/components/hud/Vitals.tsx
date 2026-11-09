import type { PlayerView } from '../../../rules/index.ts';
import styles from './Hud.module.css';

export function Vitals({ view }: { view: PlayerView }) {
  const me = view.players.find((p) => p.id === view.you);
  if (!me || !view.me) return null;
  return (
    <div className={styles.vitals}>
      <span className={styles.hp}>
        ♥ {me.hp}/{me.maxHp}
      </span>
      <span>↻ {view.me.pivots}</span>
      <span>Pack {view.me.pack.gold}g</span>
      <span>Keep {view.me.keep}g</span>
    </div>
  );
}
