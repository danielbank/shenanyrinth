import type { PlayerView } from '../../../rules/index.ts';
import type { PieceAt } from '../../eventQueue.ts';
import { useScale } from '../../useScale.ts';
import { BUILDING_NAMES, BUILDING_SPRITES, GATE_SPRITE } from '../../art/townSprites.ts';
import { PixelArt } from '../PixelArt.tsx';
import { Controls } from './Controls.tsx';
import { place } from './geometry.ts';
import { Pieces } from './Pieces.tsx';
import styles from './Board.module.css';

export function Board({
  view,
  shown,
  settled,
}: {
  view: PlayerView;
  shown: Record<string, PieceAt>;
  settled: boolean;
}) {
  const tile = 16 * useScale();
  const level = 'town';
  const size = view.town.size;
  const squares = Array.from({ length: size * size }, (_, i) => i);
  const me = view.you ? shown[view.you] : undefined;
  return (
    <div
      className={`${styles.board} ${styles.town}`}
      style={{ width: size * tile, height: size * tile }}
    >
      {squares.map((i) => (
        <TownSquare key={i} view={view} square={i} tile={tile} />
      ))}
      {view.moves
        .filter((m) => m.level === level)
        .map((m) => (
          <span
            key={m.dir}
            className={`${styles.outline} ${m.pivot ? styles.pivot : ''}`}
            style={{ ...place(m.square, size, tile), inset: 'auto' }}
          />
        ))}
      <Pieces view={view} shown={shown} level={level} size={size} tile={tile} />
      {settled && me?.level === level ? (
        <Controls view={view} at={me.square} size={size} tile={tile} />
      ) : null}
    </div>
  );
}

function TownSquare({ view, square, tile }: { view: PlayerView; square: number; tile: number }) {
  const building = view.town.buildings[square];
  const gate = view.town.gates[square];
  const label = building ? BUILDING_NAMES[building] : gate ? `Gate (${gate})` : 'Town square';
  return (
    <div className={styles.square} style={place(square, view.town.size, tile)} title={label}>
      <span className={styles.cobble} />
      {building ? (
        <PixelArt sprite={BUILDING_SPRITES[building]} size={`${tile}px`} label={label} />
      ) : null}
      {gate ? <PixelArt sprite={GATE_SPRITE} size={`${tile}px`} label={label} /> : null}
    </div>
  );
}
