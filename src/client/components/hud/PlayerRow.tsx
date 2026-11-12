import type { PlayerView } from '../../../rules/index.ts';
import { HeroSprite } from '../HeroSprite.tsx';
import styles from './Hud.module.css';

export function PlayerRow({
  view,
  onInspect,
}: {
  view: PlayerView;
  onInspect: (id: string) => void;
}) {
  const bySeat = view.seats.flatMap((id) => view.players.filter((p) => p.id === id));
  return (
    <ol className={styles.row} aria-label="Players in Turn order">
      {bySeat.map((p) => {
        const current = view.turn?.player === p.id;
        const cls = [styles.avatar, current ? styles.current : '', p.online ? '' : styles.offline];
        return (
          <li key={p.id}>
            <button
              type="button"
              className={cls.join(' ')}
              aria-label={`${p.name}${p.bot ? ' (Bot)' : ''}: ${p.publicScore} points`}
              onClick={() => onInspect(p.id)}
            >
              <HeroSprite hero={p.hero} colour={p.colour} scale={2} />
              <span>{p.name}</span>
              <span className={styles.score}>{p.publicScore}</span>
              {current ? <span className={styles.tag}>TURN</span> : null}
              {p.bot ? <span className={styles.botTag}>BOT</span> : null}
              {p.online ? null : <small>off</small>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
