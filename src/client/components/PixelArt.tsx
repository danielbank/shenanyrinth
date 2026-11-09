import { memo } from 'react';
import type { Sprite } from '../art/sprites.ts';

/** Draws a text-glyph sprite as crisp SVG rectangles, scaled by whole numbers in CSS. */
export const PixelArt = memo(function PixelArt({
  sprite,
  fill = {},
  size = 'var(--tile)',
  label,
}: {
  sprite: Sprite;
  fill?: Record<string, string>;
  size?: string;
  label?: string;
}) {
  const palette = { ...sprite.palette, ...fill };
  const width = sprite.rows[0]?.length ?? 0;
  const rects = sprite.rows.flatMap((row, y) =>
    [...row].flatMap((ch, x) => {
      const colour = palette[ch];
      return colour
        ? [<rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={colour} />]
        : [];
    }),
  );
  return (
    <svg
      viewBox={`0 0 ${width} ${sprite.rows.length}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rects}
    </svg>
  );
});
