/// <reference lib="webworker" />
import { cacheNames, clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  matchPrecache,
  precacheAndRoute,
} from 'workbox-precaching';
import {
  NavigationRoute,
  registerRoute,
  setCatchHandler,
} from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { syncNow } from './sync';

// Background Sync no está en los tipos estándar de TypeScript.
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}
declare global {
  interface ServiceWorkerGlobalScopeEventMap {
    sync: SyncEvent;
  }
}

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

// Se sube la versión al cambiar la forma de lo que se guarda en estos cachés.
const API_CACHE = 'api-reports-v1';

// install: Workbox precachea el App Shell (HTML, JS, CSS, íconos y /offline.html).
// activate: Workbox borra los precachés viejos (cleanupOutdatedCaches) y aquí se
// eliminan los demás cachés que ya no usa esta versión.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

self.addEventListener('activate', (event) => {
  const keep = new Set([cacheNames.precache, API_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)),
        ),
      ),
  );
});

// El SW nuevo espera hasta que el usuario acepta la actualización (UC-06).
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

// Background Sync (Chromium): al volver la red envía lo pendiente aunque la app esté cerrada.
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') event.waitUntil(syncNow());
});

// fetch 1: cualquier navegación de la SPA se resuelve con el index.html precacheado,
// así que la app abre sin red desde la primera visita. En desarrollo no hay precaché.
if (import.meta.env.PROD) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('/index.html'), {
      denylist: [/^\/api\//],
    }),
  );
}

// fetch 2: navegaciones que no son de la SPA (p. ej. /api/docs) van a la red;
// si falla, el catch handler responde /offline.html.
registerRoute(({ request }) => request.mode === 'navigate', new NetworkOnly());

// fetch 3: la lista de reportes usa la red y, tras 3 s o sin conexión, la última copia.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' && url.pathname.startsWith('/api/v1/reports'),
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 50 })],
  }),
);

// POST/PUT/DELETE no se interceptan: si fallan, la cola de sincronización los reintenta.

setCatchHandler(async ({ request }) =>
  request.destination === 'document'
    ? ((await matchPrecache('/offline.html')) ?? Response.error())
    : Response.error(),
);
