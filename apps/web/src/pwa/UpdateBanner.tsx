import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  // El aviso de "listo offline" es informativo: no debe quedarse tapando la pantalla.
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-10 flex items-center justify-between gap-3 rounded-xl bg-slate-900 p-4 text-white shadow-lg"
    >
      {needRefresh ? (
        <>
          <span>Hay una actualización.</span>
          <button
            onClick={() => updateServiceWorker(true)}
            className="min-h-11 rounded-lg bg-teal-500 px-4 font-semibold text-slate-950"
          >
            Recargar
          </button>
        </>
      ) : (
        <>
          <span>Lista para usarse sin conexión.</span>
          <button
            onClick={() => setOfflineReady(false)}
            className="min-h-11 px-3 font-semibold underline"
          >
            Cerrar
          </button>
        </>
      )}
    </div>
  );
}
