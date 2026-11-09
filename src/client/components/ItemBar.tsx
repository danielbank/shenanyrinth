import type { Item, PlayerView } from '../../rules/index.ts';
import { itemName, picksNeeded } from '../itemNames.ts';
import { send } from '../socket.ts';
import styles from './ItemBar.module.css';

export interface Aim {
  item: Item;
  picks: number[];
}

/** Your carried items: tap to use, or to aim at squares on the board. */
export function ItemBar({
  view,
  onAim,
  onInspect,
}: {
  view: PlayerView;
  onAim: (aim: Aim) => void;
  onInspect: (item: number) => void;
}) {
  const items = view.me?.items ?? [];
  if (items.length === 0) return null;
  return (
    <div className={styles.bar} aria-label="Your items">
      {items.map((item) => {
        const ready = view.options.find((o) => o.type === 'use' && o.item === item.id);
        const aimable = view.aimable.some((a) => a.id === item.id);
        const label = `${itemName(item.kind)}${item.charges !== undefined ? ` ×${item.charges}` : ''}`;
        return (
          <span key={item.id} className={styles.slot}>
            <button
              type="button"
              className={`${styles.item} ${ready || aimable ? '' : styles.idle}`}
              onClick={() => onInspect(item.id)}
            >
              {label}
            </button>
            {ready ? (
              <button type="button" className={styles.use} onClick={() => send(ready)}>
                Use
              </button>
            ) : null}
            {aimable ? (
              <button
                type="button"
                className={styles.use}
                onClick={() => onAim({ item, picks: [] })}
              >
                Use…
              </button>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

/** The aiming banner: pick squares on the board, then confirm. */
export function AimBanner({ aim, onDone }: { aim: Aim; onDone: () => void }) {
  const needed = picksNeeded(aim.item.kind);
  const ready = aim.picks.length === needed;
  async function confirm() {
    const [first, second] = aim.picks;
    const action =
      aim.item.kind === 'stones'
        ? { type: 'use' as const, item: aim.item.id, a: first, b: second }
        : { type: 'use' as const, item: aim.item.id, square: first };
    await send(action);
    onDone();
  }
  return (
    <div className={styles.aim} role="status">
      <span>
        {itemName(aim.item.kind)}: tap {needed === 2 ? 'two squares' : 'a square'} (
        {aim.picks.length}/{needed})
      </span>
      <button type="button" disabled={!ready} onClick={confirm}>
        Confirm
      </button>
      <button type="button" onClick={onDone}>
        Cancel
      </button>
    </div>
  );
}
