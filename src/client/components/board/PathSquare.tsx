import { memo } from 'react';
import type { Dir, PathLevel, SquareView } from '../../../rules/index.ts';
import { ARTIFACT, CHEST, COIN, HERB, PILE } from '../../art/itemSprites.ts';
import { MOB_SPRITES } from '../../art/mobSprites.ts';
import { GATE_SPRITE, STAIRS_DOWN_SPRITE, STAIRS_UP_SPRITE } from '../../art/townSprites.ts';
import { PixelArt } from '../PixelArt.tsx';
import styles from './PathSquare.module.css';

const ARM: Record<Dir, string | undefined> = {
  N: styles.armN,
  E: styles.armE,
  S: styles.armS,
  W: styles.armW,
};

/** One Forest or Dungeon square: its path overlay, fog and Feature. */
export const PathSquare = memo(function PathSquare({
  level,
  square,
  tile,
  style,
}: {
  level: PathLevel;
  square: SquareView;
  tile: number;
  style: { left: number; top: number; width: number; height: number };
}) {
  const cls = [styles.square, styles[level], square.revealed ? styles.lit : styles.fog];
  return (
    <div className={cls.join(' ')} style={style}>
      {square.exits ? (
        <span className={styles.path}>
          <span className={styles.hub} />
          {[...square.exits].map((d) => (
            <span key={d} className={`${styles.arm} ${ARM[d as Dir] ?? ''}`} />
          ))}
        </span>
      ) : null}
      <Contents square={square} tile={tile} />
      {square.feature?.type === 'gate' ? (
        <PixelArt sprite={GATE_SPRITE} size={`${tile}px`} label="Gate to the Town" />
      ) : null}
      {square.feature?.type === 'stairs' ? (
        <PixelArt
          sprite={STAIRS_DOWN_SPRITE}
          size={`${tile}px`}
          label="Stairs down to the Dungeon"
        />
      ) : null}
      {square.feature?.type === 'stairsUp' ? (
        <PixelArt sprite={STAIRS_UP_SPRITE} size={`${tile}px`} label="Stairs up to the Forest" />
      ) : null}
    </div>
  );
});

function Contents({ square, tile }: { square: SquareView; tile: number }) {
  const size = `${Math.round(tile * 0.75)}px`;
  const token = square.token;
  return (
    <>
      {token?.type === 'gold' ? (
        <PixelArt sprite={COIN} size={size} label={`${token.amount} Gold`} />
      ) : null}
      {token?.type === 'herbs' ? <PixelArt sprite={HERB} size={size} label="Herbs" /> : null}
      {token?.type === 'artifacts' ? (
        <PixelArt sprite={ARTIFACT} size={size} label="Artifact" />
      ) : null}
      {token?.type === 'cache' ? (
        <PixelArt sprite={CHEST} size={size} label={`A Cache, rated ${token.rating}`} />
      ) : null}
      {square.pile ? <PixelArt sprite={PILE} size={size} label="A dropped pile" /> : null}
      {square.mob ? (
        <PixelArt
          sprite={MOB_SPRITES[square.mob.kind] ?? MOB_SPRITES.Goblin!}
          size={`${tile}px`}
          label={`${square.mob.kind}, ${square.mob.wounds}/${square.mob.maxWounds} Wounds`}
        />
      ) : null}
    </>
  );
}
