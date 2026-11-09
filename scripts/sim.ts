/**
 * Plays seeded bot games through the real rules engine and prints the game-length and balance
 * numbers, for retuning. Usage: node scripts/sim.ts [games=500]
 */
import { playGame } from '../test/fuzz/bots.ts';
import { INVARIANTS } from '../test/fuzz/invariants.ts';

const games = Number(process.argv[2] ?? 500);
const byCount = new Map<
  number,
  { games: number; rounds: number; feats: number; actions: number }
>();
const builds = new Map<string, { played: number; won: number }>();
for (let seed = 1; seed <= games; seed++) {
  const players = 2 + (seed % 5);
  const r = playGame(seed, players, INVARIANTS);
  const c = byCount.get(players) ?? { games: 0, rounds: 0, feats: 0, actions: 0 };
  c.games++;
  c.rounds += r.rounds;
  c.actions += r.actions;
  if (r.feat) c.feats++;
  byCount.set(players, c);
  for (const [id, build] of Object.entries(r.builds)) {
    const b = builds.get(build) ?? { played: 0, won: 0 };
    b.played++;
    if (r.winners.includes(id)) b.won += 1 / r.winners.length;
    builds.set(build, b);
  }
}
console.log(`${games} games`);
console.log('Players  games  avg Rounds  Guardian ended  avg actions');
for (const [n, c] of [...byCount].sort((a, b) => a[0] - b[0])) {
  console.log(
    `${n}        ${String(c.games).padEnd(6)} ${(c.rounds / c.games).toFixed(1).padEnd(11)} ${((100 * c.feats) / c.games).toFixed(0).padStart(3)}%           ${(c.actions / c.games).toFixed(0)}`,
  );
}
console.log('\nBuild           win share vs fair share');
for (const [name, b] of [...builds].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`${name.padEnd(15)} ${(b.won / b.played).toFixed(2)} per game played`);
}
