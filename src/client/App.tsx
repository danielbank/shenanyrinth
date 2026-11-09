import { useSyncExternalStore } from 'react';
import { viewStore } from './socket.ts';
import { Lobby } from './components/Lobby.tsx';

export function App() {
  const view = useSyncExternalStore(viewStore.subscribe, viewStore.get);
  if (!view) return <p>Connecting…</p>;
  return <Lobby view={view} />;
}
