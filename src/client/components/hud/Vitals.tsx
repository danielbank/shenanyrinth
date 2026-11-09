import type { PlayerView } from '../../../rules/index.ts';
import { Glyph } from '../Icon.tsx';
import styles from './Hud.module.css';

/** HP and Pivots; tap to open your full sheet. */
export function Vitals({ view, onOpen }: { view: PlayerView; onOpen: () => void }) {
  const me = view.players.find((p) => p.id === view.you);
  if (!me || !view.me) return null;
  return (
    <button type="button" className={styles.vitals} onClick={onOpen} aria-label="Open your sheet">
      <span className={styles.hp}>
        <Glyph name="heart" /> {me.hp}/{me.maxHp}
      </span>
      <span>
        <Glyph name="pivot" /> {view.me.pivots}
      </span>
      <span>
        <Glyph name="coin" /> {view.me.pack.gold}
      </span>
    </button>
  );
}
