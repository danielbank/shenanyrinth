import { describe, expect, it } from 'vitest';
import { playGame } from './bots.ts';
import { INVARIANTS } from './invariants.ts';

/** About 200 seeded games in CI; set FUZZ_GAMES for more on demand. */
const GAMES = Number(process.env.FUZZ_GAMES ?? 200);

describe('Fuzz games', () => {
  it(`${GAMES} seeded bot games at mixed Player counts keep every invariant, every Turn`, () => {
    const reports = [];
    for (let seed = 1; seed <= GAMES; seed++) {
      reports.push(playGame(seed, 2 + (seed % 5), INVARIANTS));
    }
    expect(reports.every((r) => r.winners.length > 0)).toBe(true);
  }, 600_000);

  it('the same seed replays the same game', () => {
    expect(playGame(7, 4, INVARIANTS)).toEqual(playGame(7, 4, INVARIANTS));
  });

  it('a broken invariant fails with a replayable seed and test', () => {
    expect(() => playGame(3, 2, [() => 'always broken'])).toThrow(
      /replays seed 3 with 2 Players[\s\S]*playGame\(3, 2, INVARIANTS\)/,
    );
  });
});
