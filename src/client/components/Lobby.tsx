import { useState, type FormEvent } from 'react';
import { COLOURS, HEROES } from '../../rules/data.ts';
import type { Colour, Hero, PlayerView } from '../../rules/index.ts';
import { send } from '../socket.ts';
import { HeroSprite } from './HeroSprite.tsx';
import styles from './Lobby.module.css';

export function Lobby({ view }: { view: PlayerView }) {
  return (
    <main className={styles.lobby}>
      <h1 className={styles.title}>Shenanyrinth</h1>
      {view.you ? null : <JoinForm />}
      <h2>At the table</h2>
      <ul className={styles.players}>
        {view.players.map((p) => (
          <li key={p.id} className={styles.player}>
            <HeroSprite hero={p.hero} colour={p.colour} />
            <span>{p.name}</span>
            {p.isHost ? <small>(Host)</small> : null}
            {p.id === view.you ? <small>(you)</small> : null}
          </li>
        ))}
      </ul>
    </main>
  );
}

function JoinForm() {
  const [name, setName] = useState('');
  const [hero, setHero] = useState<Hero>('knight');
  const [colour, setColour] = useState<Colour>('red');
  const [error, setError] = useState<string | null>(null);

  async function join(e: FormEvent) {
    e.preventDefault();
    const res = await send({ type: 'join', name: name.trim(), hero, colour });
    setError(res.ok ? null : (res.error ?? 'Could not join'));
  }

  return (
    <form className={styles.form} onSubmit={join}>
      <label>
        Name{' '}
        <input value={name} maxLength={16} required onChange={(e) => setName(e.target.value)} />
      </label>
      <div className={styles.row} role="group" aria-label="Hero">
        {HEROES.map((h) => (
          <button
            key={h}
            type="button"
            aria-pressed={h === hero}
            className={h === hero ? styles.picked : undefined}
            onClick={() => setHero(h)}
          >
            <HeroSprite hero={h} colour={colour} />
          </button>
        ))}
      </div>
      <div className={styles.row} role="group" aria-label="Colour">
        {COLOURS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={c === colour}
            className={`${styles.swatch} ${c === colour ? styles.picked : ''}`}
            style={{ background: `var(--${c})` }}
            onClick={() => setColour(c)}
          />
        ))}
      </div>
      <button type="submit" disabled={!name.trim()}>
        Join
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
    </form>
  );
}
