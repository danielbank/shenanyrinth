import type { PlayerView, TurnPhase } from '../../../rules/index.ts';
import styles from './Hud.module.css';

const CRUMBS: { label: string; phase: TurnPhase | null }[] = [
  { label: 'Start', phase: null },
  { label: 'Prepare', phase: 'prepare' },
  { label: 'Roll and move', phase: 'move' },
  { label: 'After moving', phase: 'after' },
  { label: 'End', phase: null },
];

export function TurnBar({ view }: { view: PlayerView }) {
  const phase = view.turn?.phase;
  const who = view.players.find((p) => p.id === view.turn?.player);
  return (
    <nav className={styles.crumbs} aria-label="Turn phase">
      <span>{who ? `${who.id === view.you ? 'Your' : `${who.name}'s`} Turn:` : 'Game over'}</span>
      {CRUMBS.map((c, i) => (
        <span key={c.label} className={c.phase && c.phase === phase ? styles.crumbOn : undefined}>
          {i > 0 ? '› ' : ''}
          {c.label}
        </span>
      ))}
    </nav>
  );
}
