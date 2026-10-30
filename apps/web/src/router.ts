import { useSyncExternalStore } from 'react';

// Rutas con hash (#/new): funcionan igual offline y sin configuración en el servidor.
const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export const useRoute = () =>
  useSyncExternalStore(subscribe, () => location.hash.slice(1) || '/');

export const go = (path: string) => {
  location.hash = path;
};
