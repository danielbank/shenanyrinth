import { GEAR_NAMES, STATS } from '../../rules/data.ts';
import type { PlayerView } from '../../rules/index.ts';
import { itemName } from '../itemNames.ts';
import { SoundSettings } from './SoundSettings.tsx';
import { send } from '../socket.ts';
import { Glyph } from './Icon.tsx';
import type { Inspect } from './InspectCard.tsx';
import styles from './Drawer.module.css';

/** Your full sheet: HP, Stats, Pack, Slots, Trinkets and auto-pass. */
export function Sheet({
  view,
  onInspect,
  onClose,
}: {
  view: PlayerView;
  onInspect: (target: Inspect) => void;
  onClose: () => void;
}) {
  const me = view.players.find((p) => p.id === view.you);
  const mine = view.me;
  if (!me || !mine) return null;
  return (
    <dialog open className={styles.drawer} aria-label="Your sheet">
      <div className={styles.head}>
        <h3>{me.name}</h3>
        <button type="button" onClick={onClose} aria-label="Close">
          <Glyph name="close" />
        </button>
      </div>
      <p>
        <Glyph name="heart" /> {me.hp}/{me.maxHp} HP · <Glyph name="pivot" /> {mine.pivots} Pivots ·{' '}
        <Glyph name="sway" /> {mine.sway} Sway · <Glyph name="resist" /> {mine.resist} Resist
      </p>
      <table>
        <tbody>
          {STATS.map((s) => (
            <tr key={s}>
              <th>{s}</th>
              <td>{me.stats[s]}</td>
              <td>
                base {mine.base[s]}
                {mine.trained.includes(s) ? ' (Trained)' : ''}
                {mine.gear[s] > 0 ? ` + ${GEAR_NAMES[s][mine.gear[s] - 1]}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <Glyph name="pack" /> Pack: <Glyph name="coin" /> {mine.pack.gold} Gold ·{' '}
        <Glyph name="herb" /> {mine.pack.herbs} Herbs · <Glyph name="artifact" />{' '}
        {mine.pack.artifacts} Artifacts. Keep: {mine.keep} Gold.
      </p>
      <div>
        <Glyph name="slot" /> Slots {mine.slotsUsed}/5:{' '}
        {mine.items.map((it) => (
          <button key={it.id} type="button" onClick={() => onInspect({ kind: 'item', id: it.id })}>
            {itemName(it.kind)}
            {it.charges !== undefined ? ` ×${it.charges}` : ''}
          </button>
        ))}
      </div>
      <div>
        <Glyph name="trophy" /> Trinkets:{' '}
        {me.trinkets.length
          ? me.trinkets.map((t) => (
              <button key={t} type="button" onClick={() => onInspect({ kind: 'trinket', name: t })}>
                {t}
              </button>
            ))
          : 'none yet'}
      </div>
      {me.trinkets.includes('Rubber Chicken') ? (
        <button type="button" onClick={() => send({ type: 'squeak', at: 0 })}>
          Squeak the Rubber Chicken
        </button>
      ) : null}
      <SoundSettings />
      <label>
        <input
          type="checkbox"
          checked={mine.autoPass}
          onChange={(e) => send({ type: 'setAutoPass', on: e.target.checked })}
        />{' '}
        Auto-pass Response windows
      </label>
    </dialog>
  );
}
