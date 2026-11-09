import { STATS } from '../../rules/data.ts';
import type { LevelName, PlayerView, Trinket } from '../../rules/index.ts';
import { describeSquare, ITEM_BLURBS, TRINKET_BLURBS } from '../blurbs.ts';
import { itemName } from '../itemNames.ts';
import { send } from '../socket.ts';
import { Glyph } from './Icon.tsx';
import styles from './Drawer.module.css';

export type Inspect =
  | { kind: 'square'; level: LevelName; square: number }
  | { kind: 'player'; id: string }
  | { kind: 'chip'; chip: 'doom' | 'roll' }
  | { kind: 'item'; id: number }
  | { kind: 'trinket'; name: Trinket };

const LEVEL_NAMES = { town: 'the Town', forest: 'the Forest', dungeon: 'the Dungeon' };

/** Information only: an inspect card never acts, except through its own explicit buttons. */
export function InspectCard({
  view,
  target,
  onInspect,
  onClose,
}: {
  view: PlayerView;
  target: Inspect;
  onInspect: (next: Inspect) => void;
  onClose: () => void;
}) {
  return (
    <dialog open className={styles.drawer} aria-label="Inspect">
      <div className={styles.head}>
        <Glyph name="info" />
        <button type="button" onClick={onClose} aria-label="Close">
          <Glyph name="close" />
        </button>
      </div>
      <Body view={view} target={target} onInspect={onInspect} />
    </dialog>
  );
}

function Body({
  view,
  target,
  onInspect,
}: {
  view: PlayerView;
  target: Inspect;
  onInspect: (next: Inspect) => void;
}) {
  switch (target.kind) {
    case 'square':
      return <SquareInfo view={view} level={target.level} square={target.square} />;
    case 'player':
      return <PlayerInfo view={view} id={target.id} onInspect={onInspect} />;
    case 'chip':
      return target.chip === 'doom' ? (
        <p>
          <Glyph name="doom" /> The Doom Track: Round {view.round} of {view.doomLimit}. The game
          ends after the last Round, or after the Round in which someone slays the Red Wyrm.
        </p>
      ) : (
        <p>
          <Glyph name="dice" /> The movement roll: {view.turn?.roll ?? '–'}, with{' '}
          {view.turn?.stepsLeft ?? 0} steps left. Movement rolls are private: only the mover's own
          items can change them.
        </p>
      );
    case 'item': {
      const item = view.me?.items.find((it) => it.id === target.id);
      if (!item) return <p>That item is gone.</p>;
      return (
        <p>
          <strong>{itemName(item.kind)}</strong>
          {item.charges !== undefined ? ` (${item.charges} Charges left)` : ''}.{' '}
          {ITEM_BLURBS[item.kind]}
        </p>
      );
    }
    case 'trinket':
      return (
        <p>
          <strong>{target.name}</strong>: {TRINKET_BLURBS[target.name]}
        </p>
      );
  }
}

function SquareInfo({
  view,
  level,
  square,
}: {
  view: PlayerView;
  level: LevelName;
  square: number;
}) {
  const here = view.players.filter((p) => p.level === level && p.square === square);
  const { title, lines } = describeSquare(view, level, square);
  const mob = level === 'town' ? null : view.boards[level].squares[square]?.mob;
  return (
    <>
      <h3>{title}</h3>
      {lines.map((l) => (
        <p key={l}>{l}</p>
      ))}
      {mob ? (
        <p>
          <Glyph name="clash" /> <strong>{mob.kind}</strong>: Fight d{mob.dice.Fight}, Magic d
          {mob.dice.Magic}, Trickery d{mob.dice.Trickery}. {mob.wounds}/{mob.maxWounds} Wounds,
          Damage {mob.damage}.
        </p>
      ) : null}
      <Pieces names={here.map((p) => p.name)} />
    </>
  );
}

function Pieces({ names }: { names: string[] }) {
  return names.length ? <p>Here: {names.join(', ')}</p> : null;
}

function PlayerInfo({
  view,
  id,
  onInspect,
}: {
  view: PlayerView;
  id: string;
  onInspect: (next: Inspect) => void;
}) {
  const p = view.players.find((x) => x.id === id);
  if (!p) return null;
  const canSkip = view.turn?.player === p.id && view.options.some((o) => o.type === 'skipTurn');
  const amHost = view.players.some((x) => x.id === view.you && x.isHost);
  return (
    <>
      <h3>
        {p.name}
        {p.isHost ? ' (Host)' : ''}
        {p.online ? '' : ' · offline'}
      </h3>
      <p>
        <Glyph name="heart" /> {p.hp}/{p.maxHp} · in {LEVEL_NAMES[p.level]} ·{' '}
        <Glyph name="trophy" /> public score {p.publicScore}
      </p>
      <p>{STATS.map((s) => `${s} ${p.stats[s]}`).join(' · ')}</p>
      <div>
        Trinkets:{' '}
        {p.trinkets.length
          ? p.trinkets.map((t) => (
              <button key={t} type="button" onClick={() => onInspect({ kind: 'trinket', name: t })}>
                {t}
              </button>
            ))
          : 'none'}
      </div>
      <div>
        {canSkip ? (
          <button type="button" onClick={() => send({ type: 'skipTurn' })}>
            Skip their Turn
          </button>
        ) : null}
        {amHost && p.id !== view.you ? (
          <button type="button" onClick={() => send({ type: 'passHost', to: p.id })}>
            Make {p.name} the Host
          </button>
        ) : null}
      </div>
    </>
  );
}
