import type { Colour, Hero } from '../../rules/index.ts';
import { COLOUR_HEX } from '../art/colours.ts';
import { HERO_SPRITES } from '../art/sheets.ts';
import { useScale } from '../useScale.ts';
import styles from './HeroSprite.module.css';
import { Sprite } from './Sprite.tsx';

/** A Tiny Dungeon hero as drawn, standing on a ring in the Player's colour. */
export function HeroSprite({
  hero,
  colour,
  scale,
  facingWest = false,
}: {
  hero: Hero;
  colour: Colour;
  scale?: number;
  facingWest?: boolean;
}) {
  const screen = useScale();
  const s = scale ?? screen;
  return (
    <span
      className={styles.hero}
      style={
        {
          width: 16 * s,
          height: 16 * s,
          '--ring': COLOUR_HEX[colour] ?? '#888',
          '--px': `${s}px`,
        } as React.CSSProperties
      }
      role="img"
      aria-label={`${colour} ${hero}`}
    >
      <span className={styles.ring} />
      <Sprite sprite={HERO_SPRITES[hero]} scale={s} flip={facingWest} />
    </span>
  );
}
