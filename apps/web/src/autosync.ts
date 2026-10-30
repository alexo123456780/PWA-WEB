import { syncNow } from './sync';

// Disparadores de sincronización en la ventana: abrir la app, volver a primer plano, evento
// `online` y, mientras está abierta, un barrido periódico que respeta el backoff de cada reporte.
// Background Sync cubre el caso de la app cerrada, pero iOS no lo tiene, de ahí todo lo demás.
export function startAutoSync() {
  const run = () => void syncNow();
  const onVisible = () => document.visibilityState === 'visible' && run();

  window.addEventListener('online', run);
  document.addEventListener('visibilitychange', onVisible);
  const timer = setInterval(() => !document.hidden && run(), 5000);
  run();

  return () => {
    window.removeEventListener('online', run);
    document.removeEventListener('visibilitychange', onVisible);
    clearInterval(timer);
  };
}

type WithSync = ServiceWorkerRegistration & {
  sync?: { register(tag: string): Promise<void> };
};

// Tras guardar: sincroniza ya y, si el navegador lo soporta, pide un Background Sync
// para que el Service Worker envíe lo pendiente aunque se cierre la app.
export async function requestSync() {
  void syncNow();
  try {
    const registration = (await navigator.serviceWorker.ready) as WithSync;
    await registration.sync?.register('sync-reports');
  } catch {
    // Sin Service Worker o sin Background Sync (Safari/iOS): los demás disparadores bastan.
  }
}
