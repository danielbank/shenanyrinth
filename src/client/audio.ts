/**
 * Sound. World sounds play Kenney CC0 files dropped into `public/sounds/<name>.ogg`; until they
 * are there, and for the slap and the Trinket gags, sounds are generated with Web Audio.
 * Mute and volume are per device.
 */
export type SoundName =
  | 'step-town'
  | 'step-forest'
  | 'step-dungeon'
  | 'dice'
  | 'pivot'
  | 'lost'
  | 'stairs'
  | 'coin'
  | 'rustle'
  | 'hit'
  | 'miss'
  | 'kill'
  | 'shakedown'
  | 'click'
  | 'buy'
  | 'deposit'
  | 'chime'
  | 'slap'
  | 'trombone'
  | 'fart'
  | 'kazoo'
  | 'squeak'
  | 'lute'
  | 'popper';

/** The generated slap and Trinket gags, which never come from files and have a cooldown. */
const GAGS = new Set<SoundName>(['slap', 'trombone', 'fart', 'kazoo', 'squeak', 'lute', 'popper']);
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
function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

const files = new Map<SoundName, AudioBuffer | null>();
const loading = new Set<SoundName>();
function loadFile(ac: AudioContext, name: SoundName): void {
  if (loading.has(name)) return;
  loading.add(name);
  fetch(`/sounds/${name}.ogg`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('missing'))))
    .then((data) => ac.decodeAudioData(data))
    .then((buffer) => files.set(name, buffer))
    .catch(() => files.set(name, null));
}

const lastGag = new Map<SoundName, number>();

export function play(name: SoundName): void {
  if (settings.muted || settings.volume <= 0) return;
  const ac = context();
  if (!ac) return;
  if (GAGS.has(name)) {
    const now = performance.now();
    if (now - (lastGag.get(name) ?? -Infinity) < GAG_COOLDOWN_MS) return;
    lastGag.set(name, now);
  }
  const out = ac.createGain();
  out.gain.value = settings.volume;
  out.connect(ac.destination);
  const file = GAGS.has(name) ? null : files.get(name);
  if (file) {
    const src = ac.createBufferSource();
    src.buffer = file;
    src.connect(out);
    src.start();
    return;
  }
  if (!GAGS.has(name) && !files.has(name)) loadFile(ac, name);
  SYNTH[name](ac, out);
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

const SYNTH: Record<SoundName, Synth> = {
  'step-town': (ac, o) => noise(ac, o, 0.05, { freq: 1800, gain: 0.15 }),
  'step-forest': (ac, o) => noise(ac, o, 0.07, { freq: 700, gain: 0.2 }),
  'step-dungeon': (ac, o) => noise(ac, o, 0.06, { freq: 2600, gain: 0.15 }),
  dice: (ac, o) => [0, 0.06, 0.13, 0.22].forEach((at) => noise(ac, o, 0.04, { freq: 3000, at })),
  pivot: (ac, o) => noise(ac, o, 0.18, { freq: 500, gain: 0.2 }),
  lost: (ac, o) =>
    [392, 330, 262].forEach((f, i) => tone(ac, o, f, 0.25, { at: i * 0.18, type: 'triangle' })),
  stairs: (ac, o) =>
    [262, 330, 392, 523].forEach((f, i) =>
      tone(ac, o, f, 0.15, { at: i * 0.09, type: 'triangle' }),
    ),
  coin: (ac, o) => {
    tone(ac, o, 988, 0.08, { gain: 0.15 });
    tone(ac, o, 1319, 0.2, { at: 0.07, gain: 0.15 });
  },
  rustle: (ac, o) => noise(ac, o, 0.2, { freq: 900, gain: 0.15 }),
  hit: (ac, o) => {
    noise(ac, o, 0.12, { freq: 400, gain: 0.4 });
    tone(ac, o, 160, 0.12, { to: 60 });
  },
  miss: (ac, o) => noise(ac, o, 0.15, { freq: 2000, gain: 0.12 }),
  kill: (ac, o) => [523, 659, 784].forEach((f, i) => tone(ac, o, f, 0.18, { at: i * 0.08 })),
  shakedown: (ac, o) => {
    noise(ac, o, 0.1, { freq: 600, gain: 0.35 });
    tone(ac, o, 220, 0.2, { to: 110, at: 0.05 });
  },
  click: (ac, o) => tone(ac, o, 1500, 0.03, { gain: 0.12 }),
  buy: (ac, o) => [660, 880].forEach((f, i) => tone(ac, o, f, 0.1, { at: i * 0.07, gain: 0.15 })),
  deposit: (ac, o) =>
    [784, 988, 1175].forEach((f, i) => tone(ac, o, f, 0.12, { at: i * 0.06, gain: 0.13 })),
  chime: (ac, o) =>
    [659, 988].forEach((f, i) => tone(ac, o, f, 0.4, { at: i * 0.15, type: 'sine', gain: 0.2 })),
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
