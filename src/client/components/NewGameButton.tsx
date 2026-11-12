import { useState } from 'react';
import type { PlayerView } from '../../rules/index.ts';
import { send } from '../socket.ts';

/** The Host's way to start from scratch, asked twice so nobody ends a game by accident. */
export function NewGameButton({ view }: { view: PlayerView }) {
  const [asking, setAsking] = useState(false);
  const hosting = view.players.some((p) => p.id === view.you && p.isHost);
  if (!hosting) return null;
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)}>
        New game
      </button>
    );
  }
  return (
    <div role="group" aria-label="Confirm a new game">
      <p>End this game for everyone?</p>
      <button type="button" onClick={() => void send({ type: 'newGame' })}>
        Yes, start over
      </button>{' '}
      <button type="button" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </div>
  );
}
