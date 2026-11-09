import { APPROACH_STAT } from '../../rules/data.ts';
import type { Approach, Clash, PlayerView } from '../../rules/index.ts';
import { MOB_SPRITES } from '../art/sheets.ts';
import { send } from '../socket.ts';
import { Die } from './Die.tsx';
import { Sprite } from './Sprite.tsx';
import styles from './ClashPanel.module.css';

/** The Clash: both dice face-up, then Press (with any Approach) or Retreat. */
export function ClashPanel({ view }: { view: PlayerView }) {
  const clash = view.clash;
  if (!clash) return null;
  const mob = view.boards[clash.level].squares[clash.square]?.mob;
  const fighter = view.players.find((p) => p.id === clash.player);
  if (!mob || !fighter) return null;
  const mine = clash.player === view.you;
  const canRetreat = view.options.some((o) => o.type === 'retreat');
  return (
    <section className={styles.panel} aria-label="Clash">
      <div className={styles.head}>
        <Sprite sprite={MOB_SPRITES[mob.kind]!} scale={2} />
        <strong>
          {fighter.name} vs {mob.kind}
        </strong>
        <span className={styles.wounds} aria-label={`${mob.wounds} of ${mob.maxWounds} Wounds`}>
          {'✖'.repeat(mob.wounds)}
          {'·'.repeat(mob.maxWounds - mob.wounds)}
        </span>
        <span>
          ♥ {fighter.hp}/{fighter.maxHp}
        </span>
      </div>
      {clash.last ? <LastExchange last={clash.last} /> : <p>Ambush! Choose an Approach.</p>}
      {mine ? (
        <div className={styles.actions}>
          {(['Fight', 'Magic', 'Trickery'] as Approach[]).map((a) => (
            <button key={a} type="button" onClick={() => send({ type: 'exchange', approach: a })}>
              {clash.exchanges > 0 ? 'Press: ' : ''}
              {a} (+{fighter.stats[APPROACH_STAT[a]]} vs d{mob.dice[a]})
            </button>
          ))}
          {canRetreat ? (
            <button type="button" onClick={() => send({ type: 'retreat' })}>
              Retreat
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function LastExchange({ last }: { last: NonNullable<Clash['last']> }) {
  const [mine, theirs] = last.dice;
  const verdict = { player: 'Hit! A Wound lands.', mob: 'Ouch! The Mob hits.', tie: 'A tie.' };
  return (
    <div className={styles.duel}>
      <div>
        {mine ? <Die faces={mine.faces} value={mine.value} /> : null} +{last.bonus[0]}
        <div className={styles.total}>{last.totals[0]}</div>
      </div>
      <div className={styles.result}>
        {last.approach}
        <br />
        {verdict[last.winner]}
      </div>
      <div>
        {theirs ? <Die faces={theirs.faces} value={theirs.value} /> : null}
        <div className={styles.total}>{last.totals[1]}</div>
      </div>
    </div>
  );
}
