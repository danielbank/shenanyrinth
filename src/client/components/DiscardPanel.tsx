import { GEAR_NAMES } from '../../rules/data.ts';
import type { PlayerView } from '../../rules/index.ts';
import { itemName } from '../itemNames.ts';
import { send } from '../socket.ts';
import styles from './ClashPanel.module.css';

/** Over 5 Slots: choose what to discard. */
export function DiscardPanel({ view }: { view: PlayerView }) {
  const discards = view.options.filter((o) => o.type === 'discard');
  if (discards.length === 0 || !view.me) return null;
  const items = new Map(view.me.items.map((it) => [it.id, it]));
  return (
    <section className={styles.panel} aria-label="Discard">
      <strong>Your Slots are full. Choose something to discard:</strong>
      <div className={styles.actions}>
        {discards.map((d) => {
          if (d.type !== 'discard') return null;
          const item = d.item === undefined ? undefined : items.get(d.item);
          const label = item
            ? itemName(item.kind)
            : d.gear
              ? GEAR_NAMES[d.gear][(view.me?.gear[d.gear] ?? 1) - 1]
              : '?';
          return (
            <button key={JSON.stringify(d)} type="button" onClick={() => send(d)}>
              Discard {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
