/**
 * Sound. World sounds play Kenney CC0 files committed in `public/sounds/<name>.ogg` (see
 * `SOURCES.md` there); the slap and the Trinket gags are generated with Web Audio.
 * Mute and volume are per device.
 */
export const WORLD_SOUNDS = [
  'step-town',
  'step-forest',
  'step-dungeon',
  'dice',
  'pivot',
  'lost',
  'stairs',
  'coin',
  'rustle',
  'hit',
  'miss',
  'kill',
  'shakedown',
  'click',
  'buy',
  'deposit',
  'chime',
] as const;

/** The generated slap and Trinket gags, which never come from files and have a cooldown. */
export const GAG_SOUNDS = [
  'slap',
  'trombone',
  'fart',
  'kazoo',
  'squeak',
  'lute',
  'popper',
] as const;

type WorldSound = (typeof WORLD_SOUNDS)[number];
type GagSound = (typeof GAG_SOUNDS)[number];
export type SoundName = WorldSound | GagSound;

const isGag = (name: SoundName): name is GagSound =>
  (GAG_SOUNDS as readonly string[]).includes(name);
const GAG_COOLDOWN_MS = 1200;

export interface AudioSettings {
  muted: boolean;
  volume: number;
}

const KEY = 'shenanyrinth.audio';
let settings: AudioSettings = load();
const listeners = new Set<() => void>();

function load(): AudioSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as AudioSettings | null;
    if (saved && typeof saved.muted === 'boolean' && typeof saved.volume === 'number') return saved;
  } catch {
    // No storage: use the defaults.
  }
  return { muted: false, volume: 0.6 };
}

export const audioSettings = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get: () => settings,
  set(next: Partial<AudioSettings>) {
    settings = { ...settings, ...next };
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Settings still apply for this session.
    }
    for (const l of listeners) l();
  },
};

let ctx: AudioContext | null = null;
/** Fetch every world sound up front, so the first footstep isn't late. */
function preload(ac: AudioContext): void {
  for (const name of WORLD_SOUNDS) loadBuffer(ac, name).catch(() => {});
}

function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    preload(ctx);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

const loads = new Map<WorldSound, Promise<AudioBuffer>>();
/** Fetches and decodes a world sound's file once; a failed load is retried next time. */
function loadBuffer(ac: AudioContext, name: WorldSound): Promise<AudioBuffer> {
  let pending = loads.get(name);
  if (!pending) {
    pending = fetch(`/sounds/${name}.ogg`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`missing ${name}.ogg`))))
      .then((data) => ac.decodeAudioData(data));
    pending.catch((err: unknown) => {
      loads.delete(name);
      console.warn(`Sound ${name} failed to load`, err);
    });
    loads.set(name, pending);
  }
  return pending;
}

const lastGag = new Map<GagSound, number>();

function output(ac: AudioContext): GainNode {
  const out = ac.createGain();
  out.gain.value = settings.volume;
  out.connect(ac.destination);
  return out;
}

export function play(name: SoundName): void {
  if (settings.muted || settings.volume <= 0) return;
  const ac = context();
  if (!ac) return;
  if (isGag(name)) {
    const now = performance.now();
    if (now - (lastGag.get(name) ?? -Infinity) < GAG_COOLDOWN_MS) return;
    lastGag.set(name, now);
    GAG_SYNTH[name](ac, output(ac));
    return;
  }
  loadBuffer(ac, name)
    .then((buffer) => {
      const src = ac.createBufferSource();
      src.buffer = buffer;
      src.connect(output(ac));
      src.start();
    })
    .catch(() => {
      // Already warned in loadBuffer; the committed-files test guards against missing files.
    });
}

type Synth = (ac: AudioContext, out: AudioNode) => void;

function tone(
  ac: AudioContext,
  out: AudioNode,
  freq: number,
  dur: number,
  {
    type = 'square',
    to = freq,
    at = 0,
    gain = 0.25,
  }: { type?: OscillatorType; to?: number; at?: number; gain?: number } = {},
): void {
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(
  ac: AudioContext,
  out: AudioNode,
  dur: number,
  { freq = 1200, at = 0, gain = 0.3 }: { freq?: number; at?: number; gain?: number } = {},
): void {
  const t = ac.currentTime + at;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const env = ac.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(env).connect(out);
  src.start(t);
}

const GAG_SYNTH: Record<GagSound, Synth> = {
  slap: (ac, o) => {
    noise(ac, o, 0.09, { freq: 2500, gain: 0.6 });
    noise(ac, o, 0.05, { freq: 800, gain: 0.4, at: 0.01 });
  },
  trombone: (ac, o) =>
    [233, 220, 208, 196].forEach((f, i) =>
      tone(ac, o, f, i === 3 ? 0.7 : 0.3, {
        at: i * 0.32,
        type: 'sawtooth',
        to: i === 3 ? 180 : f,
        gain: 0.15,
      }),
    ),
  fart: (ac, o) => {
    tone(ac, o, 90, 0.4, { type: 'sawtooth', to: 60, gain: 0.3 });
    noise(ac, o, 0.4, { freq: 150, gain: 0.3 });
  },
  kazoo: (ac, o) =>
    [523, 523, 659, 784].forEach((f, i) =>
      tone(ac, o, f, 0.16, { at: i * 0.14, type: 'sawtooth', gain: 0.12 }),
    ),
  squeak: (ac, o) => tone(ac, o, 1400, 0.25, { to: 2200, type: 'square', gain: 0.12 }),
  lute: (ac, o) =>
    [392, 494, 587, 784].forEach((f, i) =>
      tone(ac, o, f, 0.3, { at: i * 0.08, type: 'triangle', gain: 0.15 }),
    ),
  popper: (ac, o) => {
    noise(ac, o, 0.08, { freq: 3000, gain: 0.5 });
    [1047, 1319, 1568].forEach((f, i) => tone(ac, o, f, 0.12, { at: 0.08 + i * 0.05, gain: 0.1 }));
  },
};
