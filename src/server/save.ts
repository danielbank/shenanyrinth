/** Saving the table to disk after every change, and loading it back. */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TableSnapshot } from './table.ts';

const FILE = 'game.json';

export function loadSnapshot(dir: string): TableSnapshot | undefined {
  try {
    return JSON.parse(readFileSync(join(dir, FILE), 'utf8')) as TableSnapshot;
  } catch {
    return undefined;
  }
}

/** Writes atomically: a temporary file, then a rename. */
export function saveSnapshot(dir: string, snapshot: TableSnapshot): void {
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `${FILE}.tmp`);
  writeFileSync(tmp, JSON.stringify(snapshot));
  renameSync(tmp, join(dir, FILE));
}

/** Forgets the saved table, so the next start opens on an empty Lobby. */
export function clearSnapshot(dir: string): boolean {
  const file = join(dir, FILE);
  if (!existsSync(file)) return false;
  rmSync(file);
  return true;
}
