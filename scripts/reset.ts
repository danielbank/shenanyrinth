/** Deletes the saved game, so the next server start opens on an empty Lobby. */
import { fileURLToPath } from 'node:url';
import { clearSnapshot } from '../src/server/save.ts';

const saveDir = process.env.SAVE_DIR ?? fileURLToPath(new URL('../saves', import.meta.url));

if (clearSnapshot(saveDir)) {
  console.log(`Deleted the saved game in ${saveDir}.`);
  console.log('If the server is running, restart it: it still holds the old game in memory.');
} else {
  console.log(`No saved game in ${saveDir}; nothing to reset.`);
}
