import { memo } from 'react';
import { IN_HOUSE_ICONS } from '../art/inHouse.ts';
import { ICON_SPRITES, sheetPlacement } from '../art/sheets.ts';
import styles from './Icon.module.css';

export type IconName = keyof typeof ICON_SPRITES | keyof typeof IN_HOUSE_ICONS;

/** A 16×16 icon tinted to its Tiny colour with a 1px outline: the inline treatment. */
export const Glyph = memo(function Glyph({
  name,
  scale = 1,
  colour,
  label,
}: {
  name: IconName;
  scale?: number;
  /** Overrides the icon's own tint, as on a badge. */
  colour?: string;
  label?: string;
}) {
  const size = 16 * scale;
  const a11y = {
    role: label ? 'img' : undefined,
    'aria-label': label,
    'aria-hidden': label ? undefined : true,
  } as const;
  const outline = { '--px': `${scale}px` } as React.CSSProperties;
  if (name in IN_HOUSE_ICONS) {
    const icon = IN_HOUSE_ICONS[name as keyof typeof IN_HOUSE_ICONS];
    return (
      <svg
        className={styles.glyph}
        style={outline}
        viewBox="0 0 16 16"
        width={size}
        height={size}
        shapeRendering="crispEdges"
        {...a11y}
      >
        {icon.rows.flatMap((row, y) =>
          [...row].flatMap((ch, x) =>
            ch === 'x'
              ? [
                  <rect
                    key={`${x},${y}`}
                    x={x}
                    y={y}
                    width={1}
                    height={1}
                    fill={colour ?? icon.colour}
                  />,
                ]
              : [],
          ),
        )}
      </svg>
    );
  }
  const { sprite, colour: tint } = ICON_SPRITES[name as keyof typeof ICON_SPRITES];
  const at = sheetPlacement(sprite, scale);
  const mask = { maskImage: at.image, maskSize: at.sheetSize, maskPosition: at.position };
  return (
    <span className={styles.glyph} style={outline} {...a11y}>
      <span
        className={styles.mask}
        style={{ width: size, height: size, background: colour ?? tint, ...mask }}
      />
    </span>
  );
});

/** An icon on a dark tile: the treatment for HUD buttons over the board. */
export function Badge({ name, label }: { name: IconName; label?: string }) {
  return (
    <span className={styles.badge}>
      <Glyph name={name} scale={2} colour="#f4e9d8" label={label} />
    </span>
  );
}
