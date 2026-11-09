import { memo } from 'react';
import * as m from 'motion/react-m';
import type { PathLevel, SquareView } from '../../../rules/index.ts';
import { PATH_DRAWINGS, pathShape } from '../../art/inHouse.ts';
import {
  GATE_SPRITE,
  GROUND,
  MOB_SPRITES,
  STAIRS_DOWN_SPRITE,
  STAIRS_UP_SPRITE,
  TOKEN_SPRITES,
  variant,
} from '../../art/sheets.ts';
import { PixelArt } from '../PixelArt.tsx';
import { Sprite } from '../Sprite.tsx';
import styles from './PathSquare.module.css';

/** One Forest or Dungeon square: its ground, path overlay, fog and Feature. */
export const PathSquare = memo(function PathSquare({
  level,
  square,
  tile,
  index,
  style,
  onInspect,
}: {
  level: PathLevel;
  square: SquareView;
  tile: number;
  index: number;
  style: { left: number; top: number; width: number; height: number };
  onInspect: (square: number) => void;
}) {
  const scale = tile / 16;
  const ground =
    level === 'forest' ? variant(GROUND.grass, index) : variant(GROUND.dungeonFloor, index);
  const fog = level === 'forest' ? GROUND.forestFog : variant(GROUND.dungeonRock, index);
  const path = square.exits ? pathShape(square.exits) : null;
  return (
    <button
      type="button"
      className={styles.square}
      style={style}
      aria-label={`Inspect square ${index}`}
      onClick={() => onInspect(index)}
    >
      <Sprite sprite={ground} scale={scale} className={styles.layer} />
      {path ? (
        <span className={styles.layer} style={{ transform: `rotate(${path.quarters * 90}deg)` }}>
          <PixelArt drawing={PATH_DRAWINGS[level][path.shape]!} size={`${tile}px`} />
        </span>
      ) : null}
      <Contents square={square} scale={scale} />
      <m.span
        className={styles.fogLayer}
        initial={false}
        animate={{ opacity: square.revealed ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <Sprite
          sprite={fog}
          scale={scale}
          className={level === 'forest' ? `${styles.layer} ${styles.leafy}` : styles.layer}
        />
      </m.span>
      {square.feature?.type === 'gate' ? (
        <Sprite
          sprite={GATE_SPRITE}
          scale={scale}
          className={styles.feature}
          label="Gate to the Town"
        />
      ) : null}
      {square.feature?.type === 'stairs' ? (
        <Sprite
          sprite={STAIRS_DOWN_SPRITE}
          scale={scale}
          className={styles.feature}
          label="Stairs down to the Dungeon"
        />
      ) : null}
      {square.feature?.type === 'stairsUp' ? (
        <Sprite
          sprite={STAIRS_UP_SPRITE}
          scale={scale}
          className={styles.feature}
          label="Stairs up to the Forest"
        />
      ) : null}
    </button>
  );
});

function Contents({ square, scale }: { square: SquareView; scale: number }) {
  const token = square.token;
  const at = (label: string, sprite: typeof TOKEN_SPRITES.gold) => (
    <Sprite sprite={sprite} scale={scale} className={styles.layer} label={label} />
  );
  return (
    <>
      {token?.type === 'gold' ? at(`${token.amount} Gold`, TOKEN_SPRITES.gold) : null}
      {token?.type === 'herbs' ? at('Herbs', TOKEN_SPRITES.herbs) : null}
      {token?.type === 'artifacts' ? at('Artifact', TOKEN_SPRITES.artifacts) : null}
      {token?.type === 'cache' ? at(`A Cache, rated ${token.rating}`, TOKEN_SPRITES.cache) : null}
      {square.pile ? at('A dropped pile', TOKEN_SPRITES.pile) : null}
      {square.mob
        ? at(
            `${square.mob.kind}, ${square.mob.wounds}/${square.mob.maxWounds} Wounds`,
            MOB_SPRITES[square.mob.kind]!,
          )
        : null}
    </>
  );
}
