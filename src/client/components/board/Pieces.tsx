import * as m from 'motion/react-m';
import type { LevelName, PlayerView } from '../../../rules/index.ts';
import type { PieceAt } from '../../eventQueue.ts';
import { HeroSprite } from '../HeroSprite.tsx';
import styles from './Board.module.css';

/**
 * Every piece on this Level. Pieces sharing a square stack exactly, with one on top (the mover,
 * else you, else whoever got there first) and a count badge that opens the square's card.
 */
export function Pieces({
  view,
  shown,
  level,
  size,
  tile,
  onInspect,
}: {
  view: PlayerView;
  shown: Record<string, PieceAt>;
  level: LevelName;
  size: number;
  tile: number;
  onInspect: (square: number) => void;
}) {
  const here = view.players.filter((p) => shown[p.id]?.level === level);
  const bySquare = new Map<number, string[]>();
  for (const p of here) {
    const at = shown[p.id]!.square;
    bySquare.set(at, [...(bySquare.get(at) ?? []), p.id]);
  }
  const rank = (id: string) => (id === view.turn?.player ? 2 : id === view.you ? 1 : 0);
  const onTop = new Set(
    [...bySquare.values()].map((ids) => ids.reduce((a, b) => (rank(b) > rank(a) ? b : a))),
  );
  return (
    <>
      {here.map((p) => {
        const at = shown[p.id]!.square;
        return (
          <m.div
            key={p.id}
            className={styles.piece}
            style={{ width: tile, height: tile, zIndex: onTop.has(p.id) ? 2 : 1 }}
            initial={false}
            animate={{ x: (at % size) * tile, y: Math.floor(at / size) * tile }}
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
      })}
      {[...bySquare].map(([at, ids]) =>
        ids.length > 1 ? (
          <button
            key={`stack-${at}`}
            type="button"
            className={styles.stack}
            style={{ left: ((at % size) + 1) * tile, top: Math.floor(at / size) * tile }}
            aria-label={`${ids.length} players here: show them`}
            onClick={() => onInspect(at)}
          >
            {ids.length}
          </button>
        ) : null,
      )}
    </>
  );
}
