import 'fake-indexeddb/auto';
import type { ReportForm } from '@fieldreport/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  ReportLockedError,
  createReport,
  deleteReport,
  retryAll,
  retryReport,
  updateReport,
} from './reports';

const fields: ReportForm = {
  customerName: 'Granja El Sol',
  serviceType: 'REPAIR',
  description: 'Bomba de agua sin presión',
  status: 'OPEN',
};

beforeEach(() => db.reports.clear());

describe('repositorio local de reportes', () => {
  it('guarda como pendiente, con clientId único y la hora de captura', async () => {
    const a = await createReport(fields);
    const b = await createReport(fields);
    const saved = await db.reports.get(a);

    expect(a).not.toBe(b);
    expect(saved).toMatchObject({
      ...fields,
      clientId: a,
      syncState: 'pending',
      retryCount: 0,
    });
    expect(new Date(saved!.createdAtClient).toISOString()).toBe(
      saved!.createdAtClient,
    );
  });

  it('al editar vuelve a pendiente y borra el estado de reintentos', async () => {
    const id = await createReport(fields);
    await db.reports.update(id, {
      syncState: 'error',
      retryCount: 5,
      lastError: 'boom',
      nextRetryAt: 123,
    });

    await updateReport(id, { ...fields, customerName: 'Rancho Norte' });

    const saved = await db.reports.get(id);
    expect(saved).toMatchObject({
      customerName: 'Rancho Norte',
      syncState: 'pending',
      retryCount: 0,
    });
    expect(saved).not.toHaveProperty('lastError');
    expect(saved).not.toHaveProperty('nextRetryAt');
  });

  it.each(['syncing', 'synced'] as const)(
    'no edita ni elimina un reporte %s',
    async (state) => {
      const id = await createReport(fields);
      await db.reports.update(id, { syncState: state });

      await expect(updateReport(id, fields)).rejects.toThrow(ReportLockedError);
      await expect(deleteReport(id)).rejects.toThrow(ReportLockedError);
      expect(await db.reports.count()).toBe(1);
    },
  );

  it('elimina un reporte pendiente', async () => {
    const id = await createReport(fields);
    await deleteReport(id);
    expect(await db.reports.count()).toBe(0);
  });

  it('retryReport devuelve un error a la cola con los intentos en cero', async () => {
    const id = await createReport(fields);
    await db.reports.update(id, { syncState: 'error', retryCount: 5 });

    await retryReport(id);

    expect(await db.reports.get(id)).toMatchObject({
      syncState: 'pending',
      retryCount: 0,
    });
  });

  it('retryAll adelanta los reintentos programados y no toca lo sincronizado', async () => {
    const waiting = await createReport(fields);
    const failed = await createReport(fields);
    const done = await createReport(fields);
    await db.reports.update(waiting, {
      retryCount: 2,
      nextRetryAt: Date.now() + 60_000,
    });
    await db.reports.update(failed, { syncState: 'error', retryCount: 5 });
    await db.reports.update(done, { syncState: 'synced' });

    await retryAll();

    expect(await db.reports.get(waiting)).toMatchObject({
      syncState: 'pending',
      retryCount: 0,
    });
    expect(await db.reports.get(waiting)).not.toHaveProperty('nextRetryAt');
    expect(await db.reports.get(failed)).toMatchObject({
      syncState: 'pending',
      retryCount: 0,
    });
    expect(await db.reports.get(done)).toMatchObject({ syncState: 'synced' });
  });
});
