/** Checked every Turn of every fuzz game. */
import { BASE_CAP, SLOTS, STATS, TOTAL_CAP } from '../../src/rules/data.ts';
import { maxHp, slotsUsed, stat } from '../../src/rules/stats.ts';
import { doomLimit } from '../../src/rules/turns.ts';
import type { GameState } from '../../src/rules/index.ts';
import type { Invariant } from './bots.ts';

const DELTA: Record<string, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

export const INVARIANTS: Invariant[] = [
  function exitsStayOnTheBoard(g) {
    for (const level of ['forest', 'dungeon'] as const) {
      const { size, tiles } = g.boards[level];
      for (let i = 0; i < tiles.length; i++) {
        for (const d of tiles[i]!) {
          const [dx, dy] = DELTA[d]!;
          const x = (i % size) + dx;
          const y = Math.floor(i / size) + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) {
            return `${level} square ${i} has an Exit ${d} off the board`;
          }
        }
      }
    }
    return null;
  },
  function slotsStayAtFiveOrFewer(g) {
    const over = g.players.find((p) => slotsUsed(p) > SLOTS && g.discarding !== p.id);
    return over ? `${over.id} carries ${slotsUsed(over)} Slots` : null;
  },
  function statsStayWithinTheirCaps(g) {
    for (const p of g.players) {
      for (const s of STATS) {
        if (p.base[s] < 0 || p.base[s] > BASE_CAP) return `${p.id} has base ${s} ${p.base[s]}`;
        if (stat(p, s) > TOTAL_CAP) return `${p.id} has ${s} ${stat(p, s)}`;
      }
    }
    return null;
  },
  function goldAndMaterialsNeverGoNegative(g) {
    for (const p of g.players) {
      const { gold, herbs, artifacts } = p.pack;
      if (gold < 0 || herbs < 0 || artifacts < 0 || p.keep < 0) {
        return `${p.id} has a negative Pack or Keep: ${JSON.stringify(p.pack)} keep ${p.keep}`;
      }
    }
    return null;
  },
  function hpStaysWithinBounds(g) {
    const bad = g.players.find((p) => p.hp < 0 || p.hp > maxHp(p));
    return bad ? `${bad.id} has ${bad.hp} HP of ${maxHp(bad)}` : null;
  },
  function theGameEndsByTheDoomTrackAtTheLatest(g) {
    return g.round > doomLimit(g) ? `the game reached Round ${g.round}` : null;
  },
];
