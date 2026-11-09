import { useSyncExternalStore } from 'react';
import { audioSettings } from '../audio.ts';
import { Badge, Glyph } from './Icon.tsx';

/** Mute and volume, kept on this device only. */
export function SoundSettings() {
  const { muted, volume } = useSyncExternalStore(audioSettings.subscribe, audioSettings.get);
  return (
    <div>
      <button
        type="button"
        aria-pressed={muted}
        onClick={() => audioSettings.set({ muted: !muted })}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        <Glyph name={muted ? 'mute' : 'volume'} /> {muted ? 'Muted' : 'Sound on'}
      </button>{' '}
      <label>
        Volume{' '}
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => audioSettings.set({ volume: e.target.valueAsNumber / 100 })}
        />
      </label>
    </div>
  );
}

/** A mute badge for the HUD. */
export function MuteBadge({ className }: { className?: string }) {
  const { muted } = useSyncExternalStore(audioSettings.subscribe, audioSettings.get);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={muted}
      aria-label={muted ? 'Unmute' : 'Mute'}
      onClick={() => audioSettings.set({ muted: !muted })}
    >
      <Badge name={muted ? 'mute' : 'volume'} />
    </button>
  );
}
