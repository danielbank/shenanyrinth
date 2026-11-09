import type { LevelName } from '../../../rules/index.ts';
import styles from './Hud.module.css';

const LEVELS: { level: LevelName; label: string }[] = [
  { level: 'town', label: 'Town' },
  { level: 'forest', label: 'Forest' },
  { level: 'dungeon', label: 'Dungeon' },
];

/** Peek at another Level; picking your own Level follows your piece again. */
export function LevelTabs({
  current,
  mine,
  onPick,
}: {
  current: LevelName;
  mine: LevelName;
  onPick: (level: LevelName | null) => void;
}) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Levels">
      {LEVELS.map(({ level, label }) => (
        <button
          key={level}
          type="button"
          role="tab"
          aria-selected={level === current}
          className={level === current ? styles.tabOn : undefined}
          onClick={() => onPick(level === mine ? null : level)}
        >
          {label}
          {level === mine ? ' •' : ''}
        </button>
      ))}
    </div>
  );
}
