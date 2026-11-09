/** Saving the table to disk after every change, and loading it back. */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
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
