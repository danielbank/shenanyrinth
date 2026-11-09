import { memo } from 'react';
import type { Drawing } from '../art/inHouse.ts';

/** Draws an in-house text-glyph drawing as crisp SVG rectangles, at a whole-number scale. */
export const PixelArt = memo(function PixelArt({
  drawing,
  fill = {},
  size = 'var(--tile)',
  label,
}: {
  drawing: Drawing;
  fill?: Record<string, string>;
  size?: string;
  label?: string;
}) {
  const palette = { ...drawing.palette, ...fill };
  const width = drawing.rows[0]?.length ?? 0;
  const rects = drawing.rows.flatMap((row, y) =>
    [...row].flatMap((ch, x) => {
      const colour = palette[ch];
      return colour
        ? [<rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={colour} />]
        : [];
    }),
  );
  return (
    <svg
      viewBox={`0 0 ${width} ${drawing.rows.length}`}
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
