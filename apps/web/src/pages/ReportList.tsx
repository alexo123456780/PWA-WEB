import { useLiveQuery } from 'dexie-react-hooks';
import { requestSync } from '../autosync';
import { SyncBadge } from '../components/SyncBadge';
import { db } from '../db';
import { SERVICE_LABELS } from '../labels';
import { useOnline } from '../pwa/useOnline';
import { retryAll } from '../reports';

export function ReportList() {
  const online = useOnline();
  const reports = useLiveQuery(() =>
    db.reports.orderBy('createdAtClient').reverse().toArray(),
  );
  if (!reports) return null;

  const unsynced = reports.filter((r) => r.syncState !== 'synced').length;

  return (
    <section className="flex flex-col gap-3 p-4 pb-24">
      {unsynced > 0 && (
        // En iOS el sistema puede borrar datos locales de apps poco usadas: se avisa siempre.
        <p role="status" className="rounded-lg bg-amber-100 p-3 text-amber-900">
          {unsynced}{' '}
          {unsynced === 1
            ? 'reporte sin sincronizar'
            : 'reportes sin sincronizar'}
          . Abre la app con conexión para enviarlos.
        </p>
      )}
      {unsynced > 0 && online && (
        <button
          onClick={() => retryAll().then(requestSync)}
          className="min-h-11 rounded-lg border border-teal-700 px-4 font-semibold text-teal-800"
        >
          Sincronizar ahora
        </button>
      )}
      {reports.length === 0 && (
        <p className="text-slate-600">Aún no hay reportes.</p>
      )}
      <ul className="flex flex-col gap-3">
        {reports.map((r) => (
          <li key={r.clientId}>
            <a
              href={`#/r/${r.clientId}`}
              className="flex min-h-11 flex-col gap-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <span className="font-semibold">{r.customerName}</span>
              <span className="text-sm text-slate-600">
                {SERVICE_LABELS[r.serviceType]} ·{' '}
                {new Date(r.createdAtClient).toLocaleString('es')}
              </span>
              <span>
                <SyncBadge state={r.syncState} />
              </span>
            </a>
          </li>
        ))}
      </ul>
      <a
        href="#/new"
        className="fixed inset-x-4 bottom-4 flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-4 font-semibold text-white shadow-lg"
      >
        Nuevo reporte
      </a>
    </section>
  );
}
