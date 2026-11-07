/* PROTOTYPE (throwaway): Shenanyrinth balance simulation, issue #17 "Balance simulation".
 * A pure module with no DOM: it plays complete bot games under the rules decided on the map
 * (danielbank/shenanyrinth#1) and reports the numbers. It runs in the browser (window.Sim)
 * and in Node (require('./balance-sim.js')).
 * Every rule number lives in DEFAULTS so the page can edit it. */
(function (root) {
'use strict';

const DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const ORDER = ['N', 'E', 'S', 'W'];
const HI = { N: 0, E: 1, S: 2, W: 3 };
const OPP = { N: 'S', E: 'W', S: 'N', W: 'E' };
const LEFT = { N: 'W', E: 'N', S: 'E', W: 'S' };
const RIGHT = { N: 'E', E: 'S', S: 'W', W: 'N' };
const SHAPES = { straight: 'NS', bend: 'NE', t: 'ESW', cross: 'NESW' };
const STATS = ['STR', 'DEX', 'INT', 'WIS', 'CON', 'CHA'];
const APPROACHES = ['Fight', 'Magic', 'Trickery'];
const APPROACH_STAT = { Fight: 'STR', Magic: 'INT', Trickery: 'DEX' };

// The Town (decided in "Town layouts"): 5×5, Keep Hall in the centre, stores in a plus, Gates mid-wall.
const TOWN = { n: 5, hall: 12, gates: { N: 2, W: 10, E: 14, S: 22 },
  buildings: { 7: 'Blacksmith', 11: "Adventurer's Guild", 12: 'Keep Hall', 13: 'Apothecary', 17: 'Arcanist' } };
const SHOP = { gear: 7, boots: 7, compass: 7, train: 11, potion: 13, charm: 17 };

const POTIONS = ['tonic', 'draught', 'teleport', 'stoneskin', 'twirlwater'];
const CHARMS = ['knucklebone', 'coin', 'hush', 'stones', 'orb'];
const ITEM_NAME = {
  tonic: 'Troll-Blood Tonic', draught: 'Draught of Wandering', teleport: 'Scroll of Teleportation',
  stoneskin: 'Stoneskin Salve', twirlwater: 'Twirlwater', knucklebone: 'Lucky Knucklebone',
  coin: "Trickster's Coin", hush: 'Hush Rune', stones: 'Shuffling Stones', orb: 'Orb of Foresight',
  boots: 'Boots of Second Thoughts', compass: 'Lodestone Compass',
};
const GEAR_NAME = {
  STR: ['Rusty Sword', 'Steel Blade', 'Runed Greatsword'], DEX: ['Leather Gloves', "Thief's Gloves", 'Shadowsilk Gloves'],
  INT: ["Apprentice's Tome", 'Grimoire', "Archmage's Codex"], WIS: ['Tin Lantern', "Oracle's Lantern", 'Lantern of the Seer'],
  CON: ['Bronze Buckler', 'Iron Shield', 'Enchanted Aegis'], CHA: ['Feathered Cap', 'Silver Circlet', 'Crown of Charm'],
};
const TRINKETS = ['Glove of Slapping', 'Ring of Reflection', 'Trombone of Sorrow', 'Sack of Flatulence',
  'Kazoo of Triumph', 'Rubber Chicken', 'Lute of the Bard', 'Party Popper'];

const DEEDS = [
  { id: 'trailblazer', tier: 0, name: 'Trailblazer', text: 'reach the Dungeon', test: (p) => p.flags.reachedDungeon },
  { id: 'hunter', tier: 0, name: 'Monster Hunter', text: 'kill 2 Mobs', test: (p) => p.kills >= 2 },
  { id: 'nestegg', tier: 0, name: 'Nest Egg', text: 'have 10 Gold Deposited', test: (p) => p.keep >= 10 },
  { id: 'artist', tier: 0, name: 'Shakedown Artist', text: 'win a Shakedown', test: (p) => p.shakedownWins >= 1 },
  { id: 'relic', tier: 1, name: 'Relic Hunter', text: 'carry 3 Artifacts into the Town', test: (p) => p.flags.relic },
  { id: 'sense', tier: 1, name: 'Treasure Sense', text: 'claim any Cache', test: (p) => p.caches >= 1 },
  { id: 'collector', tier: 1, name: 'Collector', text: 'own 2 Trinkets', test: (p) => p.trinkets.length >= 2 },
  { id: 'firstblood', tier: 1, name: 'First Blood', text: 'Wound the Guardian', test: (p) => p.guardianWounds >= 1 },
  { id: 'pathfinder', tier: 2, name: 'Pathfinder', text: 'end 3 Turns in a row in the Dungeon', test: (p) => p.dungeonStreak >= 3 },
  { id: 'deep', tier: 2, name: 'Deep Secrets', text: 'claim a Cache rated 4+', test: (p) => p.flags.deepCache },
  { id: 'master', tier: 2, name: 'Master-at-Arms', text: 'wield a tier-3 Gear', test: (p) => STATS.some(s => p.gear[s] >= 3) },
  { id: 'slayer', tier: 2, name: 'Dungeon Slayer', text: 'kill 3 Dungeon Mobs', test: (p) => p.dungeonKills >= 3 },
];

const DEFAULTS = {
  rules: {
    pivotLimit: 2, hpBase: 3, slots: 5, baseCap: 5, totalCap: 7,
    shakedownTakeGold: 3, dexPerExtraSquare: 1, // 1 = an extra square per point of DEX; 2 = one per 2 DEX
    dexSquaresOptional: true, // false = DEX squares are added to the roll and must be moved, like the dice
   
    resistCoversMobDie: false,       // literal rule: Resist only cancels nudges aimed at YOUR dice, not the Mob's die
    errandsWhenLeavingByGate: true,  // buildings passed still get used if the move ends by taking a Gate
  },
  doomTrack: { p2: 30, p3: 24, p4: 20, p5: 16, p6: 14 },
  guardianBonus: 9,
  deedValues: { easy: 3, medium: 4, hard: 5 },
  forest: { size: 9, straight: 50, bend: 20, t: 20, cross: 10, edgeT: 0.5, mobs: 6,
    goldTokens: 6, goldMin: 1, goldMax: 2, herbTokens: 3, caches: 2, cacheMin: 2, cacheMax: 3, cacheGold: 3, cacheMaterials: 1 },
  dungeon: { size: 7, straight: 5, bend: 75, t: 15, cross: 5, edgeT: 0.5, mobs: 5,
    goldTokens: 5, goldMin: 3, goldMax: 5, artifactTokens: 3, caches: 2, cacheMin: 3, cacheMax: 5, cacheGold: 5, cacheMaterials: 1 },
  prices: {
    gearTier1: { gold: 4, artifacts: 1 }, upgradeToTier2: { gold: 4, artifacts: 0 }, upgradeToTier3: { gold: 6, artifacts: 1 },
    boots: { gold: 8, artifacts: 1 }, compass: { gold: 4, artifacts: 1 },
    training: { gold: 10, herbs: 1, artifacts: 1 },
    potionsPlus1Herb: { tonic: 2, draught: 4, teleport: 6, stoneskin: 2, twirlwater: 3 },
    charmsPlus1Material: { knucklebone: 4, coin: 5, hush: 5, stones: 4, orb: 3 },
  },
  lootChance: { forestKillNeeds: 6, dungeonKillNeeds: 4, cacheNeeds: 3 }, // on a d6
  lootTable: { twoHerbs: 6, artifact: 4, potion: 4, charm: 3, trinket: 2, tier1Gear: 1 }, // d20 weights
  forestMobs: [
    { name: 'Goblin', Fight: 6, Magic: 6, Trickery: 4, wounds: 1, damage: 1, trophy: 1, gold: 1 },
    { name: 'Myconid', Fight: 4, Magic: 6, Trickery: 8, wounds: 1, damage: 1, trophy: 1, gold: 1 },
    { name: 'Pixie', Fight: 8, Magic: 4, Trickery: 6, wounds: 1, damage: 1, trophy: 1, gold: 1 },
    { name: 'Dire Wolf', Fight: 8, Magic: 6, Trickery: 4, wounds: 2, damage: 1, trophy: 1, gold: 2 },
    { name: 'Bandit', Fight: 4, Magic: 6, Trickery: 8, wounds: 2, damage: 1, trophy: 1, gold: 2 },
    { name: 'Treant', Fight: 8, Magic: 4, Trickery: 6, wounds: 2, damage: 1, trophy: 1, gold: 2 },
  ],
  dungeonMobs: [
    { name: 'Skeleton', Fight: 8, Magic: 12, Trickery: 12, wounds: 2, damage: 2, trophy: 2, gold: 3 },
    { name: 'Wraith', Fight: 12, Magic: 8, Trickery: 10, wounds: 2, damage: 2, trophy: 2, gold: 3 },
    { name: 'Gazer', Fight: 10, Magic: 12, Trickery: 8, wounds: 2, damage: 2, trophy: 2, gold: 3 },
    { name: 'Cave Troll', Fight: 12, Magic: 10, Trickery: 8, wounds: 3, damage: 2, trophy: 3, gold: 5 },
    { name: 'Necromancer', Fight: 8, Magic: 12, Trickery: 12, wounds: 3, damage: 2, trophy: 3, gold: 5 },
  ],
  guardian: { name: 'Red Wyrm', Fight: 16, Magic: 14, Trickery: 12, wounds: 4, damage: 3, trophyPerWound: 2, gold: 0 },
  // Seconds of real time, used only to estimate how long a game takes.
  timing: { turn: 15, perStep: 1, exchange: 12, errands: 10, shakedown: 15, responseWindow: 5 },
  // How the bots think. Not rules: these just make the bots play sensibly.
  bots: { turnValue: 2, herbValue: 1.5, artifactValue: 2.5, lootValue: 2, jabRate: 0.6, koFear: 0.6,
    unknownRisk: 0.12, lostPenalty: 1, stopBuyingRoundsLeft: 4, riskyPress: 0.6, pathEfficiency: 0.75, exploreValue: 2, planning: 'full', dungeonNerve: 0.55 },
};

const BUILDS = [
  { name: 'Brawler', blurb: 'all-in STR: Fight, Ram, Shakedowns', stats: { STR: 3, CON: 2, DEX: 1 },
    shop: ['gear:STR', 'potion:tonic', 'gear:STR', 'train:STR', 'gear:CON', 'gear:STR', 'charm:knucklebone'], aggression: 1.5, bankAt: 10, guardianReady: 0.4 },
  { name: 'Wyrmslayer', blurb: 'DEX + WIS for Trickery against the Guardian', stats: { DEX: 3, WIS: 3 },
    shop: ['gear:DEX', 'gear:WIS', 'train:DEX', 'train:WIS', 'potion:tonic', 'charm:knucklebone', 'gear:DEX', 'gear:WIS', 'gear:DEX'], aggression: 0.5, bankAt: 10, guardianReady: 0.3 },
  { name: 'Cache-hunter', blurb: 'INT to see and claim Caches', stats: { INT: 3, DEX: 2, WIS: 1 },
    shop: ['train:INT', 'gear:INT', 'charm:orb', 'gear:INT', 'potion:tonic', 'gear:DEX'], aggression: 0.5, bankAt: 12, guardianReady: 0.45 },
  { name: 'Silver-tongue', blurb: 'CHA for Sway and Haggle', stats: { CHA: 3, DEX: 2, CON: 1 },
    shop: ['gear:CHA', 'train:CHA', 'gear:DEX', 'charm:coin', 'potion:tonic', 'gear:CHA'], aggression: 1, bankAt: 10, guardianReady: 0.45 },
  { name: 'Pathfinder', blurb: 'DEX + Pivot items, never Lost', stats: { DEX: 3, CON: 2, WIS: 1 },
    shop: ['boots', 'gear:DEX', 'potion:twirlwater', 'train:DEX', 'potion:tonic', 'gear:DEX'], aggression: 0.8, bankAt: 10, guardianReady: 0.4 },
  { name: 'Tank', blurb: 'CON for HP and Resist, some STR', stats: { CON: 3, STR: 2, DEX: 1 },
    shop: ['gear:CON', 'gear:STR', 'potion:tonic', 'train:STR', 'gear:STR', 'gear:CON'], aggression: 1, bankAt: 10, guardianReady: 0.4 },
  { name: 'Balanced', blurb: '1 point in every stat', stats: { STR: 1, DEX: 1, INT: 1, WIS: 1, CON: 1, CHA: 1 },
    shop: ['gear:DEX', 'potion:tonic', 'boots', 'train:DEX', 'gear:DEX'], aggression: 0.8, bankAt: 10, guardianReady: 0.4 },
];

/* ---------- small helpers ---------- */
function rnd(g) { // mulberry32
  let t = (g.rng = (g.rng + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const die = (g, n) => 1 + Math.floor(rnd(g) * n);
const pickOne = (g, a) => a[Math.floor(rnd(g) * a.length)];
function shuffle(g, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(g) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const stepIdx = (n, i, d) => { const x = i % n + DIRS[d][0], y = ((i / n) | 0) + DIRS[d][1]; return x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x; };
const manhattan = (n, a, b) => Math.abs(a % n - b % n) + Math.abs(((a / n) | 0) - ((b / n) | 0));
const rotate = (ex, k) => [...ex].map(d => ORDER[(HI[d] + k) % 4]).sort((a, b) => HI[a] - HI[b]).join('');
const clone = (o) => JSON.parse(JSON.stringify(o));
function say(g, msg) { if (!g.quiet) g.log.push(`R${g.round} ${g.players[g.seat].name}: ${msg}`); }

/* ---------- players ---------- */
const eff = (g, p, s) => Math.min(g.cfg.rules.totalCap, p.base[s] + p.gear[s]);
const dexSquares = (g, p) => Math.floor(eff(g, p, 'DEX') / Math.max(1, g.cfg.rules.dexPerExtraSquare));
const maxHp = (g, p) => g.cfg.rules.hpBase + eff(g, p, 'CON');
const slotsUsed = (p) => STATS.filter(s => p.gear[s] > 0).length + (p.boots ? 1 : 0) + (p.compass ? 1 : 0) + p.items.length;
const torch = (g, p) => { const w = eff(g, p, 'WIS'); return w >= 5 ? 3 : w >= 3 ? 2 : 1; };
const hasItem = (p, id) => p.items.some(it => it.id === id && (it.charges === undefined || it.charges > 0));
function useItem(g, p, id) {
  const k = p.items.findIndex(it => it.id === id && (it.charges === undefined || it.charges > 0));
  if (k < 0) return false;
  const it = p.items[k];
  if (it.charges !== undefined) { it.charges--; if (it.charges <= 0) p.items.splice(k, 1); } else p.items.splice(k, 1);
  g.m.itemsUsed[id] = (g.m.itemsUsed[id] || 0) + 1;
  return true;
}
const projected = (p) => p.keep + Math.floor(p.pack.gold / 2) + p.trophies + p.deedPts + p.trinkets.length;
const halfPackValue = (g, p) => Math.floor(p.pack.gold / 2) + Math.floor(p.pack.herbs / 2) * g.cfg.bots.herbValue + Math.floor(p.pack.arts / 2) * g.cfg.bots.artifactValue;

function makePlayer(g, i, build) {
  const base = {}; STATS.forEach(s => (base[s] = build.stats[s] || 0));
  const gear = {}; STATS.forEach(s => (gear[s] = 0));
  const p = { id: i, name: `P${i + 1}`, build: build.name, bot: build, base, gear, trained: {}, boots: false, compass: false, items: [],
    hp: 0, pack: { gold: 0, herbs: 0, arts: 0 }, keep: 0, trophies: 0, deedPts: 0, trinkets: [], deeds: [],
    level: 'town', idx: TOWN.hall, heading: 'N', pivots: 0, sway: 0, resist: 0, protectedShake: false, stoneskin: false, clashAt: null,
    kills: 0, dungeonKills: 0, caches: 0, shakedownWins: 0, guardianWounds: 0, dungeonStreak: 0, flags: {}, feat: false,
    spent: 0, lost: 0, ko: 0, firstDungeonRound: null };
  p.hp = maxHp(g, p);
  return p;
}

function randomBuild(g, k) {
  const stats = {}; let pts = 6;
  while (pts > 0) { const s = pickOne(g, STATS); if ((stats[s] || 0) < 3) { stats[s] = (stats[s] || 0) + 1; pts--; } }
  const cat = [...STATS.map(s => 'gear:' + s), ...STATS.map(s => 'train:' + s), 'boots', 'compass',
    ...POTIONS.map(x => 'potion:' + x), ...CHARMS.filter(x => x !== 'stones').map(x => 'charm:' + x)];
  const shop = Array.from({ length: 4 + Math.floor(rnd(g) * 6) }, () => pickOne(g, cat));
  return { name: 'Random', blurb: 'random stats and shopping', stats, shop, aggression: rnd(g) * 2, bankAt: 6 + Math.floor(rnd(g) * 10), guardianReady: 0.2 + rnd(g) * 0.4 };
}

/* ---------- boards ---------- */
function genCells(g, c) {
  const n = c.size, cells = [], mix = { straight: c.straight, bend: c.bend, t: c.t, cross: c.cross };
  const ok = (x, y, e) => [...e].every(d => { const nx = x + DIRS[d][0], ny = y + DIRS[d][1]; return nx >= 0 && ny >= 0 && nx < n && ny < n; });
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const edge = x === 0 || y === 0 || x === n - 1 || y === n - 1, corner = (x === 0 || x === n - 1) && (y === 0 || y === n - 1);
    if (edge && !corner && rnd(g) < c.edgeT) { cells.push(ORDER.filter(d => ok(x, y, d)).join('')); continue; }
    let pool = Object.keys(SHAPES).filter(k => mix[k] > 0), exits = null;
    while (!exits && pool.length) {
      const total = pool.reduce((a, k) => a + mix[k], 0); let r = rnd(g) * total, shape = pool[pool.length - 1];
      for (const k of pool) if ((r -= mix[k]) < 0) { shape = k; break; }
      const rots = [...new Set([0, 1, 2, 3].map(k => rotate(SHAPES[shape], k)))].filter(e => ok(x, y, e));
      if (rots.length) exits = pickOne(g, rots); else pool = pool.filter(k => k !== shape);
    }
    if (!exits) exits = [0, 1, 2, 3].map(k => rotate('NE', k)).find(e => ok(x, y, e));
    cells.push(exits);
  }
  return cells;
}
function makeLevel(g, name) {
  const c = g.cfg[name];
  return { name, n: c.size, cells: genCells(g, c), revealed: new Uint8Array(c.size * c.size), tokens: new Map(), mobs: new Map(),
    piles: new Map(), feature: new Map(), tileVer: 0, dist: new Map() };
}
const knownExits = (L, i) => (L.name === 'dungeon' && !L.revealed[i] ? 'NESW' : L.cells[i]);
// Steps needed to reach target t from every square, over the exits as currently known (unknown Dungeon Tiles count as Crossroads).
function distTo(L, t) {
  const e = L.dist.get(t); if (e && e.ver === L.tileVer) return e.d;
  const n = L.n, d = new Int16Array(n * n).fill(999); d[t] = 0; const q = [t];
  for (let h = 0; h < q.length; h++) {
    const j = q[h];
    for (const dir of ORDER) { const i = stepIdx(n, j, dir); if (i < 0 || d[i] !== 999) continue; if (knownExits(L, i).includes(OPP[dir])) { d[i] = d[j] + 1; q.push(i); } }
  }
  L.dist.set(t, { ver: L.tileVer, d }); return d;
}
function distFromTrue(L, s) {
  const n = L.n, d = new Int16Array(n * n).fill(999); d[s] = 0; const q = [s];
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const dir of L.cells[i]) { const j = stepIdx(n, i, dir); if (j >= 0 && d[j] === 999) { d[j] = d[i] + 1; q.push(j); } } }
  return d;
}
function reveal(g, L, i, r) {
  const n = L.n, x0 = i % n, y0 = (i / n) | 0;
  for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) {
    if (x < 0 || y < 0 || x >= n || y >= n) continue; const j = y * n + x;
    if (!L.revealed[j]) { L.revealed[j] = 1; if (L.name === 'dungeon') L.tileVer++; }
  }
}
const isSafe = (L, i) => { const f = L.feature.get(i); return !!f && f.type !== 'guardian'; };
function emptySquare(g, L) {
  for (let tries = 0; tries < 500; tries++) {
    const i = Math.floor(rnd(g) * L.n * L.n);
    if (L.feature.has(i) || L.mobs.has(i) || L.tokens.has(i) || L.piles.has(i)) continue;
    if (g.players && g.players.some(p => p.level === L.name && p.idx === i)) continue;
    return i;
  }
  return -1;
}
function makeToken(g, L, type) {
  const c = g.cfg[L.name];
  if (type === 'gold') return { type, amt: c.goldMin + Math.floor(rnd(g) * (c.goldMax - c.goldMin + 1)) };
  if (type === 'cache') return { type, rating: c.cacheMin + Math.floor(rnd(g) * (c.cacheMax - c.cacheMin + 1)) };
  return { type, amt: 1 };
}
function placeToken(g, L, type) { const i = emptySquare(g, L); if (i >= 0) L.tokens.set(i, makeToken(g, L, type)); }
function placeMob(g, L, def) { const i = emptySquare(g, L); if (i >= 0) L.mobs.set(i, { def, wounds: 0 }); }

function setupBoards(g) {
  const F = (g.L.forest = makeLevel(g, 'forest')), D = (g.L.dungeon = makeLevel(g, 'dungeon'));
  let n = F.n; F.gate = {};
  for (const side of ORDER) {
    const k = 1 + Math.floor(rnd(g) * (n - 2));
    const i = side === 'N' ? k : side === 'S' ? (n - 1) * n + k : side === 'W' ? k * n : k * n + n - 1;
    F.gate[side] = i; F.feature.set(i, { type: 'gate', side }); F.revealed[i] = 1;
  }
  const m = (n - 1) / 2;
  F.stairs = (m - 1 + Math.floor(rnd(g) * 3)) * n + (m - 1 + Math.floor(rnd(g) * 3));
  F.feature.set(F.stairs, { type: 'stairs' });
  n = D.n;
  const side = pickOne(g, ORDER), k = 1 + Math.floor(rnd(g) * (n - 2));
  D.arrival = side === 'N' ? k : side === 'S' ? (n - 1) * n + k : side === 'W' ? k * n : k * n + n - 1;
  D.feature.set(D.arrival, { type: 'up' });
  const dist = distFromTrue(D, D.arrival); let far = -1;
  for (let i = 0; i < n * n; i++) if (dist[i] < 999 && dist[i] > far) far = dist[i];
  D.guardianIdx = pickOne(g, [...dist.keys()].filter(i => dist[i] === far));
  D.feature.set(D.guardianIdx, { type: 'guardian' });
  g.guardian = { def: g.cfg.guardian, wounds: 0, guardian: true };
  D.mobs.set(D.guardianIdx, g.guardian);
  const ax = D.arrival % n, ay = (D.arrival / n) | 0; D.guess = (n - 1 - ay) * n + (n - 1 - ax);
  reveal(g, D, D.arrival, 1);
  const fc = g.cfg.forest, dc = g.cfg.dungeon;
  const fm = shuffle(g, [...g.cfg.forestMobs]); for (let i = 0; i < fc.mobs; i++) placeMob(g, F, fm[i % fm.length]);
  const dm = shuffle(g, [...g.cfg.dungeonMobs]); for (let i = 0; i < dc.mobs; i++) placeMob(g, D, dm[i % dm.length]);
  for (let i = 0; i < fc.goldTokens; i++) placeToken(g, F, 'gold');
  for (let i = 0; i < fc.herbTokens; i++) placeToken(g, F, 'herbs');
  for (let i = 0; i < fc.caches; i++) placeToken(g, F, 'cache');
  for (let i = 0; i < dc.goldTokens; i++) placeToken(g, D, 'gold');
  for (let i = 0; i < dc.artifactTokens; i++) placeToken(g, D, 'arts');
  for (let i = 0; i < dc.caches; i++) placeToken(g, D, 'cache');
}

/* ---------- route costs (in Turns), used by the bots to plan ---------- */
const rate = (g, p, lv) => lv === 'town' ? 3.5 + dexSquares(g, p) : (3.5 + 0.6 * dexSquares(g, p)) * g.cfg.bots.pathEfficiency;
const stairsTarget = (g) => { const F = g.L.forest; return F.revealed[F.stairs] ? F.stairs : ((F.n * F.n) >> 1); };
const guardianTarget = (g) => { const D = g.L.dungeon; return D.revealed[D.guardianIdx] ? D.guardianIdx : D.guess; };
function sameCost(g, p, lv, i, j) {
  if (lv === 'town') return manhattan(5, i, j) / rate(g, p, 'town');
  const d = distTo(g.L[lv], j)[i]; return (d >= 999 ? 30 : d) / rate(g, p, lv);
}
function routeCost(g, p, lv, i, goal) {
  if (lv === goal.level) return sameCost(g, p, lv, i, goal.idx);
  const F = g.L.forest, D = g.L.dungeon;
  if (lv === 'town') {
    let best = Infinity;
    for (const s of ORDER) best = Math.min(best, sameCost(g, p, 'town', i, TOWN.gates[s]) + 0.5 + routeCost(g, p, 'forest', F.gate[s], goal));
    return best;
  }
  if (lv === 'forest') {
    if (goal.level === 'town') { let best = Infinity; for (const s of ORDER) best = Math.min(best, sameCost(g, p, 'forest', i, F.gate[s]) + 0.5 + sameCost(g, p, 'town', TOWN.gates[s], goal.idx)); return best; }
    return sameCost(g, p, 'forest', i, stairsTarget(g)) + (F.revealed[F.stairs] ? 0.5 : 1.5) + sameCost(g, p, 'dungeon', D.arrival, goal.idx);
  }
  return sameCost(g, p, 'dungeon', i, D.arrival) + 0.5 + routeCost(g, p, 'forest', F.stairs, goal);
}
function transitionDest(g, lv, i) {
  const F = g.L.forest, D = g.L.dungeon;
  if (lv === 'town') { const s = ORDER.find(s => TOWN.gates[s] === i); return s ? { level: 'forest', idx: F.gate[s] } : null; }
  const f = g.L[lv].feature.get(i); if (!f) return null;
  if (f.type === 'gate') return { level: 'town', idx: TOWN.gates[f.side] };
  if (f.type === 'stairs') return { level: 'dungeon', idx: D.arrival };
  if (f.type === 'up') return { level: 'forest', idx: F.stairs };
  return null;
}

/* ---------- combat odds ---------- */
const oddsMemo = new Map();
function exOdds(stat, faces) {
  const k = stat * 100 + faces; let o = oddsMemo.get(k); if (o) return o;
  let w = 0, l = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= faces; b++) { const t = a + stat; if (t > b) w++; else if (t < b) l++; }
  o = { pw: w / (6 * faces), pl: l / (6 * faces) }; oddsMemo.set(k, o); return o;
}
function duelOdds(a, b) { let w = 0, l = 0; for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) { if (x + a > y + b) w++; else if (x + a < y + b) l++; } return { pw: w / 36, pl: l / 36 }; }
function bestApproach(g, p, def, guardian) {
  let best = null;
  for (const a of APPROACHES) {
    const stat = eff(g, p, APPROACH_STAT[a]) + (guardian ? eff(g, p, 'WIS') : 0);
    const o = exOdds(stat, def[a]); const sc = o.pw - o.pl;
    if (!best || sc > best.sc) best = { a, stat, pw: o.pw, pl: o.pl, sc };
  }
  best.q = best.pw + best.pl > 0 ? best.pw / (best.pw + best.pl) : 0.5;
  return best;
}
function binom(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
// Chance of landing W Wounds before taking `lives` losses (ties re-roll).
function pKill(q, W, lives) { if (W <= 0) return 1; let s = 0; for (let k = 0; k < lives; k++) s += binom(W - 1 + k, k) * Math.pow(q, W) * Math.pow(1 - q, k); return Math.min(1, s); }

function lootChanceFor(g, guardian, lv) { if (guardian) return 1; const need = lv === 'forest' ? g.cfg.lootChance.forestKillNeeds : g.cfg.lootChance.dungeonKillNeeds; return (7 - need) / 6; }
function clashValue(g, p, lv, i, m) {
  const cfg = g.cfg, def = m.def, guardian = !!m.guardian, b = bestApproach(g, p, def, guardian);
  const W = def.wounds - m.wounds, dmg = def.damage;
  const hp = p.hp + (hasItem(p, 'tonic') ? maxHp(g, p) - 1 : 0);
  const lives = Math.max(1, Math.ceil(hp / dmg)), pk = pKill(b.q, W, lives);
  const koCost = halfPackValue(g, p) + cfg.bots.turnValue * routeCost(g, p, 'town', TOWN.hall, { level: lv, idx: i });
  const lootEV = cfg.bots.lootValue * lootChanceFor(g, guardian, lv);
  if (guardian) {
    const ew = Math.min(W, lives * b.q / Math.max(0.05, 1 - b.q));
    return ew * (def.trophyPerWound + lootEV) + pk * cfg.guardianBonus - (1 - pk) * koCost * cfg.bots.koFear;
  }
  return pk * (def.trophy + def.gold + lootEV) - (1 - pk) * koCost * cfg.bots.koFear - 0.5;
}
function pickupValue(g, p, L, j) {
  if (!L.revealed[j]) return 0;
  const b = g.cfg.bots; let v = 0;
  const t = L.tokens.get(j);
  if (t) {
    if (t.type === 'gold') v += t.amt; else if (t.type === 'herbs') v += b.herbValue; else if (t.type === 'arts') v += b.artifactValue;
    else if (t.type === 'cache' && eff(g, p, 'INT') >= t.rating) { const c = g.cfg[L.name]; v += c.cacheGold + c.cacheMaterials * (L.name === 'forest' ? b.herbValue : b.artifactValue) + 1; }
  }
  const pl = L.piles.get(j); if (pl) v += pl.gold + pl.herbs * b.herbValue + pl.arts * b.artifactValue;
  return v;
}
function canShake(g, p, q, L, j) { return q !== p && q.level === L.name && q.idx === j && !q.protectedShake && !q.stoneskin && L.name !== 'town' && !isSafe(L, j); }
function bestStat(g, p) { return Math.max(eff(g, p, 'STR'), eff(g, p, 'INT'), eff(g, p, 'DEX')); }
function shakeValue(g, p, q) {
  const o = duelOdds(bestStat(g, p), bestStat(g, q));
  const take = (x) => x.pack.gold > 0 ? Math.min(g.cfg.rules.shakedownTakeGold, x.pack.gold) : x.pack.arts ? g.cfg.bots.artifactValue : x.pack.herbs ? g.cfg.bots.herbValue : 0;
  const gain = take(q); if (gain <= 0) return -1;
  const deed = g.deeds.some(d => d.id === 'artist' && !d.by) ? 3 : 0;
  return (o.pw * (gain + deed) - o.pl * take(p)) * p.bot.aggression - 0.5;
}

/* ---------- the movement planner (dice-and-Pivot movement with lookahead over known Tiles) ---------- */
function makePlanner(g, p, L, goal) {
  const cfg = g.cfg, tv = cfg.bots.turnValue, n = L.n;
  const endC = new Map(), memo = new Map(), clashC = new Map();
  const others = g.players.filter(q => q !== p && q.level === L.name);
  const lostV = -halfPackValue(g, p) - tv * routeCost(g, p, 'town', TOWN.hall, goal) - cfg.bots.lostPenalty;
  function endVal(j) {
    let v = endC.get(j);
    if (v === undefined) {
      v = -tv * routeCost(g, p, L.name, j, goal);
      let sb = 0; for (const q of others) if (canShake(g, p, q, L, j)) sb = Math.max(sb, shakeValue(g, p, q));
      v += sb; endC.set(j, v);
    }
    return v;
  }
  function opts(j, h, piv) {
    const out = [];
    for (const d of L.cells[j]) { if (d === OPP[h]) continue; const to = stepIdx(n, j, d); if (to < 0) continue; const pivot = d !== h; if (pivot && piv <= 0) continue; out.push({ dir: d, to, pivot }); }
    return out;
  }
  function V(j, h, steps, dex, piv, tw) {
    const key = ((((j * 4 + HI[h]) * 16 + steps) * 8 + dex) * 8 + piv) * 2 + tw;
    let v = memo.get(key); if (v !== undefined) return v;
    if (steps === 0) {
      v = endVal(j);
      if (dex > 0) for (const o of opts(j, h, piv)) v = Math.max(v, enter(o.to, o.dir, 0, dex - 1, piv - (o.pivot ? 1 : 0), tw));
    } else {
      const os = opts(j, h, piv);
      if (!os.length) v = tw ? V(j, h, steps, dex, Math.min(7, piv + 1), 0) - 1 : lostV;
      else { v = -Infinity; for (const o of os) v = Math.max(v, enter(o.to, o.dir, steps - 1, dex, piv - (o.pivot ? 1 : 0), tw)); }
    }
    memo.set(key, v); return v;
  }
  function featureTake(j) {
    const f = L.feature.get(j); if (!f || f.type === 'guardian' || !L.revealed[j]) return null;
    const dest = transitionDest(g, L.name, j); return -tv * (routeCost(g, p, dest.level, dest.idx, goal) + 0.3);
  }
  function ramTarget(j) {
    let best = null;
    for (const q of others) if (canShake(g, p, q, L, j) && eff(g, p, 'STR') > eff(g, q, 'CON')) { const v = shakeValue(g, p, q); if (!best || v > best.v) best = { q, v }; }
    return best;
  }
  function enter(j, h, steps, dex, piv, tw) {
    const r = pickupValue(g, p, L, j);
    const m = L.revealed[j] ? L.mobs.get(j) : undefined;
    if (m) { let c = clashC.get(j); if (c === undefined) { c = clashValue(g, p, L.name, j, m); clashC.set(j, c); } return r + c + endVal(j); }
    if (L.name === 'dungeon' && !L.revealed[j]) {
      const risk = steps > 0 ? Math.min(0.9, cfg.bots.unknownRisk * steps / (piv + 1)) : 0;
      return r + (1 - risk) * endVal(j) + risk * lostV;
    }
    let v = V(j, h, steps, dex, piv, tw);
    const f = featureTake(j); if (f !== null) v = Math.max(v, f);
    if (steps > 0) { const rt = ramTarget(j); if (rt) v = Math.max(v, rt.v + endVal(j)); }
    return r + v;
  }
  // A casual Player: looks one square ahead only, keeps Pivots when it can (like the Movement feel prototype's "careful" bot).
  function glance(o, steps, piv) {
    const j = o.to, r = pickupValue(g, p, L, j), m = L.revealed[j] ? L.mobs.get(j) : undefined;
    let v = r + endVal(j) - (o.pivot ? tv * (steps > 0 ? 1.5 : 0.3) : 0);
    if (m) v += clashValue(g, p, L.name, j, m);
    const f = featureTake(j); if (f !== null) v = Math.max(v, r + f);
    return v + (piv > 0 ? 0 : -0.1 * steps);
  }
  return { endVal, opts, V, enter, glance, featureTake, ramTarget, lostV };
}

/* ---------- events ---------- */
function respawnToken(g, L, type) { placeToken(g, L, type); }
function collect(g, p, L, j) {
  const t = L.tokens.get(j), c = g.cfg[L.name];
  if (t) {
    if (t.type === 'cache') {
      if (eff(g, p, 'INT') >= t.rating) {
        L.tokens.delete(j); p.pack.gold += c.cacheGold;
        if (L.name === 'forest') p.pack.herbs += c.cacheMaterials; else p.pack.arts += c.cacheMaterials;
        p.caches++; if (t.rating >= 4) p.flags.deepCache = true; g.m.caches++;
        say(g, `claims a rating-${t.rating} Cache`);
        if (die(g, 6) >= g.cfg.lootChance.cacheNeeds) loot(g, p);
        respawnToken(g, L, 'cache');
      }
    } else {
      L.tokens.delete(j);
      if (t.type === 'gold') { p.pack.gold += t.amt; g.m.goldPicked[L.name] += t.amt; } else if (t.type === 'herbs') p.pack.herbs++; else p.pack.arts++;
      respawnToken(g, L, t.type);
    }
  }
  const pl = L.piles.get(j);
  if (pl) { L.piles.delete(j); p.pack.gold += pl.gold; p.pack.herbs += pl.herbs; p.pack.arts += pl.arts; g.m.pilesTaken++; }
}
function sendHome(g, p, why) {
  const L = g.L[p.level];
  const drop = { gold: Math.floor(p.pack.gold / 2), herbs: Math.floor(p.pack.herbs / 2), arts: Math.floor(p.pack.arts / 2) };
  p.pack.gold -= drop.gold; p.pack.herbs -= drop.herbs; p.pack.arts -= drop.arts;
  if (L && L.name !== 'town' && (drop.gold || drop.herbs || drop.arts)) {
    const pl = L.piles.get(p.idx) || { gold: 0, herbs: 0, arts: 0 };
    pl.gold += drop.gold; pl.herbs += drop.herbs; pl.arts += drop.arts; L.piles.set(p.idx, pl);
  }
  say(g, `${why} in the ${p.level}: drops ${drop.gold} Gold, ${drop.herbs} Herbs, ${drop.arts} Artifacts, back to the Keep`);
  p.level = 'town'; p.idx = TOWN.hall; p.hp = maxHp(g, p); p.clashAt = null;
}
function getLost(g, p) { g.m.lost[p.level]++; p.lost++; p.lostThisTurn = true; sendHome(g, p, 'Lost'); }

function addItem(g, p, item) {
  const value = { knucklebone: 5, coin: 4, teleport: 4, tonic: 3, twirlwater: 2, orb: 2, draught: 2, stoneskin: 1.5, hush: 1, stones: 0.5 };
  if (slotsUsed(p) < g.cfg.rules.slots) { p.items.push(item); return true; }
  let worst = -1; p.items.forEach((it, k) => { if (worst < 0 || value[it.id] < value[p.items[worst].id]) worst = k; });
  if (worst >= 0 && value[p.items[worst].id] < value[item.id]) { p.items.splice(worst, 1, item); return true; }
  return false;
}
function loot(g, p) {
  const t = g.cfg.lootTable, kinds = Object.keys(t), total = kinds.reduce((a, k) => a + t[k], 0);
  let r = rnd(g) * total, kind = kinds[kinds.length - 1];
  for (const k of kinds) if ((r -= t[k]) < 0) { kind = k; break; }
  g.m.loot[kind] = (g.m.loot[kind] || 0) + 1;
  if (kind === 'twoHerbs') p.pack.herbs += 2;
  else if (kind === 'artifact') p.pack.arts += 1;
  else if (kind === 'potion') addItem(g, p, { id: pickOne(g, POTIONS) });
  else if (kind === 'charm') addItem(g, p, { id: pickOne(g, CHARMS), charges: 3 });
  else if (kind === 'trinket') { if (g.trinketPool.length) { const tr = g.trinketPool.splice(Math.floor(rnd(g) * g.trinketPool.length), 1)[0]; p.trinkets.push(tr); say(g, `finds the ${tr}`); } else p.pack.herbs += 2; }
  else if (kind === 'tier1Gear') { const s = pickOne(g, STATS); if (p.gear[s] === 0 && slotsUsed(p) < g.cfg.rules.slots) p.gear[s] = 1; }
}

/* ---------- dice in play: Meddle, Sway, Resist ---------- */
const total = (s) => s.stat + s.dice.reduce((a, x) => a + x.v, 0);
const charm = (p, id) => p.items.find(it => it.id === id && it.charges > 0);
function spendCharge(g, p, id) { useItem(g, p, id); }
// nudge one die; returns true if it landed (the die's owner may Resist).
function nudge(g, actor, side, k, delta, ctx) {
  const dd = side.dice[k], owner = side.p || (g.cfg.rules.resistCoversMobDie ? side.foe : null);
  actor.sway--; g.m.sway++;
  const hurtsOwner = owner && owner !== actor && ((side.p && delta < 0) || (!side.p && delta > 0));
  if (hurtsOwner && owner.resist > 0) { owner.resist--; g.m.resist++; return false; }
  dd.v += delta; return true;
}
function tryWin(g, actor, S, O) {
  let need = 1 - (total(S) - total(O)); if (need <= 0) return;
  if (S.p === actor && S.stakes >= 2 && charm(actor, 'knucklebone')) { spendCharge(g, actor, 'knucklebone'); S.dice.push({ v: die(g, 6), f: 6 }); need = 1 - (total(S) - total(O)); if (need <= 0) return; }
  if (charm(actor, 'coin')) {
    let best = null;
    S.dice.forEach((a, i) => O.dice.forEach((b, j) => { const gain = 2 * (b.v - a.v); if (gain > 0 && (!best || gain > best.gain)) best = { i, j, gain }; }));
    if (best && best.gain >= need - actor.sway) {
      spendCharge(g, actor, 'coin'); g.m.meddle++;
      const owner = O.p; if (owner && owner.resist > 0) { owner.resist--; g.m.resist++; }
      else { const a = S.dice[best.i], b = O.dice[best.j]; [a.v, b.v] = [b.v, a.v]; }
      need = 1 - (total(S) - total(O)); if (need <= 0) return;
    }
  }
  // Sway: raise our dice or lower theirs; free-to-land nudges first.
  const room = S.dice.reduce((a, x) => a + (x.f - x.v), 0) + (O.p ? 0 : O.dice.reduce((a, x) => a + (x.v - 1), 0));
  const roomR = O.p ? Math.max(0, O.dice.reduce((a, x) => a + (x.v - 1), 0) - O.p.resist) : 0;
  if (actor.sway < need || room + roomR < need) return;
  while (need > 0 && actor.sway > 0) {
    let k = S.dice.findIndex(x => x.v < x.f);
    if (k >= 0) { nudge(g, actor, S, k, +1, null); need--; continue; }
    k = O.dice.findIndex(x => x.v > 1); if (k < 0) break;
    if (nudge(g, actor, O, k, -1, null)) need--;
  }
}
function tryDeny(g, actor, S, O) { // make side S not win (a tie is enough)
  let need = total(S) - total(O); if (need <= 0) return;
  if (S.dice.length >= 2 && charm(actor, 'hush')) { spendCharge(g, actor, 'hush'); g.m.meddle++; if (S.p && S.p.resist > 0) { S.p.resist--; g.m.resist++; } else { S.dice.sort((a, b) => b.v - a.v); S.dice.shift(); } need = total(S) - total(O); if (need <= 0) return; }
  const mobRoom = !O.p ? O.dice.reduce((a, x) => a + (x.f - x.v), 0) : O.dice.reduce((a, x) => a + (x.f - x.v), 0);
  const resistible = g.cfg.rules.resistCoversMobDie && !O.p && S.p ? S.p.resist : 0;
  const sRoom = S.dice.reduce((a, x) => a + (x.v - 1), 0) - (S.p ? S.p.resist : 0);
  if (actor.sway < need || Math.max(0, mobRoom - resistible) + Math.max(0, sRoom) < need) return;
  while (need > 0 && actor.sway > 0) {
    let k = O.dice.findIndex(x => x.v < x.f);
    if (k >= 0) { if (nudge(g, actor, O, k, +1)) need--; continue; }
    k = S.dice.findIndex(x => x.v > 1); if (k < 0) break;
    if (nudge(g, actor, S, k, -1)) need--;
  }
}
// One roll-off with its Response window. Returns >0 if A wins, <0 if B wins, 0 on a tie.
function rollOff(g, A, B) {
  A.dice = [{ v: die(g, 6), f: 6 }];
  B.dice = [{ v: die(g, B.faces || 6), f: B.faces || 6 }];
  A.foe = B.p || null; B.foe = A.p || null;
  if (!A.p) A.foe = B.p; if (!B.p) B.foe = A.p;
  const active = [A.p, B.p].filter(Boolean);
  const others = g.players.filter(q => !active.includes(q));
  let eligible = false;
  const leader = [...g.players].sort((a, b) => projected(b) - projected(a))[0];
  if (A.p) tryWin(g, A.p, A, B);
  if (B.p) tryWin(g, B.p, B, A);
  for (const q of others) {
    if (q.sway > 0 || charm(q, 'coin') || charm(q, 'hush')) eligible = true; else continue;
    for (const [S, O] of [[A, B], [B, A]]) {
      if (!S.p || S.p === q) continue;
      const threat = (S.p === leader && projected(S.p) > projected(q)) || (S.killsGuardian && projected(q) < projected(S.p) + g.cfg.guardianBonus);
      if (threat && rnd(g) < g.cfg.bots.jabRate) { tryDeny(g, q, S, O); g.m.jabs++; }
    }
  }
  if (A.p) tryWin(g, A.p, A, B);
  if (B.p) tryWin(g, B.p, B, A);
  if (eligible) g.time += g.cfg.timing.responseWindow;
  return total(A) - total(B);
}

/* ---------- Clashes and Shakedowns ---------- */
function clash(g, p, L, j) {
  const m = L.mobs.get(j); if (!m) return;
  const def = m.def, guardian = !!m.guardian, lv = L.name;
  p.clashAt = j; g.m.clashes[lv]++;
  if (guardian) { g.m.guardianClashes++; if (g.m.guardianFirstRound === null) g.m.guardianFirstRound = g.round; if (!g.m.guardianVisitors.includes(p.id)) g.m.guardianVisitors.push(p.id); }
  const hp0 = p.hp;
  say(g, `Clash with ${def.name} (${m.wounds}/${def.wounds} Wounds) at ${p.hp} HP`);
  for (let ex = 0; ex < 12; ex++) {
    const b = bestApproach(g, p, def, guardian);
    if (p.hp <= def.damage && hasItem(p, 'tonic')) { useItem(g, p, 'tonic'); p.hp = maxHp(g, p); }
    g.time += g.cfg.timing.exchange; g.m.exchanges++;
    const A = { p, stat: b.stat, stakes: guardian ? 3 : lv === 'dungeon' ? 2 : 1, killsGuardian: guardian && m.wounds === def.wounds - 1 };
    const B = { p: null, stat: 0, faces: def[b.a] };
    const r = rollOff(g, A, B);
    if (r > 0) {
      m.wounds++;
      if (guardian) { p.trophies += def.trophyPerWound; p.guardianWounds++; loot(g, p); }
      if (m.wounds >= def.wounds) {
        L.mobs.delete(j); p.clashAt = null; p.kills++;
        if (guardian) {
          p.keep += g.cfg.guardianBonus; p.feat = true; g.endTriggered = true; g.m.guardianKillRound = g.round;
          say(g, `slays the ${def.name}! The end is triggered.`);
        } else {
          p.trophies += def.trophy; p.pack.gold += def.gold; g.m.kills[lv]++;
          if (lv === 'dungeon') p.dungeonKills++;
          if (die(g, 6) >= (lv === 'forest' ? g.cfg.lootChance.forestKillNeeds : g.cfg.lootChance.dungeonKillNeeds)) loot(g, p);
          placeMob(g, L, def);
          say(g, `kills the ${def.name}`);
        }
        break;
      }
    } else if (r < 0) {
      p.hp -= def.damage;
      if (p.hp <= 0) { g.m.ko[lv]++; p.ko++; p.koThisTurn = true; g.m.hpLost[lv] += hp0; sendHome(g, p, 'Knocked Out'); return; }
    }
    const nb = bestApproach(g, p, def, guardian), left = def.wounds - m.wounds;
    if (p.hp <= def.damage && !hasItem(p, 'tonic')) {
      if (!(nb.q >= g.cfg.bots.riskyPress || (left === 1 && nb.q >= 0.5))) { say(g, `Retreats from the ${def.name}`); g.m.retreats++; break; }
    } else if (clashValue(g, p, lv, j, m) < -2 && !guardian) { say(g, `Retreats from the ${def.name}`); g.m.retreats++; break; }
  }
  g.m.hpLost[lv] += Math.max(0, hp0 - p.hp);
}
function shakedown(g, a, d) {
  const L = g.L[a.level];
  g.m.shakedowns++; g.time += g.cfg.timing.shakedown;
  const best = (p) => APPROACHES.map(x => ({ x, s: eff(g, p, APPROACH_STAT[x]) })).sort((u, v) => v.s - u.s)[0];
  const A = { p: a, stat: best(a).s, stakes: 2 }, B = { p: d, stat: best(d).s, stakes: 2, faces: 6 };
  const r = rollOff(g, A, B);
  d.protectedShake = true;
  if (r === 0) { say(g, `Shakedown on ${d.name}: a tie`); return; }
  const [w, l] = r > 0 ? [a, d] : [d, a];
  w.shakedownWins++; if (w === a) g.m.shakedownAttackerWins++;
  if (l.pack.gold >= 2 || (!l.pack.arts && !l.pack.herbs)) { const k = Math.min(g.cfg.rules.shakedownTakeGold, l.pack.gold); l.pack.gold -= k; w.pack.gold += k; g.m.shakedownGold += k; say(g, `Shakedown: ${w.name} takes ${k} Gold from ${l.name}`); }
  else if (l.pack.arts) { l.pack.arts--; w.pack.arts++; say(g, `Shakedown: ${w.name} takes an Artifact from ${l.name}`); }
  else { l.pack.herbs--; w.pack.herbs++; say(g, `Shakedown: ${w.name} takes Herbs from ${l.name}`); }
}

/* ---------- goals ---------- */
function dungeonReady(g, p) {
  const odds = g.cfg.dungeonMobs.map(def => bestApproach(g, p, def, false).q);
  return odds.reduce((a, b) => a + b, 0) / odds.length >= g.cfg.bots.dungeonNerve || maxHp(g, p) >= 6;
}
function guardianReady(g, p, roundsLeft) {
  if (!g.L.dungeon.mobs.has(g.L.dungeon.guardianIdx)) return false;
  const def = g.cfg.guardian, b = bestApproach(g, p, def, true), W = def.wounds - g.guardian.wounds;
  const hp = p.hp + (hasItem(p, 'tonic') ? maxHp(g, p) : 0);
  const pk = pKill(b.q, W, Math.max(1, Math.ceil(hp / def.damage)));
  const far = routeCost(g, p, p.level, p.idx, { level: 'dungeon', idx: guardianTarget(g) });
  return pk >= p.bot.guardianReady || (roundsLeft <= far + 2 && pk >= 0.12);
}
function shoppingPlan(g, p, pack) {
  const pr = g.cfg.prices, haggle = Math.floor(eff(g, p, 'CHA') / 2), cost = (x) => Math.max(1, x - haggle);
  const roundsLeft = g.doomLen - g.round;
  const buys = []; let save = 0;
  pack = { ...pack }; let slots = slotsUsed(p);
  const gearT = { ...p.gear }, counts = {}, have = {}; p.items.forEach(it => (have[it.id] = (have[it.id] || 0) + 1));
  let trained = { ...p.trained }, boots = p.boots, compass = p.compass;
  for (const e of p.bot.shop) {
    counts[e] = (counts[e] || 0) + 1;
    const [kind, what] = e.split(':');
    let price = null, durable = true, needSlot = false;
    if (kind === 'gear') {
      const k = counts[e]; if (gearT[what] >= k || gearT[what] !== k - 1 || p.base[what] + gearT[what] >= g.cfg.rules.totalCap) continue;
      const c = k === 1 ? pr.gearTier1 : k === 2 ? pr.upgradeToTier2 : pr.upgradeToTier3; price = { gold: cost(c.gold), herbs: 0, arts: c.artifacts }; needSlot = k === 1;
    } else if (kind === 'train') {
      if (trained[what] || p.base[what] >= g.cfg.rules.baseCap) continue;
      price = { gold: cost(pr.training.gold), herbs: pr.training.herbs, arts: pr.training.artifacts };
    } else if (kind === 'boots' || kind === 'compass') {
      if (kind === 'boots' ? boots : compass) continue; price = { gold: cost(pr[kind].gold), herbs: 0, arts: pr[kind].artifacts }; needSlot = true;
    } else if (kind === 'potion') {
      if ((have[what] || 0) >= counts[e]) continue; price = { gold: cost(pr.potionsPlus1Herb[what]), herbs: 1, arts: 0 }; needSlot = true; durable = false;
    } else if (kind === 'charm') {
      if ((have[what] || 0) >= counts[e]) continue; const useHerb = pack.herbs >= 1;
      price = { gold: cost(pr.charmsPlus1Material[what]), herbs: useHerb ? 1 : 0, arts: useHerb ? 0 : 1 }; needSlot = true; durable = false;
    }
    if (roundsLeft <= g.cfg.bots.stopBuyingRoundsLeft && !(kind === 'potion' && what === 'tonic')) continue;
    if (needSlot && slots >= g.cfg.rules.slots) continue;
    const mats = pack.herbs >= price.herbs && pack.arts >= price.arts;
    if (mats && pack.gold >= price.gold) {
      pack.gold -= price.gold; pack.herbs -= price.herbs; pack.arts -= price.arts; if (needSlot) slots++;
      buys.push({ e, kind, what, price, building: SHOP[kind] });
      if (kind === 'gear') gearT[what]++; else if (kind === 'train') trained[what] = true; else if (kind === 'boots') boots = true; else if (kind === 'compass') compass = true; else have[what] = (have[what] || 0) + 1;
    } else if (durable && mats) { if (price.gold - pack.gold <= 6) save = price.gold; break; } // saving up for it
  }
  return { buys, save };
}
function shopReady(g, p) { return shoppingPlan(g, p, p.pack).buys.some(b => b.kind !== 'potion'); }

function chooseGoal(g, p) {
  const roundsLeft = g.endTriggered ? 0 : g.doomLen - g.round;
  const home = { level: 'town', idx: TOWN.hall, why: 'home' };
  const homeCost = p.level === 'town' ? 0 : routeCost(g, p, p.level, p.idx, home);
  if (p.level !== 'town') {
    const low = p.level === 'dungeon' ? 2 : 1;
    if (p.hp <= low && !hasItem(p, 'tonic')) return { ...home, why: 'heal' };
    if (roundsLeft <= Math.ceil(homeCost) + 1 && p.pack.gold >= 3) return { ...home, why: 'bank before the end' };
  }
  if (guardianReady(g, p, roundsLeft)) return { level: 'dungeon', idx: guardianTarget(g), why: 'the Guardian' };
  if (p.level !== 'town') {
    if (p.pack.gold >= p.bot.bankAt) return { ...home, why: 'bank' };
    if (roundsLeft > g.cfg.bots.stopBuyingRoundsLeft + homeCost && shopReady(g, p)) return { ...home, why: 'shop' };
  }
  const tv = g.cfg.bots.turnValue, cands = [];
  const ready = dungeonReady(g, p);
  for (const lv of ['forest', 'dungeon']) {
    if (lv === 'dungeon' && !ready) continue;
    const L = g.L[lv];
    for (const j of [...L.tokens.keys(), ...L.piles.keys()]) { const v = pickupValue(g, p, L, j); if (v > 0) cands.push({ level: lv, idx: j, v, why: 'loot' }); }
    for (const [j, m] of L.mobs) if (L.revealed[j] && !m.guardian) { const v = clashValue(g, p, lv, j, m); if (v > 0) cands.push({ level: lv, idx: j, v, why: 'hunt ' + m.def.name }); }
    let unk = []; for (let j = 0; j < L.n * L.n; j++) if (!L.revealed[j]) unk.push(j);
    if (unk.length) {
      const from = p.level === lv ? p.idx : lv === 'forest' ? (p.level === 'dungeon' ? L.stairs : L.gate.N) : L.arrival;
      unk.sort((a, b) => manhattan(L.n, from, a) - manhattan(L.n, from, b));
      for (const j of unk.slice(0, 3)) cands.push({ level: lv, idx: j, v: g.cfg.bots.exploreValue * (lv === 'dungeon' ? 2 : 1), why: 'explore' });
    }
  }
  let best = null;
  for (const c of cands) { c.score = c.v - tv * routeCost(g, p, p.level, p.idx, c); if (!best || c.score > best.score) best = c; }
  return best || { level: 'forest', idx: g.L.forest.stairs, why: 'wander' };
}

/* ---------- Turns ---------- */
function chooseArrivalHeading(g, p, goal) {
  const L = g.L[p.level]; let best = null;
  for (const d of L.cells[p.idx]) { const j = stepIdx(L.n, p.idx, d); if (j < 0) continue; const c = routeCost(g, p, p.level, j, goal); if (!best || c < best.c) best = { d, c }; }
  p.heading = best ? best.d : L.cells[p.idx][0];
}
function transition(g, p, dest, goal) {
  const from = p.level;
  p.level = dest.level; p.idx = dest.idx; p.clashAt = null;
  if (dest.level === 'town') { if (p.pack.arts >= 3) p.flags.relic = true; say(g, `walks back into the Town through a Gate`); return; }
  if (dest.level === 'dungeon') { p.flags.reachedDungeon = true; if (p.firstDungeonRound === null) p.firstDungeonRound = g.round; }
  reveal(g, g.L[dest.level], p.idx, torch(g, p));
  chooseArrivalHeading(g, p, goal);
  say(g, `takes the ${from === 'town' ? 'Gate' : dest.level === 'dungeon' ? 'Stairs down' : from === 'dungeon' ? 'Stairs up' : 'Gate'} into the ${dest.level}`);
}
function rollMove(g) { return die(g, 6); }

function moveTurn(g, p, goal) {
  const L = g.L[p.level];
  let steps = rollMove(g), dex = dexSquares(g, p);
  if (!g.cfg.rules.dexSquaresOptional) { steps += dex; dex = 0; }
  let piv = p.pivots, tw = hasItem(p, 'twirlwater') ? 1 : 0, taken = 0;
  if (p.compass && piv > 0) {
    const P = makePlanner(g, p, L, goal);
    let bv = P.V(p.idx, p.heading, steps, dex, piv, tw), bh = null;
    for (const h of [LEFT[p.heading], RIGHT[p.heading]]) { const v = P.V(p.idx, h, steps, dex, piv - 1, tw); if (v > bv + 0.5) { bv = v; bh = h; } }
    if (bh) { p.heading = bh; piv--; g.m.itemsUsed.compass = (g.m.itemsUsed.compass || 0) + 1; }
  }
  say(g, `rolls ${steps} in the ${L.name} heading for ${goal.why}`);
  for (let guard = 0; guard < 60; guard++) {
    const P = makePlanner(g, p, L, goal), os = P.opts(p.idx, p.heading, piv);
    if (steps > 0 && !os.length) {
      if (tw) { useItem(g, p, 'twirlwater'); piv++; tw = 0; continue; }
      g.time += g.cfg.timing.perStep * taken; return getLost(g, p);
    }
    if (steps === 0 && (dex === 0 || !os.length)) break;
    let best = null, bv = -Infinity;
    if (steps === 0) { bv = P.endVal(p.idx); best = 'stop'; }
    const greedy = g.cfg.bots.planning === 'greedy';
    for (const o of os) {
      const v = greedy ? P.glance(o, steps > 0 ? steps - 1 : 0, piv - (o.pivot ? 1 : 0))
        : P.enter(o.to, o.dir, steps > 0 ? steps - 1 : 0, steps > 0 ? dex : dex - 1, piv - (o.pivot ? 1 : 0), tw);
      if (v > bv) { bv = v; best = o; }
    }
    if (best === 'stop' || !best) break;
    if (best.pivot) { piv--; g.m.pivots++; }
    if (steps > 0) steps--; else dex--;
    p.idx = best.to; p.heading = best.dir; taken++;
    reveal(g, L, p.idx, torch(g, p));
    collect(g, p, L, p.idx);
    if (L.mobs.has(p.idx)) { g.time += g.cfg.timing.perStep * taken; g.m.ambush++; return clash(g, p, L, p.idx); }
    const P2 = makePlanner(g, p, L, goal);
    const cont = steps > 0 || dex > 0 ? P2.V(p.idx, p.heading, steps, dex, piv, tw) : P2.endVal(p.idx);
    const fv = P2.featureTake(p.idx);
    if (fv !== null && fv > cont) { g.time += g.cfg.timing.perStep * taken; return transition(g, p, transitionDest(g, L.name, p.idx), goal); }
    if (steps > 0) { const rt = P2.ramTarget(p.idx); if (rt && rt.v + P2.endVal(p.idx) > cont && rt.v > 0) { g.m.rams++; g.time += g.cfg.timing.perStep * taken; return shakedown(g, p, rt.q); } }
  }
  g.time += g.cfg.timing.perStep * taken;
  let tgt = null;
  for (const q of g.players) if (canShake(g, p, q, L, p.idx)) { const v = shakeValue(g, p, q); if (v > 0 && (!tgt || v > tgt.v)) tgt = { q, v }; }
  if (tgt) shakedown(g, p, tgt.q);
}

function exitFor(g, p, goal) { // the square on this Level that leads toward a goal on another Level
  const L = g.L[p.level];
  if (p.level === 'dungeon') return L.arrival;
  if (goal.level === 'dungeon') return L.revealed[L.stairs] ? L.stairs : null;
  let best = null; for (const s of ORDER) { const c = sameCost(g, p, 'forest', p.idx, L.gate[s]) + sameCost(g, p, 'town', TOWN.gates[s], goal.idx); if (!best || c < best.c) best = { i: L.gate[s], c }; }
  return best.i;
}
function prepare(g, p, goal) {
  const L = g.L[p.level];
  if (p.hp <= maxHp(g, p) / 2 && hasItem(p, 'tonic')) { useItem(g, p, 'tonic'); p.hp = maxHp(g, p); say(g, 'drinks a Troll-Blood Tonic'); }
  if (goal.why === 'the Guardian' && p.hp < maxHp(g, p) && hasItem(p, 'tonic') && p.level === 'dungeon') { useItem(g, p, 'tonic'); p.hp = maxHp(g, p); }
  if (hasItem(p, 'stoneskin') && p.pack.gold >= 6 && g.players.some(q => q !== p && q.level === p.level)) { useItem(g, p, 'stoneskin'); p.stoneskin = true; }
  if (hasItem(p, 'orb')) {
    const want = p.level === 'forest' && goal.level === 'dungeon' && !L.revealed[L.stairs] ? stairsTarget(g)
      : p.level === 'dungeon' && goal.why === 'the Guardian' && !L.revealed[L.guardianIdx] ? L.guess : null;
    if (want !== null) { useItem(g, p, 'orb'); reveal(g, L, want, 1); goal.idx = goal.level === 'dungeon' && p.level === 'dungeon' ? guardianTarget(g) : goal.idx; }
  }
  if (hasItem(p, 'teleport')) {
    let to = null;
    if (goal.level === p.level && L.revealed[goal.idx] && routeCost(g, p, p.level, p.idx, goal) >= 2) to = goal.idx;
    else if (goal.level !== p.level) { const e = exitFor(g, p, goal); if (e !== null && L.revealed[e] && sameCost(g, p, p.level, p.idx, e) >= 2) to = e; }
    if (to !== null) {
      useItem(g, p, 'teleport'); p.idx = to; reveal(g, L, to, torch(g, p)); collect(g, p, L, to); say(g, 'reads a Scroll of Teleportation');
      if (L.mobs.has(to)) { clash(g, p, L, to); return true; }
      const dest = transitionDest(g, L.name, to); if (dest) transition(g, p, dest, goal);
      return true;
    }
  }
  if (hasItem(p, 'draught') && p.level === 'dungeon' && goal.level !== 'dungeon' && p.pack.gold + p.pack.arts * 2 >= 6) {
    useItem(g, p, 'draught'); say(g, 'drinks a Draught of Wandering');
    let budget = rollMove(g) + dexSquares(g, p); const target = L.arrival;
    while (budget-- > 0 && p.idx !== target) {
      let best = null;
      for (const d of ORDER) { const j = stepIdx(L.n, p.idx, d); if (j < 0) continue; if (L.revealed[j] && L.mobs.has(j)) continue; const c = manhattan(L.n, j, target); if (!best || c < best.c) best = { j, d, c }; }
      if (!best) break; p.idx = best.j; p.heading = best.d; reveal(g, L, p.idx, torch(g, p)); collect(g, p, L, p.idx);
    }
    if (p.idx === target) transition(g, p, transitionDest(g, 'dungeon', target), goal);
    return true;
  }
  return false;
}

function townPath(a, b) { // straight lines, x first
  const out = []; let x = a % 5, y = (a / 5) | 0; const bx = b % 5, by = (b / 5) | 0;
  while (x !== bx) { x += Math.sign(bx - x); out.push(y * 5 + x); }
  while (y !== by) { y += Math.sign(by - y); out.push(y * 5 + x); }
  return out;
}
function perms(a) { if (a.length <= 1) return [a]; return a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(r => [x, ...r])); }
function townTurn(g, p) {
  const goal = chooseGoal(g, p);
  const plan = shoppingPlan(g, p, p.pack);
  const need = new Set(plan.buys.map(b => b.building));
  if (p.pack.gold > plan.save || p.hp < maxHp(g, p)) need.add(TOWN.hall);
  let gate = TOWN.gates.N, gc = Infinity;
  for (const s of ORDER) { const c = routeCost(g, p, 'forest', g.L.forest.gate[s], goal); if (c < gc) { gc = c; gate = TOWN.gates[s]; } }
  const budget = rollMove(g) + dexSquares(g, p);
  let bestRoute = null;
  for (const order of perms([...need].filter(b => b !== p.idx))) {
    const path = []; let cur = p.idx;
    for (const w of [...order, gate]) { path.push(...townPath(cur, w)); cur = w; }
    if (!bestRoute || path.length < bestRoute.length) bestRoute = path;
  }
  if (!bestRoute) bestRoute = townPath(p.idx, gate);
  const walked = bestRoute.slice(0, budget), passed = new Set([p.idx, ...walked]);
  if (walked.length) p.idx = walked[walked.length - 1];
  g.time += g.cfg.timing.perStep * walked.length;
  const leaving = p.idx === gate && walked.length > 0;
  if (!leaving || g.cfg.rules.errandsWhenLeavingByGate) errands(g, p, passed);
  if (leaving) transition(g, p, transitionDest(g, 'town', gate), goal);
}
function errands(g, p, passed) {
  let did = false;
  if (passed.has(TOWN.hall)) { p.hp = maxHp(g, p); }
  const plan = shoppingPlan(g, p, p.pack);
  for (const b of plan.buys) {
    if (!passed.has(b.building)) continue;
    const pr = b.price; if (p.pack.gold < pr.gold || p.pack.herbs < pr.herbs || p.pack.arts < pr.arts) continue;
    if ((b.kind === 'potion' || b.kind === 'charm' || b.kind === 'boots' || b.kind === 'compass' || (b.kind === 'gear' && p.gear[b.what] === 0)) && slotsUsed(p) >= g.cfg.rules.slots) continue;
    p.pack.gold -= pr.gold; p.pack.herbs -= pr.herbs; p.pack.arts -= pr.arts; p.spent += pr.gold; did = true;
    if (b.kind === 'gear') p.gear[b.what]++;
    else if (b.kind === 'train') { p.trained[b.what] = true; p.base[b.what]++; }
    else if (b.kind === 'boots') p.boots = true;
    else if (b.kind === 'compass') p.compass = true;
    else if (b.kind === 'potion') p.items.push({ id: b.what });
    else if (b.kind === 'charm') p.items.push({ id: b.what, charges: 3 });
    const label = b.kind === 'gear' ? GEAR_NAME[b.what][p.gear[b.what] - 1] : b.kind === 'train' ? `Training (${b.what})` : ITEM_NAME[b.what || b.kind];
    g.m.bought[label] = (g.m.bought[label] || 0) + 1;
    say(g, `buys ${label} for ${pr.gold} Gold${pr.herbs ? ' + Herb' : ''}${pr.arts ? ' + Artifact' : ''}`);
  }
  if (passed.has(TOWN.hall) && p.pack.gold > 0) {
    const roundsLeft = g.doomLen - g.round;
    const keep = roundsLeft <= g.cfg.bots.stopBuyingRoundsLeft ? 0 : Math.min(p.pack.gold, shoppingPlan(g, p, p.pack).save);
    const dep = p.pack.gold - keep;
    if (dep > 0) { p.pack.gold -= dep; p.keep += dep; did = true; g.m.deposited += dep; say(g, `Deposits ${dep} Gold`); }
  }
  if (did) g.time += g.cfg.timing.errands;
}

function checkDeeds(g, p) {
  for (const d of g.deeds) if (!d.by && d.def.test(p)) { d.by = p.name; d.round = g.round; p.deedPts += d.value; p.deeds.push(d.def.name); say(g, `claims the Deed ${d.def.name} (+${d.value})`); }
}

function playTurn(g) {
  if (g.ended) return;
  const p = g.players[g.seat], cfg = g.cfg;
  g.turn++; g.time += cfg.timing.turn;
  p.lostThisTurn = false; p.koThisTurn = false;
  p.pivots = cfg.rules.pivotLimit + (p.boots ? 1 : 0); p.sway = eff(g, p, 'CHA'); p.resist = eff(g, p, 'CON');
  p.protectedShake = false; p.stoneskin = false;
  const lv = p.level; g.m.turnsIn[lv]++;
  if (lv === 'town') townTurn(g, p);
  else {
    const L = g.L[lv];
    if (p.clashAt !== null && !(L.mobs.has(p.clashAt) && p.idx === p.clashAt)) p.clashAt = null;
    let done = false;
    if (p.clashAt !== null) {
      const m = L.mobs.get(p.idx);
      if (p.hp <= m.def.damage && hasItem(p, 'tonic')) { useItem(g, p, 'tonic'); p.hp = maxHp(g, p); }
      if (p.hp > m.def.damage && clashValue(g, p, lv, p.idx, m) > 0) { say(g, `resumes the Clash`); clash(g, p, L, p.idx); done = true; }
      else p.clashAt = null;
    }
    if (!done) { const goal = chooseGoal(g, p); if (!prepare(g, p, goal)) moveTurn(g, p, goal); }
  }
  if (p.level === 'dungeon' && !p.lostThisTurn && !p.koThisTurn) p.dungeonStreak++; else p.dungeonStreak = 0;
  for (const q of g.players) checkDeeds(g, q);
  if (g.checks) checkInvariants(g);
  g.seat = (g.seat + 1) % g.players.length;
  if (g.seat === g.firstSeat) {
    if (g.endTriggered || g.round >= g.doomLen) return endGame(g, g.endTriggered ? 'Guardian' : 'Doom Track');
    g.round++;
  }
}
function playRound(g) { const r = g.round; while (!g.ended && g.round === r) playTurn(g); }
function playToEnd(g) { let guard = 0; while (!g.ended && guard++ < 5000) playTurn(g); if (!g.ended) endGame(g, 'runaway'); return g; }

function score(p) { return { keep: p.keep, pack: Math.floor(p.pack.gold / 2), trophies: p.trophies, deeds: p.deedPts, trinkets: p.trinkets.length, total: projected(p) }; }
function endGame(g, why) {
  g.ended = true; g.endReason = why;
  const ranked = [...g.players].sort((a, b) => projected(b) - projected(a) || b.trophies - a.trophies || (b.feat ? 1 : 0) - (a.feat ? 1 : 0));
  const top = ranked[0];
  g.winners = ranked.filter(p => projected(p) === projected(top) && p.trophies === top.trophies && p.feat === top.feat).map(p => p.id);
  if (!g.quiet) g.log.push(`Game over (${why}). Winner: ${g.winners.map(i => g.players[i].name).join(' & ')}`);
}

function checkInvariants(g) {
  const bad = (msg) => g.m.violations.push(`R${g.round}: ${msg}`);
  for (const L of [g.L.forest, g.L.dungeon]) {
    L.cells.forEach((ex, i) => { for (const d of ex) if (stepIdx(L.n, i, d) < 0) bad(`${L.name} exit off the board at ${i}`); });
    const c = g.cfg[L.name], toks = [...L.tokens.values()];
    if (toks.filter(t => t.type === 'cache').length !== c.caches) bad(`${L.name} Cache count drifted`);
    if (L.mobs.size > c.mobs + (L.name === 'dungeon' ? 1 : 0)) bad(`${L.name} has too many Mobs`);
  }
  for (const p of g.players) {
    if (slotsUsed(p) > g.cfg.rules.slots) bad(`${p.name} over Slots`);
    for (const s of STATS) { if (p.base[s] > g.cfg.rules.baseCap) bad(`${p.name} base ${s} over cap`); if (p.gear[s] > 3 || p.gear[s] < 0) bad(`${p.name} bad Gear tier`); }
    for (const k of ['gold', 'herbs', 'arts']) if (p.pack[k] < 0 || !Number.isInteger(p.pack[k])) bad(`${p.name} Pack ${k} = ${p.pack[k]}`);
    if (p.hp <= 0 || p.hp > maxHp(g, p)) bad(`${p.name} HP ${p.hp}`);
    const n = p.level === 'town' ? 5 : g.L[p.level].n; if (p.idx < 0 || p.idx >= n * n) bad(`${p.name} off the board`);
  }
  if (g.round > g.doomLen) bad('round past the Doom Track');
}

function newGame(cfgIn, opts = {}) {
  const cfg = clone(cfgIn || DEFAULTS);
  const builds = opts.builds || [BUILDS[0], BUILDS[1]];
  const g = { cfg, rng: (opts.seed | 0) || 1, round: 1, turn: 0, seat: 0, ended: false, endTriggered: false, log: [], quiet: !!opts.quiet, checks: !!opts.checks, time: 0, players: null, L: {} };
  g.m = { lost: { forest: 0, dungeon: 0 }, ko: { forest: 0, dungeon: 0 }, turnsIn: { town: 0, forest: 0, dungeon: 0 }, clashes: { forest: 0, dungeon: 0 },
    kills: { forest: 0, dungeon: 0 }, hpLost: { forest: 0, dungeon: 0 }, goldPicked: { forest: 0, dungeon: 0 }, exchanges: 0, retreats: 0, ambush: 0,
    guardianClashes: 0, guardianFirstRound: null, guardianKillRound: null, guardianVisitors: [], shakedowns: 0, shakedownAttackerWins: 0, shakedownGold: 0, rams: 0,
    sway: 0, resist: 0, meddle: 0, jabs: 0, pivots: 0, caches: 0, pilesTaken: 0, deposited: 0, bought: {}, itemsUsed: {}, loot: {}, violations: [] };
  g.doomLen = cfg.doomTrack['p' + builds.length] || 20;
  g.trinketPool = [...TRINKETS];
  g.players = [];
  setupBoards(g);
  g.players = builds.map((b, i) => makePlayer(g, i, b === 'random' ? randomBuild(g, i) : b));
  g.firstSeat = g.seat = Math.floor(rnd(g) * g.players.length);
  const tiers = ['easy', 'medium', 'hard'];
  g.deeds = [0, 1, 2].map(t => ({ def: pickOne(g, DEEDS.filter(d => d.tier === t)), value: cfg.deedValues[tiers[t]], by: null })).map(d => ({ ...d, id: d.def.id }));
  if (!g.quiet) g.log.push(`New game: ${g.players.length} Players, Doom Track ${g.doomLen} Rounds. Deeds: ${g.deeds.map(d => d.def.name).join(', ')}.`);
  return g;
}

/* ---------- batches ---------- */
function gameRecord(g) {
  const n = g.players.length;
  return { n, rounds: g.round, turns: g.turn, minutes: g.time / 60, endReason: g.endReason, m: g.m,
    players: g.players.map(p => ({ build: p.build, stats: { ...p.base }, ...score(p), won: g.winners.includes(p.id) ? 1 / g.winners.length : 0,
      feat: p.feat, lost: p.lost, ko: p.ko, spent: p.spent, firstDungeonRound: p.firstDungeonRound, gearTiers: STATS.reduce((a, s) => a + p.gear[s], 0), trained: Object.keys(p.trained).length })),
    deeds: g.deeds.map(d => ({ name: d.def.name, tier: d.def.tier, by: d.by, round: d.round })) };
}
function playGame(cfg, builds, seed, checks) {
  const g = newGame(cfg, { builds, seed, quiet: true, checks });
  playToEnd(g); return gameRecord(g);
}
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const pct = (a, q) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
function summarize(recs) {
  const sum = (f) => recs.reduce((a, r) => a + f(r), 0);
  const turnsF = sum(r => r.m.turnsIn.forest), turnsD = sum(r => r.m.turnsIn.dungeon);
  const builds = {};
  for (const r of recs) for (const p of r.players) {
    const b = (builds[p.build] ||= { games: 0, wins: 0, fair: 0, score: [], feat: 0, rank: [] });
    b.games++; b.wins += p.won; b.fair += 1 / r.n; b.score.push(p.total); b.feat += p.feat ? 1 : 0;
  }
  const comp = { keep: 0, pack: 0, trophies: 0, deeds: 0, trinkets: 0 }; let compN = 0;
  for (const r of recs) for (const p of r.players) { for (const k in comp) comp[k] += p[k]; compN++; }
  const spreads = recs.map(r => { const s = r.players.map(p => p.total).sort((a, b) => b - a); return { spread: s[0] - s[s.length - 1], margin: s[0] - s[1], top: s[0] }; });
  const deeds = {};
  for (const r of recs) for (const d of r.deeds) { const e = (deeds[d.name] ||= { drawn: 0, claimed: 0, rounds: [] }); e.drawn++; if (d.by) { e.claimed++; e.rounds.push(d.round); } }
  const bought = {}; for (const r of recs) for (const [k, v] of Object.entries(r.m.bought)) bought[k] = (bought[k] || 0) + v;
  const used = {}; for (const r of recs) for (const [k, v] of Object.entries(r.m.itemsUsed)) used[k] = (used[k] || 0) + v;
  const guardianRecs = recs.filter(r => r.endReason === 'Guardian');
  return {
    games: recs.length,
    minutes: { mean: mean(recs.map(r => r.minutes)), p10: pct(recs.map(r => r.minutes), 0.1), p90: pct(recs.map(r => r.minutes), 0.9) },
    rounds: mean(recs.map(r => r.rounds)),
    guardianEnd: guardianRecs.length / recs.length,
    guardianFirstRound: mean(recs.filter(r => r.m.guardianFirstRound !== null).map(r => r.m.guardianFirstRound)),
    guardianReachedShare: recs.filter(r => r.m.guardianFirstRound !== null).length / recs.length,
    guardianKillRound: mean(guardianRecs.map(r => r.m.guardianKillRound)),
    guardianClashesToKill: mean(guardianRecs.map(r => r.m.guardianClashes)),
    guardianVisitorsToKill: mean(guardianRecs.map(r => r.m.guardianVisitors.length)),
    firstDungeonRound: mean(recs.flatMap(r => r.players.map(p => p.firstDungeonRound).filter(x => x !== null))),
    neverDungeon: mean(recs.map(r => r.players.filter(p => p.firstDungeonRound === null).length / r.n)),
    lostRate: { forest: sum(r => r.m.lost.forest) / turnsF, dungeon: sum(r => r.m.lost.dungeon) / turnsD },
    koRate: { forest: sum(r => r.m.ko.forest) / turnsF, dungeon: sum(r => r.m.ko.dungeon) / turnsD },
    turnShare: { town: sum(r => r.m.turnsIn.town) / sum(r => r.turns), forest: turnsF / sum(r => r.turns), dungeon: turnsD / sum(r => r.turns) },
    clash: {
      forestPerGame: sum(r => r.m.clashes.forest) / recs.length, dungeonPerGame: sum(r => r.m.clashes.dungeon) / recs.length,
      forestHpPerClash: sum(r => r.m.hpLost.forest) / Math.max(1, sum(r => r.m.clashes.forest)),
      dungeonHpPerClash: sum(r => r.m.hpLost.dungeon) / Math.max(1, sum(r => r.m.clashes.dungeon)),
      forestKoPerClash: sum(r => r.m.ko.forest) / Math.max(1, sum(r => r.m.clashes.forest)),
      dungeonKoPerClash: sum(r => r.m.ko.dungeon) / Math.max(1, sum(r => r.m.clashes.dungeon)),
      forestKillPerClash: sum(r => r.m.kills.forest) / Math.max(1, sum(r => r.m.clashes.forest)),
      dungeonKillPerClash: sum(r => r.m.kills.dungeon) / Math.max(1, sum(r => r.m.clashes.dungeon)),
      retreatsPerGame: sum(r => r.m.retreats) / recs.length,
    },
    shakedowns: { perGame: sum(r => r.m.shakedowns) / recs.length, rams: sum(r => r.m.rams) / recs.length, attackerWinShare: sum(r => r.m.shakedownAttackerWins) / Math.max(1, sum(r => r.m.shakedowns)), goldPerGame: sum(r => r.m.shakedownGold) / recs.length },
    responses: { swayPerGame: sum(r => r.m.sway) / recs.length, resistPerGame: sum(r => r.m.resist) / recs.length, meddlePerGame: sum(r => r.m.meddle) / recs.length, jabsPerGame: sum(r => r.m.jabs) / recs.length },
    score: { top: mean(spreads.map(s => s.top)), spread: mean(spreads.map(s => s.spread)), margin: mean(spreads.map(s => s.margin)), closeGames: spreads.filter(s => s.margin <= 3).length / recs.length },
    composition: Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, v / compN])),
    builds: Object.fromEntries(Object.entries(builds).map(([k, b]) => [k, { games: b.games, winRate: b.wins / b.games, vsFair: b.wins / b.fair, score: mean(b.score), featRate: b.feat / b.games }])),
    deeds, bought: Object.fromEntries(Object.entries(bought).map(([k, v]) => [k, v / recs.length])),
    used: Object.fromEntries(Object.entries(used).map(([k, v]) => [k, v / recs.length])),
    spentPerPlayer: mean(recs.flatMap(r => r.players.map(p => p.spent))),
    gearTiersPerPlayer: mean(recs.flatMap(r => r.players.map(p => p.gearTiers))),
    trainedPerPlayer: mean(recs.flatMap(r => r.players.map(p => p.trained))),
    violations: recs.flatMap(r => r.m.violations).slice(0, 20), violationCount: sum(r => r.m.violations.length),
  };
}
function seatBuilds(g0, n, pool) { const out = []; for (let i = 0; i < n; i++) out.push(pool === 'random' ? 'random' : pool[Math.floor(rnd(g0) * pool.length)]); return out; }
// Run `games` games at `n` Players; builds drawn at random from `pool` (array of builds or 'random').
function runBatch(cfg, { n, games, pool, seed = 1, checks = false }) {
  const g0 = { rng: seed * 7919 + n }, recs = [];
  for (let k = 0; k < games; k++) {
    const builds = seatBuilds(g0, n, pool || BUILDS);
    try { recs.push(playGame(cfg, builds, seed * 100003 + k * 31 + n, checks)); }
    catch (e) { recs.push({ crash: String(e && e.stack || e) }); }
  }
  return recs;
}

const api = { DEFAULTS, BUILDS, DEEDS, TOWN, STATS, ITEM_NAME, GEAR_NAME, newGame, playTurn, playRound, playToEnd, runBatch, summarize, playGame,
  eff, maxHp, slotsUsed, projected, score, exOdds, pKill, bestApproach, clone };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Sim = api;
})(typeof window !== 'undefined' ? window : globalThis);
