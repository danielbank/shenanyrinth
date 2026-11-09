/** `npm start` entry: serve the built client and the game on one port. */
import { fileURLToPath } from 'node:url';
import { startServer } from './app.ts';

const port = Number(process.env.PORT ?? 3000);
const clientDir = fileURLToPath(new URL('../../dist/client', import.meta.url));
const saveDir = process.env.SAVE_DIR ?? fileURLToPath(new URL('../../saves', import.meta.url));
const server = await startServer({ port, clientDir, saveDir });
console.log(`Shenanyrinth is up on ${server.url} — share it with: ngrok http ${server.port}`);
