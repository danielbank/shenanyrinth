import type { LevelName, PlayerView } from '../../../rules/index.ts';
import type { PieceAt } from '../../eventQueue.ts';
import { useScale } from '../../useScale.ts';
import { BUILDING_SPRITES, GATE_SPRITE, GROUND, variant } from '../../art/sheets.ts';
import { BUILDING_NAMES } from '../../blurbs.ts';
import { Sprite } from '../Sprite.tsx';
import { place } from './geometry.ts';
import { PathSquare } from './PathSquare.tsx';
import { Pieces } from './Pieces.tsx';
import styles from './Board.module.css';

export function Board({
  view,
  level,
  shown,
  picks,
  onPick,
  onInspect,
}: {
  view: PlayerView;
  level: LevelName;
  shown: Record<string, PieceAt>;
  /** Squares picked while aiming an item, or null when not aiming. */
  picks: number[] | null;
  onPick: (square: number) => void;
  /** Tapping a square only ever opens its inspect card. */
  onInspect: (square: number) => void;
}) {
  const tile = 16 * useScale();
  const size = level === 'town' ? view.town.size : view.boards[level].size;
  const picked = new Set(picks ?? []);
  return (
    <div className={styles.board} style={{ width: size * tile, height: size * tile }}>
      {squareIds(size).map((i) =>
        level === 'town' ? (
          <TownSquare key={i} view={view} square={i} tile={tile} onInspect={onInspect} />
        ) : (
          <PathSquare
            key={i}
            level={level}
            square={view.boards[level].squares[i]!}
            tile={tile}
            index={i}
            style={place(i, size, tile)}
            onInspect={onInspect}
          />
        ),
      )}
      {view.moves
        .filter((m) => m.level === level)
        .map((m) => (
          <span
            key={m.dir}
            className={`${styles.outline} ${m.pivot ? styles.pivot : ''}`}
            style={{ ...place(m.square, size, tile), inset: 'auto' }}
          />
        ))}
      <Pieces
        view={view}
        shown={shown}
        level={level}
        size={size}
        tile={tile}
        onInspect={onInspect}
      />
      {picks
        ? squareIds(size).map((i) => (
            <button
              key={`pick-${i}`}
              type="button"
              aria-label={`Pick square ${i}`}
              aria-pressed={picked.has(i)}
              className={`${styles.pick} ${picked.has(i) ? styles.picked : ''}`}
              style={place(i, size, tile)}
              onClick={() => onPick(i)}
            />
          ))
        : null}
    </div>
  );
}

const ids = new Map<number, number[]>();
/** The square numbers of a board, built once per size. */
function squareIds(size: number): number[] {
  let list = ids.get(size);
  if (!list) {
    list = Array.from({ length: size * size }, (_, i) => i);
    ids.set(size, list);
  }
  return list;
}

function TownSquare({
  view,
  square,
  tile,
  onInspect,
}: {
  view: PlayerView;
  square: number;
  tile: number;
  onInspect: (square: number) => void;
}) {
  const building = view.town.buildings[square];
  const gate = view.town.gates[square];
  const label = building ? BUILDING_NAMES[building] : gate ? `Gate (${gate})` : 'Town square';
  return (
    <button
      type="button"
      className={styles.square}
      style={place(square, view.town.size, tile)}
      aria-label={label}
      onClick={() => onInspect(square)}
    >
      <Sprite sprite={variant(GROUND.grass, square)} scale={tile / 16} className={styles.layer} />
      {building ? (
        <Sprite
          sprite={BUILDING_SPRITES[building]}
          scale={tile / 16}
          className={styles.layer}
          label={label}
        />
      ) : null}
      {gate ? (
        <Sprite sprite={GATE_SPRITE} scale={tile / 16} className={styles.layer} label={label} />
      ) : null}
    </button>
  );
}
