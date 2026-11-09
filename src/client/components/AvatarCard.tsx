import { STATS } from '../../rules/data.ts';
import type { PlayerView } from '../../rules/index.ts';
import { send } from '../socket.ts';
import { HeroSprite } from './HeroSprite.tsx';
import styles from './Drawer.module.css';

const LEVEL_NAMES = { town: 'the Town', forest: 'the Forest', dungeon: 'the Dungeon' };

/** What everyone can see about a Player: never their Pack or carried items. */
export function AvatarCard({
  view,
  playerId,
  onClose,
}: {
  view: PlayerView;
  playerId: string;
  onClose: () => void;
}) {
  const p = view.players.find((x) => x.id === playerId);
  if (!p) return null;
  const canSkip = view.turn?.player === p.id && view.options.some((o) => o.type === 'skipTurn');
  const amHost = view.players.some((x) => x.id === view.you && x.isHost);
  return (
    <dialog open className={styles.drawer} aria-label={`${p.name}'s card`}>
      <div className={styles.head}>
        <h3>
          <HeroSprite hero={p.hero} colour={p.colour} size="32px" /> {p.name}
          {p.isHost ? ' (Host)' : ''}
          {p.online ? '' : ' · offline'}
        </h3>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <p>
        ♥ {p.hp}/{p.maxHp} · in {LEVEL_NAMES[p.level]} · public score {p.publicScore}
      </p>
      <p>{STATS.map((s) => `${s} ${p.stats[s]}`).join(' · ')}</p>
      <p>Trinkets: {p.trinkets.length ? p.trinkets.join(', ') : 'none'}</p>
      <div>
        {canSkip ? (
          <button type="button" onClick={() => send({ type: 'skipTurn' })}>
            Skip their Turn
          </button>
        ) : null}
        {amHost && p.id !== view.you ? (
          <button type="button" onClick={() => send({ type: 'passHost', to: p.id })}>
            Make {p.name} the Host
          </button>
        ) : null}
      </div>
    </dialog>
  );
}
