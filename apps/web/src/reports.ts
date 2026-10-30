import type { ReportForm } from '@fieldreport/shared';
import { db } from './db';

export class ReportLockedError extends Error {
  constructor() {
    super('El reporte ya se envió o se está enviando y no se puede modificar');
  }
}

export async function createReport(fields: ReportForm) {
  const clientId = crypto.randomUUID();
  await db.reports.add({
    ...fields,
    clientId,
    createdAtClient: new Date().toISOString(),
    syncState: 'pending',
    retryCount: 0,
  });
  return clientId;
}

// Solo se edita o elimina lo que aún no está en el servidor. La comprobación y el cambio van
// en una transacción para que no se cuele una edición mientras el sincronizador toma el reporte.
async function ifEditable(clientId: string, change: () => Promise<unknown>) {
  await db.transaction('rw', db.reports, async () => {
    const report = await db.reports.get(clientId);
    if (!report) throw new Error('Reporte no encontrado');
    if (report.syncState === 'syncing' || report.syncState === 'synced') {
      throw new ReportLockedError();
    }
    await change();
  });
}

export const updateReport = (clientId: string, fields: ReportForm) =>
  ifEditable(clientId, () =>
    db.reports.update(clientId, {
      ...fields,
      syncState: 'pending',
      retryCount: 0,
      nextRetryAt: undefined,
      lastError: undefined,
    }),
  );

export const deleteReport = (clientId: string) =>
  ifEditable(clientId, () => db.reports.delete(clientId));

// Reintento manual: devuelve a la cola, con los intentos en cero, lo que quedó en `error`.
export const retryReport = (clientId: string) =>
  db.reports
    .where('clientId')
    .equals(clientId)
    .and((r) => r.syncState === 'error')
    .modify({
      syncState: 'pending',
      retryCount: 0,
      nextRetryAt: undefined,
    });

// "Sincronizar ahora": además, lo que espera un reintento programado se envía ya.
export const retryAll = () =>
  db.reports.where('syncState').anyOf('pending', 'error').modify({
    syncState: 'pending',
    retryCount: 0,
    nextRetryAt: undefined,
  });
