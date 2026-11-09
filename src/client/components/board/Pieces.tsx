import * as m from 'motion/react-m';
import type { LevelName, PlayerView } from '../../../rules/index.ts';
import type { PieceAt } from '../../eventQueue.ts';
import { HeroSprite } from '../HeroSprite.tsx';
import styles from './Board.module.css';

export function Pieces({
  view,
  shown,
  level,
  size,
  tile,
}: {
  view: PlayerView;
  shown: Record<string, PieceAt>;
  level: LevelName;
  size: number;
  tile: number;
}) {
  const here = view.players.filter((p) => shown[p.id]?.level === level);
  return here.map((p) => {
    const at = shown[p.id]!.square;
    const sharing = here.filter((q) => shown[q.id]?.square === at);
    const k = sharing.indexOf(p);
    const nudge = sharing.length > 1 ? (k - (sharing.length - 1) / 2) * (tile / 4) : 0;
    return (
      <m.div
        key={p.id}
        className={styles.piece}
        style={{ width: tile, height: tile }}
        initial={false}
        animate={{ x: (at % size) * tile + nudge, y: Math.floor(at / size) * tile }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <HeroSprite
          hero={p.hero}
          colour={p.colour}
          scale={tile / 16}
          facingWest={p.heading === 'W'}
        />
      </m.div>
    );
  });
}
