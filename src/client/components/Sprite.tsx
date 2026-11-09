import { memo } from 'react';
import { sheetPlacement, type SpriteRef } from '../art/sheets.ts';
import styles from './Sprite.module.css';

/** One 16×16 Kenney sprite from a committed sheet, at a whole-number scale. */
export const Sprite = memo(function Sprite({
  sprite,
  scale,
  flip = false,
  label,
  className,
}: {
  sprite: SpriteRef;
  scale: number;
  flip?: boolean;
  label?: string;
  className?: string;
}) {
  const at = sheetPlacement(sprite, scale);
  return (
    <span
      className={className ? `${styles.sprite} ${className}` : styles.sprite}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        width: at.size,
        height: at.size,
        backgroundImage: at.image,
        backgroundSize: at.sheetSize,
        backgroundPosition: at.position,
        transform: flip ? 'scaleX(-1)' : undefined,
      }}
    />
  );
});
