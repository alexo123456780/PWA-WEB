import 'fake-indexeddb/auto';
import type { ReportForm } from '@fieldreport/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db';
import { createReport } from './reports';
import { getToken, setToken } from './session';
import { MAX_RETRIES, backoffMs, syncNow } from './sync';

const fields: ReportForm = {
  customerName: 'Granja El Sol',
  serviceType: 'REPAIR',
  description: 'Bomba de agua sin presión',
  status: 'OPEN',
};

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const fetchMock = vi.fn();
const sentNames = () =>
  fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).customerName);

function stubEnvironment(over: { onLine?: boolean; lockFree?: boolean } = {}) {
  const { onLine = true, lockFree = true } = over;
  vi.stubGlobal('navigator', {
    onLine,
    locks: {
      request: async (
        _name: string,
        _opts: object,
        cb: (lock: object | null) => unknown,
      ) => cb(lockFree ? {} : null),
    },
  });
}

beforeEach(async () => {
  stubEnvironment();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  await db.reports.clear();
  await db.meta.clear();
  await setToken('tok');
});
afterEach(() => vi.unstubAllGlobals());

describe('backoff', () => {
  it('2 s, 4 s, 8 s… con tope de 5 min', () => {
    expect([1, 2, 3, 4].map(backoffMs)).toEqual([2000, 4000, 8000, 16000]);
    expect(backoffMs(20)).toBe(5 * 60_000);
  });
});

describe('syncNow', () => {
  it('envía en orden de captura, con token y clientId, y marca sincronizado', async () => {
    const first = await createReport({ ...fields, customerName: 'Primero' });
    await new Promise((r) => setTimeout(r, 5)); // distinta hora de captura
    await createReport({ ...fields, customerName: 'Segundo' });
    fetchMock.mockImplementation(async (_url, init) =>
      json(201, { id: `srv-${JSON.parse(init.body).customerName}` }),
    );

    await syncNow();

    expect(sentNames()).toEqual(['Primero', 'Segundo']);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/reports');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toMatchObject({ clientId: first });
    expect(await db.reports.get(first)).toMatchObject({
      syncState: 'synced',
      serverId: 'srv-Primero',
    });
  });

  it('un fallo de red reintenta con backoff y no reenvía antes de tiempo', async () => {
    const id = await createReport(fields);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await syncNow();
    const failed = await db.reports.get(id);
    expect(failed).toMatchObject({ syncState: 'pending', retryCount: 1 });
    expect(failed!.nextRetryAt).toBeGreaterThan(Date.now());

    await syncNow(); // aún no toca
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await db.reports.update(id, { nextRetryAt: 0 });
    fetchMock.mockResolvedValue(json(201, { id: 'srv' }));
    await syncNow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await db.reports.get(id)).toMatchObject({ syncState: 'synced' });
  });

  it(`tras ${MAX_RETRIES} fallos pasa a error y deja de reintentar solo`, async () => {
    const id = await createReport(fields);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    for (let i = 0; i < MAX_RETRIES; i++) {
      await db.reports.update(id, { nextRetryAt: 0 });
      await syncNow();
    }
    expect(await db.reports.get(id)).toMatchObject({
      syncState: 'error',
      retryCount: MAX_RETRIES,
      lastError: 'Sin conexión con el servidor',
    });

    await syncNow();
    expect(fetchMock).toHaveBeenCalledTimes(MAX_RETRIES);
  });

  it('un 400 es permanente: error inmediato con el mensaje del servidor', async () => {
    const id = await createReport(fields);
    fetchMock.mockResolvedValue(
      json(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: ['customerName: inválido'],
      }),
    );

    await syncNow();

    expect(await db.reports.get(id)).toMatchObject({
      syncState: 'error',
      lastError: 'customerName: inválido',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('un 401 detiene el envío sin contar intento y pide iniciar sesión', async () => {
    const a = await createReport(fields);
    await new Promise((r) => setTimeout(r, 5));
    const b = await createReport(fields);
    fetchMock.mockResolvedValue(
      json(401, { statusCode: 401, message: 'Unauthorized' }),
    );

    await syncNow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const id of [a, b]) {
      expect(await db.reports.get(id)).toMatchObject({
        syncState: 'pending',
        retryCount: 0,
      });
    }
    expect(await getToken()).toBeNull();
    expect(await db.meta.get('expired')).toBeDefined();
  });

  it('recupera un reporte huérfano en `syncing` (app cerrada a mitad de envío)', async () => {
    const id = await createReport(fields);
    await db.reports.update(id, { syncState: 'syncing' });
    fetchMock.mockResolvedValue(json(200, { id: 'srv' }));

    await syncNow();

    expect(await db.reports.get(id)).toMatchObject({ syncState: 'synced' });
  });

  it('sin conexión no envía nada', async () => {
    stubEnvironment({ onLine: false });
    const id = await createReport(fields);

    await syncNow();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await db.reports.get(id)).toMatchObject({
      syncState: 'pending',
      retryCount: 0,
    });
  });

  it('si otro sincronizador tiene el candado, no envía', async () => {
    stubEnvironment({ lockFree: false });
    await createReport(fields);

    await syncNow();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
