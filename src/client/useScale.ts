import { useSyncExternalStore } from 'react';

const query = typeof matchMedia === 'function' ? matchMedia('(min-width: 900px)') : null;

function subscribe(listener: () => void) {
  query?.addEventListener('change', listener);
  return () => query?.removeEventListener('change', listener);
}

/** The whole-number pixel scale: ×2 on phones, ×3 on laptops (matches --scale in tokens.css). */
export function useScale(): number {
  return useSyncExternalStore(subscribe, () => (query?.matches ? 3 : 2));
}
