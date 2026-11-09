import { memo } from 'react';
import { ICONS, type IconName } from '../art/icons.ts';
import styles from './Icon.module.css';

const OUTLINE = '#3f2631';

/** A glyph tinted to its Tiny colour with a 1px outline: the inline treatment. */
export const Glyph = memo(function Glyph({
  name,
  size = 18,
  label,
}: {
  name: IconName;
  size?: number;
  label?: string;
}) {
  const icon = ICONS[name];
  const filled = new Set<string>();
  icon.rows.forEach((row, y) => [...row].forEach((ch, x) => ch === 'x' && filled.add(`${x},${y}`)));
  const outline: string[] = [];
  for (let y = -1; y <= icon.rows.length; y++) {
    for (let x = -1; x <= icon.rows.length; x++) {
      if (filled.has(`${x},${y}`)) continue;
      const near = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => filled.has(`${x + dx!},${y + dy!}`));
      if (near) outline.push(`${x},${y}`);
    }
  }
  return (
    <svg
      className={styles.glyph}
      viewBox="-1 -1 11 11"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {outline.map((k) => {
        const [x, y] = k.split(',').map(Number);
        return <rect key={`o${k}`} x={x} y={y} width={1} height={1} fill={OUTLINE} />;
      })}
      {[...filled].map((k) => {
        const [x, y] = k.split(',').map(Number);
        return <rect key={k} x={x} y={y} width={1} height={1} fill={icon.colour} />;
      })}
    </svg>
  );
});

/** A glyph on a dark tile: the treatment for HUD buttons over the board. */
export function Badge({ name, label }: { name: IconName; label?: string }) {
  return (
    <span className={styles.badge}>
      <Glyph name={name} size={22} label={label} />
    </span>
  );
}
