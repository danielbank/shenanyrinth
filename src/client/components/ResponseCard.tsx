import { useState } from 'react';
import * as m from 'motion/react-m';
import type { DieInPlay, ItemKind, PlayerView, ResponseWindow } from '../../rules/index.ts';
import { COLOUR_HEX } from '../art/sprites.ts';
import { itemName } from '../itemNames.ts';
import { send } from '../socket.ts';
import { Die } from './Die.tsx';
import styles from './ResponseCard.module.css';

const WINDOW_MS = 8000;

/** The Response window: both dice, your options and the 8-second countdown. */
export function ResponseCard({ view }: { view: PlayerView }) {
  const w = view.response;
  if (!w) return null;
  return <Card key={w.id} view={view} w={w} />;
}

function Card({ view, w }: { view: PlayerView; w: ResponseWindow }) {
  const [aiming, setAiming] = useState<{ item: number; kind: ItemKind; picks: number[] } | null>(
    null,
  );
  const colours = new Map(view.players.map((p) => [p.id, COLOUR_HEX[p.colour]]));
  const names = new Map(view.players.map((p) => [p.id, p.name]));
  const name = (owner: string) => (owner === 'mob' ? 'The Mob' : (names.get(owner) ?? owner));
  const left = view.responseMsLeft ?? WINDOW_MS;
  const options = view.options;
  const canSway = (die: number, delta: number) =>
    options.some((o) => o.type === 'sway' && o.die === die && o.delta === delta);
  const meddlers = (view.me?.items ?? []).filter(
    (it) => (it.kind === 'coin' || it.kind === 'hush') && options.some((o) => o.type === 'pass'),
  );
  const knuckle = options.find((o) => o.type === 'use');
  const picked = new Set(aiming?.picks ?? []);

  function pickDie(id: number) {
    if (!aiming) return;
    const picks = [...aiming.picks, id];
    const needed = aiming.kind === 'coin' ? 2 : 1;
    if (picks.length < needed) {
      setAiming({ ...aiming, picks });
      return;
    }
    void send(
      aiming.kind === 'coin'
        ? { type: 'use', item: aiming.item, dice: [picks[0]!, picks[1]!] }
        : { type: 'use', item: aiming.item, die: picks[0]! },
    );
    setAiming(null);
  }

  const side = (owner: string, bonus: number, total: number) => (
    <div>
      <div>{name(owner)}</div>
      <div className={styles.dice}>
        {w.dice
          .filter((d) => d.owner === owner)
          .map((d) => (
            <DieControl
              key={d.id}
              die={d}
              glow={d.touchedBy ? colours.get(d.touchedBy) : undefined}
              canUp={canSway(d.id, 1)}
              canDown={canSway(d.id, -1)}
              aiming={aiming !== null}
              picked={picked.has(d.id)}
              onPick={() => pickDie(d.id)}
            />
          ))}
      </div>
      <div>+{bonus}</div>
      <div className={styles.total}>{total}</div>
    </div>
  );

  const totals = w.sides.map(
    (s) => s.bonus + w.dice.filter((d) => d.owner === s.owner).reduce((a, d) => a + d.value, 0),
  );
  const pendingForMe = options.some((o) => o.type === 'resist');
  return (
    <dialog open className={styles.card} aria-label="Response window">
      <div className={styles.bar}>
        <m.div
          className={styles.fill}
          initial={{ scaleX: left / WINDOW_MS }}
          animate={{ scaleX: 0 }}
          transition={{ duration: left / 1000, ease: 'linear' }}
        />
      </div>
      <div className={styles.sides}>
        {side(w.sides[0].owner, w.sides[0].bonus, totals[0] ?? 0)}
        <strong>vs</strong>
        {side(w.sides[1].owner, w.sides[1].bonus, totals[1] ?? 0)}
      </div>
      {w.pending ? (
        <p>
          {name(w.pending.by)} is Meddling with {w.pending.targets.map(name).join(' and ')}’s dice
          {pendingForMe ? '. Resist it?' : '…'}
        </p>
      ) : null}
      <div className={styles.actions}>
        {pendingForMe ? (
          <>
            <button type="button" onClick={() => send({ type: 'resist' })}>
              Resist (1 of {view.me?.resist})
            </button>
            <button type="button" onClick={() => send({ type: 'allow' })}>
              Let it land
            </button>
          </>
        ) : null}
        {knuckle ? (
          <button type="button" onClick={() => send(knuckle)}>
            Lucky Knucklebone: +1d6
          </button>
        ) : null}
        {meddlers.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => setAiming({ item: it.id, kind: it.kind, picks: [] })}
          >
            {itemName(it.kind)}… {aiming?.item === it.id ? '(tap dice)' : ''}
          </button>
        ))}
        {options.some((o) => o.type === 'pass') ? (
          <button type="button" onClick={() => send({ type: 'pass' })}>
            Pass{view.me ? ` (Sway ${view.me.sway})` : ''}
          </button>
        ) : null}
        {options.length === 0 ? <span>Waiting for responses…</span> : null}
      </div>
    </dialog>
  );
}

function DieControl({
  die,
  glow,
  canUp,
  canDown,
  aiming,
  picked,
  onPick,
}: {
  die: DieInPlay;
  glow: string | undefined;
  canUp: boolean;
  canDown: boolean;
  aiming: boolean;
  picked: boolean;
  onPick: () => void;
}) {
  const face = <Die faces={die.faces} value={die.value} glow={glow} />;
  return (
    <div className={`${styles.die} ${picked ? styles.picked : ''}`}>
      {aiming ? (
        <button
          type="button"
          aria-label={`Pick d${die.faces} showing ${die.value}`}
          onClick={onPick}
        >
          {face}
        </button>
      ) : (
        face
      )}
      {canUp || canDown ? (
        <div className={styles.nudges}>
          <button
            type="button"
            disabled={!canDown}
            aria-label="Sway down"
            onClick={() => send({ type: 'sway', die: die.id, delta: -1 })}
          >
            −
          </button>
          <button
            type="button"
            disabled={!canUp}
            aria-label="Sway up"
            onClick={() => send({ type: 'sway', die: die.id, delta: 1 })}
          >
            +
          </button>
        </div>
      ) : null}
    </div>
  );
}
