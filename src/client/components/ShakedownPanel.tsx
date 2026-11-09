import { APPROACHES, APPROACH_STAT } from '../../rules/data.ts';
import type { PlayerView } from '../../rules/index.ts';
import { send } from '../socket.ts';
import styles from './ClashPanel.module.css';

/** A Shakedown waiting for the defender's Approach. */
export function ShakedownPanel({ view }: { view: PlayerView }) {
  const s = view.shakedown;
  if (!s) return null;
  const names = new Map(view.players.map((p) => [p.id, p]));
  const attacker = names.get(s.attacker);
  const defender = names.get(s.defender);
  if (!attacker || !defender) return null;
  const defending = view.options.some((o) => o.type === 'defend');
  return (
    <section className={styles.panel} aria-label="Shakedown">
      <strong>
        {attacker.name} {s.ram ? 'Rams' : 'Shakes down'} {defender.name} with {s.approach}!
      </strong>
      {defending ? (
        <div className={styles.actions}>
          {APPROACHES.map((a) => (
            <button key={a} type="button" onClick={() => send({ type: 'defend', approach: a })}>
              Defend: {a} (+{defender.stats[APPROACH_STAT[a]]})
            </button>
          ))}
        </div>
      ) : (
        <p>Waiting for {defender.name} to choose an Approach…</p>
      )}
    </section>
  );
}
