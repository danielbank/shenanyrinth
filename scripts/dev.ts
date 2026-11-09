/** `npm run dev`: the game server plus Vite's dev server, which proxies the socket to it. */
import { spawn } from 'node:child_process';

const children = [
  spawn('node', ['--watch', 'src/server/main.ts'], { stdio: 'inherit' }),
  spawn('npx', ['vite'], { stdio: 'inherit' }),
];
const stop = () => {
  for (const c of children) c.kill();
  process.exit();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
