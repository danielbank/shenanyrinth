import type { PlayerView } from '../../../rules/index.ts';
import { HeroSprite } from '../HeroSprite.tsx';
import styles from './Hud.module.css';

export function PlayerRow({ view }: { view: PlayerView }) {
  const bySeat = view.seats.flatMap((id) => view.players.filter((p) => p.id === id));
  return (
    <ol className={styles.row} aria-label="Players in Turn order">
      {bySeat.map((p) => {
        const current = view.turn?.player === p.id;
        const cls = [styles.avatar, current ? styles.current : '', p.online ? '' : styles.offline];
        return (
          <li key={p.id} className={cls.join(' ')}>
            <HeroSprite hero={p.hero} colour={p.colour} size="24px" />
            <span>{p.name}</span>
            <span className={styles.score}>{p.publicScore}</span>
            {current ? <span className={styles.tag}>TURN</span> : null}
            {p.online ? null : <small>off</small>}
          </li>
        );
      })}
    </ol>
  );
}
