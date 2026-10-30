import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { requestSync } from '../autosync';
import { SyncBadge } from '../components/SyncBadge';
import { db } from '../db';
import { SERVICE_LABELS, STATUS_LABELS } from '../labels';
import { go } from '../router';
import { ReportLockedError, deleteReport, retryReport } from '../reports';
import { ReportForm } from './ReportForm';

export function ReportDetail({
  clientId,
  edit,
}: {
  clientId: string;
  edit: boolean;
}) {
  // `null` = no existe; `undefined` = todavía cargando.
  const report = useLiveQuery(
    async () => (await db.reports.get(clientId)) ?? null,
    [clientId],
  );
  const [error, setError] = useState('');

  if (report === undefined) return null;
  if (report === null) return <p className="p-4">Reporte no encontrado.</p>;
  if (edit) return <ReportForm initial={report} />;

  const editable =
    report.syncState === 'pending' || report.syncState === 'error';

  async function remove() {
    if (!confirm('¿Eliminar este reporte? No se puede deshacer.')) return;
    try {
      await deleteReport(clientId);
      go('/');
    } catch (e) {
      setError(
        e instanceof ReportLockedError ? e.message : 'No se pudo eliminar.',
      );
    }
  }

  const rows: [string, string][] = [
    ['Cliente', report.customerName],
    ['Servicio', SERVICE_LABELS[report.serviceType]],
    ['Estatus', STATUS_LABELS[report.status]],
    ['Capturado', new Date(report.createdAtClient).toLocaleString('es')],
    ['Descripción', report.description],
    [
      'Ubicación',
      report.latitude != null && report.longitude != null
        ? `${report.latitude}, ${report.longitude}`
        : 'Sin ubicación',
    ],
  ];

  return (
    <section className="flex flex-col gap-4 p-4">
      <a
        href="#/"
        className="flex min-h-11 items-center text-teal-800 underline"
      >
        ← Reportes
      </a>
      <div className="flex flex-col gap-2">
        <SyncBadge state={report.syncState} />
        {report.lastError && (
          <p role="alert" className="text-red-700">
            {report.lastError}
          </p>
        )}
      </div>
      <dl className="flex flex-col gap-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-slate-600">{label}</dt>
            <dd className="whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
      </dl>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {report.syncState === 'error' && (
        <button
          onClick={() => retryReport(clientId).then(requestSync)}
          className="min-h-11 rounded-lg border border-teal-700 px-4 font-semibold text-teal-800"
        >
          Reintentar ahora
        </button>
      )}
      {editable && (
        <div className="flex gap-3">
          <a
            href={`#/r/${clientId}/edit`}
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-teal-700 font-semibold text-white"
          >
            Editar
          </a>
          <button
            onClick={remove}
            className="min-h-11 flex-1 rounded-lg border border-red-700 font-semibold text-red-800"
          >
            Eliminar
          </button>
        </div>
      )}
    </section>
  );
}
