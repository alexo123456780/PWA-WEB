import { useSyncExternalStore } from 'react';

// navigator.onLine solo sabe si hay una interfaz de red, no si hay internet (Wi-Fi sin salida,
// datos agotados). Por eso se confirma pidiendo el health de la API.
const PING_URL = `${import.meta.env.VITE_API_URL || '/api/v1'}/health`;
const PING_EVERY_MS = 15_000;
const PING_TIMEOUT_MS = 5_000;

let online = navigator.onLine;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (next === online) return;
  online = next;
  listeners.forEach((notify) => notify());
}

async function ping() {
  if (!navigator.onLine) return set(false);
  try {
    const res = await fetch(PING_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    set(res.ok);
  } catch {
    set(false);
  }
}

function start() {
  const goOffline = () => set(false);
  const check = () => void ping();
  window.addEventListener('offline', goOffline);
  window.addEventListener('online', check);
  const timer = setInterval(check, PING_EVERY_MS);
  check();
  return () => {
    window.removeEventListener('offline', goOffline);
    window.removeEventListener('online', check);
    clearInterval(timer);
  };
}

let stop = () => {};
function subscribe(notify: () => void) {
  listeners.add(notify);
  if (listeners.size === 1) stop = start();
  return () => {
    listeners.delete(notify);
    if (!listeners.size) stop();
  };
}

export const useOnline = () => useSyncExternalStore(subscribe, () => online);
